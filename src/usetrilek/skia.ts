import { Platform } from 'react-native'
import { matchFont, PaintStyle, Skia, StrokeCap, StrokeJoin, TileMode, type SkCanvas, type SkFont, type SkMatrix, type SkPaint, type SkPath } from '@shopify/react-native-skia'
import type { Out } from './engine'
import { TONE } from './palette'
import { isColour, type Gradient, type Paint, type Shape } from './shapes'

/*
 * Ušetřílek on the GPU. The website's shape lists are compiled once into Skia
 * paths and paints; a pose becomes a flat list of drawing ops; every frame a
 * worklet replays that list into a picture, moving the joints with canvas
 * transforms. Nothing is redrawn on the CPU and nothing goes through React.
 */

// --- ops ---------------------------------------------------------------------------------------

export const SAVE = 0
export const RESTORE = 1
/** A fixed transform. */
export const MAT = 2
/** A transform computed from the engine's output every frame — see `move`. */
export const DYN = 3
export const DRAW = 4
/** A fixed opacity for everything up to the matching RESTORE. */
export const LAYER = 5
/** An opacity computed every frame; at zero the whole group is skipped. */
export const FADE = 6

export type Op = {
  o: number
  /** Which kind of DYN or FADE. */
  k?: number
  /** Channel or layer names the op reads, resolved when the scene is built. */
  s?: string
  s2?: string
  s3?: string
  s4?: string
  x?: number
  y?: number
  z?: number
  w?: number
  h?: number
  d?: Drift
  p?: SkPath
  q?: SkPaint
  m?: SkMatrix
  /** For FADE: how many ops to jump over to land after its RESTORE. */
  skip?: number
}

export type Drift =
  | { kind: 'float'; dur: number; delay?: number; amp?: number }
  | { kind: 'twinkle'; dur: number; delay?: number }
  | { kind: 'rise'; dur: number; delay?: number; dx?: number }
  | { kind: 'fall'; dur: number; delay?: number; dx?: number; spin?: number }

// DYN kinds
export const K_JOINT = 1 // translate(x, y) rotate(c[s])
export const K_LOOP = 2 // looping layer L[s] about (x, y)
export const K_TURN = 3 // rotate(c[s]) about (x, y)
export const K_SLIDE = 4 // translate(c[s] * z, 0)
export const K_HELD = 5 // held prop placement: c[s], c[s2] shift, c[s3] turn, c[s4] scale
export const K_STRETCH = 6 // thigh stretch c[s]
export const K_KNEE = 7 // knee: down the stretched thigh c[s], turned by c[s2]
export const K_LOOK = 8
export const K_BLINK = 9 // blink squash about (x, y)
export const K_BROW = 10 // brow at (x, y + c[s]), turned by c[s2]
export const K_MOUTH = 11 // mouth pop about (x, y)
export const K_BODY = 12
export const K_SHADOW = 13
export const K_SQUASH = 14 // anticipation squash about (x, y)
export const K_DRIFT = 15 // an extra drifting in its box (x, y, w, h)

// FADE kinds
export const A_CHAN = 1 // c[s]
export const A_CHAN_INV = 2 // 1 - c[s]
export const A_EXTRAS = 3
export const A_DRIFT = 4

const THIGH = 56

// --- the frame ---------------------------------------------------------------------------------

function lerpKeys(ts: number[], vs: number[], p: number) {
  'worklet'
  for (let i = 1; i < ts.length; i++) {
    if (p <= ts[i]) return vs[i - 1] + ((vs[i] - vs[i - 1]) * (p - ts[i - 1])) / (ts[i] - ts[i - 1])
  }
  return vs[vs.length - 1]
}

