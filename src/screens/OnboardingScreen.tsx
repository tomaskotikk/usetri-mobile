import { useRef, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated'
import { Button, Press } from '../components/ui'
import { Mascot, type MascotMood } from '../components/Mascot'
import { colors, motion, radius } from '../theme'

const SLIDES: {
  mood: MascotMood
  holds?: 'coin' | 'bag'
  title: string
  text: string
}[] = [
  {
    mood: 'wave',
    title: 'Předplatné se platí\nve více lidech',
    text: 'Rodinné tarify jsou stavěné pro šest lidí. Když je využiješ sám, platíš za pět prázdných míst.',
  },
  {
    mood: 'search',
    title: 'Najdi volné místo',
    text: 'V Objevit vidíš skupiny, kterým zbývá místo. Přidáš se jedním klepnutím a platíš jen svůj podíl.',
  },
  {
    mood: 'idle',
    holds: 'bag',
    title: 'Nebo založ vlastní',
    text: 'Máš tarif, ve kterém zbývá místo? Vyber službu, nastav cenu za osobu a nech se najít.',
  },
  {
    mood: 'cheer',
    title: 'Sleduj, kolik ušetříš',
    text: 'Na Domů vidíš rozdíl mezi tím, co platíš, a tím, co by stálo mít všechno sám.',
  },
]

/** Shown once after the first sign-in. The caller stores that it has been seen. */
export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scroller = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const last = index === SLIDES.length - 1

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width)
    if (next !== index) setIndex(next)
  }

  const advance = () => {
    if (last) return onDone()
    scroller.current?.scrollTo({ x: (index + 1) * width, animated: true })
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.navyMid, '#081327', colors.navyDeep]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.top, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.wordmark}>
          Ušetři<Text style={{ color: colors.brand }}>.</Text>
        </Text>
        {!last && (
          <Press onPress={onDone} scaleTo={0.92}>
            <Text style={styles.skip}>Přeskočit</Text>
          </Press>
        )}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Animated.View entering={FadeIn.delay(i === 0 ? 120 : 0).duration(motion.slow)}>
              <View style={styles.art}>
                <View style={styles.artGlow} />
                <Mascot size={172} mood={slide.mood} holds={slide.holds} />
              </View>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(i === 0 ? 200 : 0).duration(motion.slow)}
              style={styles.title}
            >
              {slide.title}
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(i === 0 ? 280 : 0).duration(motion.slow)}
              style={styles.text}
            >
              {slide.text}
            </Animated.Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <Dot key={slide.title} active={i === index} />
          ))}
        </View>
        <Button label={last ? 'Jdeme na to' : 'Dál'} onPress={advance} icon="arrow-right" />
      </View>
    </View>
  )
}

/** The active dot stretches into a pill rather than just changing colour. */
function Dot({ active }: { active: boolean }) {
  const progress = useDerivedValue(() => withSpring(active ? 1 : 0, { damping: 18, stiffness: 220 }))

  const animated = useAnimatedStyle(() => ({
    width: 7 + progress.value * 17,
    opacity: 0.32 + progress.value * 0.68,
    backgroundColor: progress.value > 0.5 ? colors.brand : colors.white,
  }))

  return <Animated.View style={[styles.dot, animated]} />
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navyDeep },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 6,
  },
  wordmark: { color: colors.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  skip: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  art: { alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  // A soft disc behind him, so he is not floating on flat navy.
  artGlow: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: 'rgba(0,217,154,0.10)',
  },
  title: {
    color: colors.white,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -1.1,
    textAlign: 'center',
    lineHeight: 35,
  },
  text: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 14,
  },
  bottom: { paddingHorizontal: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 7, borderRadius: radius.pill, backgroundColor: colors.white },
})
