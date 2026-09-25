import * as art from './art'
import { idle, MOTIONS, startsAtRest, type Frame, type Target, type Track } from './motion'
import { heldPlacement, joints, type Pose } from './rig'

/*
 * What the website does with CSS transitions and Web Animations, the app does in
 * one worklet per frame on the UI thread: every joint glides to its new angle on a
 * spring, every looping layer plays its sampled curve, and old loops fade out along
 * their own path when the pose changes. The JS side only sends a command when the
 * pose changes; nothing crosses the bridge while he moves.
 */

// --- pose channels ---------------------------------------------------------------------

/** Spring shapes: loose for arms (~8 % overshoot), plain for the head, firm for legs and body, ease for fades. */
const LOOSE = 0
const PLAIN = 1
const FIRM = 2
const EASE = 3

/** Every value a pose sets, with the transition it glides on: [ms, delay ms, spring]. */
const CHANNELS = {
  bx: [800, 0, FIRM],
  by: [800, 0, FIRM],
  lean: [800, 20, FIRM],
  tilt: [900, 60, PLAIN],
  turn: [600, 0, FIRM],
  lookX: [600, 40, FIRM],
  lookY: [600, 40, FIRM],
  aLs: [860, 0, LOOSE],
  aLe: [860, 50, LOOSE],
  aLw: [860, 100, LOOSE],
  aRs: [860, 0, LOOSE],
  aRe: [860, 50, LOOSE],
  aRw: [860, 100, LOOSE],
  hLx: [860, 100, LOOSE],
  hLy: [860, 100, LOOSE],
  hLr: [860, 100, LOOSE],
  hLs: [860, 100, LOOSE],
  hRx: [860, 100, LOOSE],
  hRy: [860, 100, LOOSE],
  hRr: [860, 100, LOOSE],
  hRs: [860, 100, LOOSE],
  lLh: [760, 0, FIRM],
  lLk: [760, 40, FIRM],
  lLt: [760, 70, FIRM],
  lLs: [760, 0, FIRM],
  lRh: [760, 0, FIRM],
  lRk: [760, 40, FIRM],
  lRt: [760, 70, FIRM],
  lRs: [760, 0, FIRM],
  bLy: [620, 60, PLAIN],
  bLr: [620, 60, PLAIN],
  bRy: [620, 60, PLAIN],
  bRr: [620, 60, PLAIN],
  blush: [400, 0, EASE],
  phones: [300, 150, EASE],
  shadow: [800, 0, FIRM],
} as const

export type Chan = keyof typeof CHANNELS
export type Targets = Record<Chan, number>

/** The numbers a pose resolves to. */
export function poseTargets(pose: Pose, seat: boolean, shadow: boolean): Targets {
  const j = joints(pose)
  const held = heldPlacement(pose)
  const holds = (side: 'L' | 'R') => (held && pose.held?.hand === side ? held : null)
  const hL = holds('L')
  const hR = holds('R')
  const bL = art.browPose(pose.face.brows, 'L')
  const bR = art.browPose(pose.face.brows, 'R')
  const look = pose.face.look ?? [0, 0]
  return {
    bx: j.x,
    by: j.y,
    lean: j.lean,
    tilt: j.tilt,
    turn: j.turn,
    lookX: look[0],
    lookY: look[1],
    aLs: j.armL.shoulder,
    aLe: j.armL.elbow,
    aLw: j.armL.wrist,
    aRs: j.armR.shoulder,
    aRe: j.armR.elbow,
    aRw: j.armR.wrist,
    hLx: hL?.x ?? 0,
    hLy: hL?.y ?? 0,
    hLr: hL?.rot ?? 0,
    hLs: hL?.scale ?? 1,
    hRx: hR?.x ?? 0,
    hRy: hR?.y ?? 0,
    hRr: hR?.rot ?? 0,
    hRs: hR?.scale ?? 1,
    lLh: j.legL.hip,
    lLk: j.legL.knee,
    lLt: j.legL.toe,
    lLs: j.legL.stretch,
    lRh: j.legR.hip,
    lRk: j.legR.knee,
    lRt: j.legR.toe,
    lRs: j.legR.stretch,
    bLy: bL.y,
    bLr: bL.r,
    bRy: bR.y,
    bRr: bR.r,
    blush: Math.min(1, (pose.face.blush ?? 1) * 0.68),
    phones: pose.phonesOn ? 1 : 0,
    shadow: shadow && !seat ? 1 : 0,
  }
}

// --- loops -------------------------------------------------------------------------------

/** One cycle of a track, sampled evenly: r, x, y, sx, sy per sample. */
export type Loop = { d: number[]; n: number; dur: number; intro: boolean }

function keyedAt(keys: readonly { t: number; f: Frame }[], p: number): Frame {
  let i = 0
  while (i < keys.length - 2 && keys[i + 1].t <= p) i++
  const a = keys[i]
  const b = keys[i + 1] ?? a
  const s = b.t > a.t ? Math.min(1, Math.max(0, (p - a.t) / (b.t - a.t))) : 0
  const lerp = (u: number | undefined, v: number | undefined, rest: number) => (u ?? rest) + ((v ?? rest) - (u ?? rest)) * s
  return { r: lerp(a.f.r, b.f.r, 0), x: lerp(a.f.x, b.f.x, 0), y: lerp(a.f.y, b.f.y, 0), sx: lerp(a.f.sx, b.f.sx, 1), sy: lerp(a.f.sy, b.f.sy, 1) }
}

