import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { czk, type Offer } from '../lib/data'
import { Press, Seats, ServiceMark, Tag } from './ui'
import { categoryOf, colors, motion, radius, shadow } from '../theme'

/**
 * One offer, as it appears in every list. `index` only staggers the entrance, so a
 * freshly loaded list assembles itself from the top down instead of snapping in.
 */
export function OfferCard({
  offer,
  index = 0,
  onPress,
}: {
  offer: Offer
  index?: number
  onPress: () => void
}) {
  const free = Math.max(0, offer.seatsTotal - offer.seatsTaken)
  const saving = offer.fullPrice - offer.pricePerSeat

  return (
    <Animated.View entering={FadeInDown.delay(index * motion.stagger).duration(motion.slow)}>
      <Press onPress={onPress} style={styles.card}>
        <View style={styles.top}>
          <ServiceMark name={offer.name} color={offer.color} />

          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {offer.name}
              </Text>
              {offer.role === 'owner' && <Tag label="tvoje" tone="dark" />}
              {offer.role === 'member' && <Tag label="jsi člen" />}
              {offer.closed && <Tag label="uzavřeno" tone="muted" />}
            </View>
            <Text style={styles.plan} numberOfLines={1}>
              {offer.plan}
            </Text>
          </View>

          <View style={styles.priceWrap}>
            <Text style={styles.price}>{czk(offer.pricePerSeat)}</Text>
            <Text style={styles.priceNote}>měsíčně</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.meta}>
            <Feather name={categoryOf(offer.category).icon} size={12} color="#9aa3b4" />
            <Seats total={offer.seatsTotal} taken={offer.seatsTaken} />
            <Text style={styles.metaText} numberOfLines={1}>
              {free === 0 ? 'plno' : `volná ${free}`} · {offer.ownerName}
            </Text>
          </View>

          <View style={styles.right}>
            {saving > 0 && (
              <View style={styles.saving}>
                <Feather name="trending-down" size={11} color={colors.brandForeground} />
                <Text style={styles.savingText}>−{czk(saving)}</Text>
              </View>
            )}
            <Feather name="chevron-right" size={17} color="#b6bfcd" />
          </View>
        </View>

        <View style={[styles.stripe, { backgroundColor: offer.color }]} />
      </Press>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    overflow: 'hidden',
    ...shadow.card,
  },
  // A hairline of the service's own colour, the only place that colour is used large.
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleWrap: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.navyDeep, fontSize: 16.5, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  plan: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
  priceWrap: { alignItems: 'flex-end' },
  price: { color: colors.navyDeep, fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  priceNote: { color: colors.muted, fontSize: 10.5 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 10,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  metaText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saving: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,217,154,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingText: { color: colors.brandForeground, fontSize: 11, fontWeight: '700' },
})
