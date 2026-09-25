import { useEffect, useRef, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import {
  czk,
  deleteOffer,
  joinOffer,
  leaveOffer,
  loadMembers,
  setOfferClosed,
  type Member,
  type Offer,
} from '../lib/data'
import { getPaymentView, type PaymentView } from '../lib/payments'
import { shareInvite } from '../lib/invite'
import { Avatar, Banner, Button, Press, Seats, ServiceMark, Sheet, Skeleton, Tag } from '../components/ui'
import { PayoutAccountForm } from '../components/AccountField'
import { Usetrilek } from '../usetrilek'
import {
  MemberPaymentControls,
  PaymentCard,
  PaymentStatusBadge,
  type RunPayment,
} from '../components/PaymentCard'
import { categoryOf, colors, motion, radius } from '../theme'

/**
 * Everything about one offer: who is in it, what it costs, and the one action the
 * viewer can take. Owners manage here; everyone else joins or leaves.
 */
export function OfferSheet({
  offer,
  userId,
  onClose,
  onChanged,
  onOpenMember,
}: {
  offer: Offer | null
  userId: string
  onClose: () => void
  onChanged: () => void
  /** Opens a member's profile. Their own row is not clickable. */
  onOpenMember: (id: string) => void
}) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Outcome of the last payment write, shown next to the payment cards. */
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const [payments, setPayments] = useState<PaymentView | null>(null)
  /** A payment changed while the sheet was open, so the lists behind it are stale. */
  const dirty = useRef(false)
  // Closing clears `offer`, but the sheet still needs its contents while it slides away.
  const [shown, setShown] = useState<Offer | null>(offer)

  useEffect(() => {
    if (offer) setShown(offer)
  }, [offer])

  useEffect(() => {
    // Not cleared when the sheet closes: blanking it mid-exit flashes skeletons.
    if (!offer) return

    let current = true
    setError(null)
    setNotice(null)
    setMembers(null)
    setPayments(null)
    loadMembers(offer.id)
      .then((rows) => current && setMembers(rows))
      .catch(() => current && setMembers([]))
    getPaymentView(userId, offer)
      .then((view) => current && setPayments(view))
      .catch(() => current && setPayments(null))

    return () => {
      current = false
    }
  }, [offer, userId])

  if (!shown) return null

  const free = Math.max(0, shown.seatsTotal - shown.seatsTaken)
  const saving = shown.fullPrice - shown.pricePerSeat
  const category = categoryOf(shown.category)

  const reloadPayments = async () => {
    try {
      setPayments(await getPaymentView(userId, shown))
    } catch {
      // The write went through; a stale card is fixed by reopening the sheet.
    }
  }

  /**
   * Payment writes keep the sheet open: the card redraws from a fresh read, and
   * the home screen catches up once the sheet closes.
   */
  const runPayment: RunPayment = async (action, success) => {
    setNotice(null)
    const failed = await action()
    if (failed) return setNotice({ tone: 'error', text: failed })
    dirty.current = true
    setNotice({ tone: 'info', text: success })
    await reloadPayments()
  }

  const close = () => {
    if (dirty.current) {
      dirty.current = false
      onChanged()
    }
    onClose()
  }

  const myName = members?.find((m) => m.userId === userId)?.name ?? ''
  const mine = payments?.mine ?? null

  const run = async (action: () => Promise<string | null>) => {
    setBusy(true)
    const failed = await action()
    setBusy(false)
    if (failed) return setError(failed)
    dirty.current = false
    onChanged()
    onClose()
  }

  const confirmDelete = () =>
    Alert.alert('Smazat nabídku?', 'Skupina i její členové zmizí. Tohle nejde vrátit.', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: () => run(() => deleteOffer(shown.id)),
      },
    ])

  return (
    <Sheet open={offer !== null} onClose={close} title={shown.name}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ServiceMark name={shown.name} color={shown.color} slug={shown.serviceSlug} size={54} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.plan}>{shown.plan}</Text>
            <View style={styles.tags}>
              <Tag label={category.label} tone="muted" />
              {shown.role === 'owner' && <Tag label="tvoje nabídka" tone="dark" />}
              {shown.role === 'member' && <Tag label="jsi člen" />}
              {shown.closed && <Tag label="uzavřeno" tone="muted" />}
            </View>
          </View>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Tvůj podíl</Text>
              <Text style={styles.priceValue}>{czk(shown.pricePerSeat)}</Text>
            </View>
            <View style={styles.priceAside}>
              <Text style={styles.priceLabel}>Sám bys platil</Text>
              <Text style={styles.priceStrike}>{czk(shown.fullPrice)}</Text>
            </View>
          </View>

          {saving > 0 && (
            <View style={styles.savingRow}>
              <Feather name="trending-down" size={13} color={colors.brandForeground} />
              <Text style={styles.savingText}>
                Ušetříš {czk(saving)} měsíčně, {czk(saving * 12)} ročně
              </Text>
            </View>
          )}
        </View>

        {shown.role === 'owner' && payments && !payments.account && (
          <View style={styles.accountCard}>
            <View style={styles.accountHead}>
              <Feather name="credit-card" size={16} color={colors.brandForeground} />
              <Text style={styles.accountTitle}>Doplň číslo účtu, ať ti členové můžou platit</Text>
            </View>
            <Text style={styles.accountText}>
              Členům z něj vygenerujeme QR platbu. Uvidí ho jen lidé ve tvých skupinách.
            </Text>
            <PayoutAccountForm
              userId={userId}
              onSaved={() => {
                // The card goes away once the account exists, so the notice outlives it.
                setNotice({ tone: 'info', text: 'Číslo účtu je uložené.' })
                void reloadPayments()
              }}
            />
          </View>
        )}

        {mine &&
          members !== null &&
          mine.periods.map((view) => (
            <PaymentCard
              key={view.period}
              groupId={shown.id}
              userId={userId}
              serviceName={shown.name}
              payerName={myName}
              account={payments?.account ?? null}
              vs={mine.vs}
              view={view}
              run={runPayment}
            />
          ))}

        {notice && (
          <View style={{ marginTop: 14 }}>
            <Banner tone={notice.tone} text={notice.text} />
          </View>
        )}

        <View style={styles.seatBlock}>
          <View style={styles.seatHead}>
            <Text style={styles.sectionTitle}>Obsazenost</Text>
            <Text style={styles.seatCount}>
              {shown.seatsTaken}/{shown.seatsTotal} · {free === 0 ? 'plno' : `volná ${free}`}
            </Text>
          </View>
          <Seats total={shown.seatsTotal} taken={shown.seatsTaken} />
        </View>

        {shown.note && (
          <View style={styles.note}>
            <Feather name="message-square" size={14} color={colors.muted} />
            <Text style={styles.noteText}>{shown.note}</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 22, marginBottom: 10 }]}>Členové</Text>
        {members === null ? (
          <View style={{ gap: 8 }}>
            <Skeleton height={46} />
            <Skeleton height={46} />
          </View>
        ) : (
          <View style={styles.members}>
            {members.map((member, i) => {
              const payment =
                shown.role === 'owner' && member.role === 'member'
                  ? payments?.members.get(member.userId)
                  : undefined
              return (
                <Animated.View key={member.id} entering={FadeIn.delay(i * 45).duration(motion.base)}>
                  <View style={styles.memberCard}>
                    <Press
                      onPress={() => member.userId !== userId && onOpenMember(member.userId)}
                      scaleTo={member.userId === userId ? 1 : 0.97}
                    >
                      <View style={styles.memberRow}>
                        <Avatar name={member.name} src={member.avatar} size={30} />
                        <Text style={styles.memberName} numberOfLines={1}>
                          {member.name}
                        </Text>
                        {member.role === 'owner' && <Tag label="zakladatel" tone="muted" />}
                        {member.userId !== userId && (
                          <Feather name="chevron-right" size={16} color="#b6bfcd" />
                        )}
                      </View>
                    </Press>
                    {payment && (
                      <View style={styles.memberPay}>
                        <PaymentStatusBadge status={payment.status} />
                        <View style={{ flex: 1 }} />
                        <MemberPaymentControls
                          groupId={shown.id}
                          userId={member.userId}
                          view={payment}
                          run={runPayment}
                        />
                      </View>
                    )}
                  </View>
                </Animated.View>
              )
            })}
            {Array.from({ length: free }).map((_, i) => (
              <View key={`free-${i}`} style={[styles.member, styles.memberFree]}>
                <View style={[styles.memberAvatar, styles.memberAvatarFree]}>
                  <Feather name="plus" size={14} color="#b6bfcd" />
                </View>
                <Text style={styles.memberFreeText}>Volné místo</Text>
              </View>
            ))}
          </View>
        )}

        {error && (
          <View style={{ marginTop: 16 }}>
            <Banner tone="error" text={error} />
          </View>
        )}

        <View style={styles.actions}>
          {shown.role !== null && free > 0 && !shown.closed && (
            <>
              <View style={styles.invite}>
                <Usetrilek pose="zve" height={112} shadow={false} />
                <Text style={styles.inviteText}>
                  {free === 1
                    ? 'Zbývá poslední volné místo.'
                    : free < 5
                      ? `Zbývají ${free} volná místa.`
                      : `Zbývá ${free} volných míst.`}{' '}
                  Pošli pozvánku a cena se rozpočítá mezi víc lidí.
                </Text>
              </View>
              <Button
                label="Pozvat do skupiny"
                icon="share-2"
                onPress={() => shareInvite(shown).catch(() => setError('Sdílení se nepovedlo.'))}
              />
            </>
          )}
          {shown.role === 'owner' ? (
            <>
              <Button
                label={shown.closed ? 'Znovu otevřít' : 'Uzavřít nabídku'}
                icon={shown.closed ? 'unlock' : 'lock'}
                variant="outline"
                loading={busy}
                onPress={() => run(() => setOfferClosed(shown.id, !shown.closed))}
              />
              <Button label="Smazat nabídku" icon="trash-2" variant="danger" onPress={confirmDelete} />
            </>
          ) : shown.role === 'member' ? (
            <Button
              label="Odejít ze skupiny"
              icon="log-out"
              variant="outline"
              loading={busy}
              onPress={() => run(() => leaveOffer(shown.id, userId))}
            />
          ) : free === 0 || shown.closed ? (
            <Button label={shown.closed ? 'Nabídka je uzavřená' : 'Plno'} onPress={onClose} disabled />
          ) : (
            <Button
              label={`Přidat se za ${czk(shown.pricePerSeat)}`}
              icon="user-plus"
              loading={busy}
              onPress={() => run(() => joinOffer(shown.id, userId))}
            />
          )}
        </View>

        <Text style={styles.disclaimer}>
          Peníze posíláš napřímo zakladateli skupiny. Ušetři je nedrží — jen hlídá, co je zaplacené.
        </Text>
      </ScrollView>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  plan: { color: colors.navyDeep, fontSize: 15, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  priceCard: {
    marginTop: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
  },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  priceAside: { alignItems: 'flex-end' },
  priceLabel: {
    color: colors.muted,
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  priceValue: { color: colors.navyDeep, fontSize: 28, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  priceStrike: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    marginTop: 7,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  savingText: { color: colors.brandForeground, fontSize: 12.5, fontWeight: '700' },
  seatBlock: { marginTop: 22, gap: 10 },
  seatHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.navyDeep, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3 },
  seatCount: { color: colors.muted, fontSize: 12.5 },
  note: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  noteText: { flex: 1, color: colors.navyDeep, fontSize: 13.5, lineHeight: 19 },
  members: { gap: 8 },
  memberCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 9,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  memberPay: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
  },
  accountCard: {
    marginTop: 18,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(0,217,154,0.4)',
    borderRadius: radius.xl,
    padding: 16,
    gap: 10,
  },
  accountHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountTitle: { flex: 1, color: colors.navyDeep, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3 },
  accountText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  memberFree: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: colors.navyDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarFree: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  memberName: { flex: 1, color: colors.navyDeep, fontSize: 14, fontWeight: '600' },
  memberFreeText: { flex: 1, color: '#9aa3b4', fontSize: 14 },
  actions: { gap: 10, marginTop: 24 },
  invite: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 4 },
  inviteText: { flex: 1, color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  disclaimer: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 10,
  },
})
