import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import { colors, motion, radius, shadow } from '../theme'
import { Mascot, type MascotMood } from './Mascot'
import { BrandGlyph, hasGlyph } from './BrandGlyph'
import { monogram } from '../lib/data'

type IconName = React.ComponentProps<typeof Feather>['name']

/** Google's own four-colour mark. */
export function GoogleLogo({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.63l4.01 3.09C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </Svg>
  )
}

/**
 * A press target that dips under the finger. Every tappable surface bigger than an
 * icon uses this, so the whole app answers touch the same way.
 */
export function Press({
  onPress,
  onLongPress,
  disabled = false,
  scaleTo = 0.97,
  style,
  children,
}: {
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  scaleTo?: number
  style?: ViewStyle | ViewStyle[]
  children: React.ReactNode
}) {
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 })
      }}
    >
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  )
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  leading,
  style,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  loading?: boolean
  disabled?: boolean
  icon?: IconName
  leading?: React.ReactNode
  style?: ViewStyle
}) {
  const tones = {
    primary: { bg: colors.brand, fg: colors.brandForeground, border: 'transparent' },
    outline: { bg: colors.white, fg: colors.navyDeep, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.muted, border: 'transparent' },
    danger: { bg: '#fdeceb', fg: '#a3241a', border: 'transparent' },
  } as const

  const tone = tones[variant]
  const off = disabled || loading

  return (
    <Press onPress={onPress} disabled={off} scaleTo={0.96}>
      <View
        style={[
          styles.button,
          { backgroundColor: tone.bg, borderColor: tone.border, opacity: off ? 0.55 : 1 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={tone.fg} />
        ) : (
          <>
            {leading}
            {icon && <Feather name={icon} size={17} color={tone.fg} />}
            <Text style={[styles.buttonLabel, { color: tone.fg }]}>{label}</Text>
          </>
        )}
      </View>
    </Press>
  )
}

export function IconButton({
  icon,
  onPress,
  tone = 'light',
  size = 34,
}: {
  icon: IconName
  onPress: () => void
  tone?: 'light' | 'dark'
  size?: number
}) {
  const dark = tone === 'dark'
  return (
    <Press onPress={onPress} scaleTo={0.9}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? 'rgba(255,255,255,0.09)' : colors.white,
          borderWidth: dark ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Feather name={icon} size={16} color={dark ? 'rgba(255,255,255,0.75)' : colors.navyDeep} />
      </View>
    </Press>
  )
}

export function Field({
  label,
  secure = false,
  suffix,
  ...props
}: TextInputProps & { label?: string; secure?: boolean; suffix?: string }) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(secure)

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          {...props}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="#9aa3b4"
          style={styles.input}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  )
}

export function Banner({ tone, text }: { tone: 'error' | 'info'; text: string }) {
  const error = tone === 'error'
  return (
    <Animated.View
      entering={FadeIn.duration(motion.quick)}
      exiting={FadeOut.duration(motion.quick)}
      style={[styles.banner, { backgroundColor: error ? '#fdeceb' : 'rgba(0,217,154,0.12)' }]}
    >
      <Feather
        name={error ? 'alert-circle' : 'check-circle'}
        size={15}
        color={error ? '#d63b2f' : colors.brandForeground}
      />
      <Text style={[styles.bannerText, { color: error ? '#a3241a' : colors.brandForeground }]}>
        {text}
      </Text>
    </Animated.View>
  )
}

/**
 * Services get their own mark on a tinted tile, falling back to initials for any
 * slug we haven't drawn. The marks are original shapes in the brand's colour — we
 * still never ship anyone else's actual logo files. See glyphShapes.ts.
 */
export function ServiceMark({
  name,
  color,
  slug,
  size = 42,
}: {
  name: string
  color: string
  slug?: string
  size?: number
}) {
  if (hasGlyph(slug)) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.33,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}1f`,
          borderWidth: 1,
          borderColor: `${color}33`,
        }}
      >
        <BrandGlyph slug={slug as string} size={size * 0.54} color={color} />
      </View>
    )
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.33,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${color}1f`,
        borderWidth: 1,
        borderColor: `${color}33`,
      }}
    >
      <Text style={{ color, fontSize: size * 0.34, fontWeight: '800', letterSpacing: -0.3 }}>
        {monogram(name)}
      </Text>
    </View>
  )
}