/** The website's drifts: tx and ty as fractions of the item's size, rotation, scale, opacity. */
export function driftAt(d: Drift, t: number) {
  'worklet'
  const cycles = (t + (d.delay ?? 0)) / d.dur
  const p = cycles - Math.floor(cycles)
  const swell = 0.5 - 0.5 * Math.cos(Math.PI * 2 * p)
  if (d.kind === 'float') return [0, ((d.amp ?? -8) / 100) * swell, 0, 1, 1]
  if (d.kind === 'twinkle') return [0, 0, 45 * swell, 1 - 0.45 * swell, 1 - 0.55 * swell]
  if (d.kind === 'rise') {
    const dx = (d.dx ?? 0) / 100
    const T = [0, 0.18, 0.7, 1]
    return [
      lerpKeys(T, [0, dx * 0.18, dx * 0.7, dx], p),
      lerpKeys(T, [0, -0.58, -2.24, -3.2], p),
      0,
      lerpKeys(T, [0.5, 0.68, 0.95, 1.1], p),
      lerpKeys(T, [0, 1, 1, 0], p),
    ]
  }
  const dx = (d.dx ?? 100) / 100
  const spin = d.spin ?? 300
  const T = [0, 0.12, 0.8, 1]
  return [
    lerpKeys(T, [0, dx * 0.12, dx * 0.8, dx], p),
    lerpKeys(T, [-1.5, -1.5 + 18.5 * 0.12, -1.5 + 18.5 * 0.8, 17], p),
    lerpKeys(T, [0, spin * 0.12, spin * 0.8, spin], p),
    1,
    lerpKeys(T, [0, 1, 1, 0], p),
  ]
}

/** Turn and scale about (ox, oy), after shifting by (tx, ty). */
function about(canvas: SkCanvas, ox: number, oy: number, deg: number, sx: number, sy: number, tx: number, ty: number) {
  'worklet'
  canvas.translate(ox + tx, oy + ty)
  if (deg !== 0) canvas.rotate(deg, 0, 0)
  if (sx !== 1 || sy !== 1) canvas.scale(sx, sy)
  canvas.translate(-ox, -oy)
}

function move(canvas: SkCanvas, op: Op, o: Out) {
  'worklet'
  const c = o.c
  const s = op.s as string
  switch (op.k) {
    case K_JOINT:
      canvas.translate(op.x as number, op.y as number)
      canvas.rotate(c[s], 0, 0)
      return
    case K_LOOP: {
      const f = o.L[s]
      about(canvas, op.x as number, op.y as number, f[0], f[3], f[4], f[1], f[2])
      return
    }
    case K_TURN:
      about(canvas, op.x as number, op.y as number, c[s], 1, 1, 0, 0)
      return
    case K_SLIDE:
      canvas.translate(c[s] * (op.z as number), 0)
      return
    case K_HELD: {
      const sc = c[op.s4 as string]
      canvas.translate(c[s], c[op.s2 as string])
      canvas.rotate(c[op.s3 as string], 0, 0)
      canvas.scale(sc, sc)
      return
    }
    case K_STRETCH:
      canvas.scale(1, c[s])
      return
    case K_KNEE:
      canvas.translate(0, THIGH * c[s])
      canvas.rotate(c[op.s2 as string], 0, 0)
      return
    case K_LOOK:
      canvas.translate(c.lookX * 2.4, c.lookY * 2)
      return
    case K_BLINK:
      about(canvas, op.x as number, op.y as number, 0, 1, o.blink, 0, 0)
      return
    case K_BROW:
      canvas.translate(op.x as number, (op.y as number) + c[s])
      canvas.rotate(c[op.s2 as string], 0, 0)
      return
    case K_MOUTH:
      about(canvas, op.x as number, op.y as number, 0, o.mouth, o.mouth, 0, 0)
      return
    case K_BODY:
      canvas.translate(c.bx, c.by)
      return
    case K_SHADOW:
      canvas.translate(c.bx, 0)
      return
    case K_SQUASH:
      about(canvas, op.x as number, op.y as number, 0, o.squash[1], o.squash[2], 0, o.squash[0])
      return
    case K_DRIFT: {
      const w = op.w as number
      const h = op.h as number
      const [tx, ty, r, sc] = driftAt(op.d as Drift, o.t)
      about(canvas, (op.x as number) + w / 2, (op.y as number) + h / 2, r, sc, sc, tx * w, ty * h)
      return
    }
  }
}

