import { useEffect, useMemo, useRef } from 'react'
import { PanResponder, View } from 'react-native'
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '../theme'
import { GEOMETRY } from './globe-geometry'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const TILT = (-16 * Math.PI) / 180
const SIN_TILT = Math.sin(TILT)
const COS_TILT = Math.cos(TILT)

/**
 * A dot is a zero-length stroke with a round cap: ~18 characters instead of the
 * ~50 an arc pair costs. With hundreds of dots per frame that difference is the
 * whole budget for handing the path to the native renderer.
 */
function dot(x: number, y: number) {
  'worklet'
  return `M${x.toFixed(1)} ${y.toFixed(1)}l.01 0`
}

/** Spins the point around the pole, tilts it, and drops it onto the viewport. */
function project(x: number, y: number, z: number, cos: number, sin: number, r: number, c: number) {
  'worklet'
  const x1 = x * cos + z * sin
  const z1 = -x * sin + z * cos
  const y2 = y * COS_TILT - z1 * SIN_TILT
  const z2 = y * SIN_TILT + z1 * COS_TILT
  return { x: c + x1 * r, y: c - y2 * r, z: z2 }
}

/** Builds one stroke-dot path out of a flat [x,y,z,…] array, front hemisphere only. */
function dotsPath(pts: number[], cos: number, sin: number, r: number, c: number, depth: number) {
  'worklet'
  let d = ''
  for (let i = 0; i < pts.length; i += 3) {
    const p = project(pts[i], pts[i + 1], pts[i + 2], cos, sin, r, c)
    if (p.z > depth) d += dot(p.x, p.y)
  }
  return d
}

/** Polylines (graticule, great-circle links) clipped at the horizon. */
function linesPath(lines: number[][], cos: number, sin: number, r: number, c: number, lift: number) {
  'worklet'
  let d = ''
  for (let l = 0; l < lines.length; l++) {
    const pts = lines[l]
    let drawing = false
    for (let i = 0; i < pts.length; i += 3) {
      const p = project(pts[i] * lift, pts[i + 1] * lift, pts[i + 2] * lift, cos, sin, r, c)
      if (p.z > 0) {
        d += `${drawing ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        drawing = true
      } else {
        drawing = false
      }
    }
  }
  return d
}

/**
 * The website's dot globe, rebuilt for the phone. All per-frame maths runs in a
 * Reanimated worklet on the UI thread, so React never re-renders while it spins.
 */
export function Globe({ size }: { size: number }) {
  const geo = useMemo(() => GEOMETRY, [])

  const spin = useSharedValue(0)
  const drag = useSharedValue(0)
  const pulse = useSharedValue(0)

  useEffect(() => {
    // One seamless revolution; 2π wraps back onto 0 so there is no jump.
    spin.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 62000, easing: Easing.linear }),
      -1,
      false,
    )
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true)
    return () => {
      cancelAnimation(spin)
      cancelAnimation(pulse)
    }
  }, [spin, pulse])

  const lastDx = useRef(0)
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderGrant: () => {
        cancelAnimation(drag)
        lastDx.current = 0
      },
      onPanResponderMove: (_, g) => {
        drag.value += (g.dx - lastDx.current) * 0.007
        lastDx.current = g.dx
      },
      onPanResponderRelease: (_, g) => {
        drag.value = withDecay({ velocity: g.vx * 7, deceleration: 0.996 })
      },
    }),
  ).current

  const r = size * 0.38
  const c = size / 2
  const dotSize = Math.max(1.7, size / 118)

  // One worklet per frame produces every path; the five props below just read it.
  const paths = useDerivedValue(() => {
    // 0.5 rad puts the Atlantic up front: Americas left, Europe right.
    const angle = 0.5 + spin.value + drag.value
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    return {
      land: dotsPath(geo.land, cos, sin, r, c, 0),
      ocean: dotsPath(geo.ocean, cos, sin, r, c, 0.02),
      grid: linesPath(geo.graticule, cos, sin, r, c, 1),
      links: linesPath(geo.links, cos, sin, r, c, 1.07),
      cities: dotsPath(geo.cities, cos, sin, r, c, 0.02),
    }
  }, [geo, r, c])

  const landProps = useAnimatedProps(() => ({ d: paths.value.land }))
  const oceanProps = useAnimatedProps(() => ({ d: paths.value.ocean }))
  const gridProps = useAnimatedProps(() => ({ d: paths.value.grid }))
  const linkProps = useAnimatedProps(() => ({ d: paths.value.links }))
  const cityProps = useAnimatedProps(() => ({ d: paths.value.cities }))
  const haloProps = useAnimatedProps(() => ({
    d: paths.value.cities,
    strokeWidth: dotSize * (3.2 + pulse.value * 2.6),
    strokeOpacity: 0.26 - pulse.value * 0.14,
  }))

  return (
    <View style={{ width: size, height: size }} {...pan.panHandlers}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="atmo" cx="50%" cy="50%" r="50%">
            <Stop offset="58%" stopColor={colors.brand} stopOpacity={0} />
            <Stop offset="84%" stopColor={colors.brand} stopOpacity={0.16} />
            <Stop offset="100%" stopColor={colors.cyan} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="body" cx="34%" cy="26%" r="80%">
            <Stop offset="0%" stopColor="#15406f" />
            <Stop offset="55%" stopColor="#0a2145" />
            <Stop offset="100%" stopColor="#04101f" />
          </RadialGradient>
        </Defs>

        <Circle cx={c} cy={c} r={r * 1.28} fill="url(#atmo)" />
        <Circle cx={c} cy={c} r={r} fill="url(#body)" />

        {/* meridians and parallels give the sphere its sense of rotation */}
        <AnimatedPath
          animatedProps={gridProps}
          stroke="#5b8ac2"
          strokeOpacity={0.18}
          strokeWidth={0.7}
          fill="none"
        />
        <AnimatedPath
          animatedProps={oceanProps}
          stroke="#4478b8"
          strokeOpacity={0.5}
          strokeWidth={dotSize * 0.62}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedPath
          animatedProps={landProps}
          stroke="#b9ffe8"
          strokeOpacity={0.94}
          strokeWidth={dotSize}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedPath
          animatedProps={linkProps}
          stroke={colors.brand}
          strokeOpacity={0.5}
          strokeWidth={1}
          fill="none"
        />
        <AnimatedPath
          animatedProps={haloProps}
          stroke={colors.brand}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedPath
          animatedProps={cityProps}
          stroke={colors.brand}
          strokeWidth={dotSize * 2.4}
          strokeLinecap="round"
          fill="none"
        />

        <Circle cx={c} cy={c} r={r} stroke="rgba(13,27,54,0.14)" strokeWidth={1} fill="none" />
      </Svg>
    </View>
  )
}
