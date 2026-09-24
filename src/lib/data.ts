import { supabase } from './supabase'
import { parseCzechAccount } from './czech-account'
import { ACCOUNT_ERROR, upsertPayoutAccount } from './payments'

export type Offer = {
  id: string
  serviceSlug: string
  name: string
  plan: string
  category: string
  color: string
  fullPrice: number
  seatsTotal: number
  seatsTaken: number
  pricePerSeat: number
  note: string | null
  closed: boolean
  createdAt: string
  ownerId: string
  ownerName: string
  role: 'owner' | 'member' | null
  /** Who already sits in the plan — drives the avatar stack on the card. */
  members: Face[]
}

export type Service = {
  slug: string
  name: string
  plan: string
  category: string
  color: string
  fullPrice: number
  seats: number
}

export type Member = {
  id: string
  /** The account behind the membership, for opening their profile. */
  userId: string
  name: string
  avatar: string | null
  role: 'owner' | 'member'
  joinedAt: string
}

/** Just enough of a member to draw a face in a stack. */
export type Face = { id: string; name: string; avatar: string | null }

type Row = {
  id: string
  owner_id: string
  service_slug: string
  seats_total: number
  seats_taken: number
  price_per_seat: number
  note: string | null
  closed: boolean
  created_at: string
  services: { name: string; plan: string; category: string; color: string; full_price: number } | null
  profiles: { full_name: string | null } | null
}

const SELECT =
  'id, owner_id, service_slug, seats_total, seats_taken, price_per_seat, note, closed, created_at, services(name, plan, category, color, full_price), profiles!groups_owner_id_fkey(full_name)'

function toOffer(row: Row, roles: Map<string, 'owner' | 'member'>): Offer | null {
  if (!row.services) return null
  return {
    id: row.id,
    serviceSlug: row.service_slug,
    name: row.services.name,
    plan: row.services.plan,
    category: row.services.category,
    color: row.services.color,
    fullPrice: row.services.full_price,
    seatsTotal: row.seats_total,
    seatsTaken: row.seats_taken,
    pricePerSeat: row.price_per_seat,
    note: row.note,
    closed: row.closed,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    ownerName: row.profiles?.full_name?.trim() || 'Anonymní člen',
    role: roles.get(row.id) ?? null,
    members: [],
  }
}

/** One extra round trip fills the avatar stacks for a whole page of offers. */
async function fillMemberStacks(offers: Offer[]) {
  if (offers.length === 0) return offers

  const { data } = await supabase
    .from('group_members')
    .select('group_id, profiles(id, full_name, avatar_url)')
    .in(
      'group_id',
      offers.map((o) => o.id),
    )
    .order('joined_at')

  type StackRow = {
    group_id: string
    profiles: { id: string; full_name: string | null; avatar_url: string | null } | null
  }

  const byGroup = new Map<string, Face[]>()
  for (const row of (data ?? []) as unknown as StackRow[]) {
    if (!row.profiles) continue
    const list = byGroup.get(row.group_id) ?? []
    list.push({
      id: row.profiles.id,
      name: row.profiles.full_name?.trim() || 'Anonymní člen',
      avatar: row.profiles.avatar_url,
    })
    byGroup.set(row.group_id, list)
  }

  for (const offer of offers) offer.members = byGroup.get(offer.id) ?? []
  return offers
}

export type Home = {
  mine: Offer[]
  open: Offer[]
  stats: { groups: number; monthly: number; saved: number; percent: number }
}

/** Everything the tabs render, in one round trip pair. */
export async function loadHome(userId: string): Promise<Home> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', userId)

  const roles = new Map<string, 'owner' | 'member'>(
    (memberships ?? []).map((m) => [m.group_id as string, m.role as 'owner' | 'member']),
  )

  const { data, error } = await supabase
    .from('groups')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) throw error

  const all = await fillMemberStacks(
    ((data ?? []) as unknown as Row[])
      .map((row) => toOffer(row, roles))
      .filter((o): o is Offer => o !== null),
  )

  const mine = all.filter((o) => o.role !== null)
  const monthly = mine.reduce((sum, o) => sum + o.pricePerSeat, 0)
  // What the same set of services would cost if nobody shared them.
  const alone = mine.reduce((sum, o) => sum + o.fullPrice, 0)

  return {
    mine,
    open: all.filter((o) => o.role === null && !o.closed && o.seatsTaken < o.seatsTotal),
    stats: {
      groups: mine.length,
      monthly,
      saved: Math.max(0, alone - monthly),
      percent: alone > 0 ? Math.round((1 - monthly / alone) * 100) : 0,
    },
  }
}

/** The public catalogue backing the create flow. */
export async function loadServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('slug, name, plan, category, color, full_price, seats')
    .order('name')

  if (error) throw error

  return (data ?? []).map((s) => ({
    slug: s.slug as string,
    name: s.name as string,
    plan: s.plan as string,
    category: s.category as string,
    color: s.color as string,
    fullPrice: s.full_price as number,
    seats: s.seats as number,
  }))
}

export async function loadMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, user_id, role, joined_at, profiles(full_name, avatar_url)')
    .eq('group_id', groupId)
    .order('joined_at')

  if (error) throw error

  type MemberRow = {
    id: string
    user_id: string
    role: string
    joined_at: string
    profiles: { full_name: string | null; avatar_url: string | null } | null
  }

  return ((data ?? []) as unknown as MemberRow[]).map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.profiles?.full_name?.trim() || 'Anonymní člen',
    avatar: m.profiles?.avatar_url ?? null,
    role: m.role === 'owner' ? 'owner' : 'member',
    joinedAt: m.joined_at,
  }))
}

/**
 * The picture the provider handed us on sign-in. Supabase files it under
 * `avatar_url` for some providers and `picture` for others.
 */