function sampleTrack(track: Track): Loop {
  const n = Math.max(24, Math.ceil(track.dur * 60))
  const at = 'fn' in track ? track.fn : (p: number) => keyedAt(track.keys, p)
  const d: number[] = []
  for (let i = 0; i <= n; i++) {
    const f = at(i / n)
    d.push(f.r ?? 0, f.x ?? 0, f.y ?? 0, f.sx ?? 1, f.sy ?? 1)
  }
  // A curve that starts mid-swing fades in over its first cycle, or it would jerk.
  return { d, n, dur: track.dur * 1000, intro: 'fn' in track && !startsAtRest(track.fn) }
}

/** The loops a pose plays: its own motion plus being alive underneath. */
export function poseLoops(pose: Pose, motion: string): Partial<Record<Target, Loop>> {
  const own = MOTIONS[motion] ?? []
  const out: Partial<Record<Target, Loop>> = {}
  for (const track of [...own, ...idle(pose, own)]) out[track.target] = sampleTrack(track)
  return out
}

// --- the frame -------------------------------------------------------------------------------

type ChanState = { from: number; to: number; t0: number; dur: number; delay: number; sp: number }
type Running = Loop & { start: number; rel?: number }

export type Command = {
  seq: number
  targets: Targets
  loops: Partial<Record<Target, Loop>>
  first: boolean
  eyes: boolean
  mouth: boolean
}

export type EngineState = {
  seq: number
  chans: Record<string, ChanState>
  cur: Record<string, Running>
  prev: Record<string, Running>
  poseAt: number
  eyesAt: number
  mouthAt: number
}

export type Out = {
  /** Seconds on the figure's clock, for the drifting extras. */
  t: number
  c: Record<string, number>
  /** Per looping layer: r, x, y, sx, sy. */
  L: Record<string, number[]>
  /** Anticipation squash on a pose change: dy, sx, sy. */
  squash: number[]
  blink: number
  mouth: number
  /** How far the extras (confetti, notes…) have faded in after a pose change. */
  extras: number
}

/** New loops start while the pose is still settling, so there is never a dead stop. */
const LOOP_DELAY = 380
/** How long an old loop takes to fade out once the pose changes. */
const RELEASE_MS = 360

export function staticState(targets: Targets): EngineState {
  const chans: Record<string, ChanState> = {}
  for (const key of Object.keys(CHANNELS) as Chan[]) {
    const [dur, delay, sp] = CHANNELS[key]
    chans[key] = { from: targets[key], to: targets[key], t0: 0, dur, delay, sp }
  }
  return { seq: 0, chans, cur: {}, prev: {}, poseAt: -1e9, eyesAt: -1e9, mouthAt: -1e9 }
}

function smooth(t: number) {
  'worklet'
  return t * t * (3 - 2 * t)
}

/** A damped spring from 0 to 1 over p in [0, 1], nudged to land exactly on 1. */
function spring(sp: number, p: number) {
  'worklet'
  if (sp === EASE) return smooth(p)
  const zeta = sp === LOOSE ? 0.63 : sp === PLAIN ? 0.72 : 0.83
  const w = sp === LOOSE ? 8.5 : sp === PLAIN ? 7.6 : 6.8
  const wd = w * Math.sqrt(1 - zeta * zeta)
  const at = (q: number) => 1 - Math.exp(-zeta * w * q) * (Math.cos(wd * q) + ((zeta * w) / wd) * Math.sin(wd * q))
  return at(p) + (1 - at(1)) * p
}

function chanValue(c: ChanState, now: number) {
  'worklet'
  const p = (now - c.t0 - c.delay) / c.dur
  if (p <= 0) return c.from
  if (p >= 1) return c.to
  return c.from + (c.to - c.from) * spring(c.sp, p)
}

/** Piecewise-linear keyframes. */
function keys(ts: readonly number[], vs: readonly number[], p: number) {
  'worklet'
  if (p <= ts[0]) return vs[0]
  for (let i = 1; i < ts.length; i++) {
    if (p <= ts[i]) return vs[i - 1] + ((vs[i] - vs[i - 1]) * (p - ts[i - 1])) / (ts[i] - ts[i - 1])
  }
  return vs[vs.length - 1]
}

/** Adds a running loop's frame at `now`, scaled by its fade, into acc. */
function addLoop(acc: number[], l: Running, now: number) {
  'worklet'
  const elapsed = now - l.start
  if (elapsed < 0) return
  const cycles = elapsed / l.dur
  let gain = l.intro ? smooth(Math.min(1, cycles)) : 1
  if (l.rel !== undefined) {
    const out = (now - l.rel) / RELEASE_MS
    if (out >= 1) return
    gain *= 1 - smooth(out)
  }
  const phase = (cycles - Math.floor(cycles)) * l.n
  const i = Math.min(l.n - 1, Math.floor(phase))
  const s = phase - i
  for (let ch = 0; ch < 5; ch++) {
    const a = l.d[i * 5 + ch]
    const b = l.d[(i + 1) * 5 + ch]
    const v = a + (b - a) * s
    acc[ch] += (ch < 3 ? v : v - 1) * gain
  }
}

