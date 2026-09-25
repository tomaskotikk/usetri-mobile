/**
 * Ušetřílek's artwork is data, not JSX: plain lists of SVG primitives. The web
 * renders them with <ShapeSvg>, the Expo app can render the same lists with
 * react-native-svg — one drawing, two platforms.
 */

export type Stop = readonly [offset: number, color: string, opacity?: number]

export type Gradient =
  | { type: 'linear'; stops: readonly Stop[]; x1?: number; y1?: number; x2?: number; y2?: number }
  | { type: 'radial'; stops: readonly Stop[]; cx?: number; cy?: number; r?: number; fx?: number; fy?: number }

/**
 * A colour ('#hex', 'none'), a shared paint of the figure ('ball-skin', 'tube-hood')
 * or a one-off gradient.
 */
export type Paint = string | Gradient

type Look = {
  fill?: Paint
  stroke?: Paint
  sw?: number
  /** Round caps and joins on strokes. */
  round?: boolean
  op?: number
  tf?: string
}

export type Shape =
  | (Look & { k: 'path'; d: string })
  | (Look & { k: 'circle'; cx: number; cy: number; r: number })
  | (Look & { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number })
  | (Look & { k: 'rect'; x: number; y: number; w: number; h: number; rx?: number })
  | (Look & {
      k: 'text'
      x: number
      y: number
      text: string
      size: number
      weight?: number
      anchor?: 'start' | 'middle' | 'end'
    })
  | { k: 'group'; tf?: string; op?: number; kids: Shape[] }

/** x, y, width, height of the region a shape list occupies, in its own units. */
export type Box = readonly [x: number, y: number, w: number, h: number]

export const isColour = (p: string) => p === 'none' || p === 'currentColor' || p.startsWith('#') || p.startsWith('rgb')

// --- small builders ------------------------------------------------------------

export const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: Paint, rot = 0, op?: number): Shape => ({
  k: 'ellipse',
  cx,
  cy,
  rx,
  ry,
  fill,
  op,
  tf: rot ? `rotate(${rot} ${cx} ${cy})` : undefined,
})

export const circle = (cx: number, cy: number, r: number, fill: Paint, op?: number): Shape => ({ k: 'circle', cx, cy, r, fill, op })

export const path = (d: string, fill: Paint, op?: number): Shape => ({ k: 'path', d, fill, op })

export const line = (d: string, stroke: Paint, sw: number, op?: number): Shape => ({
  k: 'path',
  d,
  fill: 'none',
  stroke,
  sw,
  round: true,
  op,
})

/** A vertical capsule — a limb segment — centred on x from y1 to y2, `w` wide. */
export const capsule = (x: number, y1: number, y2: number, w: number, fill: Paint): Shape => ({
  k: 'rect',
  x: x - w / 2,
  y: y1 - w / 2,
  w,
  h: y2 - y1 + w,
  rx: w / 2,
  fill,
})

export const group = (kids: Shape[], tf?: string, op?: number): Shape => ({ k: 'group', kids, tf, op })

/** A four-point sparkle, drawn from its centre. */
export function sparklePath(x: number, y: number, r: number) {
  const w = r * 0.22
  return (
    `M${x} ${y - r} C${x + w} ${y - w} ${x + w} ${y - w} ${x + r} ${y} ` +
    `C${x + w} ${y + w} ${x + w} ${y + w} ${x} ${y + r} ` +
    `C${x - w} ${y + w} ${x - w} ${y + w} ${x - r} ${y} ` +
    `C${x - w} ${y - w} ${x - w} ${y - w} ${x} ${y - r} Z`
  )
}

/** Mixes two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (v: number, s: number) => (v >> s) & 255
  const out = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
