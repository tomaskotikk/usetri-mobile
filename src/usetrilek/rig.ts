/**
 * Ušetřílek's skeleton. Poses are plain data — joint angles plus a face — so the
 * same library drives the website and, later, the Expo app. Nothing in here
 * touches React or the DOM.
 *
 * Angles are in degrees, SVG-style: 0 points right, 90 points down, -90 points up.
 * Arm and leg angles in a pose are absolute (not relative to the parent bone),
 * which keeps posing readable: "forearm at -80" is "forearm almost straight up"
 * wherever the upper arm is. `joints()` turns them into the relative turns a
 * puppet of nested layers needs. L and R are the viewer's left and right.
 */

export type Pt = { x: number; y: number }

export type HandShape = 'relaxed' | 'open' | 'fist' | 'point' | 'thumb' | 'hold' | 'flat'
export type Eyes = 'open' | 'happy' | 'closed' | 'wide' | 'wink' | 'half'
export type Brows = 'neutral' | 'raised' | 'worried' | 'focused' | 'skeptic'
export type Mouth = 'smile' | 'grin' | 'open' | 'o' | 'flat' | 'smirk' | 'tongue' | 'teeth' | 'wobbly'

export type Arm = {
  upper: number
  fore: number
  hand: HandShape
  /** Extra turn of the hand on top of the forearm's direction. */
  twist?: number
  /** Mirrors the hand across the forearm, i.e. which side the thumb is on. */
  flip?: boolean
  /** Draws the whole arm behind the torso instead of in front of it. */
  behind?: boolean
  /** A wristwatch on this arm. */
  watch?: boolean
}

export type Leg = {
  thigh: number
  shin: number
  /** Shorter thighs read as knees coming towards the viewer (sitting). */
  thighLen?: number
  /** Toe turn of the shoe, in degrees. */
  toe?: number
}

export type Face = {
  eyes: Eyes
  brows: Brows
  mouth: Mouth
  /** Where he looks, each axis -1..1. */
  look?: [number, number]
  blush?: number
}

export type PropKind = 'phone' | 'coin' | 'magnifier' | 'bag'

/** Something held in a hand: placed in the hand's own frame, drawn upright. */
export type HeldProp = { kind: PropKind; hand: 'L' | 'R'; dx: number; dy: number; rot?: number; scale?: number }

export type Pose = {
  /** Moves the whole figure; negative y lifts him off the ground. */
  x?: number
  y?: number
  /** Upper body lean about the pelvis. Positive is clockwise, to the viewer's right. */
  lean?: number
  /** Head tilt about the neck. */
  tilt?: number
  /** Fakes a three-quarter head turn, -1..1. */
  turn?: number
  armL: Arm
  armR: Arm
  legL: Leg
  legR: Leg
  face: Face
  held?: HeldProp
  /** Headphones on his ears instead of round his neck. */
  phonesOn?: boolean
}

export type Skeleton = {
  pelvis: Pt
  neck: Pt
  head: Pt
  shoulderL: Pt
  shoulderR: Pt
  elbowL: Pt
  elbowR: Pt
  wristL: Pt
  wristR: Pt
  hipL: Pt
  hipR: Pt
  kneeL: Pt
  kneeR: Pt
  ankleL: Pt
  ankleR: Pt
}

/** The drawing area. The figure stands in the middle, feet on GROUND; the margins are for reach. */
export const VIEW = { x: -40, y: 0, w: 380, h: 432 } as const

/** The rest pose. */
export const REST = {
  pelvis: { x: 150, y: 268 },
  neck: { x: 150, y: 152 },
  head: { x: 150, y: 103 },
  shoulderL: { x: 107, y: 181 },
  shoulderR: { x: 193, y: 181 },
  hipDX: 20,
  hipDY: 6,
} as const

export const LEN = { upper: 52, fore: 48, thigh: 56, shin: 54 } as const
/** Upper arm and forearm share a width (and the legs theirs), so a straight limb has no seam. */
export const WIDTH = { arm: 28, cuff: 30, leg: 38 } as const
export const GROUND = 414
/** The head is drawn a touch below the neck point, for a short, sturdy neck. */
export const HEAD_DROP = 7
/** Hands are drawn oversized — chunky hands are half the charm of clay figures. */
export const HAND_SCALE = 1.16

export const rad = (deg: number) => (deg * Math.PI) / 180

