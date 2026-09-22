import { useState } from 'react'
import { Alert, Image, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { avatarFromSession, czk, updateProfileName, type Home } from '../lib/data'
import { Banner, Button, Field, Press, Sheet } from '../components/ui'
import { TAB_BAR_SPACE } from '../components/TabBar'
import { PullMascot } from '../components/PullMascot'
import { colors, motion, radius } from '../theme'

const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://usetri-five.vercel.app'

export function ProfileScreen({
  user,
  data,
  refreshing,
  onRefresh,
  onChanged,
  onReplayGuide,
}: {
  user: User
  data: Home | null
  refreshing: boolean
  onRefresh: () => void
  onChanged: () => void
  onReplayGuide: () => void
}) {
  const insets = useSafeAreaInsets()

  const pull = useSharedValue(0)

  // 90 px of overscroll is a full pull; past that he is simply held at the bottom.
  const onScroll = useAnimatedScrollHandler((event) => {
    pull.value = Math.min(1, Math.max(0, -event.contentOffset.y / 90))
  })
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
  const currentName = (meta.full_name ?? meta.name ?? '').trim()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return setError('Jméno nemůže být prázdné.')

    setSaving(true)
    const failed = await updateProfileName(user.id, trimmed)
    setSaving(false)

    if (failed) return setError(failed)
    setError(null)
    setEditing(false)
    setNotice('Jméno je uložené.')
    onChanged()
  }

  const signOut = () =>
    Alert.alert('Odhlásit se?', 'Budeš se muset znovu přihlásit.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Odhlásit', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])

  const photo = avatarFromSession(user.user_metadata)

  const initials = (currentName || user.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <PullMascot pull={pull} refreshing={refreshing} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" />
        }
        contentContainerStyle={{
          paddingBottom: TAB_BAR_SPACE + insets.bottom,
          paddingTop: insets.top + 12,
          backgroundColor: colors.surface,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.title}>Profil</Text>
        </View>

        <Animated.View entering={FadeInDown.duration(motion.slow)} style={styles.identity}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {currentName || 'Bez jména'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <Press onPress={() => setEditing(true)} scaleTo={0.9}>
            <View style={styles.editButton}>
              <Feather name="edit-2" size={15} color={colors.navyDeep} />
            </View>
          </Press>
        </Animated.View>

        {data && (
          <Animated.View entering={FadeInDown.delay(80).duration(motion.slow)} style={styles.stats}>
            <Stat label="Skupiny" value={String(data.stats.groups)} />
            <View style={styles.statDivider} />
            <Stat label="Měsíčně" value={czk(data.stats.monthly)} />
            <View style={styles.statDivider} />
            <Stat label="Ušetřeno" value={czk(data.stats.saved)} />
          </Animated.View>
        )}

        {notice && (
          <View style={styles.bannerWrap}>
            <Banner tone="info" text={notice} />
          </View>
        )}

        <Group title="Nastavení">
          <Row icon="help-circle" label="Jak to funguje" onPress={onReplayGuide} />
          <Row
            icon="globe"
            label="Otevřít web"
            hint={SITE.replace(/^https:\/\//, '')}
            onPress={() => Linking.openURL(SITE)}
          />
        </Group>

        <Group title="Účet">
          <Row icon="log-out" label="Odhlásit se" tone="danger" onPress={signOut} />
        </Group>

        <Text style={styles.footnote}>
          Platby zatím neprobíhají přes appku — se zakladatelem skupiny se domluvíte napřímo.
        </Text>
      </Animated.ScrollView>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Upravit jméno">
        <View style={{ gap: 14 }}>
          <Field
            label="Jméno"
            placeholder="Tomáš Kotík"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />
          {error && <Banner tone="error" text={error} />}
          <Button label="Uložit" onPress={save} loading={saving} />
        </View>
      </Sheet>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  )
}

function Row({
  icon,
  label,
  hint,
  right,
  tone = 'normal',
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name']
  label: string
  hint?: string
  right?: React.ReactNode
  tone?: 'normal' | 'danger'
  onPress?: () => void
}) {
  const danger = tone === 'danger'
  const body = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, danger && { backgroundColor: '#fdeceb' }]}>
        <Feather name={icon} size={16} color={danger ? '#d63b2f' : colors.navyDeep} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowLabel, danger && { color: '#d63b2f' }]}>{label}</Text>
        {hint && (
          <Text style={styles.rowHint} numberOfLines={1}>
            {hint}
          </Text>
        )}
      </View>
      {right ?? (onPress && <Feather name="chevron-right" size={17} color="#b6bfcd" />)}
    </View>
  )

  if (!onPress) return body
  return (
    <Press onPress={onPress} scaleTo={0.985}>
      {body}
    </Press>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  head: { paddingHorizontal: 20, paddingBottom: 14 },
  title: { color: colors.navyDeep, fontSize: 30, fontWeight: '800', letterSpacing: -1.2 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 15,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.navyDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  name: { color: colors.navyDeep, fontSize: 17.5, fontWeight: '800', letterSpacing: -0.4 },
  email: { color: colors.muted, fontSize: 13, marginTop: 2 },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 15,
  },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { color: colors.navyDeep, fontSize: 16.5, fontWeight: '800', letterSpacing: -0.4 },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  bannerWrap: { paddingHorizontal: 20, marginTop: 14 },
  group: { marginTop: 26, paddingHorizontal: 20, gap: 10 },
  groupTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  groupBody: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 13 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { color: colors.navyDeep, fontSize: 14.5, fontWeight: '600' },
  rowHint: { color: colors.muted, fontSize: 12, marginTop: 1.5 },
  footnote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 34,
    marginTop: 26,
  },
})
