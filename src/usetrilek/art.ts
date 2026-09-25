import { glyphShapes, type GlyphShape } from '../components/glyphShapes'
import { BLUSH, INK, MOUTH, TONE, TONGUE } from './palette'
import { HAND_SCALE, LEN, WIDTH, type Brows, type Eyes, type HandShape, type Mouth, type PropKind } from './rig'
import { capsule, circle, ellipse, group, line, mix, path, sparklePath, type Box, type Shape } from './shapes'

/**
 * Every piece of Ušetřílek, as shape lists. Each piece is drawn in the frame of
 * the layer that carries it: the torso and head in artboard units, a limb from
 * its joint downwards (so turning the layer turns the limb about the joint).
 */

// --- the wordmark ---------------------------------------------------------------

/**
 * "Ušetři." set in Bricolage Grotesque ExtraBold with the brand's -0.045em
 * tracking, outlined at 22 px on a baseline at y = 0. Outlines rather than text,
 * so the print on his hoodie looks the same everywhere, fonts loaded or not.
 */
const WORDMARK =
  'M7.59 0.31Q6.27 0.31 5.22 0.03Q4.18-0.24 3.42-0.77Q2.66-1.30 2.17-2.05Q1.67-2.79 1.43-3.73Q1.19-4.66 1.19-5.74L1.19-14.52L4.75-14.52L4.75-5.87Q4.75-4.80 5.08-4.13Q5.41-3.45 6.04-3.15Q6.67-2.84 7.57-2.84Q8.51-2.84 9.14-3.15Q9.77-3.45 10.10-4.13Q10.43-4.80 10.43-5.87L10.43-14.52L13.99-14.52L13.99-5.74Q13.99-2.88 12.40-1.29Q10.80 0.31 7.59 0.31Z' +
  'M20.17 0.31Q19.01 0.31 18.04 0.09Q17.07-0.13 16.36-0.57Q15.64-1.01 15.21-1.69Q14.78-2.38 14.72-3.28L17.56-4.07Q17.67-3.54 18.01-3.12Q18.35-2.71 18.94-2.47Q19.54-2.24 20.37-2.24Q21.16-2.24 21.66-2.49Q22.15-2.73 22.15-3.23Q22.15-3.56 21.92-3.76Q21.69-3.96 21.17-4.13Q20.66-4.29 19.80-4.47Q18.85-4.69 17.97-4.94Q17.09-5.19 16.40-5.60Q15.71-6.01 15.30-6.64Q14.89-7.28 14.89-8.23Q14.89-9.37 15.50-10.19Q16.10-11 17.24-11.46Q18.37-11.92 19.95-11.92Q21.34-11.92 22.47-11.53Q23.61-11.13 24.31-10.34Q25.01-9.55 25.12-8.32L22.20-7.63Q22.18-8.16 21.87-8.56Q21.56-8.95 21.06-9.16Q20.57-9.37 19.89-9.37Q19.07-9.37 18.63-9.10Q18.19-8.82 18.19-8.40Q18.19-8.05 18.48-7.82Q18.77-7.59 19.34-7.44Q19.91-7.28 20.75-7.08Q21.56-6.93 22.40-6.69Q23.23-6.45 23.92-6.05Q24.62-5.65 25.05-5.02Q25.48-4.38 25.48-3.39Q25.48-2.24 24.86-1.42Q24.24-0.59 23.07-0.14Q21.89 0.31 20.17 0.31Z' +
  'M16.26-14.32L16.26-16.85L19.89-15.20L23.50-16.85L23.50-14.32L19.89-12.67L16.26-14.32Z' +
  'M31.61 0.31Q30.10 0.31 28.96-0.11Q27.83-0.53 27.08-1.31Q26.33-2.09 25.96-3.18Q25.59-4.27 25.59-5.59Q25.59-6.91 25.95-8.06Q26.31-9.22 27.04-10.09Q27.76-10.96 28.86-11.44Q29.96-11.92 31.39-11.92Q32.82-11.92 33.89-11.44Q34.96-10.96 35.63-10.06Q36.30-9.17 36.57-7.93Q36.85-6.69 36.67-5.15L27.87-5.06L27.87-6.95L34.36-7.02L33.44-6.05Q33.59-7.13 33.35-7.82Q33.11-8.51 32.61-8.84Q32.12-9.17 31.42-9.17Q30.62-9.17 30.07-8.76Q29.52-8.34 29.26-7.57Q29.00-6.80 29.00-5.70Q29.00-3.89 29.70-3.08Q30.40-2.27 31.61-2.27Q32.19-2.27 32.56-2.42Q32.93-2.57 33.18-2.83Q33.42-3.08 33.54-3.41Q33.66-3.74 33.70-4.09L36.85-3.63Q36.78-2.86 36.46-2.16Q36.15-1.45 35.53-0.89Q34.91-0.33 33.96-0.01Q33 0.31 31.61 0.31Z' +
  'M42.15 0.29Q40.08 0.29 39.11-0.79Q38.13-1.87 38.13-4.18L38.13-8.84L36.63-8.84L36.67-11.40L37.38-11.40Q38.37-11.46 38.82-11.89Q39.27-12.32 39.38-13.24L39.56-14.23L41.58-14.23L41.58-11.62L44.33-11.62L44.33-8.73L41.58-8.73L41.58-4.40Q41.58-3.63 41.97-3.28Q42.35-2.93 43.03-2.93Q43.41-2.93 43.76-3.01Q44.11-3.10 44.37-3.26L44.37-0.04Q43.69 0.18 43.13 0.23Q42.57 0.29 42.15 0.29Z' +
  'M48.71 0L45.14 0L45.14-5.76L45.14-11.62L48.11-11.62L48.16-7.39L48.49-7.39Q48.64-9.06 49.05-10.04Q49.46-11.02 50.17-11.45Q50.89-11.88 51.88-11.88Q52.16-11.88 52.46-11.82Q52.76-11.77 53.11-11.64L52.95-7.79Q52.54-8.01 52.11-8.10Q51.68-8.18 51.33-8.18Q50.53-8.18 49.97-7.83Q49.41-7.48 49.09-6.76Q48.77-6.05 48.71-4.99L48.71 0Z' +
  'M45.10-14.32L45.10-16.85L48.71-15.20L52.34-16.85L52.34-14.32L48.71-12.67L45.10-14.32Z' +
  'M57.11 0L53.55 0L53.55-11.62L57.11-11.62L57.11 0Z' +
  'M55.33-12.91Q54.32-12.91 53.78-13.34Q53.24-13.77 53.24-14.59Q53.24-15.42 53.78-15.85Q54.32-16.28 55.33-16.28Q56.36-16.28 56.90-15.84Q57.44-15.40 57.44-14.59Q57.44-13.79 56.90-13.35Q56.36-12.91 55.33-12.91Z'
