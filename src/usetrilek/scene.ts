import * as art from './art'
import { addExtras, type Extra } from './extras'
import { GROUND, HEAD_DROP, LEN, REST, type Arm, type Pose } from './rig'
import type { Shape } from './shapes'
import {
  A_CHAN,
  A_CHAN_INV,
  K_BLINK,
  K_BODY,
  K_BROW,
  K_HELD,
  K_JOINT,
  K_KNEE,
  K_LOOK,
  K_LOOP,
  K_MOUTH,
  K_SHADOW,
  K_SLIDE,
  K_SQUASH,
  K_STRETCH,
  K_TURN,
  Scene,
} from './skia'

/*
 * A pose as drawing ops: groups nest the way the puppet's layers do on the
 * website — shoulder › elbow › wrist › hand — each moved by the engine's output.
 * The artwork is compiled once; building a pose's list is cheap.
 */

// --- static artwork, built once ----------------------------------------------------------------

const ART = {
  torso: art.torso(),
  band: art.band(),
  chest: art.chest(),
  strings: art.strings(),
  cups: art.cups(),
  ears: art.ears(),
  skull: art.skull(),
  blush: art.blush(),
  browL: art.brow(false),
  browR: art.brow(true),
  nose: art.nose(),
  hair: art.hair(),
  phonesOn: art.phonesOn(),
  upperArm: art.upperArm(),
  forearm: art.forearm(),
  cuff: art.cuff(),
  thigh: art.thigh(),
  shin: art.shin(),
  shoe: art.shoe(),
  shadow: [{ k: 'ellipse', cx: REST.pelvis.x, cy: GROUND + 4, rx: 80, ry: 12, fill: 'ground' }] as Shape[],
  benchShadow: [{ k: 'ellipse', cx: 150, cy: GROUND + 4, rx: 180, ry: 13, fill: 'ground', op: 0.9 }] as Shape[],
}

/** Parts that come in variants (hands, eyes, mouths, props, blocks), built once per variant. */
const variants = new Map<string, Shape[]>()
function variant(key: string, build: () => Shape[]) {
  let shapes = variants.get(key)
  if (!shapes) {
    shapes = build()
    variants.set(key, shapes)
  }
  return shapes
}

const BENCH = [
  { x: 150 - 104, color: '#e50914', slug: 'netflix-premium', size: 96, rot: -2 },
  { x: 150, color: '#1db954', slug: 'spotify-family', size: 104, rot: 0 },
  { x: 150 + 104, color: '#ff0033', slug: 'youtube-premium', size: 96, rot: 2 },
  { x: 150 + 110, color: '#0063e5', slug: 'disney-plus', size: 60, rot: 9, y: GROUND - 96 - 19 - 30 },
]

// --- the scene ------------------------------------------------------------------------------------

function arm(scene: Scene, side: 'L' | 'R', a: Arm, pose: Pose) {
  const shoulder = side === 'L' ? REST.shoulderL : REST.shoulderR
  const held = pose.held?.hand === side ? pose.held : undefined
  const pivot = held ? art.PROP_PIVOT[held.kind] : { x: 0, y: 0 }
  const handId = `${a.hand}-${a.flip ? 1 : 0}-${a.watch ? 1 : 0}`

  scene.group({ k: K_JOINT, x: shoulder.x, y: shoulder.y, s: `a${side}s` }, () =>
    scene.group({ k: K_LOOP, s: `arm${side}`, x: 0, y: 0 }, () => {
      scene.shapes(ART.upperArm)
      scene.group({ k: K_JOINT, x: 0, y: LEN.upper, s: `a${side}e` }, () =>
        scene.group({ k: K_LOOP, s: `fore${side}`, x: 0, y: 0 }, () => {
          scene.shapes(ART.forearm)
          scene.group({ k: K_JOINT, x: 0, y: LEN.fore, s: `a${side}w` }, () =>
            scene.group({ k: K_LOOP, s: `hand${side}`, x: 0, y: 0 }, () => {
              scene.shapes(variant(`hand-back-${handId}`, () => art.hand(a.hand, 'back', a.flip, a.watch)))
              if (held)
                scene.group({ k: K_HELD, s: `h${side}x`, s2: `h${side}y`, s3: `h${side}r`, s4: `h${side}s` }, () =>
                  scene.group({ k: K_LOOP, s: 'held', x: pivot.x, y: pivot.y }, () =>
                    scene.shapes(variant(`prop-${held.kind}`, () => art.prop(held.kind))),
                  ),
                )
              scene.shapes(variant(`hand-front-${handId}`, () => art.hand(a.hand, 'front', a.flip)))
            }),
          )
          scene.shapes(ART.cuff)
        }),
      )
    }),
  )
}

function leg(scene: Scene, side: 'L' | 'R') {
  const hipX = REST.pelvis.x + (side === 'L' ? -REST.hipDX : REST.hipDX)
  const hipY = REST.pelvis.y + REST.hipDY
  scene.group({ k: K_JOINT, x: hipX, y: hipY, s: `l${side}h` }, () =>
    scene.group({ k: K_LOOP, s: `thigh${side}`, x: 0, y: 0 }, () => {
      scene.group({ k: K_STRETCH, s: `l${side}s` }, () => scene.shapes(ART.thigh))
      scene.group({ k: K_KNEE, s: `l${side}s`, s2: `l${side}k` }, () =>
        scene.group({ k: K_LOOP, s: `shin${side}`, x: 0, y: 0 }, () => {
          scene.group({ k: K_JOINT, x: 0, y: LEN.shin, s: `l${side}t` }, () => scene.shapes(ART.shoe))
          scene.shapes(ART.shin)
        }),
      )
    }),
  )
}

