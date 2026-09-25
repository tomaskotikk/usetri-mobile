import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Usetrilek } from '../usetrilek'

/** Past this much of a pull he gives up being dignified and sticks his tongue out. */
const TONGUE_AT = 0.62

/**
 * Ušetřílek hangs from the top edge while the list is pulled down, gripping with both
 * hands and swinging. Drag him far enough and he pokes his tongue out — the pull is
 * its own feedback, so there is no label to read.
 *
 * He lives behind the scroll view and is only uncovered by the overscroll gap the
 * content leaves behind. That makes him iOS-only in practice: Android answers an
 * overscroll with a glow instead of moving the content, so nothing is uncovered.
 */
export function PullMascot({
  pull,
  refreshing,
}: {
  pull: SharedValue<number>
  refreshing: boolean
}) {
  const insets = useSafeAreaInsets()
  const [cheeky, setCheeky] = useState(false)

  useAnimatedReaction(
    () => pull.value > TONGUE_AT,
    (out, previous) => {
      if (out !== previous) runOnJS(setCheeky)(out)
    },
  )

  // Swinging only while he is actually holding on, so he is still at rest.
  const swing = useDerivedValue(() =>
    pull.value > 0.15 || refreshing
      ? withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true)
      : withTiming(0.5, { duration: 200 }),
  )

  const body = useAnimatedStyle(() => {
    const shown = refreshing ? 1 : pull.value
    return {
      opacity: interpolate(shown, [0, 0.35, 1], [0, 0.4, 1]),
      transform: [
        { translateY: interpolate(shown, [0, 1], [-40, 2]) },
        { scale: interpolate(shown, [0, 1], [0.7, 1]) },
        { rotate: `${interpolate(swing.value, [0, 1], [-8, 8])}deg` },
        // Stretching him as he is dragged sells the weight of the pull.
        { scaleY: interpolate(shown, [0, 1], [1, 1.06]) },
      ],
    }
  })

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]} pointerEvents="none">
      {/* The pivot sits above his hands, so he swings from the grip and not the belly. */}
      <Animated.View style={[styles.pivot, body]}>
        <Usetrilek
          pose="visi"
          height={128}
          shadow={false}
          face={cheeky && !refreshing ? { mouth: 'tongue', eyes: 'wink' } : undefined}
          still
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  pivot: { transformOrigin: 'top center' },
})
