import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated'
import { Canvas, createPicture, Picture } from '@shopify/react-native-skia'
import { applyCommand, evaluate, poseLoops, poseTargets, staticState, type Command, type EngineState, type Out } from './engine'
import type { Extra } from './extras'
import { VIEW, type Pose } from './rig'
import { buildScene } from './scene'
import { drawOps } from './skia'

/*
 * The puppet, as on the website: every moving part is its own layer, nested the
 * way the bones are — shoulder › elbow › wrist › hand. Here a layer is a group of
 * drawing ops in one Skia picture, re-recorded on the UI thread each frame with
 * the joints where the engine puts them, and drawn on the GPU. The artwork is
 * compiled once; a pose change rebuilds only the (cheap) list of ops.
 */

/**
 * Stops every Ušetřílek inside it where he is — for pages out of sight or covered
 * by a sheet, where nobody sees him but his frames would still cost the UI thread.
 */
export const UsetrilekPause = createContext(false)

// --- the puppet ---------------------------------------------------------------------------------------------

export type PuppetProps = {
  pose: Pose
  /** A key of MOTIONS. */
  motion?: string
  extras?: Extra[]
  seat?: boolean
  shadow?: boolean
  /** Freezes him: no loops, no transitions. */
  still?: boolean
  /** Pixels per artboard unit. */
  k: number
}

export function Puppet({ pose, motion = 'none', extras = [], seat = false, shadow = true, still: frozen = false, k }: PuppetProps) {
  const reduce = useReducedMotion()
  const still = frozen || reduce
  const paused = useContext(UsetrilekPause)

  const [initial] = useState(() => staticState(poseTargets(pose, seat, shadow)))
  const state = useSharedValue<EngineState>(initial)
  const out = useSharedValue<Out>(evaluate(initial, 0))
  const command = useSharedValue<Command | null>(null)
  const seq = useRef(0)
  const started = useRef(false)
  const lastFace = useRef(pose.face)
  const [eyes, setEyes] = useState(pose.face.eyes)

  const frame = useFrameCallback((info) => {
    'worklet'
    const now = info.timestamp
    const cmd = command.value
    let s = state.value
    if (cmd && cmd.seq !== s.seq) {
      s = applyCommand(s, cmd, now)
      state.value = s
    }
    out.value = evaluate(s, now)
  }, false)

  const key = JSON.stringify([motion, pose, seat, shadow, still])
  useLayoutEffect(() => {
    const targets = poseTargets(pose, seat, shadow)
    const face = lastFace.current
    lastFace.current = pose.face
    if (still) {
      const s = staticState(targets)
      command.value = null
      state.value = s
      out.value = evaluate(s, 0)
      started.current = false
      return
    }
    seq.current += 1
    command.value = {
      seq: seq.current,
      targets,
      loops: poseLoops(pose, motion),
      first: !started.current,
      eyes: started.current && face.eyes !== pose.face.eyes,
      mouth: started.current && face.mouth !== pose.face.mouth,
    }
    started.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    frame.setActive(!still && !paused)
    return () => frame.setActive(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, paused])

  // Eyes change behind a blink, the way an animator hides a swap.
  useEffect(() => {
    if (pose.face.eyes === eyes) return
    const id = setTimeout(() => setEyes(pose.face.eyes), still ? 0 : 100)
    return () => clearTimeout(id)
  }, [pose.face.eyes, eyes, still])

  const extrasKey = extras.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ops = useMemo(() => buildScene(pose, eyes, extras, seat, still), [key, eyes, extrasKey])

  const width = VIEW.w * k
  const height = VIEW.h * k
  const picture = useDerivedValue(() =>
    createPicture(
      (canvas) => {
        canvas.scale(k, k)
        canvas.translate(-VIEW.x, -VIEW.y)
        drawOps(canvas, ops, out.value)
      },
      { width, height },
    ),
  )

  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <Picture picture={picture} />
    </Canvas>
  )
}