const WORDMARK_DOT = 'M59.97 0.29Q58.83 0.29 58.27-0.20Q57.71-0.68 57.71-1.69Q57.71-2.73 58.27-3.21Q58.83-3.70 59.97-3.70Q61.12-3.70 61.69-3.21Q62.26-2.73 62.26-1.69Q62.26 0.29 59.97 0.29Z'
/** Left and right ink edges of the wordmark at 22 px, for centring it. */
const WORDMARK_X = [1.19, 62.26] as const

/** The wordmark centred on x, sitting on `baseline`, in the brand's colours for a green ground. */
export function wordmark(x: number, baseline: number, scale: number, ink = '#ffffff', dot = TONE.navy.m): Shape[] {
  const left = x - ((WORDMARK_X[0] + WORDMARK_X[1]) / 2) * scale
  const at = (dx: number, dy: number) => `translate(${+(left + dx).toFixed(2)} ${baseline + dy}) scale(${scale})`
  return [
    // printed into the fabric: a faint shade below the ink
    group([path(WORDMARK, TONE.hood.dd), path(WORDMARK_DOT, TONE.hood.dd)], at(0.5, 0.9), 0.32),
    group([path(WORDMARK, ink), path(WORDMARK_DOT, dot)], at(0, 0)),
  ]
}

// --- torso -----------------------------------------------------------------------

const HOODIE =
  'M150 158 C176 158 197 163 203 182 C207 198 206 236 205 266 Q204 281 189 281 L111 281 Q96 281 95 266 C94 236 93 198 97 182 C103 163 124 158 150 158 Z'

