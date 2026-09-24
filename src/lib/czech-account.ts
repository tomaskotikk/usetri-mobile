// kopie z webu lib/czech-account.ts, měnit obojí
/**
 * Czech bank account numbers: parsing, the ČNB checksum and IBAN conversion.
 *
 * Copy of the website's lib/czech-account.ts — change both.
 */
export interface CzechAccount {
  /** Without leading zeros, '' when the account has none. */
  prefix: string
  /** Without leading zeros. */
  number: string
  /** Four-digit bank code. */
  bank: string
}

const WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1]

/** CZ in the ISO 13616 letters-to-digits mapping (C = 12, Z = 35). */
const CZ_DIGITS = '1235'

/** ČNB weighted mod-11 check. Both parts are left-padded to ten digits first. */
function passesChecksum(digits: string) {
  const padded = digits.padStart(10, '0')
  const sum = [...padded].reduce((acc, d, i) => acc + Number(d) * WEIGHTS[i], 0)
  return sum % 11 === 0
}

function mod97(digits: string) {
  let rest = 0
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97
  return rest
}

function isValid({ prefix, number }: CzechAccount) {
  return number.length > 0 && passesChecksum(prefix) && passesChecksum(number)
}

const stripZeros = (digits: string) => digits.replace(/^0+/, '')

function fromIban(raw: string): CzechAccount | null {
  const iban = raw.replace(/\s+/g, '').toUpperCase()
  if (!/^CZ\d{22}$/.test(iban)) return null
  // Country and check digits move to the end; a valid IBAN leaves remainder 1.
  if (mod97(iban.slice(4) + CZ_DIGITS + iban.slice(2, 4)) !== 1) return null
  return { prefix: stripZeros(iban.slice(8, 14)), number: stripZeros(iban.slice(14)), bank: iban.slice(4, 8) }
}

/** Accepts `číslo/kód`, `předčíslí-číslo/kód` or a pasted CZ IBAN. Null when invalid. */
export function parseCzechAccount(input: string): CzechAccount | null {
  const raw = input.trim()
  if (/^cz/i.test(raw)) {
    const parsed = fromIban(raw)
    return parsed && isValid(parsed) ? parsed : null
  }

  const match = raw.replace(/\s+/g, '').match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/)
  if (!match) return null

  const parsed = { prefix: stripZeros(match[1] ?? ''), number: stripZeros(match[2]), bank: match[3] }
  return isValid(parsed) ? parsed : null
}

export function toIban({ prefix, number, bank }: CzechAccount) {
  const bban = bank + prefix.padStart(6, '0') + number.padStart(10, '0')
  const check = 98 - mod97(bban + CZ_DIGITS + '00')
  return `CZ${String(check).padStart(2, '0')}${bban}`
}

export function formatAccount({ prefix, number, bank }: CzechAccount) {
  return `${prefix ? `${prefix}-` : ''}${number}/${bank}`
}

export function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, '$1 ').trim()
}
