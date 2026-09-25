/**
 * How Ušetřílek moves, as data. A motion is a set of tracks; a track loops one
 * layer of the puppet (a joint, the body, the hair…) through a smooth periodic
 * curve. Curves are written the way an animator thinks — sines with phase lags
 * for follow-through, splines through keys for acted beats — and then sampled
 * densely, so any renderer can play them as plain keyframes: the web on the
 * compositor, the app on the UI thread.
 *
 * Units: rotations in degrees, translations in artboard units, scales as factors.
 */

import type { Pose } from './rig'

export type Target =
  | 'bodyIdle'
  | 'body'
  | 'upperIdle'
  | 'upper'
  | 'headIdle'
  | 'head'
  | 'hair'
  | 'strings'
  | 'eyes'
  | 'blink'
  | 'shadow'
  | 'held'
  | 'armL'
  | 'foreL'
  | 'handL'
  | 'armR'
  | 'foreR'
  | 'handR'
  | 'thighL'
  | 'shinL'
  | 'thighR'
  | 'shinR'

export type Frame = { r?: number; x?: number; y?: number; sx?: number; sy?: number }

export type Track =
  | { target: Target; dur: number; fn: (t: number) => Frame }
  /** Explicit keyframes, played as written — for things that snap, like a blink. */
  | { target: Target; dur: number; keys: readonly { t: number; f: Frame; ease?: string }[] }

export type Motion = readonly Track[]

// --- curve helpers ------------------------------------------------------------------

const TAU = Math.PI * 2

/** A sine over one cycle, lagging by `lag` of a cycle. */
export const sin = (t: number, lag = 0) => Math.sin(TAU * (t - lag))

/** 0 → 1 → 0 over one cycle, at rest at both ends. */
export const swell = (t: number, lag = 0) => 0.5 - 0.5 * Math.cos(TAU * (t - lag))

const wrap = (t: number) => ((t % 1) + 1) % 1

/**
 * A smooth loop through keys [t, value], t in [0, 1): a periodic monotone cubic
 * (Fritsch–Carlson), so a held value stays held and nothing overshoots a key the
 * animator didn't ask for. Overshoot, where wanted, is written in as its own key.
 */
export function spline(keys: readonly (readonly [number, number])[]) {
  const n = keys.length
  const ts = keys.map((k) => k[0])
  const vs = keys.map((k) => k[1])
  const at = (i: number) => {
    const j = ((i % n) + n) % n
    return { t: ts[j] + Math.floor(i / n), v: vs[j] }
  }
  const slope = (i: number) => {
    const a = at(i)
    const b = at(i + 1)
    return (b.v - a.v) / (b.t - a.t)
  }
  const tangents = ts.map((_, i) => {
    const s0 = slope(i - 1)
    const s1 = slope(i)
    // A turning point or a hold: stop there, don't sail past it.
    if (s0 * s1 <= 0) return 0
    // Otherwise the weighted harmonic mean of the neighbouring slopes.
    const h0 = at(i).t - at(i - 1).t
    const h1 = at(i + 1).t - at(i).t
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / s0 + (h1 + 2 * h0) / s1)
  })
  return (t: number) => {
    const x = wrap(t)
    let i = n - 1
    for (let k = 0; k < n; k++) if (ts[k] <= x) i = k
    const a = at(i)
    const b = at(i + 1)
    const h = b.t - a.t
    const s = (x - a.t) / h
    const s2 = s * s
    const s3 = s2 * s
    return (
      (2 * s3 - 3 * s2 + 1) * a.v +
      (s3 - 2 * s2 + s) * h * tangents[i] +
      (-2 * s3 + 3 * s2) * b.v +
      (s3 - s2) * h * tangents[(i + 1) % n]
    )
  }
}

type Keys = readonly (readonly [number, number])[]

/** The same keyed curve on several channels at once. */
function keyed(channels: Partial<Record<keyof Frame, Keys>>, lag = 0) {
  const curves = Object.entries(channels).map(([k, keys]) => [k as keyof Frame, spline(keys!)] as const)
  return (t: number): Frame => Object.fromEntries(curves.map(([k, c]) => [k, c(t - lag)]))
}

// --- sampling -------------------------------------------------------------------------