/** Wraps an angle into (-180, 180], so a turn always takes the short way round. */
export function norm(deg: number) {
  const d = ((((deg + 180) % 360) + 360) % 360) - 180
  return d === -180 ? 180 : d
}

export function polar(from: Pt, deg: number, len: number): Pt {
  return { x: from.x + Math.cos(rad(deg)) * len, y: from.y + Math.sin(rad(deg)) * len }
}

export function rotateAbout(p: Pt, centre: Pt, deg: number): Pt {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  const dx = p.x - centre.x
  const dy = p.y - centre.y
  return { x: centre.x + dx * c - dy * s, y: centre.y + dx * s + dy * c }
}

/** Where every joint ends up, in artboard units. Used to place things around him. */
export function solve(pose: Pose): Skeleton {
  const dx = pose.x ?? 0
  const dy = pose.y ?? 0
  const pelvis = { x: REST.pelvis.x + dx, y: REST.pelvis.y + dy }
  const lean = pose.lean ?? 0
  const upper = (p: Pt) => rotateAbout({ x: p.x + dx, y: p.y + dy }, pelvis, lean)

  const neck = upper(REST.neck)
  const head = rotateAbout(upper(REST.head), neck, pose.tilt ?? 0)
  const shoulderL = upper(REST.shoulderL)
  const shoulderR = upper(REST.shoulderR)
  const elbowL = polar(shoulderL, pose.armL.upper, LEN.upper)
  const elbowR = polar(shoulderR, pose.armR.upper, LEN.upper)
  const wristL = polar(elbowL, pose.armL.fore, LEN.fore)
  const wristR = polar(elbowR, pose.armR.fore, LEN.fore)

  const hipL = { x: pelvis.x - REST.hipDX, y: pelvis.y + REST.hipDY }
  const hipR = { x: pelvis.x + REST.hipDX, y: pelvis.y + REST.hipDY }
  const kneeL = polar(hipL, pose.legL.thigh, pose.legL.thighLen ?? LEN.thigh)
  const kneeR = polar(hipR, pose.legR.thigh, pose.legR.thighLen ?? LEN.thigh)
  const ankleL = polar(kneeL, pose.legL.shin, LEN.shin)
  const ankleR = polar(kneeR, pose.legR.shin, LEN.shin)

  return { pelvis, neck, head, shoulderL, shoulderR, elbowL, elbowR, wristL, wristR, hipL, hipR, kneeL, kneeR, ankleL, ankleR }
}

export type ArmTurns = { shoulder: number; elbow: number; wrist: number }
export type LegTurns = { hip: number; knee: number; toe: number; stretch: number }

/**
 * The pose as a puppet of nested layers sees it: each joint turns relative to its
 * parent. A limb layer is drawn pointing straight down, so a turn of 0 hangs it.
 */
export function joints(pose: Pose) {
  const lean = pose.lean ?? 0
  const arm = (a: Arm): ArmTurns => ({
    shoulder: norm(a.upper - 90 - lean),
    elbow: norm(a.fore - a.upper),
    wrist: norm(a.twist ?? 0),
  })
  const leg = (l: Leg): LegTurns => ({
    hip: norm(l.thigh - 90),
    knee: norm(l.shin - l.thigh),
    toe: l.toe ?? 0,
    stretch: (l.thighLen ?? LEN.thigh) / LEN.thigh,
  })
  return {
    x: pose.x ?? 0,
    y: pose.y ?? 0,
    lean,
    tilt: pose.tilt ?? 0,
    turn: pose.turn ?? 0,
    armL: arm(pose.armL),
    armR: arm(pose.armR),
    legL: leg(pose.legL),
    legR: leg(pose.legR),
  }
}

/**
 * Where a held prop sits and how it turns inside the hand's layer, so that it
 * ends up upright in the world whatever the arm is doing.
 */
export function heldPlacement(pose: Pose) {
  const held = pose.held
  if (!held) return null
  const arm = held.hand === 'L' ? pose.armL : pose.armR
  const dy = arm.flip ? -held.dy : held.dy
  return {
    // The hand art points along +x before it is turned to hang down the arm.
    x: -dy * HAND_SCALE,
    y: held.dx * HAND_SCALE,
    rot: norm((held.rot ?? 0) - (arm.fore + (arm.twist ?? 0) - 90)),
    scale: held.scale ?? 1,
  }
}