export const TORSO_BOX: Box = [86, 144, 128, 142]
export function torso(): Shape[] {
  return [
    path(HOODIE, 'hood'),
    // the body turns away from the light towards the hem
    path('M95 226 L205 226 L205 266 Q204 281 189 281 L111 281 Q96 281 95 266 Z', 'hem'),
    // kangaroo pocket
    path('M119 238 Q150 234 181 238 L189 262 Q150 266 111 262 Z', TONE.hood.d, 0.55),
    line('M119 238 Q150 234 181 238', TONE.hood.hi, 2.2, 0.6),
    line('M119 239 Q113 251 111 262', TONE.hood.dd, 2, 0.5),
    line('M181 239 Q187 251 189 262', TONE.hood.dd, 2, 0.5),
    // ribbed waistband
    path('M96 265 Q150 270 204 265 L204 270 Q204 281 189 281 L111 281 Q96 281 96 270 Z', TONE.hood.d),
    ...[112, 124, 136, 148, 160, 172, 184].map((x) => line(`M${x + 2} 270 L${x + 2} 278`, TONE.hood.dd, 1.4, 0.35)),
    // the hood, lying round the back of the neck
    { k: 'path', d: 'M113 178 C115 152 185 152 187 178', fill: 'none', stroke: 'ball-hood', sw: 19, round: true },
  ]
}

/** The headphone band, behind the neck. */
export const BAND_BOX: Box = [120, 150, 60, 34]
export const band = (): Shape[] => [line('M129 178 C126 156 174 156 171 178', TONE.navy.d, 5)]

/** Neck, collar and the Ušetři print on his chest. */
export const CHEST_BOX: Box = [108, 124, 84, 110]
export function chest(): Shape[] {
  return [
    path('M134 132 L166 132 L166 170 Q150 178 134 170 Z', 'neck'),
    ellipse(150, 148, 21, 9, 'ao'),
    path('M127 165 Q150 186 173 165 Q178 173 169 180 Q150 194 131 180 Q122 173 127 165 Z', 'ball-hood'),
    ellipse(150, 172, 22, 5, 'ao', 0, 0.8),
    ...wordmark(150, 229, 1.1),
  ]
}

/** Hoodie drawstrings, hung from the collar so they can swing. */
export const STRINGS_PIVOT = { x: 150, y: 183 } as const
export const STRINGS_BOX: Box = [138, 180, 24, 30]
export function strings(): Shape[] {
  return [
    line('M145 183 C144 190 143.5 196 144 202', '#f3fffb', 3.2),
    line('M155 183 C156 190 156.5 197 156 203', '#f3fffb', 3.2),
    line('M144 202 L144.2 207', TONE.navy.m, 4),
    line('M156 203 L155.8 208', TONE.navy.m, 4),
  ]
}

/**
 * Over-ear headphones round his neck — he's the kind of guy who splits Spotify.
 * The cups are seen edge-on, leaning outwards; face-on discs read as a pair of eyes.
 */
export const CUPS_BOX: Box = [112, 170, 76, 38]
export function cups(): Shape[] {
  return (
    [
      [130, 188, 24, 1],
      [170, 188, -24, -1],
    ] as const
  ).map(([x, y, r, side]) =>
    group(
      [
        { k: 'rect', x: -7.5, y: -13, w: 15, h: 26, rx: 7.5, fill: 'ball-navy' },
        { k: 'rect', x: side * 3.5 - 3, y: -11, w: 6, h: 22, rx: 3, fill: TONE.navy.l },
        { k: 'rect', x: -side * 4.2 - 1.3, y: -6, w: 2.6, h: 12, rx: 1.3, fill: TONE.hood.m },
      ],
      `translate(${x} ${y}) rotate(${r})`,
    ),
  )
}

// --- head ------------------------------------------------------------------------

export const EYE_L = { x: 136, y: 99 } as const
export const EYE_R = { x: 164, y: 99 } as const
export const BROW_Y = 85
export const MOUTH_AT = { x: 150, y: 130 } as const

export const EARS_BOX: Box = [100, 88, 100, 30]
export function ears(): Shape[] {
  return [
    ellipse(111, 102, 8.5, 12.5, 'skin'),
    ellipse(112.5, 103, 4, 7, TONE.skin.d, 0, 0.55),
    ellipse(189, 102, 8.5, 12.5, 'skin'),
    ellipse(187.5, 103, 4, 7, TONE.skin.d, 0, 0.55),
  ]
}

export const SKULL_BOX: Box = [108, 48, 84, 99]
export const skull = (): Shape[] => [
  path('M150 50 C176 50 190 70 190 97 C190 125 173 145 150 145 C127 145 110 125 110 97 C110 70 124 50 150 50 Z', 'skin'),
]

export const BLUSH_BOX: Box = [114, 110, 72, 12]
/** Drawn at half strength; the layer's opacity turns it up or down with the mood. */
export const blush = (): Shape[] => [ellipse(124, 116, 7.5, 4.5, BLUSH, 0, 0.5), ellipse(176, 116, 7.5, 4.5, BLUSH, 0, 0.5)]