export type Sample = { offset: number; frame: Frame; ease?: string }

const smooth = (t: number) => t * t * (3 - 2 * t)

function scaleFrame(f: Frame, k: number): Frame {
  return {
    r: (f.r ?? 0) * k,
    x: (f.x ?? 0) * k,
    y: (f.y ?? 0) * k,
    sx: 1 + ((f.sx ?? 1) - 1) * k,
    sy: 1 + ((f.sy ?? 1) - 1) * k,
  }
}

/** Enough keyframes that straight lines between them read as a curve. */
const samplesFor = (dur: number) => Math.max(24, Math.ceil(dur * 40))

/** One cycle of a track, as keyframes. */
export function sampleLoop(track: Track): Sample[] {
  if ('keys' in track) return track.keys.map((k) => ({ offset: k.t, frame: k.f, ease: k.ease }))
  const n = samplesFor(track.dur)
  return Array.from({ length: n + 1 }, (_, i) => ({ offset: i / n, frame: scaleFrame(track.fn(i / n), 1) }))
}

/**
 * Whether a curve already starts still and in place — a keyed jump does, a sine
 * doesn't. Those that do can loop from the first frame at full size.
 */
export function startsAtRest(fn: (t: number) => Frame) {
  const e = 0.002
  const a = scaleFrame(fn(0), 1)
  const b = scaleFrame(fn(e), 1)
  const off = Math.abs(a.r!) + Math.abs(a.x!) + Math.abs(a.y!) + Math.abs(a.sx! - 1) * 40 + Math.abs(a.sy! - 1) * 40
  const speed = (Math.abs(b.r! - a.r!) + Math.abs(b.x! - a.x!) + Math.abs(b.y! - a.y!) + (Math.abs(b.sx! - a.sx!) + Math.abs(b.sy! - a.sy!)) * 40) / e
  return off < 0.05 && speed < 0.5
}

/**
 * The first cycle, faded in from rest: a loop that starts at full swing would
 * jerk. The envelope eases in and out, so the handover to the loop is seamless in
 * both position and speed. Curves that already start at rest need none.
 */
export function sampleIntro(track: Track): Sample[] | null {
  if ('keys' in track || startsAtRest(track.fn)) return null
  const n = samplesFor(track.dur)
  return Array.from({ length: n + 1 }, (_, i) => ({ offset: i / n, frame: scaleFrame(track.fn(i / n), smooth(i / n)) }))
}

/**
 * Letting go of a loop mid-swing: it carries on along its own curve for a moment
 * while its size fades to nothing, so the part keeps its speed instead of
 * stopping dead when the next pose takes over. `phase` is where the loop was, in
 * cycles; `easingIn` says it was still in its fade-in.
 */
export function sampleRelease(fn: (t: number) => Frame, dur: number, phase: number, easingIn: boolean, releaseMs: number): Sample[] {
  const n = 18
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const p = phase + (t * releaseMs) / (dur * 1000)
    const size = (easingIn ? smooth(Math.min(1, p)) : 1) * (1 - smooth(t))
    return { offset: t, frame: scaleFrame(fn(p), size) }
  })
}

// --- the library -------------------------------------------------------------------------

/** Blinks once, then twice in a row — the double blink is what makes it look alive. */
const BLINK: Track = {
  target: 'blink',
  dur: 6.4,
  keys: [
    { t: 0, f: {} },
    { t: 0.34, f: {} },
    { t: 0.355, f: { sy: 0.08 } },
    { t: 0.373, f: {} },
    { t: 0.8, f: {} },
    { t: 0.815, f: { sy: 0.08 } },
    { t: 0.83, f: {} },
    { t: 0.848, f: { sy: 0.08 } },
    { t: 0.866, f: {} },
    { t: 1, f: {} },
  ],
}

/** Quick glances away and back, with holds: eyes move in darts, not glides. */
const GLANCE: Track = {
  target: 'eyes',
  dur: 7.6,
  keys: [
    { t: 0, f: {} },
    { t: 0.42, f: {} },
    { t: 0.445, f: { x: -1.6, y: 0.3 }, ease: 'cubic-bezier(.2,.8,.3,1)' },
    { t: 0.6, f: { x: -1.6, y: 0.3 } },
    { t: 0.625, f: { x: 1.3, y: -0.4 }, ease: 'cubic-bezier(.2,.8,.3,1)' },
    { t: 0.76, f: { x: 1.3, y: -0.4 } },
    { t: 0.785, f: {}, ease: 'cubic-bezier(.2,.8,.3,1)' },
    { t: 1, f: {} },
  ],
}