function fadeOf(op: Op, o: Out) {
  'worklet'
  switch (op.k) {
    case A_CHAN:
      return o.c[op.s as string]
    case A_CHAN_INV:
      return 1 - o.c[op.s as string]
    case A_EXTRAS:
      return o.extras
    case A_DRIFT:
      return driftAt(op.d as Drift, o.t)[4] * o.extras
  }
  return 1
}

/** Replays a pose's ops into the canvas, with the engine's output for this frame. */
export function drawOps(canvas: SkCanvas, ops: Op[], o: Out) {
  'worklet'
  const n = ops.length
  let i = 0
  while (i < n) {
    const op = ops[i]
    const code = op.o
    if (code === DRAW) canvas.drawPath(op.p as SkPath, op.q as SkPaint)
    else if (code === SAVE) canvas.save()
    else if (code === RESTORE) canvas.restore()
    else if (code === DYN) move(canvas, op, o)
    else if (code === MAT) canvas.concat(op.m as SkMatrix)
    else if (code === LAYER) canvas.saveLayer(op.q)
    else if (code === FADE) {
      const a = fadeOf(op, o)
      if (a < 0.004) {
        i += op.skip as number
        continue
      }
      if (a > 0.996) canvas.save()
      else {
        const paint = op.q as SkPaint
        paint.setAlphaf(a)
        canvas.saveLayer(paint)
      }
    }
    i++
  }
}

// --- compiling shapes ----------------------------------------------------------------------------

/** The figure-wide paints of the website's PaintDefs, as gradients in the shapes' own format. */
function named(name: string): Gradient | null {
  const [kind, toneName] = name.includes('-') ? (name.split('-') as [string, string]) : ['flat', name]
  const t = TONE[toneName as keyof typeof TONE]
  if (kind === 'flat' && t)
    return { type: 'radial', cx: 0.36, cy: 0.3, r: 0.8, fx: 0.3, fy: 0.22, stops: [[0, t.l], [0.55, t.m], [1, t.d]] }
  if (kind === 'ball' && t)
    return { type: 'radial', cx: 0.4, cy: 0.36, r: 0.72, fx: 0.34, fy: 0.26, stops: [[0, t.hi], [0.3, t.l], [0.72, t.m], [1, t.d]] }
  if (kind === 'tube' && t)
    return { type: 'linear', x1: 0, y1: 0, x2: 1, y2: 0, stops: [[0, t.d], [0.3, t.l], [0.52, t.m], [0.86, t.d], [1, t.dd]] }
  switch (name) {
    case 'tube-cuff':
      return { type: 'linear', x1: 0, y1: 0, x2: 1, y2: 0, stops: [[0, TONE.hood.dd], [0.32, TONE.hood.m], [0.6, TONE.hood.d], [1, TONE.hood.dd]] }
    case 'ao':
      return { type: 'radial', stops: [[0, '#1a0c05', 0.32], [1, '#1a0c05', 0]] }
    case 'neck':
      return { type: 'linear', x1: 0, y1: 0, x2: 1, y2: 0, stops: [[0, TONE.skin.m], [1, TONE.skin.dd]] }
    case 'glass':
      return { type: 'linear', x1: 0, y1: 0, x2: 1, y2: 1, stops: [[0, '#e6fbff', 0.85], [1, '#8fdcff', 0.35]] }
    case 'hem':
      return { type: 'linear', x1: 0, y1: 0, x2: 0, y2: 1, stops: [[0, TONE.hood.dd, 0], [1, TONE.hood.dd, 0.55]] }
    case 'ground':
      return { type: 'radial', stops: [[0, '#051a14', 0.34], [0.6, '#051a14', 0.14], [1, '#051a14', 0]] }
  }
  return null
}

