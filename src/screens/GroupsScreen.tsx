import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { czk, type Home, type Offer } from '../lib/data'
import { OfferCard } from '../components/OfferCard'
import { Button, EmptyState, Skeleton } from '../components/ui'
import { TAB_BAR_SPACE } from '../components/TabBar'
import { PullMascot } from '../components/PullMascot'
import { Usetrilek } from '../usetrilek'
import { colors, motion, radius } from '../theme'

export function GroupsScreen({
  data,
  refreshing,
  onRefresh,
  onOpenOffer,
  onCreate,
  onDiscover,
}: {
  data: Home | null
  refreshing: boolean
  onRefresh: () => void
  onOpenOffer: (offer: Offer) => void
  onCreate: () => void
  onDiscover: () => void
}) {
  const insets = useSafeAreaInsets()
  const pull = useSharedValue(0)

  // 90 px of overscroll is a full pull; past that he is simply held at the bottom.
  const onScroll = useAnimatedScrollHandler((event) => {
    pull.value = Math.min(1, Math.max(0, -event.contentOffset.y / 90))
  })

  const owned = data?.mine.filter((o) => o.role === 'owner') ?? []
  const joined = data?.mine.filter((o) => o.role === 'member') ?? []
  const seatsOffered = owned.reduce((sum, o) => sum + o.seatsTotal - 1, 0)
  const seatsFilled = owned.reduce((sum, o) => sum + o.seatsTaken - 1, 0)
  const income = owned.reduce((sum, o) => sum + o.pricePerSeat * Math.max(0, o.seatsTaken - 1), 0)

  return (
    <View style={styles.root}>
      <PullMascot pull={pull} refreshing={refreshing} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: TAB_BAR_SPACE + insets.bottom,
          paddingTop: insets.top + 12,
          backgroundColor: colors.surface,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.title}>Skupiny</Text>
          <Text style={styles.subtitle}>Co spravuješ a kde jsi členem</Text>
        </View>

        {!data ? (
          <View style={styles.list}>
            <Skeleton height={76} />
            <Skeleton height={112} />
          </View>
        ) : (
          <View style={styles.list}>
            {owned.length > 0 && (
              <Animated.View entering={FadeInDown.duration(motion.slow)} style={styles.summary}>
                <Summary label="Obsazeno" value={`${seatsFilled}/${seatsOffered}`} />
                <View style={styles.divider} />
                <Summary label="Vybíráš měsíčně" value={czk(income)} />
                <Usetrilek
                  pose={income > 0 ? 'nese' : seatsFilled > 0 ? 'hura' : 'ceka'}
                  height={96}
                  shadow={false}
                  style={{ marginVertical: -8, marginLeft: 'auto' }}
                />
              </Animated.View>
            )}

            <Block
              title="Tvoje nabídky"
              count={owned.length}
              empty={
                <EmptyState
                  icon="plus-circle"
                  mascot="premysli"
                  title="Žádná vlastní nabídka"
                  text="Když máš v tarifu volné místo, nabídni ho ostatním a sniž si tím cenu."
                  action={
                    <Button
                      label="Založit nabídku"
                      onPress={onCreate}
                      variant="outline"
                      icon="plus"
                      style={{ marginTop: 10, paddingHorizontal: 18 }}
                    />
                  }
                />
              }
            >
              {owned.map((offer, i) => (
                <OfferCard key={offer.id} offer={offer} index={i} onPress={() => onOpenOffer(offer)} />
              ))}
            </Block>

            <Block
              title="Kde jsi členem"
              count={joined.length}
              empty={
                <EmptyState
                  icon="users"
                  mascot="sedi"
                  title="Zatím nikde"
                  text="Přidej se do skupiny s volným místem a plať jen svůj podíl."
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
              }
            >
              {joined.map((offer, i) => (
                <OfferCard key={offer.id} offer={offer} index={i} onPress={() => onOpenOffer(offer)} />
              ))}
            </Block>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

function Block({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.blockHead}>
        <Text style={styles.blockTitle}>{title}</Text>
        <Text style={styles.blockCount}>{count}</Text>
      </View>
      <View style={{ gap: 10 }}>{count === 0 ? empty : children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  head: { paddingHorizontal: 20, paddingBottom: 6 },
  title: { color: colors.navyDeep, fontSize: 30, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 13.5, marginTop: 4 },
  list: { padding: 20, gap: 26 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navyDeep,
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  divider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 16 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryValue: { color: colors.white, fontSize: 19, fontWeight: '800', marginTop: 4 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockTitle: { color: colors.navyDeep, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  blockCount: { color: colors.muted, fontSize: 14, fontWeight: '600' },
})
