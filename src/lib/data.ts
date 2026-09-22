import { supabase } from './supabase'

export type Offer = {
  id: string
  name: string
  plan: string
  color: string
  fullPrice: number
  seatsTotal: number
  seatsTaken: number
  pricePerSeat: number
  note: string | null
  closed: boolean
  ownerName: string
  role: 'owner' | 'member' | null
}

type Row = {
  id: string
  seats_total: number
  seats_taken: number
  price_per_seat: number
  note: string | null
  closed: boolean
  created_at: string
  services: { name: string; plan: string; color: string; full_price: number } | null
  profiles: { full_name: string | null } | null
}

const SELECT =
  'id, seats_total, seats_taken, price_per_seat, note, closed, created_at, services(name, plan, color, full_price), profiles!groups_owner_id_fkey(full_name)'

function toOffer(row: Row, roles: Map<string, 'owner' | 'member'>): Offer | null {
  if (!row.services) return null
  return {
    id: row.id,
    name: row.services.name,
    plan: row.services.plan,
    color: row.services.color,
    fullPrice: row.services.full_price,
    seatsTotal: row.seats_total,
    seatsTaken: row.seats_taken,
    pricePerSeat: row.price_per_seat,
    note: row.note,
    closed: row.closed,
    ownerName: row.profiles?.full_name?.trim() || 'Anonymní člen',
    role: roles.get(row.id) ?? null,
  }
}

/** Everything the home screen needs, in one round trip pair. */
export async function loadHome(userId: string) {
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
    .limit(40)

  if (error) throw error

  const all = ((data ?? []) as unknown as Row[])
    .map((row) => toOffer(row, roles))
    .filter((o): o is Offer => o !== null)

  const mine = all.filter((o) => o.role !== null)
  const monthly = mine.reduce((sum, o) => sum + o.pricePerSeat, 0)
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

/** Groups thousands with a non-breaking space, like the website does. */
export const czk = (value: number) =>
  `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Kč`
