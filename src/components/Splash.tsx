import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Mascot } from './Mascot'
import { colors } from '../theme'

const INTRO = 520
const WAVE_AT = 640
const WAVE_FOR = 1500

/**
 * Ušetřík arrives, the wordmark settles under him, and he waves. The app is only
 * uncovered once that wave has played out *and* the session is resolved, so the
 * hand-off never cuts him off mid-gesture.
 */
export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const mark = useSharedValue(0)
  const dot = useSharedValue(0)
  const halo = useSharedValue(0)
  const cover = useSharedValue(1)

  const [waving, setWaving] = useState(false)
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => {
    mark.value = withTiming(1, { duration: INTRO, easing: Easing.out(Easing.cubic) })
    halo.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }))
    dot.value = withDelay(
      430,
      withSequence(
        withSpring(1.45, { damping: 9, stiffness: 240 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      ),
    )

    const startWave = setTimeout(() => setWaving(true), WAVE_AT)
    const endWave = setTimeout(() => setIntroDone(true), WAVE_AT + WAVE_FOR)

    return () => {
      clearTimeout(startWave)
      clearTimeout(endWave)
    }
  }, [mark, dot, halo])

  // Whichever finishes last — the wave or the session check — releases the screen.
  useEffect(() => {
    if (!introDone || !ready) return

    cover.value = withTiming(0, { duration: 440, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(onDone)()
    })
  }, [introDone, ready, cover, onDone])

  const layer = useAnimatedStyle(() => ({ opacity: cover.value }))

  const wordmark = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ translateY: (1 - mark.value) * 14 }, { scale: 0.94 + mark.value * 0.06 }],
  }))

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }] }))

  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.5,
    transform: [{ scale: 0.4 + halo.value * 1.6 }],
  }))

  return (
    <Animated.View style={[styles.root, layer]} pointerEvents="none">
      <LinearGradient
        colors={[colors.navyMid, '#081327', colors.navyDeep]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        <Animated.View style={[styles.halo, haloStyle]} />

        <Animated.View style={[styles.mascot, wordmark]}>
          <Mascot size={140} mood={waving ? 'wave' : 'idle'} />
        </Animated.View>

        <Animated.View style={[styles.row, wordmark]}>
          <Text style={styles.word}>Ušetři</Text>
          <Animated.View style={[styles.dot, dotStyle]} />
        </Animated.View>

        <Animated.Text style={[styles.tagline, wordmark]}>Předplatné ve dvou i v šesti</Animated.Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.brand,
  },
  mascot: { marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  word: { color: colors.white, fontSize: 42, fontWeight: '800', letterSpacing: -1.8 },
  dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand, marginBottom: 8 },
  tagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginTop: 12,
    letterSpacing: 0.2,
  },
})