function colour(hex: string, alpha = 1) {
  const c = Skia.Color(hex)
  return Float32Array.of(c[0], c[1], c[2], c[3] * alpha)
}

/** An SVG objectBoundingBox gradient: defined in the unit square, stretched over the shape's bounds. */
function shader(g: Gradient, path: SkPath) {
  const b = path.computeTightBounds()
  const box = Skia.Matrix([b.width || 1, 0, b.x, 0, b.height || 1, b.y, 0, 0, 1])
  const colors = g.stops.map(([, c, a]) => colour(c, a ?? 1))
  const pos = g.stops.map(([o]) => o)
  if (g.type === 'linear')
    return Skia.Shader.MakeLinearGradient(
      { x: g.x1 ?? 0, y: g.y1 ?? 0 },
      { x: g.x2 ?? 0, y: g.y2 ?? 1 },
      colors,
      pos,
      TileMode.Clamp,
      box,
    )
  const cx = g.cx ?? 0.5
  const cy = g.cy ?? 0.5
  const r = g.r ?? 0.5
  const fx = g.fx ?? cx
  const fy = g.fy ?? cy
  if (fx === cx && fy === cy) return Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, r, colors, pos, TileMode.Clamp, box)
  return Skia.Shader.MakeTwoPointConicalGradient({ x: fx, y: fy }, 0, { x: cx, y: cy }, r, colors, pos, TileMode.Clamp, box)
}

function paintFor(p: Paint, path: SkPath, stroke?: { width: number; round?: boolean }, opacity = 1): SkPaint | null {
  if (p === 'none') return null
  const paint = Skia.Paint()
  paint.setAntiAlias(true)
  if (typeof p === 'string' && isColour(p)) paint.setColor(colour(p))
  else {
    const g = typeof p === 'string' ? named(p) : p
    if (!g) return null
    paint.setShader(shader(g, path))
  }
  if (stroke) {
    paint.setStyle(PaintStyle.Stroke)
    paint.setStrokeWidth(stroke.width)
    if (stroke.round) {
      paint.setStrokeCap(StrokeCap.Round)
      paint.setStrokeJoin(StrokeJoin.Round)
    }
  }
  if (opacity < 1) paint.setAlphaf(opacity)
  return paint
}

/** SVG transform lists (translate, rotate, scale, matrix) as one matrix. */
export function parseTransform(tf: string): SkMatrix {
  let m = [1, 0, 0, 1, 0, 0]
  const mul = (n: number[]) => {
    m = [
      m[0] * n[0] + m[2] * n[1],
      m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4],
      m[1] * n[4] + m[3] * n[5] + m[5],
    ]
  }
  for (const [, fn, args] of tf.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = args.split(/[\s,]+/).filter(Boolean).map(Number)
    if (fn === 'translate') mul([1, 0, 0, 1, a[0], a[1] ?? 0])
    else if (fn === 'scale') mul([a[0], 0, 0, a[1] ?? a[0], 0, 0])
    else if (fn === 'matrix') mul(a)
    else if (fn === 'rotate') {
      const r = (a[0] * Math.PI) / 180
      const [cx, cy] = [a[1] ?? 0, a[2] ?? 0]
      mul([1, 0, 0, 1, cx, cy])
      mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0])
      mul([1, 0, 0, 1, -cx, -cy])
    }
  }
  return Skia.Matrix([m[0], m[2], m[4], m[1], m[3], m[5], 0, 0, 1])
}

