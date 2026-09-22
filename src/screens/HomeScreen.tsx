import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { czk, joinOffer, leaveOffer, loadHome, type Offer } from '../lib/data'
import { Button } from '../components/ui'
import { colors, radius } from '../theme'

type Data = Awaited<ReturnType<typeof loadHome>>

export function HomeScreen({ user }: { user: User }) {
  const insets = useSafeAreaInsets()
  const [data, setData] = useState<Data | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await loadHome(user.id))
    } catch {
      Alert.alert('Nepovedlo se načíst data', 'Zkontroluj připojení k internetu.')
    }
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const act = async (offer: Offer) => {
    setPendingId(offer.id)
    const error =
      offer.role === 'member'
        ? await leaveOffer(offer.id, user.id)
        : await joinOffer(offer.id, user.id)
    setPendingId(null)
    if (error) Alert.alert('Nepovedlo se', error)
    else await load()
  }

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
  const firstName = (meta.full_name ?? meta.name ?? '').split(' ')[0]

  if (!data) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.navyMid, '#0b1730', colors.navyDeep]}
          style={[styles.header, { paddingTop: insets.top + 18 }]}
        >
          <View style={styles.headerRow}>
            <Text style={styles.logo}>
              Ušetři<Text style={{ color: colors.brand }}>.</Text>
            </Text>
            <Pressable
              onPress={() => supabase.auth.signOut()}
              hitSlop={10}
              style={styles.iconButton}
            >
              <Feather name="log-out" size={16} color="rgba(255,255,255,0.75)" />
            </Pressable>
          </View>

          <Text style={styles.greeting}>{firstName ? `Ahoj, ${firstName}.` : 'Ahoj.'}</Text>

          <View style={styles.savingsCard}>
            <Text style={styles.savingsLabel}>Tento měsíc šetříš</Text>
            <Text style={styles.savingsValue}>{czk(data.stats.saved)}</Text>
            {data.stats.percent > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>↑ {data.stats.percent} % oproti samostatným</Text>
              </View>
            )}
            <View style={styles.statRow}>
              <Stat label="Platíš měsíčně" value={czk(data.stats.monthly)} />
              <Stat label="Skupiny" value={String(data.stats.groups)} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Section title="Tvoje skupiny" count={data.mine.length}>
            {data.mine.length === 0 ? (
              <Empty
                icon="users"
                text="Zatím nejsi v žádné skupině. Níže jsou volná místa, do kterých se můžeš přidat."
              />
            ) : (
              data.mine.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  pending={pendingId === offer.id}
                  onPress={() => act(offer)}
                />
              ))
            )}
          </Section>

          <Section title="Volná místa" count={data.open.length}>
            {data.open.length === 0 ? (
              <Empty icon="inbox" text="Právě teď nikdo nenabízí volné místo." />
            ) : (
              data.open.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  pending={pendingId === offer.id}
                  onPress={() => act(offer)}
                />
              ))
            )}
          </Section>

          <Text style={styles.footnote}>
            Nabídky zakládáš na webu usetri.cz — v appce se k nim přidáš. Platby zatím nejsou
            napojené, domluvte se se zakladatelem napřímo.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  )
}

function monogram(name: string) {
  const words = name.split(/[\s+]+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.[0] ?? '?').toUpperCase()
}

function OfferRow({
  offer,
  pending,
  onPress,
}: {
  offer: Offer
  pending: boolean
  onPress: () => void
}) {
  const free = Math.max(0, offer.seatsTotal - offer.seatsTaken)

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badgeIcon, { backgroundColor: `${offer.color}1f` }]}>
          <Text style={[styles.badgeIconText, { color: offer.color }]}>{monogram(offer.name)}</Text>
        </View>

        <View style={styles.cardTitleWrap}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {offer.name}
            </Text>
            {offer.role === 'owner' && <Tag label="tvoje" dark />}
            {offer.role === 'member' && <Tag label="jsi člen" />}
          </View>
          <Text style={styles.cardPlan} numberOfLines={1}>
            {offer.plan}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>{czk(offer.pricePerSeat)}</Text>
          <Text style={styles.priceNote}>měsíčně</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.seats}>
          {Array.from({ length: offer.seatsTotal }).map((_, i) => (
            <View
              key={i}
              style={[styles.seatDot, i < offer.seatsTaken && { backgroundColor: colors.brand }]}
            />
          ))}
          <Text style={styles.seatText}>
            {free === 0 ? 'plno' : `volná ${free}`} · {offer.ownerName}
          </Text>
        </View>

        {offer.role === 'owner' ? (
          <Text style={styles.ownerHint}>spravuj na webu</Text>
        ) : (
          <Button
            label={offer.role === 'member' ? 'Odejít' : 'Přidat se'}
            variant={offer.role === 'member' ? 'outline' : 'primary'}
            onPress={onPress}
            loading={pending}
            style={styles.cardButton}
          />
        )}
      </View>
    </View>
  )
}

function Tag({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <View style={[styles.tag, dark && { backgroundColor: colors.navyDeep }]}>
      <Text style={[styles.tagText, dark && { color: colors.white }]}>{label}</Text>
    </View>
  )
}

function Empty({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={20} color={colors.muted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: colors.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  greeting: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 16,
  },
  savingsCard: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.xl,
    padding: 18,
  },
  savingsLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  savingsValue: {
    color: colors.white,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.8,
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,217,154,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
  },
  badgeText: { color: colors.brand, fontSize: 11.5, fontWeight: '700' },
  statRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '700', marginTop: 3 },
  body: { padding: 20, gap: 26 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.navyDeep, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  sectionCount: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    shadowColor: '#050b1a',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badgeIconText: { fontSize: 14, fontWeight: '800' },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { color: colors.navyDeep, fontSize: 16.5, fontWeight: '700', letterSpacing: -0.3 },
  cardPlan: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
  price: { color: colors.navyDeep, fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  priceNote: { color: colors.muted, fontSize: 10.5 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 10,
  },
  seats: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  seatDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  seatText: { color: colors.muted, fontSize: 12, marginLeft: 6, flexShrink: 1 },
  cardButton: { height: 38, paddingHorizontal: 16 },
  ownerHint: { color: colors.muted, fontSize: 12 },
  tag: {
    backgroundColor: 'rgba(0,217,154,0.16)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: { color: colors.brandForeground, fontSize: 10, fontWeight: '700' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 18,
  },
  emptyText: { flex: 1, color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  footnote: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
})
