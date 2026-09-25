import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Puppet } from './Puppet'

export { UsetrilekPause } from './Puppet'
import { POSES, type PoseDef } from './poses'
import { VIEW, type Face } from './rig'

/*
 * Ušetřílek in the app. Everything under this folder except Puppet, skia,
 * extras and engine is copied as-is from the website's components/usetrilek —
 * art, rig, poses, motion, palette, shapes. Change them there and copy them over,
 * so both products show the same figure.
 */

const hangL = { upper: 101, fore: 97, hand: 'relaxed' } as const
const hangR = { upper: 79, fore: 83, hand: 'relaxed', flip: true } as const
const standL = { thigh: 91, shin: 91, toe: 5 }
const standR = { thigh: 89, shin: 89, toe: -5 }

/** Poses only the app needs, next to the website's library. */
const APP_POSES: PoseDef[] = [
  {
    id: 'spi',
    motion: 'none',
    name: 'Spí',
    use: 'Prázdný katalog — nic se neděje',
    pose: {
      tilt: 12,
      armL: hangL,
      armR: hangR,
      legL: standL,
      legR: standR,
      face: { eyes: 'closed', brows: 'neutral', mouth: 'o', blush: 1.2 },
    },
    extras: ['zzz'],
  },
  {
    id: 'visi',
    motion: 'none',
    name: 'Visí',
    use: 'Stažení seznamu dolů',
    pose: {
      armL: { upper: -98, fore: -94, hand: 'fist', flip: true },
      armR: { upper: -82, fore: -86, hand: 'fist' },
      legL: { thigh: 96, shin: 100, toe: 10 },
      legR: { thigh: 84, shin: 80, toe: -10 },
      face: { eyes: 'wide', brows: 'raised', mouth: 'grin', look: [0, -0.8] },
    },
  },
]

const BY_ID = new Map([...POSES, ...APP_POSES].map((p) => [p.id, p]))

export type UsetrilekPose =
  | 'ahoj'
  | 'stoji'
  | 'premysli'
  | 'hura'
  | 'ukazuje'
  | 'qr'
  | 'mince'
  | 'hleda'
  | 'palec'
  | 'krci'
  | 'nese'
  | 'ceka'
  | 'posloucha'
  | 'zve'
  | 'sedi'
  | 'spi'
  | 'visi'

/** The part of the artboard he actually occupies; the rest is reach for his arms. */
const CROP = { x: 25, y: 20, w: 250, h: 412 }
/** Sitting, he brings his bench of subscriptions, which is wider than he is. */
const CROP_SEATED = { x: -12, y: 20, w: 324, h: 412 }

/** Width of the figure at a given height, for layouts that need to reserve room. */
export const usetrilekWidth = (height: number, pose: UsetrilekPose = 'stoji') =>
  (height * (BY_ID.get(pose)?.seat ? CROP_SEATED : CROP).w) / CROP.h

/**
 * Ušetřílek, posed and moving. `height` is from the top of his hair to the ground
 * under his feet; confetti, thoughts and notes may spill outside that box.
 */
export function Usetrilek({
  pose = 'stoji',
  height = 160,
  face,
  still = false,
  shadow = true,
  style,
}: {
  pose?: UsetrilekPose
  height?: number
  /** Overrides on top of the pose's face — a tongue, a look. */
  face?: Partial<Face>
  /** No loops, no transitions: for small or repeated places. */
  still?: boolean
  shadow?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const def = BY_ID.get(pose) ?? BY_ID.get('stoji')!
  const crop = def.seat ? CROP_SEATED : CROP
  const k = height / crop.h
  const posed = face ? { ...def.pose, face: { ...def.pose.face, ...face } } : def.pose

  return (
    <View style={[{ width: crop.w * k, height }, style]} pointerEvents="none">
      <View style={{ position: 'absolute', left: -(crop.x - VIEW.x) * k, top: -(crop.y - VIEW.y) * k }}>
        <Puppet pose={posed} motion={def.motion} extras={def.extras} seat={def.seat} shadow={shadow} still={still} k={k} />
      </View>
    </View>
  )
}