function eye(kind: Eyes, at: { x: number; y: number }): Shape[] {
  const { x, y } = at
  if (kind === 'happy') return [line(`M${x - 5.5} ${y + 2} Q${x} ${y - 5.5} ${x + 5.5} ${y + 2}`, INK, 3.1)]
  if (kind === 'closed') return [line(`M${x - 5.5} ${y - 0.5} Q${x} ${y + 4.5} ${x + 5.5} ${y - 0.5}`, INK, 3.1)]
  if (kind === 'half')
    return [path(`M${x - 4.6} ${y} A4.6 5.4 0 0 0 ${x + 4.6} ${y} Z`, INK), line(`M${x - 5.8} ${y - 0.4} L${x + 5.8} ${y - 0.4}`, INK, 2.6)]
  const big = kind === 'wide'
  return [ellipse(x, y, big ? 5.4 : 4.5, big ? 6.6 : 5.5, INK), circle(x - 1.5, y - 2.1, big ? 2 : 1.6, '#ffffff')]
}

export const EYES_BOX: Box = [126, 90, 48, 18]
export function eyes(kind: Eyes): Shape[] {
  return [...eye(kind === 'wink' ? 'open' : kind, EYE_L), ...eye(kind === 'wink' ? 'happy' : kind, EYE_R)]
}

/** One brow, around its own centre; the right one is the left one mirrored. */
export const BROW_BOX: Box = [-10, -8, 20, 14]
export const brow = (mirror: boolean): Shape[] => [
  group([line('M-6.5 1.5 Q0 -2.5 6.5 0.5', TONE.hair.m, 4.4)], mirror ? 'scale(-1 1)' : undefined),
]

/** How each brow sits, as a lift and a turn — so changing mood slides them, never swaps them. */
export function browPose(brows: Brows, side: 'L' | 'R') {
  const kind = brows === 'skeptic' ? (side === 'L' ? 'raised' : 'focused') : brows
  const turn = { neutral: 0, raised: 0, worried: -13, focused: 12 }[kind]
  const lift = { neutral: 0, raised: -4.5, worried: -1.5, focused: 1 }[kind]
  return { y: lift, r: side === 'L' ? turn : -turn }
}

export const NOSE_BOX: Box = [140, 104, 20, 20]
export const nose = (): Shape[] => [ellipse(150, 120.5, 7, 2.6, TONE.skin.dd, 0, 0.32), ellipse(150, 114, 7.8, 7, 'ball-skin')]

export const MOUTH_BOX: Box = [136, 122, 28, 24]
export function mouth(kind: Mouth): Shape[] {
  const { x, y } = MOUTH_AT
  const t = `translate(${x} ${y})`
  switch (kind) {
    case 'grin':
      return [
        group(
          [
            path('M-11.5 -3 Q0 -1 11.5 -3 Q10.5 12.5 0 13 Q-10.5 12.5 -11.5 -3 Z', MOUTH),
            path('M-10 -2.3 Q0 -0.6 10 -2.3 L9.2 1.8 Q0 3.2 -9.2 1.8 Z', '#ffffff'),
            path('M-6.5 10.5 Q0 4 6.5 10.5 Q0 13.4 -6.5 10.5 Z', TONGUE),
          ],
          t,
        ),
      ]
    case 'open':
      return [group([ellipse(0, 3, 6.5, 7.5, MOUTH), path('M-4.5 7.5 Q0 3.5 4.5 7.5 Q0 10.4 -4.5 7.5 Z', TONGUE)], t)]
    case 'o':
      return [ellipse(x, y + 2, 3.8, 4.6, MOUTH)]
    case 'flat':
      return [line(`M${x - 6} ${y + 1} L${x + 6} ${y + 1}`, MOUTH, 3.2)]
    case 'smirk':
      return [line(`M${x - 8} ${y + 1} Q${x + 2} ${y + 5.5} ${x + 9} ${y - 3}`, MOUTH, 3.2)]
    case 'wobbly':
      return [line(`M${x - 8} ${y + 1} Q${x - 4} ${y - 2.5} ${x} ${y + 1} Q${x + 4} ${y + 4.5} ${x + 8} ${y + 1}`, MOUTH, 3.2)]
    case 'teeth':
      return [
        group([path('M-10.5 -2 L10.5 -2 Q10.5 7 0 7 Q-10.5 7 -10.5 -2 Z', MOUTH), path('M-9.5 -1.4 L9.5 -1.4 L8.8 2 L-8.8 2 Z', '#ffffff')], t),
      ]
    case 'tongue':
      return [
        group(
          [
            ellipse(3.5, 5.5, 4.4, 5, TONGUE),
            line('M1.2 5 L2.4 9', '#e0584a', 1.3),
            line('M-9 -2 Q0 7 9 -2', MOUTH, 3.2),
          ],
          t,
        ),
      ]
    default:
      return [line(`M${x - 9} ${y - 2} Q${x} ${y + 7} ${x + 9} ${y - 2}`, MOUTH, 3.2)]
  }
}

