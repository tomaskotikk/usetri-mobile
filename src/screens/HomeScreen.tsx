import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import type { User } from '@supabase/supabase-js'
import { czk, type Home, type Offer } from '../lib/data'
import { OfferCard } from '../components/OfferCard'
import { Button, CountUp, EmptyState, Press, Skeleton } from '../components/ui'
import { TAB_BAR_SPACE } from '../components/TabBar'
import { Mascot } from '../components/Mascot'
import { PullMascot } from '../components/PullMascot'
import { colors, motion, radius } from '../theme'

export function HomeScreen({
  user,
  data,
  refreshing,
  onRefresh,
  onOpenOffer,
  onDiscover,
  onCreate,
}: {
  user: User
  data: Home | null
  refreshing: boolean
  onRefresh: () => void
  onOpenOffer: (offer: Offer) => void
  onDiscover: () => void
  onCreate: () => void
}) {
  const insets = useSafeAreaInsets()
  const pull = useSharedValue(0)

  // 90 px of overscroll is a full pull; past that he is simply held at the bottom.
  const onScroll = useAnimatedScrollHandler((event) => {
    pull.value = Math.min(1, Math.max(0, -event.contentOffset.y / 90))
  })

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string }
  const firstName = (meta.full_name ?? meta.name ?? '').split(' ')[0]

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Navy behind the header, so the gap a pull opens up matches the gradient. */}
      <View style={[styles.pullBackdrop, { height: insets.top + 240 }]} />
      <PullMascot pull={pull} refreshing={refreshing} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: TAB_BAR_SPACE + insets.bottom,
          backgroundColor: colors.surface,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.navyMid, '#0b1730', colors.navyDeep]}
          style={[styles.header, { paddingTop: insets.top + 18 }]}
        >
          <Text style={styles.logo}>
            Ušetři<Text style={{ color: colors.brand }}>.</Text>
          </Text>

          <View style={styles.greetingRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Animated.Text entering={FadeInDown.duration(motion.slow)} style={styles.greeting}>
                {firstName ? `Ahoj, ${firstName}.` : 'Ahoj.'}
              </Animated.Text>
              <Animated.Text
                entering={FadeInDown.delay(60).duration(motion.slow)}
                style={styles.greetingNote}
              >
                {data && data.stats.groups > 0
                  ? `Jsi v ${data.stats.groups === 1 ? '1 skupině' : `${data.stats.groups} skupinách`}.`
                  : 'Pojď si najít první skupinu.'}
              </Animated.Text>
            </View>
            <Animated.View entering={FadeIn.delay(220).duration(motion.slow)}>
              <Mascot
                size={88}
                mood="wave"
                holds={data && data.stats.saved > 0 ? 'bag' : undefined}
              />
            </Animated.View>
          </View>

          {!data ? (
            <View style={styles.savingsCard}>
              <Skeleton height={92} />
            </View>
          ) : (
            <Animated.View
              entering={FadeInDown.delay(90).duration(motion.slow)}
              style={styles.savingsCard}
            >
              <Text style={styles.savingsLabel}>Tento měsíc šetříš</Text>
              <CountUp value={data.stats.saved} format={czk} style={styles.savingsValue} />

              {data.stats.percent > 0 && (
                <Animated.View entering={FadeIn.delay(500)} style={styles.badge}>
                  <Feather name="trending-down" size={12} color={colors.brand} />
                  <Text style={styles.badgeText}>
                    o {data.stats.percent} % méně než samostatně
                  </Text>
                </Animated.View>
              )}

              <View style={styles.statRow}>
                <Stat label="Platíš měsíčně" value={czk(data.stats.monthly)} />
                <Stat label="Skupiny" value={String(data.stats.groups)} />
                <Stat label="Ročně ušetříš" value={czk(data.stats.saved * 12)} />
              </View>
            </Animated.View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {!data ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={112} />
              <Skeleton height={112} />
            </View>
          ) : (
            <>
              <Section title="Tvoje skupiny" count={data.mine.length}>
                {data.mine.length === 0 ? (
                  <EmptyState
                    icon="users"
                    mascot="wave"
                    title="Zatím nikde nejsi"
                    text="Přidej se do skupiny, které zbývá místo, nebo založ vlastní nabídku."
                    action={
                      <Button
                        label="Projít volná místa"
                        onPress={onDiscover}
                        variant="outline"
                        icon="compass"
                        style={{ marginTop: 10, paddingHorizontal: 18 }}
                      />
                    }
                  />
                ) : (
                  data.mine.map((offer, i) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      index={i}
                      onPress={() => onOpenOffer(offer)}
                    />
                  ))
                )}
              </Section>

              {data.open.length > 0 && (
                <Section
                  title="Volná místa"
                  count={data.open.length}
                  action={
                    <Press onPress={onDiscover} scaleTo={0.94}>
                      <Text style={styles.sectionLink}>Vše</Text>
                    </Press>
                  }
                >
                  {data.open.slice(0, 3).map((offer, i) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      index={i}
                      onPress={() => onOpenOffer(offer)}
                    />
                  ))}
                </Section>
              )}

              <Press onPress={onCreate} style={styles.promo}>
                <Mascot size={58} mood="idle" holds="coin" animated={false} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.promoTitle}>Máš volné místo v tarifu?</Text>
                  <Text style={styles.promoText}>
                    Založ nabídku a rozpočítej cenu mezi ostatní.
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.muted} />
              </Press>
            </>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string
  count: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
        <View style={{ flex: 1 }} />
        {action}
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  pullBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.navyMid },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logo: { color: colors.white, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  greeting: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  greetingNote: { color: 'rgba(255,255,255,0.55)', fontSize: 13.5, marginTop: 4 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    gap: 14,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statValue: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 3 },
  body: { padding: 20, gap: 26 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.navyDeep, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  sectionCount: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  sectionLink: { color: colors.muted, fontSize: 13.5, fontWeight: '700' },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    padding: 15,
  },
  promoTitle: { color: colors.navyDeep, fontSize: 14.5, fontWeight: '700' },
  promoText: { color: colors.muted, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
})