/**
 * Being alive: breathing lifts the chest, the hair settles a beat later, the weight
 * drifts from foot to foot and the head never quite holds still. Every pose gets
 * this underneath its own motion.
 */
export function idle(pose: Pose, own: Motion): Track[] {
  const uses = new Set(own.map((t) => t.target))
  const tracks: Track[] = [
    { target: 'upperIdle', dur: 4.2, fn: (t) => ({ y: -1.5 * swell(t), sy: 1 + 0.013 * swell(t) }) },
    { target: 'hair', dur: 4.2, fn: (t) => ({ y: 0.9 * swell(t, 0.12) }) },
    { target: 'strings', dur: 4.2, fn: (t) => ({ r: 1.8 * sin(t, 0.15) }) },
    { target: 'bodyIdle', dur: 7.3, fn: (t) => ({ r: 0.55 * sin(t) }) },
    { target: 'headIdle', dur: 6.1, fn: (t) => ({ r: 1.2 * sin(t) + 0.45 * sin(2 * t, 0.3) }) },
  ]
  // Hanging arms float out a little on each breath in.
  if (!uses.has('armL')) tracks.push({ target: 'armL', dur: 4.2, fn: (t) => ({ r: 1.4 * swell(t, 0.08) }) })
  if (!uses.has('armR')) tracks.push({ target: 'armR', dur: 4.2, fn: (t) => ({ r: -1.4 * swell(t, 0.08) }) })
  if (['open', 'wide', 'half'].includes(pose.face.eyes)) tracks.push(BLINK)
  return tracks.filter((t) => !uses.has(t.target))
}

const HOP_T = [0, 0.1, 0.2, 0.38, 0.56, 0.63, 0.74, 0.84] as const
const hop = (values: readonly number[]): Keys => HOP_T.map((t, i) => [t, values[i]] as const)

