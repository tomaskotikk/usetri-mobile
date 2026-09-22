import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
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

/**
 * Four tabs with the create action raised between them. The bar floats above the
 * content rather than sitting in a slot, so screens keep the full height and only
 * pad their scroll views by `TAB_BAR_SPACE`.
 */
export function TabBar({
  active,
  onChange,
  onCreate,
}: {
  active: TabKey
  onChange: (key: TabKey) => void
  onCreate: () => void
}) {
  const insets = useSafeAreaInsets()
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {left.map((tab) => (
          <Tab
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            active={active === tab.key}
            onPress={() => onChange(tab.key)}
          />
        ))}

        <Press onPress={onCreate} scaleTo={0.9}>
          <View style={styles.fab}>
            <Feather name="plus" size={24} color={colors.brandForeground} />
          </View>
        </Press>

        {right.map((tab) => (
          <Tab
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            active={active === tab.key}
            onPress={() => onChange(tab.key)}
          />
        ))}
      </View>
    </View>
  )
}

function Tab({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name']
  label: string
  active: boolean
  onPress: () => void
}) {
  // One spring drives lift, colour and the dot, so the tab moves as a single object.
  const progress = useDerivedValue(() =>
    withSpring(active ? 1 : 0, { damping: 17, stiffness: 220 }),
  )

  const icons = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * 3 }, { scale: 1 + progress.value * 0.08 }],
  }))

  const dot = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.4 + progress.value * 0.6 }],
  }))

  return (
    <View style={styles.tabSlot}>
      <Press onPress={onPress} scaleTo={0.92} style={styles.tab}>
        <Animated.View style={icons}>
          <Feather name={icon} size={21} color={active ? colors.navyDeep : '#9aa3b4'} />
        </Animated.View>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
        <Animated.View style={[styles.tabDot, dot]} />
      </Press>
    </View>
  )
}

/** How much room screens must leave at the bottom of their scroll content. */
export const TAB_BAR_SPACE = 104

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
    paddingBottom: 7,
    ...shadow.float,
  },
  tabSlot: { flex: 1 },
  tab: { alignItems: 'center', gap: 3, paddingVertical: 2 },
  tabLabel: { fontSize: 10.5, fontWeight: '600', color: '#9aa3b4' },
  tabLabelActive: { color: colors.navyDeep },
  tabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand },
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