/** Curls of clay: radius, then centre. Back row first. */
const CURLS_BACK = [
  [14, 125, 52],
  [15, 141, 43],
  [15, 159, 43],
  [14, 175, 52],
] as const
const CURLS_RING = [
  [13, 114, 80],
  [14, 121, 64],
  [15, 134, 53],
  [15, 150, 49],
  [15, 166, 53],
  [14, 179, 64],
  [13, 186, 80],
] as const
const CURLS_FRINGE = [
  [10.5, 125, 70],
  [11, 139, 64],
  [11.5, 154, 63],
  [11, 168, 66],
  [9.5, 180, 73],
] as const

export const HAIR_BOX: Box = [96, 24, 108, 72]
export function hair(): Shape[] {
  const curl = ([r, x, y]: readonly [number, number, number]) => circle(x, y, r, 'ball-hair')
  return [
    ...CURLS_BACK.map(curl),
    path('M111 90 C108 62 126 46 150 46 C174 46 192 62 189 90 C181 76 167 69 150 69 C133 69 119 76 111 90 Z', TONE.hair.d),
    ellipse(150, 78, 31, 8, 'ao'),
    ...CURLS_RING.map(curl),
    ...CURLS_FRINGE.map(curl),
  ]
}

export const PHONES_ON_BOX: Box = [94, 34, 112, 88]
export function phonesOn(): Shape[] {
  return [
    line('M109 98 C100 26 200 26 191 98', TONE.navy.d, 8),
    line('M112 70 C122 40 178 40 188 70', TONE.navy.hi, 2, 0.6),
    { k: 'rect', x: 98, y: 86, w: 20, h: 32, rx: 10, fill: 'ball-navy' },
    circle(108, 102, 4, TONE.hood.m),
    { k: 'rect', x: 182, y: 86, w: 20, h: 32, rx: 10, fill: 'ball-navy' },
    circle(192, 102, 4, TONE.hood.m),
  ]
}

// --- limbs -------------------------------------------------------------------------

/** Sleeves: from the shoulder (origin) down the upper arm. */
export const UPPER_ARM_BOX: Box = [-16, -16, 32, LEN.upper + 32]
export const upperArm = (): Shape[] => [capsule(0, 0, LEN.upper, WIDTH.arm, 'tube-hood')]

/** From the elbow (origin) down to just short of the wrist; the cuff covers the rest. */
export const FOREARM_BOX: Box = [-16, -16, 32, LEN.fore + 24]
export const forearm = (): Shape[] => [capsule(0, 0, LEN.fore - 8, WIDTH.arm, 'tube-hood')]

export const CUFF_BOX: Box = [-16, LEN.fore - 30, 32, 40]
export function cuff(): Shape[] {
  return [
    capsule(0, LEN.fore - 14, LEN.fore - 7, WIDTH.cuff, 'tube-cuff'),
    ...[-8, -3, 2, 7].map((x) => line(`M${x} ${LEN.fore - 22} L${x} ${LEN.fore - 1}`, TONE.hood.dd, 1.2, 0.22)),
  ]
}

export const THIGH_BOX: Box = [-20, -20, 40, LEN.thigh + 40]
export const thigh = (): Shape[] => [capsule(0, 0, LEN.thigh, WIDTH.leg, 'tube-pants')]

/** Stops short of the ankle so the shoe shows under the hem. */
export const SHIN_BOX: Box = [-20, -20, 40, LEN.shin + 24]
export const shin = (): Shape[] => [capsule(0, 0, LEN.shin - 16, WIDTH.leg, 'tube-pants')]