function head(scene: Scene, pose: Pose, eyes: Pose['face']['eyes']) {
  const neck = { x: REST.neck.x, y: REST.neck.y }
  scene.group({ k: K_TURN, s: 'tilt', ...neck }, () =>
    scene.group({ k: K_LOOP, s: 'headIdle', ...neck }, () =>
      scene.group({ k: K_LOOP, s: 'head', ...neck }, () =>
        scene.fixed(`translate(0 ${HEAD_DROP})`, () => {
          scene.group({ k: K_SLIDE, s: 'turn', z: -2.8 }, () => scene.shapes(ART.ears))
          scene.shapes(ART.skull)

          scene.group({ k: K_SLIDE, s: 'turn', z: 7 }, () => {
            scene.group(null, () => scene.shapes(ART.blush), { k: A_CHAN, s: 'blush' })
            scene.group({ k: K_LOOK }, () =>
              scene.group({ k: K_LOOP, s: 'eyes', x: 0, y: 0 }, () =>
                scene.group({ k: K_LOOP, s: 'blink', x: REST.neck.x, y: art.EYE_L.y }, () =>
                  scene.group({ k: K_BLINK, x: REST.neck.x, y: art.EYE_L.y }, () =>
                    scene.shapes(variant(`eyes-${eyes}`, () => art.eyes(eyes))),
                  ),
                ),
              ),
            )
            scene.group({ k: K_BROW, x: art.EYE_L.x, y: art.BROW_Y, s: 'bLy', s2: 'bLr' }, () => scene.shapes(ART.browL))
            scene.group({ k: K_BROW, x: art.EYE_R.x, y: art.BROW_Y, s: 'bRy', s2: 'bRr' }, () => scene.shapes(ART.browR))
            // a new mouth pops in with a little bounce
            scene.group({ k: K_MOUTH, x: art.MOUTH_AT.x, y: art.MOUTH_AT.y }, () =>
              scene.shapes(variant(`mouth-${pose.face.mouth}`, () => art.mouth(pose.face.mouth))),
            )
          })

          scene.group({ k: K_SLIDE, s: 'turn', z: 9.45 }, () => scene.shapes(ART.nose))
          scene.group({ k: K_LOOP, s: 'hair', x: 0, y: 0 }, () => scene.shapes(ART.hair))
          scene.group(null, () => scene.shapes(ART.phonesOn), { k: A_CHAN, s: 'phones' })
        }),
      ),
    ),
  )
}

export function buildScene(pose: Pose, eyes: Pose['face']['eyes'], extras: Extra[], seat: boolean, still: boolean) {
  const scene = new Scene()
  const feet = { x: REST.pelvis.x, y: GROUND }
  const pelvis = { x: REST.pelvis.x, y: REST.pelvis.y }
  const arms = (behind: boolean) =>
    (['L', 'R'] as const).forEach((s) => {
      const a = s === 'L' ? pose.armL : pose.armR
      if (Boolean(a.behind) === behind) arm(scene, s, a, pose)
    })

  if (seat) {
    scene.shapes(ART.benchShadow)
    for (const b of BENCH)
      scene.fixed(`translate(${b.x} ${b.y ?? GROUND - b.size / 2}) rotate(${b.rot})`, () =>
        scene.shapes(variant(`block-${b.slug}-${b.size}`, () => art.block(b.size, b.color, b.slug))),
      )
  }
  addExtras(scene, extras, pose, 'back', still)

  // the shadow stays on the ground while he jumps
  scene.group(
    { k: K_SHADOW },
    () => scene.group({ k: K_LOOP, s: 'shadow', x: REST.pelvis.x, y: GROUND + 4 }, () => scene.shapes(ART.shadow)),
    { k: A_CHAN, s: 'shadow' },
  )

  scene.group({ k: K_BODY }, () =>
    // anticipation and settle: a small squash as he gathers himself for a new pose
    scene.group({ k: K_SQUASH, ...feet }, () =>
      scene.group({ k: K_LOOP, s: 'bodyIdle', ...feet }, () =>
        scene.group({ k: K_LOOP, s: 'body', ...feet }, () => {
          leg(scene, 'L')
          leg(scene, 'R')
          scene.group({ k: K_TURN, s: 'lean', ...pelvis }, () =>
            scene.group({ k: K_LOOP, s: 'upperIdle', ...pelvis }, () =>
              scene.group({ k: K_LOOP, s: 'upper', ...pelvis }, () => {
                arms(true)
                scene.shapes(ART.torso)
                scene.group(null, () => scene.shapes(ART.band), { k: A_CHAN_INV, s: 'phones' })
                scene.shapes(ART.chest)
                scene.group({ k: K_LOOP, s: 'strings', x: art.STRINGS_PIVOT.x, y: art.STRINGS_PIVOT.y }, () => scene.shapes(ART.strings))
                scene.group(null, () => scene.shapes(ART.cups), { k: A_CHAN_INV, s: 'phones' })
                head(scene, pose, eyes)
                arms(false)
              }),
            ),
          )
        }),
      ),
    ),
  )

  addExtras(scene, extras, pose, 'front', still)
  return scene.ops
}
