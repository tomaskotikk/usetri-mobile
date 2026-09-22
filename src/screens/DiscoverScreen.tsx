import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  FadeIn,
  LinearTransition,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { czk, type Home, type Offer } from '../lib/data'
import { OfferCard } from '../components/OfferCard'
import { Button, EmptyState, Field, Segmented, Skeleton } from '../components/ui'
import { TAB_BAR_SPACE } from '../components/TabBar'
import { PullMascot } from '../components/PullMascot'
import { Mascot } from '../components/Mascot'
import { CATEGORIES, colors, motion } from '../theme'

type Filter = 'all' | keyof typeof CATEGORIES

export function DiscoverScreen({
  data,
  refreshing,
  onRefresh,
  onOpenOffer,
  onCreate,
}: {
  data: Home | null
  refreshing: boolean
  onRefresh: () => void
  onOpenOffer: (offer: Offer) => void
  onCreate: () => void
}) {
  const insets = useSafeAreaInsets()
  const pull = useSharedValue(0)

  // 90 px of overscroll is a full pull; past that he is simply held at the bottom.
  const onScroll = useAnimatedScrollHandler((event) => {
    pull.value = Math.min(1, Math.max(0, -event.contentOffset.y / 90))
  })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const offers = data?.open ?? []

  // Only offer categories that actually have something in them right now.
  const options = useMemo(() => {
    const present = new Set(offers.map((o) => o.category))
    return [
      { value: 'all' as Filter, label: 'Vše' },
      ...Object.entries(CATEGORIES)
        .filter(([key]) => present.has(key))
        .map(([key, value]) => ({ value: key as Filter, label: value.label })),
    ]
  }, [offers])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return offers.filter((offer) => {
      if (filter !== 'all' && offer.category !== filter) return false
      if (!needle) return true
      return `${offer.name} ${offer.plan}`.toLowerCase().includes(needle)
    })
  }, [offers, query, filter])

  const cheapest = visible.reduce((min, o) => Math.min(min, o.pricePerSeat), Infinity)

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <PullMascot pull={pull} refreshing={refreshing} />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingBottom: TAB_BAR_SPACE + insets.bottom,
          paddingTop: insets.top + 12,
          backgroundColor: colors.surface,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="transparent" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Objevit</Text>
            <Text style={styles.subtitle}>
              {offers.length > 0
                ? `${offers.length} skupin s volným místem${
                    cheapest < Infinity ? ` · od ${czk(cheapest)}` : ''
                  }`
                : 'Skupiny, kterým zbývá místo'}
            </Text>
          </View>
          <Mascot size={72} mood="search" />
        </View>

        <View style={styles.search}>
          <Field
            placeholder="Hledat službu…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {options.length > 2 && (
          <View style={styles.filters}>
            <Segmented options={options} value={filter} onChange={setFilter} />
          </View>
        )}

        <View style={styles.list}>
          {!data ? (
            <>
              <Skeleton height={112} />
              <Skeleton height={112} />
              <Skeleton height={112} />
            </>
          ) : visible.length === 0 ? (
            <Animated.View entering={FadeIn.duration(motion.base)}>
              <EmptyState
                icon={query || filter !== 'all' ? 'search' : 'inbox'}
                mascot={query || filter !== 'all' ? 'search' : 'sleep'}
                title={query || filter !== 'all' ? 'Nic se neshoduje' : 'Zatím tu nic není'}
                text={
                  query || filter !== 'all'
                    ? 'Zkus jiný výraz nebo zruš filtr kategorie.'
                    : 'Nikdo právě nenabízí volné místo. Můžeš být první.'
                }
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
            </Animated.View>
          ) : (
            visible.map((offer, i) => (
              // Layout transition keeps surviving cards in place while filters change.
              <Animated.View key={offer.id} layout={LinearTransition.duration(motion.base)}>
                <OfferCard offer={offer} index={i} onPress={() => onOpenOffer(offer)} />
              </Animated.View>
            ))
          )}
        </View>
      </Animated.ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  title: { color: colors.navyDeep, fontSize: 30, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 13.5, marginTop: 4 },
  search: { paddingHorizontal: 20 },
  filters: { paddingLeft: 20, marginTop: 14 },
  list: { padding: 20, gap: 10 },
})
