import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '../theme'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedText = Animated.createAnimatedComponent(SvgText)

export type MascotMood = 'idle' | 'wave' | 'cheer' | 'search' | 'sleep' | 'hang' | 'think'

/** Body tones derived from the brand green, so the mascot reads as the logo's dot. */
const SKIN = colors.brand
const SKIN_DARK = '#00b885'
const SKIN_LIGHT = colors.brandSoft
const INK = colors.navyDeep

/** Where the right arm meets the body. Everything in a wave turns about this point. */
const SHOULDER_X = 93
const SHOULDER_Y = 58

/** A four-point sparkle, drawn from its centre. */
function sparkle(x: number, y: number, r: number) {
  const w = r * 0.22
  return (
    `M${x} ${y - r} C${x + w} ${y - w} ${x + w} ${y - w} ${x + r} ${y} ` +
    `C${x + w} ${y + w} ${x + w} ${y + w} ${x} ${y + r} ` +
    `C${x - w} ${y + w} ${x - w} ${y + w} ${x - r} ${y} ` +
    `C${x - w} ${y - w} ${x - w} ${y - w} ${x} ${y - r} Z`
  )
}

/** A tied sack, held in his right hand where the coin would otherwise sit. */
// Pear-shaped with a flat, heavy base — a circle here just reads as a coin.
const BAG_NECK = 'M90 59 C93 55 101 55 104 59 L107 70 L87 70 Z'
const BAG_BODY =
  'M92 71 C88 78 80 84 80.5 90 C81 96.5 88 100.5 97 100.5 C106 100.5 113 96.5 113.5 90 C114 84 106 78 102 71 Z'

/**
 * The raised arm, swung by `deg` about the shoulder.
 *
 * Rotating the <G> instead would be the obvious way, but animating `rotation`
 * through animatedProps drops the static originX/originY, so react-native-svg turns
 * the arm about the canvas origin and it sails off the body. Turning the control
 * points here keeps the shoulder pinned where it belongs.
 */
function wavingArm(deg: number) {
  'worklet'
  const a = (deg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)

  const turn = (x: number, y: number) => {
    'worklet'
    const dx = x - SHOULDER_X
    const dy = y - SHOULDER_Y
    return [
      (SHOULDER_X + dx * cos - dy * sin).toFixed(1),
      (SHOULDER_Y + dx * sin + dy * cos).toFixed(1),
    ]
  }

  const c1 = turn(104, 50)
  const c2 = turn(108, 38)
  const end = turn(105, 29)

  return `M${SHOULDER_X} ${SHOULDER_Y} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${end[0]} ${end[1]}`
}

/**
 * Ušetřík — the wordmark's dot with a face. The body never changes between moods,
 * so he stays recognisable at any size; only the eyes, mouth and arms do.
 *
 * He breathes, blinks on his own, and each mood adds its own motion: waving swings
 * the arm, cheering adds a hop, searching sweeps his eyes, sleeping drifts the Zzz.
 * `animated={false}` freezes all of it for places where movement would compete with
 * the content.
 */