export function applyCommand(s: EngineState, cmd: Command, now: number): EngineState {
  'worklet'
  const chans: Record<string, ChanState> = {}
  for (const key of Object.keys(s.chans)) {
    const c = s.chans[key]
    chans[key] = { ...c, from: chanValue(c, now), to: (cmd.targets as Record<string, number>)[key], t0: now }
  }
  // Every loop still playing lets go; the new ones start after a beat.
  const prev: Record<string, Running> = {}
  for (const key of Object.keys(s.cur)) prev[key] = { ...s.cur[key], rel: now }
  const cur: Record<string, Running> = {}
  const start = now + (cmd.first ? 0 : LOOP_DELAY)
  for (const key of Object.keys(cmd.loops)) {
    const l = (cmd.loops as Record<string, Loop>)[key]
    cur[key] = { ...l, start }
  }
  return {
    seq: cmd.seq,
    chans,
    cur,
    prev,
    poseAt: cmd.first ? s.poseAt : now,
    eyesAt: cmd.eyes ? now : s.eyesAt,
    mouthAt: cmd.mouth ? now : s.mouthAt,
  }
}

const TARGETS: Target[] = [
  'bodyIdle', 'body', 'upperIdle', 'upper', 'headIdle', 'head', 'hair', 'strings', 'eyes', 'blink', 'shadow', 'held',
  'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'thighL', 'shinL', 'thighR', 'shinR',
]

export function evaluate(s: EngineState, now: number): Out {
  'worklet'
  const c: Record<string, number> = {}
  for (const key of Object.keys(s.chans)) c[key] = chanValue(s.chans[key], now)

  const L: Record<string, number[]> = {}
  for (const t of TARGETS) {
    const acc = [0, 0, 0, 0, 0]
    const a = s.prev[t]
    const b = s.cur[t]
    if (a) addLoop(acc, a, now)
    if (b) addLoop(acc, b, now)
    L[t] = [acc[0], acc[1], acc[2], 1 + acc[3], 1 + acc[4]]
  }

  // Anticipation and settle: a small squash as he gathers himself for the new pose.
  const q = (now - s.poseAt) / 640
  const squash =
    q >= 0 && q < 1
      ? [
          keys([0, 0.22, 0.55, 0.8, 1], [0, 2.2, -2.6, 0.4, 0], q),
          keys([0, 0.22, 0.55, 0.8, 1], [1, 1.025, 0.99, 1.004, 1], q),
          keys([0, 0.22, 0.55, 0.8, 1], [1, 0.97, 1.02, 0.997, 1], q),
        ]
      : [0, 1, 1]

  // New eyes arrive behind a blink; a new mouth pops in with a little bounce.
  const e = (now - s.eyesAt) / 230
  const blink = e >= 0 && e < 1 ? keys([0, 0.45, 1], [1, 0.08, 1], e) : 1
  const m = (now - s.mouthAt - 90) / 300
  const mouth = m >= 0 && m < 1 ? keys([0, 0.35, 0.7, 1], [1, 0.82, 1.08, 1], m) : 1

  // Extras arrive once the new pose has settled.
  const x = (now - s.poseAt - 420) / 300
  const extras = x >= 1 ? 1 : x <= 0 ? 0 : smooth(x)

  return { t: now / 1000, c, L, squash, blink, mouth, extras }
}

// --- 2D matrices ---------------------------------------------------------------------------------

/*
 * The figure is one <Svg>, and every moving part a <G> whose matrix is built here:
 * [a, b, c, d, e, f] as in SVG's matrix(), mapping the part's coordinates into its
 * parent's. No native view per joint, nothing for React Native to flatten or recycle.
 */
export type Mat = number[]

export function mul(m: Mat, n: Mat): Mat {
  'worklet'
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

/** Translate by (tx, ty), then turn by `deg` and scale by (sx, sy) about the local point (ox, oy). */
export function about(ox: number, oy: number, deg: number, sx = 1, sy = 1, tx = 0, ty = 0): Mat {
  'worklet'
  const r = (deg * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const a = cos * sx
  const b = sin * sx
  const c = -sin * sy
  const d = cos * sy
  return [a, b, c, d, ox + tx - (a * ox + c * oy), oy + ty - (b * ox + d * oy)]
}

/** A joint at (x, y), turned by `deg`. */
export function joint(x: number, y: number, deg: number): Mat {
  'worklet'
  return about(0, 0, deg, 1, 1, x, y)
}

/** A looping layer's frame as a matrix about its origin. */
export function loopMat(f: number[], ox = 0, oy = 0): Mat {
  'worklet'
  return about(ox, oy, f[0], f[3], f[4], f[1], f[2])
}
