import * as art from './art'
import { BRAND, CYAN } from './palette'
import { solve, type Pose } from './rig'
import type { Box, Shape } from './shapes'
import { A_DRIFT, A_EXTRAS, K_DRIFT, type Drift, type Scene } from './skia'

export type Extra = 'confetti' | 'thought' | 'sparkles' | 'zzz' | 'coins' | 'question' | 'hearts' | 'notes'

const SPARKLE = (r: number): Box => [-r, -r, r * 2, r * 2]
const COIN: Box = [-12, -12, 26, 26]
const HEART: Box = [-13, -15, 26, 22]
const NOTE: Box = [-7, -21, 21, 26]
const TEXT: Box = [-14, -34, 28, 40]

/** x, y, width, height, colour, delay, duration, drift (% of own width), spin */
const CONFETTI: [number, number, number, number, string, number, number, number, number][] = [
  [20, 20, 7, 12, BRAND, 0, 2.6, 260, 320],
  [62, -10, 8, 8, '#ffd23f', 0.9, 3.1, -180, -260],
  [96, 30, 6, 11, CYAN, 1.7, 2.8, 170, 280],
  [238, 0, 7, 12, '#ff7a6b', 0.4, 2.9, -290, -300],
  [270, 36, 8, 8, BRAND, 1.3, 3.2, 150, 240],
  [210, -20, 6, 10, '#ffd23f', 2.1, 2.7, 270, 340],
  [300, -4, 7, 11, CYAN, 0.7, 3, -170, -220],
  [4, 70, 6, 9, '#ff7a6b', 1.9, 2.8, 230, 260],
  [150, -30, 7, 7, '#b388ff', 1.1, 3.3, -140, 300],
  [120, -6, 6, 12, BRAND, 2.4, 2.9, 130, -280],
  [180, 16, 7, 9, '#ff7a6b', 0.2, 3.1, -230, 260],
  [326, 50, 6, 10, '#ffd23f', 1.5, 2.6, -130, 320],
]

/** Extras' artwork is fixed per kind, so each list is built (and compiled) once. */
const cache = new Map<string, Shape[]>()
const once = (key: string, build: () => Shape[]) => {
  let shapes = cache.get(key)
  if (!shapes) {
    shapes = build()
    cache.set(key, shapes)
  }
  return shapes
}

const text = (t: string, size: number, colour: string): Shape[] => [
  { k: 'text', x: 0, y: 0, text: t, size, weight: 900, anchor: 'middle', fill: colour },
]

/**
 * Things around him — confetti, a thought, notes, hearts — added to the scene.
 * They drift on the figure's clock and fade in once a new pose has settled.
 */
export function addExtras(scene: Scene, extras: Extra[], pose: Pose, layer: 'back' | 'front', still: boolean) {
  if (!extras.length) return
  const head = solve(pose).head
  const has = (e: Extra) => extras.includes(e)

  /** One item in its box, drifting (unless the figure is still) about the box's centre. */
  const item = (x: number, y: number, box: Box, shapes: Shape[], drift: Drift) => {
    const [bx, by, bw, bh] = box
    scene.group(
      still ? null : { k: K_DRIFT, d: drift, x: x + bx, y: y + by, w: bw, h: bh },
      () => scene.fixed(`translate(${x} ${y})`, () => scene.shapes(shapes)),
      still ? { k: A_EXTRAS } : { k: A_DRIFT, d: drift },
    )
  }

  scene.group(null, () => {
    if (layer === 'back') {
      if (has('sparkles'))
        (
          [
            [-78, -30, 11, CYAN, 2.4, 0],
            [82, -44, 8, '#ffd23f', 2, 0.6],
            [96, 60, 6, BRAND, 2.6, 1.1],
          ] as const
        ).forEach(([dx, dy, r, colour, dur, delay]) =>
          item(head.x + dx, head.y + dy, SPARKLE(r), once(`sparkle${r}${colour}`, () => art.sparkle(r, colour)), { kind: 'twinkle', dur, delay }),
        )
      if (has('coins'))
        (
          [
            [-70, 20, 0],
            [74, 0, 0.9],
            [-50, -40, 1.7],
          ] as const
        ).forEach(([dx, dy, delay], i) =>
          item(head.x + dx, head.y + dy, COIN, once('coin', () => art.coin(11)), { kind: 'rise', dur: 2.8, delay, dx: i % 2 ? -40 : 40 }),
        )
      return
    }

    if (has('thought'))
      item(head.x + 92, head.y - 74, art.THOUGHT_BOX, once('thought', art.thought), { kind: 'float', dur: 3.4, amp: -6 })
    if (has('question')) item(head.x + 58, head.y - 48, TEXT, once('question', () => text('?', 40, CYAN)), { kind: 'float', dur: 2.6, amp: -14 })
    if (has('zzz'))
      ['z', 'Z', 'Z'].forEach((z, i) =>
        item(head.x + 40 + i * 6, head.y - 40, TEXT, once(`z${i}`, () => text(z, 14 + i * 5, CYAN)), {
          kind: 'rise',
          dur: 2.4,
          delay: i * 0.8,
          dx: 60,
        }),
      )
    if (has('hearts'))
      (
        [
          [-60, -20, 0],
          [62, -36, 0.8],
          [80, 10, 1.6],
        ] as const
      ).forEach(([dx, dy, delay], i) =>
        item(head.x + dx, head.y + dy, HEART, once('heart', () => [{ k: 'group', tf: 'scale(1.4)', kids: art.heart() }]), {
          kind: 'rise',
          dur: 2.6,
          delay,
          dx: i % 2 ? 50 : -50,
        }),
      )
    if (has('notes'))
      (
        [
          [-72, -10, 0, BRAND],
          [70, -40, 0.9, CYAN],
          [84, 20, 1.8, '#b388ff'],
          [-60, -56, 2.4, '#ffd23f'],
        ] as const
      ).forEach(([dx, dy, delay, colour], i) =>
        item(head.x + dx, head.y + dy, NOTE, once(`note${colour}`, () => art.note(colour)), { kind: 'rise', dur: 3, delay, dx: i % 2 ? 60 : -60 }),
      )
    if (has('confetti'))
      CONFETTI.forEach(([x, y, w, h, colour, delay, dur, dx, spin], i) =>
        item(x, y + 20, [0, 0, w, h], once(`confetto${i}`, () => [{ k: 'rect', x: 0, y: 0, w, h, rx: 2, fill: colour }]), {
          kind: 'fall',
          dur,
          delay,
          dx,
          spin,
        }),
      )
  })
}
