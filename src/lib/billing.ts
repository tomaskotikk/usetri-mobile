// kopie z webu lib/billing.ts, měnit obojí
/**
 * Billing periods. Every paying member pays on the anniversary of their
 * `billing_start`; a period runs from one due date to the next.
 *
 * Dates are 'YYYY-MM-DD' strings in Europe/Prague — never JS Dates, which shift
 * by a day between the UTC server, the browser and Postgres `date`.
 *
 * Copy of the website's lib/billing.ts — change both. The SQL function
 * public.is_billing_date mirrors dueDateFor.
 */
export type IsoDate = string
export type PeriodStatus = 'paid' | 'reported' | 'overdue' | 'due'

/** Days after the due date before a period counts as overdue. */
const GRACE_DAYS = 3
/** How early the next period shows up. The database accepts payments this far ahead. */
export const PREVIEW_DAYS = 7

function parts(date: IsoDate) {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d }
}

function iso(y: number, m: number, d: number): IsoDate {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** `m` is 1-based; day 0 of the next month is the last day of this one. */
function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const { y, m, d } = parts(date)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

/** Due date `monthOffset` months after the start, clamped to the month's last day. */
export function dueDateFor(billingStart: IsoDate, monthOffset: number): IsoDate {
  const { y, m, d } = parts(billingStart)
  const index = y * 12 + (m - 1) + monthOffset
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return iso(year, month, Math.min(d, daysInMonth(year, month)))
}

function offsetOn(billingStart: IsoDate, today: IsoDate) {
  const s = parts(billingStart)
  const t = parts(today)
  let k = (t.y - s.y) * 12 + (t.m - s.m)
  // ISO strings compare correctly as text.
  if (dueDateFor(billingStart, k) > today) k -= 1
  return Math.max(0, k)
}

/** The latest due date on or before today. */
export function currentPeriod(billingStart: IsoDate, today: IsoDate): IsoDate {
  return dueDateFor(billingStart, offsetOn(billingStart, today))
}

/** The next due date, once it is at most PREVIEW_DAYS away. */
export function upcomingPeriod(billingStart: IsoDate, today: IsoDate): IsoDate | null {
  const next = dueDateFor(billingStart, offsetOn(billingStart, today) + 1)
  return next <= addDays(today, PREVIEW_DAYS) ? next : null
}

export function periodStatus(
  period: IsoDate,
  payment: 'reported' | 'confirmed' | null,
  today: IsoDate,
): PeriodStatus {
  if (payment === 'confirmed') return 'paid'
  if (payment === 'reported') return 'reported'
  return today > addDays(period, GRACE_DAYS) ? 'overdue' : 'due'
}

export function todayInPrague(now: Date = new Date()): IsoDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** "2. 10. 2026" — no Intl, so hydration always matches. */
export function formatDate(date: IsoDate) {
  const { y, m, d } = parts(date)
  return `${d}. ${m}. ${y}`
}
