import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { InteractionManager, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { UsetrilekPause } from '../usetrilek'
import type { TabKey } from './TabBar'

/** In the order of the tab bar, so a swipe goes where the bar would. */
export const TAB_ORDER: TabKey[] = ['home', 'discover', 'groups', 'profile']
/** How close to the edge of the screen a swipe has to start. */
const EDGE = 40
/** Past this share of the width (or flicked), letting go turns the page. */
const COMMIT = 0.25
const SETTLE = { damping: 30, stiffness: 280, mass: 0.9, overshootClamping: true }

/**
 * The tabs as pages side by side, as in Instagram. Every tab stays mounted once it
 * has been built, so switching never rebuilds a screen: a swipe from either edge
 * drags the neighbouring page in under the finger, and a tap on the bar slides
 * across. `x` is the row's offset in pixels — the tab bar reads it to move its
 * indicator with the finger.
 */
export function Pager({
  tab,
  onChange,
  enabled,
  paused,
  x,
  pages,
}: {
  tab: TabKey
  onChange: (tab: TabKey) => void
  /** Off while a sheet or overlay is up. */
  enabled: boolean
  /** Holds every Ušetřílek still, e.g. while a sheet covers the tabs. */
  paused: boolean
  x: SharedValue<number>
  pages: Record<TabKey, ReactNode>
}) {
  const { width } = useWindowDimensions()
  const index = TAB_ORDER.indexOf(tab)

  // The first tab is built at once; the rest right after the first frame has
  // settled, so the first swipe already finds its neighbour ready.
  const [built, setBuilt] = useState<Set<TabKey>>(() => new Set([tab]))
  useEffect(() => {
    let task: { cancel: () => void } | undefined
    const id = setTimeout(() => {
      task = InteractionManager.runAfterInteractions(() => setBuilt(new Set(TAB_ORDER)))
    }, 500)
    return () => {
      clearTimeout(id)
      task?.cancel()
    }
  }, [])
  const shown = built.has(tab) ? built : new Set([...built, tab])

  const live = useRef({ index, enabled, width, onChange })
  live.current = { index, enabled, width, onChange }
  /** Set when a swipe has already sent the row on its way to the new tab. */
  const swiped = useRef(false)
  const start = useRef(0)

  // A tap on the bar (or a link to another tab) slides the row across.
  useLayoutEffect(() => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    x.value = withTiming(-index * width, { duration: 300, easing: Easing.out(Easing.cubic) })
  }, [index, width, x])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => {
          const { enabled, width } = live.current
          if (!enabled) return false
          if (g.x0 > EDGE && g.x0 < width - EDGE) return false
          // Clearly sideways; either way from either edge.
          return Math.abs(g.dx) >= 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5
        },
        onPanResponderGrant: () => {
          cancelAnimation(x)
          start.current = x.value
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          const { width } = live.current
          const min = -(TAB_ORDER.length - 1) * width
          const to = start.current + g.dx
          // Past the first or last tab the row only gives a little, like a rubber band.
          x.value = to > 0 ? to * 0.18 : to < min ? min + (to - min) * 0.18 : to
        },
        onPanResponderRelease: (_, g) => {
          const { width, index, onChange } = live.current
          const flicked = Math.abs(g.vx) > 0.45 && Math.sign(g.vx) === Math.sign(g.dx)
          const step = g.dx < 0 ? 1 : -1
          const turn = Math.abs(g.dx) > width * COMMIT || flicked
          const next = turn ? Math.min(TAB_ORDER.length - 1, Math.max(0, index + step)) : index
          x.value = withSpring(-next * width, { ...SETTLE, velocity: g.vx * 1000 })
          if (next !== index) {
            swiped.current = true
            onChange(TAB_ORDER[next])
          }
        },
        onPanResponderTerminate: () => {
          const { width, index } = live.current
          x.value = withSpring(-index * width, SETTLE)
        },
      }),
    [x],
  )

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <Animated.View style={[styles.row, { width: width * TAB_ORDER.length }, row]}>
        {TAB_ORDER.map((key) => (
          <View key={key} style={{ width }}>
            {/* Figures on pages out of sight hold still. */}
            <UsetrilekPause.Provider value={paused || key !== tab}>{shown.has(key) ? pages[key] : null}</UsetrilekPause.Provider>
          </View>
        ))}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row' },
})