/** A white sneaker seen from the front, from the ankle (origin) down. */
export const SHOE_BOX: Box = [-28, -3, 56, 38]
export function shoe(): Shape[] {
  return [
    { k: 'rect', x: -27, y: 22, w: 54, h: 11, rx: 5.5, fill: 'ball-hood' },
    path('M-25 25 C-26 8 -15 -1 0 -1 C15 -1 26 8 25 25 Z', 'shoe'),
    { k: 'rect', x: -25.5, y: 21, w: 51, h: 4.5, rx: 2.25, fill: '#ffffff' },
    line('M-20 21.5 C-19 15 -10 12 0 12 C10 12 19 15 20 21.5', TONE.shoe.d, 1.6),
    line('M-22 16 Q-15 9 -7 13', TONE.hood.m, 3),
    line('M-6 4 L6 4 M-7 8 L7 8', TONE.navy.m, 2),
    ellipse(-9, 15, 6, 2.8, '#ffffff', 0, 0.9),
  ]
}

// --- hands -------------------------------------------------------------------------

/** Hands are drawn along +x (thumb towards -y) and turned to hang from the wrist. */
const handFrame = (flip: boolean) => `rotate(90) scale(${HAND_SCALE} ${flip ? -HAND_SCALE : HAND_SCALE})`

export const HAND_BOX: Box = [-32, -10, 64, 64]

function handArt(shape: HandShape, layer: 'back' | 'front', watch: boolean): Shape[] {
  const skin = 'ball-skin'
  const crease = (d: string): Shape => line(d, TONE.skin.d, 1.3, 0.55)

  if (shape === 'hold') {
    if (layer === 'back') return [ellipse(13, 0, 12, 12.5, skin), ...(watch ? watchArt() : [])]
    return [
      ...[-7.8, -2.6, 2.6, 7.8].map((y) => ellipse(21, y, 7.5, 3.4, skin)),
      ellipse(12, -11, 8.5, 4.6, skin, 10),
    ]
  }
  if (layer === 'front') return []

  let art: Shape[]
  switch (shape) {
    case 'open': {
      const fingers = [
        [-27, 12.5],
        [-9, 15],
        [9, 14.5],
        [27, 12],
      ] as const
      art = [
        ...fingers.map(([deg, len]) => {
          const r = (deg * Math.PI) / 180
          const d = 12 + len / 2 - 2
          return ellipse(14 + Math.cos(r) * d, Math.sin(r) * d, len / 2 + 2, 4.4, skin, deg)
        }),
        ellipse(7, -13, 8.5, 4.8, skin, -52),
        circle(14, 0, 12.5, skin),
        crease('M9 -3 Q14 2 12 8'),
      ]
      break
    }
    case 'fist':
    case 'point':
    case 'thumb': {
      const rows = shape === 'point' ? [-2.8, 2.8, 8.4] : [-8.4, -2.8, 2.8, 8.4]
      art = [
        { k: 'rect', x: 3, y: -12.5, w: 25, h: 25, rx: 11, fill: skin },
        ...(shape === 'point' ? [ellipse(31, -8, 12.5, 4.3, skin)] : []),
        ...rows.map((y) => ellipse(22, y, 7.5, 3.3, skin)),
        shape === 'thumb' ? ellipse(12, -17, 4.8, 10, skin) : ellipse(13, -11, 9, 4.8, skin, 8),
      ]
      break
    }
    case 'flat':
      art = [
        ellipse(9, -10, 7.5, 4.2, skin, -35),
        ellipse(17, 0, 16.5, 10.5, skin),
        crease('M24 -4 L31 -3 M24 1 L31.5 1.5 M24 5.5 L30 6'),
      ]
      break
    default:
      art = [
        { k: 'rect', x: 3, y: -12, w: 23, h: 24, rx: 11, fill: skin },
        ...[-7.8, -2.6, 2.6, 7.8].map((y, i) => ({
          ...ellipse(24.5 - Math.abs(i - 1.5) * 1.2, y + 1, 8, 3.3, skin),
          tf: `rotate(${8 + i * 3} 24 ${y})`,
        })),
        ellipse(13, -10.5, 9, 4.8, skin, 24),
      ]
  }
  return watch ? [...art, ...watchArt()] : art
}

function watchArt(): Shape[] {
  return [
    { k: 'rect', x: 1, y: -12.5, w: 8, h: 25, rx: 3, fill: TONE.navy.m },
    { k: 'circle', cx: 5, cy: -9, r: 7.5, fill: '#ffffff', stroke: TONE.navy.m, sw: 2.6 },
    line('M5 -9 L5 -13 M5 -9 L8 -8', TONE.navy.m, 1.4),
    circle(5, -9, 1.2, TONE.hood.m),
  ]
}

/** A hand in its layer's frame: the wrist at the origin, the fingers hanging down. */
export function hand(shape: HandShape, layer: 'back' | 'front', flip = false, watch = false): Shape[] {
  const art = handArt(shape, layer, watch)
  return art.length ? [group(art, handFrame(flip))] : []
}