export function Mascot({
  size = 120,
  mood = 'idle',
  holds,
  tongue = false,
  animated = true,
}: {
  size?: number
  mood?: MascotMood
  /** What he carries in his right hand. The arm reaches for it either way. */
  holds?: 'coin' | 'bag'
  /** Sticks his tongue out — used while he is being dragged down a list. */
  tongue?: boolean
  animated?: boolean
}) {
  const bob = useSharedValue(0)
  const hop = useSharedValue(0)
  const wave = useSharedValue(0.5)
  const scan = useSharedValue(0)
  const twinkle = useSharedValue(1)
  const coinLift = useSharedValue(0)
  const drift = useSharedValue(0)

  const [blinking, setBlinking] = useState(false)

  // --- looping motion ---------------------------------------------------------
  useEffect(() => {
    if (!animated) return
    const slow = mood === 'sleep'
    bob.value = withRepeat(
      withTiming(1, { duration: slow ? 2600 : 1700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [animated, mood, bob])

  useEffect(() => {
    if (!animated || mood !== 'cheer') return
    // A hop, then a pause — a character that bounces without rest looks frantic.
    hop.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }),
        withDelay(900, withTiming(0, { duration: 1 })),
      ),
      -1,
      false,
    )
  }, [animated, mood, hop])

  useEffect(() => {
    if (!animated || mood !== 'wave') return
    wave.value = withRepeat(
      withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [animated, mood, wave])

  useEffect(() => {
    if (!animated || mood !== 'search') return
    // Look right, hold, look left, hold — a sweep, not a twitch.
    scan.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        withDelay(500, withTiming(0, { duration: 900, easing: Easing.inOut(Easing.cubic) })),
        withDelay(500, withTiming(0, { duration: 1 })),
      ),
      -1,
      false,
    )
  }, [animated, mood, scan])

  useEffect(() => {
    if (!animated) return
    twinkle.value = withRepeat(
      withTiming(0.35, { duration: mood === 'cheer' ? 620 : 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [animated, mood, twinkle])

  useEffect(() => {
    if (!animated || !holds) return
    coinLift.value = withRepeat(
      withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [animated, holds, coinLift])

  useEffect(() => {
    if (!animated || mood !== 'sleep') return
    drift.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false)
  }, [animated, mood, drift])

  // Eyes that are already shut have nothing to blink.
  useEffect(() => {
    if (!animated || mood === 'cheer' || mood === 'sleep') return

    let shut: ReturnType<typeof setTimeout>
    const timer = setInterval(() => {
      setBlinking(true)
      shut = setTimeout(() => setBlinking(false), 130)
    }, 3800)

    return () => {
      clearInterval(timer)
      clearTimeout(shut)
    }
  }, [animated, mood])

  // --- derived styles and props -----------------------------------------------
  const float = useAnimatedStyle(() => ({
    transform: [
      { translateY: -bob.value * 4 - hop.value * 12 },
      // A hop stretches him on the way up and settles flat again.
      { scaleY: 1 + hop.value * 0.05 },
      { scaleX: 1 - hop.value * 0.04 },
    ],
  }))

  const armProps = useAnimatedProps(() => ({ d: wavingArm(-16 + wave.value * 30) }))

  const gaze = useDerivedValue(() => (mood === 'search' ? -2.5 + scan.value * 6 : 0))
  const leftEye = useAnimatedProps(() => ({ cx: 47 + gaze.value }))
  const rightEye = useAnimatedProps(() => ({ cx: 73 + gaze.value }))
  const leftGlint = useAnimatedProps(() => ({ cx: 45 + gaze.value }))
  const rightGlint = useAnimatedProps(() => ({ cx: 71 + gaze.value }))

  const sparkleProps = useAnimatedProps(() => ({ opacity: twinkle.value }))
  const sparkleSmall = useAnimatedProps(() => ({ opacity: twinkle.value * 0.6 }))

  const coinCircle = useAnimatedProps(() => ({ cy: 81 - coinLift.value * 3 }))
  const coinLabel = useAnimatedProps(() => ({ y: 86 - coinLift.value * 3 }))
  const bagLift = useAnimatedStyle(() => ({ transform: [{ translateY: -coinLift.value * 3 }] }))

  const zzzNear = useAnimatedProps(() => ({ y: 33 - drift.value * 10, opacity: 1 - drift.value }))
  const zzzFar = useAnimatedProps(() => ({ y: 21 - drift.value * 12, opacity: 0.8 - drift.value * 0.8 }))

  const eyesShut = mood === 'cheer' || mood === 'sleep' || blinking
  const lookUp = mood === 'think' ? -2.5 : 0
  const still = !animated

  const leftArm =
    mood === 'hang'
      ? 'M34 50 C30 38 30 28 33 20'
      : mood === 'cheer'
        ? 'M28 56 C17 48 14 36 18 28'
        : 'M27 62 C18 66 16 75 21 81'

  const rightArm = holds
    ? 'M92 62 C98 66 100 70 99 73'
    : mood === 'hang'
      ? 'M86 50 C90 38 90 28 87 20'
      : mood === 'cheer'
        ? 'M92 56 C103 48 106 36 102 28'
        : mood === 'wave'
          ? wavingArm(-1)
          : 'M93 62 C102 66 104 75 99 81'

  const arm = { stroke: SKIN_DARK, strokeWidth: 9, strokeLinecap: 'round' as const, fill: 'none' }
  const lid = { stroke: INK, strokeWidth: 3.4, strokeLinecap: 'round' as const, fill: 'none' }

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={float}>
        <Svg width={size} height={size} viewBox="0 0 120 120">
          {/* Sparkles sit behind him so he never occludes his own highlights. */}
          {still ? (
            <>
              <Path d={sparkle(99, 27, 9)} fill={colors.cyan} opacity={0.9} />
              <Path d={sparkle(20, 41, 5.5)} fill={colors.cyan} opacity={0.55} />
            </>
          ) : (
            <>
              <AnimatedPath d={sparkle(99, 27, 9)} fill={colors.cyan} animatedProps={sparkleProps} />
              <AnimatedPath d={sparkle(20, 41, 5.5)} fill={colors.cyan} animatedProps={sparkleSmall} />
            </>
          )}

          {/* Feet and arms are drawn first: the body overlaps where they join. */}
          <Ellipse
            cx={mood === 'hang' ? 48 : 45}
            cy={mood === 'hang' ? 97 : 95}
            rx={9.5}
            ry={6.5}
            fill={SKIN_DARK}
          />
          <Ellipse
            cx={mood === 'hang' ? 72 : 75}
            cy={mood === 'hang' ? 97 : 95}
            rx={9.5}
            ry={6.5}
            fill={SKIN_DARK}
          />

          <Path d={leftArm} {...arm} />

          {mood === 'wave' && !holds && !still ? (
            <AnimatedPath {...arm} animatedProps={armProps} />
          ) : (
            <Path d={rightArm} {...arm} />
          )}

          {/* Body */}
          <Ellipse cx={60} cy={58} rx={36} ry={33} fill={SKIN} />
          <Ellipse cx={60} cy={43} rx={26} ry={16} fill={SKIN_LIGHT} opacity={0.55} />

          {/* Face */}
          {eyesShut ? (
            <>
              <Path d="M41 57 q6.5 -7 13 0" {...lid} />
              <Path d="M66 57 q6.5 -7 13 0" {...lid} />
            </>
          ) : still || mood !== 'search' ? (
            <>
              <Circle cx={47} cy={56 + lookUp} r={6.5} fill={INK} />
              <Circle cx={73} cy={56 + lookUp} r={6.5} fill={INK} />
              <Circle cx={45} cy={53.5 + lookUp} r={2.3} fill={colors.white} />
              <Circle cx={71} cy={53.5 + lookUp} r={2.3} fill={colors.white} />
            </>
          ) : (
            <>
              <AnimatedCircle cy={56} r={6.5} fill={INK} animatedProps={leftEye} />
              <AnimatedCircle cy={56} r={6.5} fill={INK} animatedProps={rightEye} />
              <AnimatedCircle cy={53.5} r={2.3} fill={colors.white} animatedProps={leftGlint} />
              <AnimatedCircle cy={53.5} r={2.3} fill={colors.white} animatedProps={rightGlint} />
            </>
          )}

          <Ellipse cx={35} cy={67} rx={5.5} ry={3.4} fill={INK} opacity={0.09} />
          <Ellipse cx={85} cy={67} rx={5.5} ry={3.4} fill={INK} opacity={0.09} />

          {tongue ? (
            <>
              <Path d="M47 68 q13 18 26 0 z" fill={INK} />
              <Path
                d="M53.5 73 L66.5 73 C66.5 84 63.5 89.5 60 89.5 C56.5 89.5 53.5 84 53.5 73 Z"
                fill={colors.danger}
              />
              <Path d="M60 79 v6" stroke="#d8483d" strokeWidth={1.6} strokeLinecap="round" />
            </>
          ) : mood === 'cheer' ? (
            <Path d="M50 70 q10 14 20 0 z" fill={INK} />
          ) : mood === 'search' ? (
            <Ellipse cx={60} cy={73} rx={4} ry={5} fill={INK} />
          ) : mood === 'sleep' ? (
            <Path d="M54 74 h12" {...lid} />
          ) : mood === 'think' ? (
            <Path d="M53 73 q7 4 14 -1" stroke={INK} strokeWidth={3.4} strokeLinecap="round" fill="none" />
          ) : (
            <Path d="M50 71 q10 9 20 0" stroke={INK} strokeWidth={3.6} strokeLinecap="round" fill="none" />
          )}

          {holds === 'coin' && (
            <G>
              {still ? (
                <>
                  <Circle cx={99} cy={81} r={14} fill={colors.white} stroke={INK} strokeWidth={2.6} />
                  <SvgText x={99} y={86} fontSize={12} fontWeight="bold" fill={INK} textAnchor="middle">
                    Kč
                  </SvgText>
                </>
              ) : (
                <>
                  <AnimatedCircle
                    cx={99}
                    r={14}
                    fill={colors.white}
                    stroke={INK}
                    strokeWidth={2.6}
                    animatedProps={coinCircle}
                  />
                  <AnimatedText
                    x={99}
                    fontSize={12}
                    fontWeight="bold"
                    fill={INK}
                    textAnchor="middle"
                    animatedProps={coinLabel}
                  >
                    Kč
                  </AnimatedText>
                </>
              )}
            </G>
          )}

          {mood === 'sleep' &&
            (still ? (
              <>
                <SvgText x={92} y={33} fontSize={13} fontWeight="bold" fill={colors.cyan}>
                  z
                </SvgText>
                <SvgText x={100} y={21} fontSize={17} fontWeight="bold" fill={colors.cyan}>
                  Z
                </SvgText>
              </>
            ) : (
              <>
                <AnimatedText x={92} fontSize={13} fontWeight="bold" fill={colors.cyan} animatedProps={zzzNear}>
                  z
                </AnimatedText>
                <AnimatedText x={100} fontSize={17} fontWeight="bold" fill={colors.cyan} animatedProps={zzzFar}>
                  Z
                </AnimatedText>
              </>
            ))}

          {mood === 'think' && (
            <SvgText x={24} y={32} fontSize={19} fontWeight="bold" fill={colors.cyan} textAnchor="middle">
              ?
            </SvgText>
          )}
        </Svg>
      </Animated.View>

      {holds === 'bag' && (
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, still ? undefined : bagLift]}>
          <Svg width={size} height={size} viewBox="0 0 120 120">
            <Path d={BAG_NECK} fill={colors.white} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
            <Path d={BAG_BODY} fill={colors.white} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
            {/* The cord that cinches the sack shut, drawn over both seams. */}
            <Rect x={85} y={67} width={24} height={6.5} rx={3.25} fill={INK} />
            <SvgText x={97} y={93} fontSize={12} fontWeight="bold" fill={INK} textAnchor="middle">
              Kč
            </SvgText>
          </Svg>
        </Animated.View>
      )}
    </View>
  )
}
