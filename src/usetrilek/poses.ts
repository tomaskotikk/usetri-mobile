import type { Extra } from './extras'
import type { MOTIONS } from './motion'
import type { Arm, Leg, Pose } from './rig'

/**
 * The pose library. Each entry is where he stands, what he feels, how he moves
 * and where the app uses him — so the page that shows him doubles as the spec.
 */
export type PoseDef = {
  id: string
  name: string
  /** Where in the app this one belongs. */
  use: string
  pose: Pose
  /** How he moves while holding it — a key of MOTIONS. */
  motion: keyof typeof MOTIONS
  extras?: Extra[]
  /** Sits on a block of Netflix instead of standing on the ground. */
  seat?: boolean
}

const hangL: Arm = { upper: 101, fore: 97, hand: 'relaxed' }
const hangR: Arm = { upper: 79, fore: 83, hand: 'relaxed', flip: true }
const hipL: Arm = { upper: 142, fore: 38, hand: 'fist', flip: true }
const standL: Leg = { thigh: 91, shin: 91, toe: 5 }
const standR: Leg = { thigh: 89, shin: 89, toe: -5 }

export const POSES: PoseDef[] = [
  {
    id: 'ahoj',
    motion: 'wave',
    name: 'Ahoj!',
    use: 'Vítání, onboarding, hlavička domovské obrazovky',
    pose: {
      tilt: -5,
      armL: hangL,
      armR: { upper: -30, fore: -84, hand: 'open' },
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'raised', mouth: 'grin' },
    },
  },
  {
    id: 'stoji',
    motion: 'stand',
    name: 'V klidu',
    use: 'Výchozí stav, prázdná místa v rozhraní',
    pose: {
      armL: hangL,
      armR: hangR,
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'neutral', mouth: 'smile' },
    },
  },
  {
    id: 'premysli',
    motion: 'think',
    name: 'Přemýšlí',
    use: 'Výběr služby, prázdný stav „ještě nemáš skupinu“',
    pose: {
      tilt: -6,
      turn: 0.25,
      armL: { upper: 100, fore: -4, hand: 'flat', flip: true },
      armR: { upper: 124, fore: -94, hand: 'fist', twist: 4 },
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'skeptic', mouth: 'smirk', look: [0.6, -0.9] },
    },
    extras: ['thought'],
  },
  {
    id: 'hura',
    motion: 'jump',
    name: 'Hurá!',
    use: 'Platba potvrzená, skupina je plná',
    pose: {
      armL: { upper: -128, fore: -112, hand: 'fist', flip: true },
      armR: { upper: -52, fore: -68, hand: 'fist' },
      legL: { thigh: 100, shin: 84, toe: 8 },
      legR: { thigh: 80, shin: 96, toe: -8 },
      face: { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: 1.5 },
    },
    extras: ['confetti'],
  },
  {
    id: 'ukazuje',
    motion: 'point',
    name: 'Ukazuje',
    use: 'Nápověda a tipy — „tady klikni“',
    pose: {
      tilt: 4,
      turn: 0.45,
      armL: hipL,
      armR: { upper: -8, fore: -20, hand: 'point' },
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'raised', mouth: 'smile', look: [1, -0.2] },
    },
  },
  {
    id: 'qr',
    motion: 'show',
    name: 'QR platba',
    use: 'Obrazovka platby — naskenuj a zaplať',
    pose: {
      tilt: -5,
      turn: 0.15,
      armL: hangL,
      armR: { upper: 72, fore: -78, hand: 'hold' },
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'raised', mouth: 'grin' },
      held: { kind: 'phone', hand: 'R', dx: 38, dy: 4, rot: 5, scale: 1.3 },
    },
  },
  {
    id: 'mince',
    motion: 'flip',
    name: 'Ušetřil!',
    use: 'Přehled úspor, měsíční shrnutí',
    pose: {
      tilt: -4,
      armL: hipL,
      armR: { upper: -38, fore: -82, hand: 'hold' },
      legL: standL,
      legR: standR,
      face: { eyes: 'wide', brows: 'raised', mouth: 'grin', look: [0.6, -0.6], blush: 1.3 },
      held: { kind: 'coin', hand: 'R', dx: 34, dy: 0, rot: 0, scale: 1.25 },
    },
    extras: ['sparkles'],
  },
  {
    id: 'hleda',
    motion: 'search',
    name: 'Hledá',
    use: 'Vyhledávání v katalogu, žádné výsledky',
    pose: {
      lean: 5,
      tilt: 6,
      turn: 0.6,
      armL: hangL,
      armR: { upper: 22, fore: -58, hand: 'hold' },
      legL: standL,
      legR: standR,
      face: { eyes: 'wide', brows: 'focused', mouth: 'o', look: [1, 0] },
      held: { kind: 'magnifier', hand: 'R', dx: 14, dy: 0, rot: 10, scale: 1.05 },
    },
  },
  {
    id: 'palec',
    motion: 'thumb',
    name: 'Palec nahoru',
    use: 'Uloženo, hotovo, všechno sedí',
    pose: {
      tilt: -3,
      armL: hangL,
      armR: { upper: 62, fore: -58, hand: 'thumb', twist: 58 },
      legL: standL,
      legR: standR,
      face: { eyes: 'wink', brows: 'raised', mouth: 'grin' },
    },
  },
  {
    id: 'krci',
    motion: 'shrug',
    name: 'Krčí rameny',
    use: 'Chyba, nic tu není, stránka nenalezena',
    pose: {
      tilt: 8,
      armL: { upper: 122, fore: 192, hand: 'flat', flip: true },
      armR: { upper: 58, fore: -12, hand: 'flat' },
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'worried', mouth: 'teeth', look: [0, -0.3] },
    },
    extras: ['question'],
  },
  {
    id: 'nese',
    motion: 'carry',
    name: 'Nese úspory',
    use: 'Kolik jsi letos ušetřil',
    pose: {
      tilt: 4,
      turn: -0.2,
      armL: hipL,
      armR: { upper: 84, fore: 90, hand: 'hold', twist: 0 },
      legL: standL,
      legR: standR,
      face: { eyes: 'happy', brows: 'neutral', mouth: 'grin' },
      held: { kind: 'bag', hand: 'R', dx: 24, dy: 0, rot: 0, scale: 1.2 },
    },
    extras: ['coins'],
  },
  {
    id: 'ceka',
    motion: 'wait',
    name: 'Čeká',
    use: 'Čeká se na platbu od člena',
    pose: {
      tilt: 9,
      armL: { upper: 74, fore: -8, hand: 'fist', watch: true },
      armR: hangR,
      legL: standL,
      legR: standR,
      face: { eyes: 'half', brows: 'worried', mouth: 'flat', look: [0.3, 1] },
    },
  },
  {
    id: 'posloucha',
    motion: 'listen',
    name: 'Poslouchá',
    use: 'Hudební předplatné, Spotify skupiny',
    pose: {
      tilt: -7,
      phonesOn: true,
      armL: hangL,
      armR: { upper: -5, fore: -130, hand: 'flat', flip: true },
      legL: standL,
      legR: { thigh: 86, shin: 94, toe: -8 },
      face: { eyes: 'closed', brows: 'neutral', mouth: 'smile', blush: 1.3 },
    },
    extras: ['notes'],
  },
  {
    id: 'zve',
    motion: 'welcome',
    name: 'Zve do skupiny',
    use: 'Pozvánka — „pojď k nám, je tu volné místo“',
    pose: {
      tilt: 4,
      armL: { upper: 158, fore: -168, hand: 'open', flip: true },
      armR: { upper: 22, fore: -12, hand: 'open' },
      legL: standL,
      legR: standR,
      face: { eyes: 'open', brows: 'raised', mouth: 'grin', blush: 1.2 },
    },
    extras: ['hearts'],
  },
  {
    id: 'sedi',
    motion: 'sit',
    name: 'Sedí na předplatných',
    use: 'Úvod webu, první spuštění appky',
    seat: true,
    pose: {
      y: 22,
      tilt: -5,
      turn: -0.1,
      armL: { upper: 96, fore: 78, hand: 'relaxed' },
      armR: { upper: -30, fore: -84, hand: 'open' },
      legL: { thigh: 112, shin: 94, thighLen: 20, toe: 6 },
      legR: { thigh: 68, shin: 86, thighLen: 20, toe: -6 },
      face: { eyes: 'open', brows: 'raised', mouth: 'grin' },
    },
  },
]

export const REST_POSE = POSES.find((p) => p.id === 'stoji')!.pose