/**
 * A person: their provider picture when we have one, their initials otherwise.
 * Mirrors the Avatar on the website so a group looks the same in both places.
 */
export function Avatar({
  name,
  src,
  size = 36,
  ring,
}: {
  name: string
  src?: string | null
  size?: number
  /** Colour of the hairline that separates overlapping faces in a stack. */
  ring?: string
}) {
  const border = ring ? { borderWidth: 2, borderColor: ring } : null

  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, border]}
      />
    )
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        },
        border,
      ]}
    >
      <Text style={{ color: colors.brandForeground, fontSize: size * 0.34, fontWeight: '800' }}>
        {initials(name)}
      </Text>
    </View>
  )
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((w) => w[0]).join('').toUpperCase() || '?'
}

/**
 * Overlapping faces of everyone in a plan, with dashed placeholders for the seats
 * still going spare — the same treatment as the website's offer cards.
 */
export function MemberStack({
  members,
  free,
  size = 28,
  ring = colors.white,
}: {
  members: { id: string; name: string; avatar: string | null }[]
  free: number
  size?: number
  ring?: string
}) {
  const shown = members.slice(0, 4)
  const hidden = members.length - shown.length
  const overlap = -size * 0.28

  const pill = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: overlap,
    borderWidth: 2,
    borderColor: ring,
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: -overlap }}>
      {shown.map((m) => (
        <View key={m.id} style={{ marginLeft: overlap }}>
          <Avatar name={m.name} src={m.avatar} size={size} ring={ring} />
        </View>
      ))}

      {hidden > 0 && (
        <View style={[pill, { backgroundColor: colors.navyDeep }]}>
          <Text style={{ color: colors.white, fontSize: size * 0.34, fontWeight: '800' }}>
            +{hidden}
          </Text>
        </View>
      )}

      {Array.from({ length: Math.min(Math.max(free, 0), 3) }).map((_, i) => (
        <View
          key={`free-${i}`}
          style={[
            pill,
            { backgroundColor: colors.white, borderStyle: 'dashed', borderColor: `${colors.muted}59` },
          ]}
        >
          <Text style={{ color: colors.muted, fontSize: size * 0.4, fontWeight: '700' }}>+</Text>
        </View>
      ))}
    </View>
  )
}

export function Tag({ label, tone = 'brand' }: { label: string; tone?: 'brand' | 'dark' | 'muted' }) {
  const tones = {
    brand: { bg: 'rgba(0,217,154,0.16)', fg: colors.brandForeground },
    dark: { bg: colors.navyDeep, fg: colors.white },
    muted: { bg: '#eef1f7', fg: colors.muted },
  } as const
  const t = tones[tone]
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <Text style={[styles.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  )
}

export function Card({ style, children }: { style?: ViewStyle; children: React.ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function EmptyState({
  icon,
  mascot,
  title,
  text,
  action,
}: {
  icon: IconName
  /** Given a mood, Ušetřík stands in for the icon — an empty screen is where he helps most. */
  mascot?: MascotMood
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <View style={styles.empty}>
      {mascot ? (
        <Mascot size={104} mood={mascot} />
      ) : (
        <View style={styles.emptyIcon}>
          <Feather name={icon} size={20} color={colors.muted} />
        </View>
      )}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action}
    </View>
  )
}

/** Horizontal pills that scroll when there are more than fit — used for categories. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    // segmentedTrack pins the height to the content: left to grow, a horizontal
    // ScrollView swallows every spare row of a flexing column.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.segmentedTrack}
      contentContainerStyle={styles.segmented}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <Press key={option.value} onPress={() => onChange(option.value)} scaleTo={0.94}>
            <View style={[styles.segment, active && styles.segmentActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </View>
          </Press>
        )
      })}
    </ScrollView>
  )
}

export function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta))
    if (next !== value) onChange(next)
  }

  return (
    <View style={styles.stepper}>
      <Press onPress={() => step(-1)} disabled={value <= min} scaleTo={0.88}>
        <View style={[styles.stepperButton, value <= min && styles.stepperOff]}>
          <Feather name="minus" size={16} color={colors.navyDeep} />
        </View>
      </Press>
      <Text style={styles.stepperValue}>{value}</Text>
      <Press onPress={() => step(1)} disabled={value >= max} scaleTo={0.88}>
        <View style={[styles.stepperButton, value >= max && styles.stepperOff]}>
          <Feather name="plus" size={16} color={colors.navyDeep} />
        </View>
      </Press>
    </View>
  )
}

/** Filled dots for taken seats, hollow for free ones. */
export function Seats({ total, taken, dark = false }: { total: number; taken: number; dark?: boolean }) {
  return (
    <View style={styles.seats}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.seatDot,
            { backgroundColor: dark ? 'rgba(255,255,255,0.22)' : colors.border },
            i < taken && { backgroundColor: colors.brand },
          ]}
        />
      ))}
    </View>
  )
}