export function avatarFromSession(meta: Record<string, unknown> | undefined) {
  const url = (meta?.avatar_url as string) || (meta?.picture as string)
  return url?.trim() ? url : null
}

/**
 * Copies the Google picture onto the profile row, so every other member sees this
 * face too — the stacks read `profiles.avatar_url`, not the viewer's own session.
 * Writes only when it changed, and never blocks sign-in if it fails.
 */
export async function syncProfileAvatar(userId: string, meta: Record<string, unknown> | undefined) {
  const avatar = avatarFromSession(meta)
  if (!avatar) return

  try {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle()
    if (data?.avatar_url === avatar) return
    await supabase.from('profiles').update({ avatar_url: avatar }).eq('id', userId)
  } catch {
    // A missing picture is cosmetic; a failed sync must not break the session.
  }
}

export async function joinOffer(groupId: string, userId: string) {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId })
  if (!error) return null
  if (error.message.includes('plná')) return 'Skupina je mezitím plná.'
  if (error.message.includes('uzavřená')) return 'Tahle nabídka je uzavřená.'
  if (error.code === '23505') return 'V téhle skupině už jsi.'
  return 'Přidání se nepovedlo. Zkus to prosím znovu.'
}

export async function leaveOffer(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', 'member')
  return error ? 'Odchod se nepovedl.' : null
}

/**
 * The owner row is added by a trigger, so the insert alone is the whole creation.
 * The payout account is saved first — members cannot pay a group without one.
 */
export async function createOffer(input: {
  serviceSlug: string
  ownerId: string
  seatsTotal: number
  pricePerSeat: number
  note: string | null
  /** Where members send money: 123456789/0800, 19-123456789/0800 or a CZ IBAN. */
  account: string
}): Promise<{ id: string } | { error: string }> {
  const account = parseCzechAccount(input.account)
  if (!account) return { error: ACCOUNT_ERROR }

  const accountError = await upsertPayoutAccount(input.ownerId, account)
  if (accountError) return { error: 'Číslo účtu se nepodařilo uložit. Zkus to prosím znovu.' }

  const { data, error } = await supabase
    .from('groups')
    .insert({
      service_slug: input.serviceSlug,
      owner_id: input.ownerId,
      seats_total: input.seatsTotal,
      price_per_seat: input.pricePerSeat,
      note: input.note,
    })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('price_per_seat')) return { error: 'Cena musí být mezi 1 a 5 000 Kč.' }
    if (error.message.includes('seats_total')) return { error: 'Počet míst musí být mezi 2 a 12.' }
    if (error.message.includes('note')) return { error: 'Poznámka je moc dlouhá.' }
    return { error: 'Nabídku se nepodařilo založit.' }
  }
  return { id: data.id as string }
}

export async function setOfferClosed(groupId: string, closed: boolean) {
  const { error } = await supabase.from('groups').update({ closed }).eq('id', groupId)
  return error ? 'Změna se nepovedla.' : null
}

export async function deleteOffer(groupId: string) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  return error ? 'Nabídku se nepodařilo smazat.' : null
}

export async function updateProfileName(userId: string, fullName: string) {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
  if (error) return 'Jméno se nepodařilo uložit.'
  // Keep the copy on the session in step, so greetings update without a re-login.
  await supabase.auth.updateUser({ data: { full_name: fullName } })
  return null
}

/** Groups thousands with a non-breaking space, like the website does. */
export const czk = (value: number) =>
  `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Kč`

export function monogram(name: string) {
  const words = name.split(/[\s+]+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.[0] ?? '?').toUpperCase()
}

export type PublicProfile = {
  id: string
  name: string
  avatar: string | null
  joinedAt: string
  owned: number
  joined: number
  freeSeats: number
  offers: Offer[]
}

/**
 * What one member may see about another: a name, a face, and counts.
 *
 * Never what they pay. The privacy notice promises other members see a name and
 * a picture, and how much somebody spends on subscriptions has no business on a
 * profile a stranger can open.
 */
export async function loadProfile(id: string, viewerId: string): Promise<PublicProfile | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, created_at')
    .eq('id', id)
    .maybeSingle()

  if (!profile) return null

  const [{ data: theirs }, { data: mine }] = await Promise.all([
    supabase.from('group_members').select('group_id, role').eq('user_id', id),
    supabase.from('group_members').select('group_id, role').eq('user_id', viewerId),
  ])

  const roles = new Map(
    (mine ?? []).map((m) => [m.group_id as string, (m.role === 'owner' ? 'owner' : 'member') as 'owner' | 'member']),
  )

  const { data } = await supabase
    .from('groups')
    .select(SELECT)
    .eq('owner_id', id)
    .eq('closed', false)
    .order('created_at', { ascending: false })

  const offers = await fillMemberStacks(
    ((data ?? []) as unknown as Row[]).map((row) => toOffer(row, roles)).filter((o): o is Offer => o !== null),
  )

  return {
    id: profile.id,
    name: profile.full_name?.trim() || 'Anonymní člen',
    avatar: profile.avatar_url ?? null,
    joinedAt: profile.created_at,
    owned: (theirs ?? []).filter((m) => m.role === 'owner').length,
    joined: (theirs ?? []).filter((m) => m.role !== 'owner').length,
    freeSeats: offers.reduce((sum, o) => sum + Math.max(0, o.seatsTotal - o.seatsTaken), 0),
    offers,
  }
}

/** Rough "how long ago", worded the same as on the website. */
export function since(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'dnes'
  if (days === 1) return 'včera'
  if (days < 7) return `před ${days} dny`
  if (days < 60) return `před ${Math.floor(days / 7)} týdny`
  return `před ${Math.floor(days / 30)} měsíci`
}