// --- props -------------------------------------------------------------------------

/** "https://usetri.app" — a real code, so the one in his hand actually scans. */
const QR_ROWS = [
  '1111111011000010101111111', '1000001000000010001000001', '1011101010011100101011101', '1011101011010001101011101',
  '1011101011110111101011101', '1000001001001010001000001', '1111111010101010101111111', '0000000001010110000000000',
  '1111001010000110110011101', '1001010011000000110100010', '0101111000000010010110000', '0011110110011111011001100',
  '1101101111010000011110111', '0100100110110101011110001', '0111001101001010010010110', '1000010101101101011110001',
  '0001101110010001111111111', '0000000011101100100010101', '1111111001011000101010111', '1000001001101001100010011',
  '1011101001111100111111000', '1011101011001111111011111', '1011101010111100001010110', '1000001010000001010010100',
  '1111111010001010001111111',
]
const QR_PATH = QR_ROWS.flatMap((row, y) => [...row].map((bit, x) => (bit === '1' ? `M${x} ${y}h1v1h-1z` : ''))).join('')

export const qr = (x: number, y: number, size: number, colour = '#0b1730'): Shape => ({
  k: 'path',
  d: QR_PATH,
  fill: colour,
  tf: `translate(${x} ${y}) scale(${size / 25})`,
})

function phone(): Shape[] {
  return [
    { k: 'rect', x: -20, y: -36, w: 40, h: 72, rx: 9, fill: 'navy' },
    { k: 'rect', x: -17, y: -32, w: 34, h: 64, rx: 6, fill: '#ffffff' },
    { k: 'rect', x: -6, y: -30, w: 12, h: 3.2, rx: 1.6, fill: TONE.navy.m },
    { k: 'rect', x: -13, y: -24, w: 18, h: 3.2, rx: 1.6, fill: '#c9d2e0' },
    qr(-12, -17, 24),
    { k: 'rect', x: -13, y: 11, w: 26, h: 3, rx: 1.5, fill: '#c9d2e0' },
    { k: 'rect', x: -13, y: 18, w: 26, h: 8, rx: 4, fill: TONE.hood.m },
    path('M-15 -30 L-4 -30 L-15 -12 Z', '#ffffff', 0.2),
  ]
}

export function coin(r = 24): Shape[] {
  const text = (dx: number, fill: string, op?: number): Shape => ({
    k: 'text',
    x: dx,
    y: r * 0.27 + dx,
    text: 'Kč',
    size: r * 0.72,
    weight: 800,
    anchor: 'middle',
    fill,
    op,
  })
  return [
    circle(2.5, 3.5, r, TONE.gold.dd),
    circle(0, 0, r, 'ball-gold'),
    { k: 'circle', cx: 0, cy: 0, r: r * 0.72, fill: 'none', stroke: TONE.gold.d, sw: 2, op: 0.6 },
    text(0.8, '#fff6cf', 0.7),
    text(0, TONE.gold.dd),
    ellipse(-r * 0.42, -r * 0.5, r * 0.22, r * 0.12, '#ffffff', -35, 0.7),
  ]
}

function magnifier(): Shape[] {
  return [
    { k: 'rect', x: -5, y: -2, w: 10, h: 34, rx: 5, fill: 'navy' },
    circle(0, -26, 21, 'ball-gold'),
    circle(0, -26, 15, '#eafcff'),
    circle(0, -26, 15, 'glass'),
    line('M-9 -32 Q-6 -38 1 -39', '#ffffff', 3.4, 0.9),
  ]
}

/** The money sack the old mascot carried — kept, in clay. */
function bag(): Shape[] {
  return [
    path('M-9 -28 C-5 -33 5 -33 9 -28 L12 -16 L-12 -16 Z', 'paper'),
    path('M-7 -15 C-15 -6 -26 2 -25 12 C-24 22 -14 28 0 28 C14 28 24 22 25 12 C26 2 15 -6 7 -15 Z', 'ball-paper'),
    { k: 'rect', x: -14, y: -19, w: 28, h: 7, rx: 3.5, fill: TONE.navy.m },
    { k: 'text', x: 0, y: 16, text: 'Kč', size: 16, weight: 800, anchor: 'middle', fill: TONE.hood.d },
  ]
}

export const PROP_BOX: Record<PropKind, Box> = {
  phone: [-22, -38, 44, 76],
  coin: [-26, -26, 55, 55],
  magnifier: [-24, -49, 48, 83],
  bag: [-28, -35, 56, 65],
}

