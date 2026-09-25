import { useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { Press } from './ui'
import { colors, radius, shadow } from '../theme'

export type TabKey = 'home' | 'discover' | 'groups' | 'profile'

const TABS: { key: TabKey; icon: React.ComponentProps<typeof Feather>['name']; label: string }[] = [
  { key: 'home', icon: 'home', label: 'Domů' },
  { key: 'discover', icon: 'compass', label: 'Objevit' },
  { key: 'groups', icon: 'users', label: 'Skupiny' },
  { key: 'profile', icon: 'user', label: 'Profil' },
]

const IDLE = '#9aa3b4'
const ACTIVE = colors.navyDeep

/**
 * Four tabs with the create action raised between them. The bar floats above the
 * content rather than sitting in a slot, so screens keep the full height and only
 * pad their scroll views by `TAB_BAR_SPACE`.
 *
 * Everything that marks the active tab is driven by `page` — the pager's position,
 * fractional mid-swipe — on the UI thread: the pill slides under the finger and the
 * icons trade colour as the pages trade places, without waiting for React. The
 * icons themselves stay put and keep their size.
 */
export function TabBar({
  page,
  onChange,
  onCreate,
}: {
  /** 0 = first tab; 1.5 = halfway between the second and third. */
  page: SharedValue<number>
  onChange: (key: TabKey) => void
  onCreate: () => void
}) {
  const insets = useSafeAreaInsets()
  // Centre of each tab within the bar, for the pill to travel between.
  const [centres, setCentres] = useState<number[]>([0, 0, 0, 0])
  const measured = centres.every((c) => c > 0)
  const place = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout
    setCentres((cs) => (cs[i] === x + width / 2 ? cs : cs.map((c, j) => (j === i ? x + width / 2 : c))))
  }

  const pill = useAnimatedStyle(() => ({
    opacity: measured ? 1 : 0,
    transform: [
      { translateX: interpolate(page.value, [0, 1, 2, 3], centres, 'clamp') - PILL / 2 },
      // Stretches a little while it travels, like a drop of ink.
      { scaleX: 1 + 0.6 * Math.abs(Math.sin(page.value * Math.PI)) },
    ],
  }))

  const tab = (t: (typeof TABS)[number], i: number) => (
    <Tab key={t.key} index={i} page={page} icon={t.icon} label={t.label} onPress={() => onChange(t.key)} onLayout={place(i)} />
  )

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <Animated.View style={[styles.pill, pill]} pointerEvents="none" />
        {TABS.slice(0, 2).map(tab)}

        <Press onPress={onCreate} scaleTo={0.9}>
          <View style={styles.fab}>
            <Feather name="plus" size={24} color={colors.brandForeground} />
          </View>
        </Press>

        {TABS.slice(2).map((t, i) => tab(t, i + 2))}
      </View>
    </View>
  )
}

function Tab({
  index,
  page,
  icon,
  label,
  onPress,
  onLayout,
}: {
  index: number
  page: SharedValue<number>
  icon: React.ComponentProps<typeof Feather>['name']
  label: string
  onPress: () => void
  onLayout: (e: LayoutChangeEvent) => void
}) {
  /** 1 on this tab, falling to 0 one page away. */
  const near = useDerivedValue(() => Math.max(0, 1 - Math.abs(page.value - index)))

  const on = useAnimatedStyle(() => ({ opacity: near.value }))
  const off = useAnimatedStyle(() => ({ opacity: 1 - near.value }))
  const text = useAnimatedStyle(() => ({ color: interpolateColor(near.value, [0, 1], [IDLE, ACTIVE]) }))

  return (
    <View style={styles.tabSlot} onLayout={onLayout}>
      <Press onPress={onPress} scaleTo={0.92} style={styles.tab}>
        <View style={styles.icon}>
          <Animated.View style={[StyleSheet.absoluteFill, off]}>
            <Feather name={icon} size={21} color={IDLE} />
          </Animated.View>
          <Animated.View style={on}>
            <Feather name={icon} size={21} color={ACTIVE} />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.tabLabel, text]}>{label}</Animated.Text>
      </Press>
    </View>
  )
}

/** How much room screens must leave at the bottom of their scroll content. */
export const TAB_BAR_SPACE = 104

const PILL = 18

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingTop: 9,
    paddingBottom: 11,
    ...shadow.float,
  },
  pill: {
    position: 'absolute',
    left: 0,
    bottom: 6,
    width: PILL,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  tabSlot: { flex: 1 },
  tab: { alignItems: 'center', gap: 3, paddingVertical: 2 },
  icon: { width: 21, height: 21 },
  tabLabel: { fontSize: 10.5, fontWeight: '600', color: IDLE },
  fab: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: -22,
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow.float,
  },
})
