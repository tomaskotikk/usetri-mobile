import { supabase } from './supabase'
import { formatAccount, parseCzechAccount, toIban, type CzechAccount } from './czech-account'
import {
  currentPeriod,
  periodStatus,
  todayInPrague,
  upcomingPeriod,
  type IsoDate,
  type PeriodStatus,
} from './billing'
import type { Offer } from './data'

/**
 * QR payments between members — the same reads and writes as the website's
 * lib/payments.ts and app/dashboard/payment-actions.ts. The app talks to Supabase
 * directly, so RLS and the triggers are what actually guard every write here.
 *
 * Writes return an error message, or null when they went through.
 */

export const ACCOUNT_ERROR = 'Tohle číslo účtu nevypadá správně. Zkontroluj ho prosím.'

export type PayoutAccount = {
  iban: string
  /** As Czech banks print it: 19-2000145399/0800. */
  display: string
}

export type PeriodView = {
  period: IsoDate
  status: PeriodStatus
  paymentId: string | null
  /** What was recorded, or today's price when nothing is recorded yet. */
  amount: number
}

type Paid = {
  id: string
  user_id: string
  period_start: string
  amount: number
  status: 'reported' | 'confirmed'
}

function viewOf(period: IsoDate, payments: Paid[], userId: string, price: number, today: IsoDate): PeriodView {
  const payment = payments.find((p) => p.user_id === userId && p.period_start === period) ?? null
  return {
    period,
    status: periodStatus(period, payment?.status ?? null, today),
    paymentId: payment?.id ?? null,
    amount: payment?.amount ?? price,
  }
}

export async function getPayoutAccount(userId: string): Promise<PayoutAccount | null> {
  const { data } = await supabase
    .from('payout_accounts')
    .select('iban, account_display')
    .eq('user_id', userId)
    .maybeSingle()
  return data ? { iban: data.iban as string, display: data.account_display as string } : null
}

/** Shared with createOffer, which saves the account before the group exists. */
export async function upsertPayoutAccount(userId: string, account: CzechAccount) {
  const { error } = await supabase.from('payout_accounts').upsert({
    user_id: userId,
    iban: toIban(account),
    account_display: formatAccount(account),
    updated_at: new Date().toISOString(),
  })
  return error
}

export async function savePayoutAccount(userId: string, input: string) {
  const parsed = parseCzechAccount(input)
  if (!parsed) return ACCOUNT_ERROR
  const error = await upsertPayoutAccount(userId, parsed)
  return error ? 'Účet se nepodařilo uložit. Zkus to prosím znovu.' : null
}

export type PaymentView = {
  /** The owner's account. RLS hides it from anyone outside the group. */
  account: PayoutAccount | null
  /** The viewer's own periods, when they are a paying member. */
  mine: { vs: number; periods: PeriodView[] } | null
  /** Owner only: member user id → their current period. */
  members: Map<string, PeriodView>
}

export async function getPaymentView(viewerId: string, offer: Offer): Promise<PaymentView> {
  if (offer.role === null) return { account: null, mine: null, members: new Map() }

  const today = todayInPrague()
  const [account, { data: billing }, { data: payments }] = await Promise.all([
    getPayoutAccount(offer.ownerId),
    supabase
      .from('group_members')
      .select('user_id, billing_start, payment_ref')
      .eq('group_id', offer.id)
      .eq('role', 'member'),
    supabase
      .from('payments')
      .select('id, user_id, period_start, amount, status')
      .eq('group_id', offer.id),
  ])

  type Billing = { user_id: string; billing_start: string; payment_ref: number }
  const rows = (billing ?? []) as Billing[]
  const paid = (payments ?? []) as Paid[]

  if (offer.role === 'member') {
    const me = rows.find((b) => b.user_id === viewerId)
    if (!me) return { account, mine: null, members: new Map() }

    const periods = [currentPeriod(me.billing_start, today), upcomingPeriod(me.billing_start, today)]
      .filter((p): p is IsoDate => p !== null)
      .map((p) => viewOf(p, paid, viewerId, offer.pricePerSeat, today))
    // bigint arrives as a number while it fits, which an 8-digit VS always does.
    return { account, mine: { vs: Number(me.payment_ref), periods }, members: new Map() }
  }

  const members = new Map(
    rows.map((b) => [
      b.user_id,
      viewOf(currentPeriod(b.billing_start, today), paid, b.user_id, offer.pricePerSeat, today),
    ]),
  )
  return { account, mine: null, members }
}

