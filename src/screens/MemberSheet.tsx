import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { loadProfile, since, type Offer, type PublicProfile } from '../lib/data'
import { OfferCard } from '../components/OfferCard'
import { Avatar, EmptyState, SheetOverlay, Skeleton } from '../components/ui'
import { colors, motion, radius } from '../theme'

/**
 * Another member's profile: who they are, how active they are, and what they are
 * currently offering. Counts only — never what anybody pays.
 */
export function MemberSheet({
  userId,
  viewerId,
  onClose,
  onOpenOffer,
}: {
  /** The profile to show, or null when the sheet is closed. */
  userId: string | null
  viewerId: string
  onClose: () => void
  onOpenOffer: (offer: Offer) => void
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // Not cleared on close: blanking mid-exit flashes skeletons as it slides away.
    if (!userId) return

    let current = true
    setLoading(true)
    setFailed(false)
    setProfile(null)
    loadProfile(userId, viewerId)
      .then((row) => {
        if (!current) return
        setProfile(row)
        setFailed(row === null)
      })
      .catch(() => current && setFailed(true))
      .finally(() => current && setLoading(false))

    return () => {
      current = false
    }
  }, [userId, viewerId])

  const self = profile?.id === viewerId

  return (
    <SheetOverlay open={userId !== null} onClose={onClose} title="Profil člena">
      {loading ? (
        <View style={styles.body}>
          <Skeleton height={76} />
          <View style={{ height: 12 }} />
          <Skeleton height={64} />
          <View style={{ height: 12 }} />
          <Skeleton height={140} />
        </View>
      ) : !profile ? (
        // Never leave the sheet on skeletons: it covers the screen, so a load that
        // never resolves would look like the whole app had frozen.
        <View style={styles.body}>
          <EmptyState
            icon="alert-circle"
            title={failed ? 'Profil se nepodařilo načíst' : 'Profil nenalezen'}
            text="Zkus to prosím znovu, nebo sheet zavři."
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(motion.base)} style={styles.identity}>
            <Avatar name={profile.name} src={profile.avatar} size={64} />
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {profile.name}
                {self ? ' (ty)' : ''}
              </Text>
              <Text style={styles.since}>Připojil se {since(profile.joinedAt)}</Text>
            </View>
          </Animated.View>

          <View style={styles.stats}>
            <Stat icon="award" value={profile.owned} label="spravuje" />
            <Stat icon="users" value={profile.joined} label="je členem" />
            <Stat icon="user-plus" value={profile.freeSeats} label="volných míst" />
          </View>

          <Text style={styles.heading}>Otevřené nabídky</Text>

          {profile.offers.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Žádné otevřené nabídky"
              text={`${profile.name} teď nenabízí volná místa.`}
            />
          ) : (
            <View style={styles.list}>
              {profile.offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} onPress={() => onOpenOffer(offer)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SheetOverlay>
  )
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>['name']
  value: number
  label: string
}) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={15} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 40 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
  },
  identityText: { flex: 1, minWidth: 0 },
  name: { color: colors.navyDeep, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  since: { color: colors.muted, fontSize: 13, marginTop: 3 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  statValue: { color: colors.navyDeep, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11 },
  heading: {
    color: colors.navyDeep,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 26,
    marginBottom: 12,
  },
  list: { gap: 10 },
})
