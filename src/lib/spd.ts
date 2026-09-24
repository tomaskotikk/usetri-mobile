// kopie z webu lib/spd.ts, měnit obojí
/**
 * Czech QR payment ("QR Platba", Short Payment Descriptor 1.0).
 *
 * Copy of the website's lib/spd.ts — change both.
 */
import type { IsoDate } from './billing'

/** SPD caps MSG at 60 characters. */
export const MESSAGE_LIMIT = 60

export function buildSpd({ iban, amount, vs, message }: { iban: string; amount: number; vs: number; message: string }) {
  return ['SPD', '1.0', `ACC:${iban}`, `AM:${amount.toFixed(2)}`, 'CC:CZK', `X-VS:${vs}`, `MSG:${message}`].join('*')
}

/** Some banks mangle diacritics and `*` separates SPD fields, so both go. */
function plain(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "Usetri Netflix 10/2026 Tomas K." — what the owner sees on their statement. */
export function paymentMessage(serviceName: string, period: IsoDate, payerName: string) {
  const [year, month] = period.split('-')
  const words = plain(payerName).split(' ').filter(Boolean)
  const who = words.length > 1 ? `${words[0]} ${words[words.length - 1][0]}.` : (words[0] ?? '')
  const tail = ` ${Number(month)}/${year}${who ? ` ${who}` : ''}`

  const room = MESSAGE_LIMIT - 'Usetri '.length - tail.length
  const service = plain(serviceName).slice(0, Math.max(0, room)).trim()
  return `Usetri ${service}${tail}`.slice(0, MESSAGE_LIMIT)
}