export type InboxItem = PeriodView & {
  groupId: string
  serviceName: string
  serviceSlug: string
  serviceColor: string
  /** Set on items waiting for the owner's confirmation. */
  payerName?: string
}

export type PaymentInbox = { toPay: InboxItem[]; toConfirm: InboxItem[] }

type ServiceBits = { name: string; color: string } | null

/** What the home screen asks the viewer to act on: pay, or confirm. */
export async function getPaymentInbox(userId: string): Promise<PaymentInbox> {
  const today = todayInPrague()

  const [{ data: memberships }, { data: mine }, { data: reported }] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id, billing_start, groups(price_per_seat, service_slug, services(name, color))')
      .eq('user_id', userId)
      .eq('role', 'member'),
    supabase
      .from('payments')
      .select('id, group_id, user_id, period_start, amount, status')
      .eq('user_id', userId),
    supabase
      .from('payments')
      .select(
        'id, group_id, period_start, amount, profiles(full_name), groups!inner(owner_id, service_slug, services(name, color))',
      )
      .eq('status', 'reported')
      .eq('groups.owner_id', userId)
      .order('reported_at'),
  ])

  type Membership = {
    group_id: string
    billing_start: string
    groups: { price_per_seat: number; service_slug: string; services: ServiceBits } | null
  }
  type Reported = {
    id: string
    group_id: string
    period_start: string
    amount: number
    profiles: { full_name: string | null } | null
    groups: { owner_id: string; service_slug: string; services: ServiceBits } | null
  }

  const own = (mine ?? []) as (Paid & { group_id: string })[]

  const toPay: InboxItem[] = ((memberships ?? []) as unknown as Membership[]).flatMap((m) => {
    const group = m.groups
    if (!group?.services) return []
    const paid = own.filter((p) => p.group_id === m.group_id)
    const view = viewOf(currentPeriod(m.billing_start, today), paid, userId, group.price_per_seat, today)
    if (view.status !== 'due' && view.status !== 'overdue') return []
    return [
      {
        ...view,
        groupId: m.group_id,
        serviceName: group.services.name,
        serviceSlug: group.service_slug,
        serviceColor: group.services.color,
      },
    ]
  })

  const toConfirm: InboxItem[] = ((reported ?? []) as unknown as Reported[]).flatMap((r) =>
    r.groups?.services
      ? [
          {
            period: r.period_start,
            status: 'reported' as const,
            paymentId: r.id,
            amount: r.amount,
            groupId: r.group_id,
            serviceName: r.groups.services.name,
            serviceSlug: r.groups.service_slug,
            serviceColor: r.groups.services.color,
            payerName: r.profiles?.full_name?.trim() || 'Anonymní člen',
          },
        ]
      : [],
  )

  return { toPay, toConfirm }
}

export async function reportPayment(groupId: string, userId: string, period: IsoDate) {
  const { error } = await supabase
    .from('payments')
    .insert({ group_id: groupId, user_id: userId, period_start: period, status: 'reported' })

  if (!error) return null
  if (error.code === '23505') return 'Tuhle platbu už jsi nahlásil.'
  return 'Platbu se nepodařilo nahlásit. Zkus to prosím znovu.'
}

export async function undoReport(paymentId: string, userId: string) {
  const { data, error } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', userId)
    .eq('status', 'reported')
    .select('id')
  return error || !data?.length ? 'Nahlášení se nepodařilo vzít zpět.' : null
}

export async function confirmPayment(paymentId: string) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'confirmed' })
    .eq('id', paymentId)
    .select('id')
  // RLS filters out payments in groups the viewer does not own: zero rows, no error.
  return error || !data?.length ? 'Platbu se nepodařilo potvrdit.' : null
}

export async function rejectPayment(paymentId: string) {
  const { data, error } = await supabase.from('payments').delete().eq('id', paymentId).select('id')
  return error || !data?.length ? 'Změna se nepovedla. Zkus to prosím znovu.' : null
}

/** Owner records a payment that arrived another way, e.g. in cash. */
export async function markPaid(groupId: string, userId: string, period: IsoDate) {
  const { error } = await supabase
    .from('payments')
    .insert({ group_id: groupId, user_id: userId, period_start: period, status: 'confirmed' })

  if (!error) return null
  if (error.code === '23505') return 'Tahle platba už je zapsaná.'
  return 'Platbu se nepodařilo zapsat.'
}