/** The point a prop swings about when it moves on its own: a sack from its neck, a lens from its handle. */
export const PROP_PIVOT: Record<PropKind, { x: number; y: number }> = {
  phone: { x: 0, y: 0 },
  coin: { x: 0, y: 0 },
  magnifier: { x: 0, y: 30 },
  bag: { x: 0, y: -24 },
}

export function prop(kind: PropKind): Shape[] {
  if (kind === 'phone') return phone()
  if (kind === 'coin') return coin()
  if (kind === 'magnifier') return magnifier()
  return bag()
}

// --- scenery ------------------------------------------------------------------------

function glyph(shapes: readonly GlyphShape[], fg: string, ko: string): Shape[] {
  return shapes.map((s) => {
    const paint = s.ko ? ko : fg
    const stroked = 's' in s && s.s
    const look = stroked ? { fill: 'none', stroke: paint, sw: s.s, round: true, op: s.o } : { fill: paint, op: s.o }
    if (s.k === 'p') return { k: 'path', d: s.d, ...look }
    if (s.k === 'c') return { k: 'circle', cx: s.cx, cy: s.cy, r: s.r, ...look }
    return { k: 'rect', x: s.x, y: s.y, w: s.w, h: s.h, rx: s.rx, ...look }
  })
}

/**
 * One subscription as a chunky block of clay: the service colour on the front, a
 * lighter lid, the mark pressed into the face. Centred on (0, 0).
 */
export function block(size: number, color: string, slug?: string): Shape[] {
  const s = size
  const d = s * 0.2
  const r = s * 0.27
  const g = s * 0.5
  const marks = slug ? glyphShapes[slug] : undefined
  return [
    { k: 'rect', x: -s / 2, y: -s / 2 - d, w: s, h: s + d, rx: r, fill: mix(color, '#ffffff', 0.42) },
    {
      k: 'rect',
      x: -s / 2,
      y: -s / 2,
      w: s,
      h: s,
      rx: r,
      fill: {
        type: 'linear',
        x1: 0,
        y1: 0,
        x2: 0.35,
        y2: 1,
        stops: [
          [0, mix(color, '#ffffff', 0.18)],
          [0.6, color],
          [1, mix(color, '#000000', 0.28)],
        ],
      },
    },
    line(`M${-s / 2 + r} ${-s / 2 + 1.5} L${s / 2 - r} ${-s / 2 + 1.5}`, '#ffffff', 2, 0.35),
    ...(marks ? [group(glyph(marks, '#ffffff', color), `translate(${-g / 2} ${-g / 2}) scale(${g / 24})`)] : []),
  ]
}

export const blockBox = (size: number): Box => [-size / 2 - 2, -size * 0.7 - 2, size + 4, size * 1.2 + 4]

export const sparkle = (r: number, colour: string): Shape[] => [path(sparklePath(0, 0, r), colour)]

export const heart = (colour = '#ff6b7d'): Shape[] => [
  path('M0 4 C-7 -2 -9 -8 -4.5 -10 C-2 -11 0 -9 0 -7 C0 -9 2 -11 4.5 -10 C9 -8 7 -2 0 4 Z', colour),
]

export const note = (colour: string): Shape[] => [
  ellipse(0, 0, 6, 4.6, colour, -22),
  { k: 'rect', x: 3.6, y: -20, w: 2.6, h: 20, rx: 1.3, fill: colour },
  path('M6.2 -20 Q14 -16 12 -8 Q11 -13 6.2 -14 Z', colour),
]

/** A thought cloud with two subscriptions in it, and a question. Centred on (0, 0). */
export function thought(): Shape[] {
  const puffs = [
    [-26, 4, 20],
    [-6, -10, 24],
    [18, -6, 22],
    [30, 10, 17],
    [4, 14, 20],
    [-18, 16, 16],
  ] as const
  return [
    circle(-46, 52, 5, 'ball-paper'),
    circle(-34, 36, 8, 'ball-paper'),
    ...puffs.map(([x, y, r]) => circle(x, y, r, 'ball-paper')),
    group(block(22, '#e50914', 'netflix-premium'), 'translate(-14 3) rotate(-8)'),
    group(block(22, '#1db954', 'spotify-family'), 'translate(13 1) rotate(7)'),
    { k: 'text', x: 34, y: -12, text: '?', size: 22, weight: 900, anchor: 'middle', fill: TONE.navy.m },
  ]
}
export const THOUGHT_BOX: Box = [-54, -38, 108, 98]