/**
 * Counts from zero to `value` on mount. Driven from JS on purpose: the text content
 * has to change, which a native animation cannot do on its own.
 */
export function CountUp({
  value,
  format,
  style,
  duration = 900,
}: {
  value: number
  format: (n: number) => string
  style?: object
  duration?: number
}) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const start = Date.now()
    const origin = from.current
    let frame: number

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration)
      // Cubic ease-out: fast first, settling at the end.
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(origin + (value - origin) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
      else from.current = value
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <Text style={style}>{format(shown)}</Text>
}

/**
 * A bottom sheet that slides up over a fading scrim. `full` takes the whole
 * screen instead — for flows long enough that a half-height sheet would spend
 * most of its room on the scrim.
 */
export function Sheet({
  open,
  onClose,
  title,
  full,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  full?: boolean
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  // The Modal must outlive `open` by the length of the exit, or RN tears the view
  // down before Reanimated can play it and the sheet vanishes instead of sliding.
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) return setMounted(true)
    const timer = setTimeout(() => setMounted(false), motion.base + 60)
    return () => clearTimeout(timer)
  }, [open])

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {open && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            entering={FadeIn.duration(motion.quick)}
            exiting={FadeOut.duration(motion.quick)}
            style={styles.scrim}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(320).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(240).easing(Easing.in(Easing.cubic))}
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 18 },
              full && [styles.sheetFull, { paddingTop: insets.top + 6 }],
            ]}
          >
            {!full && <View style={styles.grabber} />}
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <IconButton icon="x" onPress={onClose} />
            </View>
            {full ? (
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                {children}
              </KeyboardAvoidingView>
            ) : (
              children
            )}
          </Animated.View>
        </View>
      )}
    </Modal>
  )
}

/** A placeholder block that breathes while data is on its way. */
export function Skeleton({ height, width = '100%' }: { height: number; width?: number | '100%' }) {
  const pulse = useSharedValue(0.45)

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.9, { duration: 780 }), -1, true)
  }, [pulse])

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return (
    <Animated.View
      style={[{ height, width, borderRadius: radius.lg, backgroundColor: '#e8edf5' }, animated]}
    />
  )
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 },
  label: { color: colors.navyDeep, fontSize: 13, fontWeight: '600', marginBottom: 7 },
  field: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6ef',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  fieldFocused: { borderColor: colors.navy },
  input: { flex: 1, color: colors.navyDeep, fontSize: 15.5, height: '100%' },
  suffix: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  bannerText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2.5 },
  tagText: { fontSize: 10, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    ...shadow.card,
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: { color: colors.navyDeep, fontSize: 15.5, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  segmentedTrack: { flexGrow: 0, flexShrink: 0 },
  segmented: { gap: 8, paddingRight: 20 },
  segment: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.navyDeep, borderColor: colors.navyDeep },
  segmentText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.white },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperOff: { opacity: 0.4 },
  stepperValue: {
    color: colors.navyDeep,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  seats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seatDot: { width: 7, height: 7, borderRadius: 4 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,11,26,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetFull: {
    top: 0,
    maxHeight: undefined,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d3dae6',
    marginBottom: 12,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { color: colors.navyDeep, fontSize: 21, fontWeight: '800', letterSpacing: -0.6 },
})