const fonts = new Map<number, SkFont | null>()
function font(size: number) {
  if (!fonts.has(size)) {
    let f: SkFont | null = null
    try {
      f = matchFont({ fontFamily: Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' }), fontSize: size, fontWeight: 'bold' })
    } catch {
      f = null
    }
    fonts.set(size, f)
  }
  return fonts.get(size) ?? null
}

function pathOf(s: Shape): SkPath | null {
  switch (s.k) {
    case 'path':
      return Skia.Path.MakeFromSVGString(s.d)
    case 'circle': {
      const p = Skia.Path.Make()
      p.addCircle(s.cx, s.cy, s.r)
      return p
    }
    case 'ellipse': {
      const p = Skia.Path.Make()
      p.addOval(Skia.XYWHRect(s.cx - s.rx, s.cy - s.ry, s.rx * 2, s.ry * 2))
      return p
    }
    case 'rect': {
      const p = Skia.Path.Make()
      const r = Math.min(s.rx ?? 0, s.w / 2, s.h / 2)
      p.addRRect(Skia.RRectXY(Skia.XYWHRect(s.x, s.y, s.w, s.h), r, r))
      return p
    }
    case 'text': {
      const f = font(s.size)
      if (!f) return null
      const width = f.measureText(s.text).width
      const dx = s.anchor === 'middle' ? -width / 2 : s.anchor === 'end' ? -width : 0
      return Skia.Path.MakeFromText(s.text, s.x + dx, s.y, f)
    }
  }
  return null
}

function compileInto(ops: Op[], shapes: Shape[]) {
  for (const s of shapes) {
    const tf = s.tf ? parseTransform(s.tf) : null
    const faded = s.op !== undefined && s.op < 1
    if (s.k === 'group') {
      if (!tf && !faded) {
        compileInto(ops, s.kids)
        continue
      }
      if (faded) {
        const paint = Skia.Paint()
        paint.setAlphaf(s.op as number)
        ops.push({ o: LAYER, q: paint })
      } else ops.push({ o: SAVE })
      if (tf) ops.push({ o: MAT, m: tf })
      compileInto(ops, s.kids)
      ops.push({ o: RESTORE })
      continue
    }
    const path = pathOf(s)
    if (!path) continue
    const opacity = s.op ?? 1
    const fill = s.fill && s.fill !== 'none' ? paintFor(s.fill, path, undefined, opacity) : null
    const stroke = s.stroke ? paintFor(s.stroke, path, { width: s.sw ?? 1, round: s.round }, opacity) : null
    if (!fill && !stroke) continue
    if (tf) ops.push({ o: SAVE }, { o: MAT, m: tf })
    if (fill) ops.push({ o: DRAW, p: path, q: fill })
    if (stroke) ops.push({ o: DRAW, p: path, q: stroke })
    if (tf) ops.push({ o: RESTORE })
  }
}

const compiled = new WeakMap<Shape[], Op[]>()

/** A shape list as drawing ops — built once per list and shared by every figure. */
export function compile(shapes: Shape[]): Op[] {
  let ops = compiled.get(shapes)
  if (!ops) {
    ops = []
    compileInto(ops, shapes)
    compiled.set(shapes, ops)
  }
  return ops
}

/** Builds a pose's op list: groups nest like the puppet's layers. */
export class Scene {
  ops: Op[] = []

  /** A group moved by `move` (and faded by `fade`) around whatever `body` adds. */
  group(move: Omit<Op, 'o'> | null, body: () => void, fade?: Omit<Op, 'o'>) {
    const at = this.ops.length
    this.ops.push(fade ? { o: FADE, ...fade, q: Skia.Paint() } : { o: SAVE })
    if (move) this.ops.push({ o: DYN, ...move })
    body()
    this.ops.push({ o: RESTORE })
    if (fade) this.ops[at].skip = this.ops.length - at
  }

  /** A fixed transform around `body`. */
  fixed(tf: string, body: () => void) {
    this.ops.push({ o: SAVE }, { o: MAT, m: parseTransform(tf) })
    body()
    this.ops.push({ o: RESTORE })
  }

  shapes(list: Shape[]) {
    for (const op of compile(list)) this.ops.push(op)
  }
}