export const MOTIONS: Record<string, Motion> = {
  none: [],

  /** A wave with a loose wrist: the forearm leads, the hand trails it. */
  wave: [
    { target: 'foreR', dur: 1.05, fn: (t) => ({ r: 17 * sin(t) }) },
    { target: 'handR', dur: 1.05, fn: (t) => ({ r: 13 * sin(t, 0.13) }) },
    { target: 'armR', dur: 1.05, fn: (t) => ({ r: -3.5 * swell(t, 0.05) }) },
    { target: 'upper', dur: 2.1, fn: (t) => ({ r: 1.1 * sin(t, 0.1) }) },
    { target: 'head', dur: 1.05, fn: (t) => ({ r: 2.2 * sin(t, 0.22) }) },
  ],

  stand: [GLANCE],

  /** Chin in hand, tapping; the eyes wander while he makes up his mind. */
  think: [
    { target: 'foreR', dur: 1.4, fn: (t) => ({ r: 3 * swell(t) }) },
    { target: 'handR', dur: 1.4, fn: (t) => ({ r: 4 * swell(t, 0.08) }) },
    { target: 'head', dur: 5.6, fn: (t) => ({ r: 2.4 * sin(t) }) },
    { target: 'upper', dur: 5.6, fn: (t) => ({ r: 0.8 * sin(t, 0.1) }) },
    {
      target: 'eyes',
      dur: 5.6,
      keys: [
        { t: 0, f: {} },
        { t: 0.3, f: {} },
        { t: 0.33, f: { x: -2.2, y: 0.4 }, ease: 'cubic-bezier(.2,.8,.3,1)' },
        { t: 0.62, f: { x: -2.2, y: 0.4 } },
        { t: 0.65, f: {}, ease: 'cubic-bezier(.2,.8,.3,1)' },
        { t: 1, f: {} },
      ],
    },
  ],

  /**
   * A jump with all the principles in it: squash to load, stretch to launch, hang at
   * the top, stretch into the fall, squash on landing, then a small rebound. The
   * arms pump late and the hair and strings lag behind the body.
   */
  jump: [
    {
      target: 'body',
      dur: 1.5,
      fn: keyed({
        y: hop([0, 3, -10, -36, -8, 2, -1, 0]),
        sx: hop([1, 1.05, 0.96, 1, 0.97, 1.07, 0.99, 1]),
        sy: hop([1, 0.93, 1.07, 1, 1.05, 0.92, 1.02, 1]),
      }),
    },
    { target: 'shadow', dur: 1.5, fn: keyed({ sx: hop([1, 1.05, 0.92, 0.68, 0.9, 1.08, 0.99, 1]), sy: hop([1, 1.05, 0.92, 0.68, 0.9, 1.08, 0.99, 1]) }) },
    { target: 'armL', dur: 1.5, fn: keyed({ r: hop([0, 3, 8, 16, 6, -6, 2, 0]) }) },
    { target: 'armR', dur: 1.5, fn: keyed({ r: hop([0, -3, -8, -16, -6, 6, -2, 0]) }) },
    { target: 'foreL', dur: 1.5, fn: keyed({ r: hop([0, 2, 6, 14, 8, -8, 3, 0]) }, 0.05) },
    { target: 'foreR', dur: 1.5, fn: keyed({ r: hop([0, -2, -6, -14, -8, 8, -3, 0]) }, 0.05) },
    { target: 'thighL', dur: 1.5, fn: keyed({ r: hop([0, 0, 4, 12, 5, -2, 0, 0]) }) },
    { target: 'thighR', dur: 1.5, fn: keyed({ r: hop([0, 0, -4, -12, -5, 2, 0, 0]) }) },
    { target: 'shinL', dur: 1.5, fn: keyed({ r: hop([0, 0, -6, -20, -8, 3, 0, 0]) }) },
    { target: 'shinR', dur: 1.5, fn: keyed({ r: hop([0, 0, 6, 20, 8, -3, 0, 0]) }) },
    { target: 'hair', dur: 1.5, fn: keyed({ y: hop([0, -1, 2.5, -1.5, -2.5, 3, -0.8, 0]) }) },
    { target: 'head', dur: 1.5, fn: keyed({ r: hop([0, 1, -1, 0, 1.5, -2, 0.5, 0]) }) },
    { target: 'strings', dur: 1.5, fn: keyed({ r: hop([0, 1, -4, 3, 5, -5, 1, 0]) }) },
  ],

  /** Two jabs of the finger, the body leaning into each, then a breath. */
  point: [
    {
      target: 'foreR',
      dur: 2.6,
      fn: keyed({ r: [[0, 0], [0.08, -7], [0.16, 5], [0.24, -1.5], [0.32, 0], [0.48, 0], [0.55, -6], [0.62, 4.5], [0.7, -1], [0.78, 0]] }),
    },
    {
      target: 'handR',
      dur: 2.6,
      fn: keyed({ r: [[0, 0], [0.08, -7], [0.16, 5], [0.24, -1.5], [0.32, 0], [0.48, 0], [0.55, -6], [0.62, 4.5], [0.7, -1], [0.78, 0]] }, 0.03),
    },
    { target: 'upper', dur: 2.6, fn: keyed({ r: [[0, 0], [0.08, -0.4], [0.16, 1.2], [0.3, 0.2], [0.55, -0.4], [0.62, 1], [0.78, 0]] }) },
    { target: 'head', dur: 2.6, fn: keyed({ r: [[0, 0], [0.16, 2.5], [0.32, 0], [0.62, 2], [0.8, 0]] }) },
  ],

  /** Holding the phone up, turning it a little towards whoever should scan it. */
  show: [
    { target: 'armR', dur: 3.2, fn: (t) => ({ r: -2.5 * swell(t) }) },
    { target: 'foreR', dur: 3.2, fn: (t) => ({ r: 3 * sin(t, 0.08) }) },
    { target: 'handR', dur: 3.2, fn: (t) => ({ r: 2.5 * sin(t, 0.16) }) },
    { target: 'head', dur: 3.2, fn: (t) => ({ r: 1.8 * sin(t, 0.2) }) },
  ],

  /** Flips the coin — a dip to load, two turns in the air, a soft catch — and watches it. */
  flip: [
    {
      target: 'held',
      dur: 2.4,
      fn: (t) => {
        const air = t > 0.14 && t < 0.5 ? (t - 0.14) / 0.36 : -1
        return {
          y: spline([[0, 0], [0.1, 0], [0.14, 3], [0.2, -34], [0.32, -64], [0.44, -34], [0.5, 0], [0.54, 4], [0.6, 0]])(t),
          sx: air >= 0 ? Math.cos(TAU * 2 * air) : 1,
        }
      },
    },
    { target: 'foreR', dur: 2.4, fn: keyed({ r: [[0, 0], [0.1, 6], [0.16, -8], [0.24, -2], [0.46, 0], [0.5, 6], [0.58, -2], [0.66, 0]] }) },
    { target: 'armR', dur: 2.4, fn: keyed({ r: [[0, 0], [0.1, 3], [0.16, -5], [0.3, 0], [0.5, 4], [0.6, 0]] }) },
    { target: 'head', dur: 2.4, fn: keyed({ r: [[0, 0], [0.2, -3], [0.32, -4.5], [0.5, 0]] }) },
    { target: 'eyes', dur: 2.4, fn: keyed({ y: [[0, 0], [0.2, -1.6], [0.32, -2.2], [0.48, 0]] }) },
  ],

  /** Sweeping the lens, the head following a beat behind the hand. */
  search: [
    { target: 'armR', dur: 3.4, fn: (t) => ({ r: 6 * sin(t) }) },
    { target: 'handR', dur: 3.4, fn: (t) => ({ r: 3 * sin(t, 0.1) }) },
    { target: 'upper', dur: 3.4, fn: (t) => ({ r: 1.2 * sin(t, 0.05) }) },
    { target: 'head', dur: 3.4, fn: (t) => ({ r: 3 * sin(t, 0.15) }) },
    { target: 'eyes', dur: 3.4, fn: (t) => ({ x: 1.2 * sin(t, 0.1) }) },
  ],

  /** Pumps the thumb twice and nods along. */
  thumb: [
    { target: 'foreR', dur: 2.2, fn: keyed({ r: [[0, 0], [0.08, 7], [0.16, -7], [0.24, 2], [0.32, 0], [0.5, 0], [0.56, 5], [0.63, -5], [0.7, 1], [0.78, 0]] }) },
    { target: 'handR', dur: 2.2, fn: keyed({ r: [[0, 0], [0.08, 7], [0.16, -7], [0.24, 2], [0.32, 0], [0.5, 0], [0.56, 5], [0.63, -5], [0.7, 1], [0.78, 0]] }, 0.03) },
    { target: 'head', dur: 2.2, fn: keyed({ r: [[0, 0], [0.16, -3], [0.3, 0], [0.63, -2], [0.78, 0]] }) },
  ],

  /** Shoulders up, hold, drop — "no idea". */
  shrug: [
    { target: 'armL', dur: 2.8, fn: keyed({ r: [[0, 0], [0.14, 7], [0.5, 7], [0.64, 0]] }) },
    { target: 'armR', dur: 2.8, fn: keyed({ r: [[0, 0], [0.14, -7], [0.5, -7], [0.64, 0]] }) },
    { target: 'foreL', dur: 2.8, fn: keyed({ r: [[0, 0], [0.17, 10], [0.5, 9], [0.66, 0]] }) },
    { target: 'foreR', dur: 2.8, fn: keyed({ r: [[0, 0], [0.17, -10], [0.5, -9], [0.66, 0]] }) },
    { target: 'upper', dur: 2.8, fn: keyed({ y: [[0, 0], [0.14, -2.5], [0.5, -2.5], [0.64, 0]] }) },
    { target: 'head', dur: 2.8, fn: keyed({ r: [[0, 0], [0.16, 5], [0.32, 3], [0.5, 5], [0.66, 0]] }) },
  ],

  /** Carrying the sack: a bouncy step on the spot, the sack swinging after him. */
  carry: [
    { target: 'body', dur: 1.2, fn: (t) => ({ y: -2.2 * swell(2 * t) }) },
    { target: 'held', dur: 1.2, fn: (t) => ({ r: 7 * sin(t, 0.12) }) },
    { target: 'armR', dur: 1.2, fn: (t) => ({ r: 2 * sin(t, 0.05) }) },
    { target: 'shinL', dur: 1.2, fn: (t) => ({ r: 3 * sin(t) }) },
    { target: 'shinR', dur: 1.2, fn: (t) => ({ r: 3 * sin(t, 0.5) }) },
    { target: 'head', dur: 1.2, fn: (t) => ({ r: 1.5 * sin(2 * t, 0.1) }) },
  ],

  /** Taps his foot, lifts the watch, and every now and then lets out a sigh. */
  wait: [
    { target: 'shinR', dur: 0.62, fn: keyed({ r: [[0, 0], [0.16, -5], [0.4, 0]] }) },
    { target: 'armL', dur: 3.6, fn: keyed({ r: [[0, 0], [0.08, -5], [0.3, -5], [0.42, 0]] }) },
    { target: 'head', dur: 3.6, fn: keyed({ r: [[0, 0], [0.1, 2], [0.3, 2], [0.45, -3], [0.62, -3], [0.75, 0]] }) },
    { target: 'upper', dur: 3.6, fn: keyed({ y: [[0, 0], [0.62, 0], [0.7, -2.4], [0.8, 1.2], [0.9, 0]], sy: [[0, 1], [0.62, 1], [0.7, 1.02], [0.8, 0.985], [0.9, 1]] }) },
  ],

  /** Nods on the beat, taps every other one, sways across two bars. */
  listen: [
    { target: 'head', dur: 0.46, fn: keyed({ r: [[0, 0], [0.32, 4.5]] }) },
    { target: 'upper', dur: 0.46, fn: keyed({ y: [[0, 0], [0.36, 1.4]] }) },
    { target: 'hair', dur: 0.46, fn: keyed({ y: [[0, 0], [0.45, 1.8]] }) },
    { target: 'shinR', dur: 0.92, fn: keyed({ r: [[0, 0], [0.12, -6], [0.3, 0]] }) },
    { target: 'armR', dur: 1.84, fn: (t) => ({ r: 1.5 * sin(t) }) },
    { target: 'body', dur: 1.84, fn: (t) => ({ r: 1.2 * sin(t) }) },
    { target: 'strings', dur: 0.46, fn: keyed({ r: [[0, 0], [0.4, 3]] }) },
  ],

  /** Arms open, hands beckoning in — "come on in". */
  welcome: [
    { target: 'armL', dur: 1.5, fn: (t) => ({ r: 4 * swell(t) }) },
    { target: 'armR', dur: 1.5, fn: (t) => ({ r: -4 * swell(t) }) },
    { target: 'foreL', dur: 1.5, fn: (t) => ({ r: 10 * swell(t, 0.1) }) },
    { target: 'foreR', dur: 1.5, fn: (t) => ({ r: -10 * swell(t, 0.1) }) },
    { target: 'handL', dur: 1.5, fn: (t) => ({ r: 14 * swell(t, 0.2) }) },
    { target: 'handR', dur: 1.5, fn: (t) => ({ r: -14 * swell(t, 0.2) }) },
    { target: 'upper', dur: 1.5, fn: (t) => ({ y: -1.5 * swell(t) }) },
    { target: 'head', dur: 1.5, fn: (t) => ({ r: 2 * sin(t, 0.25) }) },
  ],

  /** Legs swinging off the edge, out of step with the wave. */
  sit: [
    { target: 'shinL', dur: 1.3, fn: (t) => ({ r: 11 * sin(t) }) },
    { target: 'shinR', dur: 1.3, fn: (t) => ({ r: 11 * sin(t, 0.5) }) },
    { target: 'foreR', dur: 1.0, fn: (t) => ({ r: 16 * sin(t) }) },
    { target: 'handR', dur: 1.0, fn: (t) => ({ r: 13 * sin(t, 0.13) }) },
    { target: 'head', dur: 2.0, fn: (t) => ({ r: 2 * sin(t, 0.2) }) },
    { target: 'upper', dur: 2.6, fn: (t) => ({ r: 1 * sin(t) }) },
  ],
}
