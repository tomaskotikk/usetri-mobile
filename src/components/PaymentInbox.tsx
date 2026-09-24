import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { formatDate } from '../lib/billing'
import { czk } from '../lib/data'
import type { PaymentInbox as Inbox } from '../lib/payments'
import {
  ConfirmPaymentAction,
  PaymentStatusBadge,
  RejectPaymentAction,
  type RunPayment,
} from './PaymentCard'
import { Banner, Press, ServiceMark } from './ui'
import { colors, motion, radius } from '../theme'

/**
 * What the home screen asks the viewer to act on: periods to pay, and — for
 * owners — payments members reported that still need confirming. Renders nothing
 * when both are empty.
 */
export function PaymentInbox({
  inbox,
  onOpenGroup,
  onChanged,
}: {
  inbox: Inbox
  onOpenGroup: (groupId: string) => void
  /** Reloads the home data, which drops the item that was just handled. */
  onChanged: () => void
}) {
  const [notice, setNotice] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)

  const run: RunPayment = async (action, success) => {
    setNotice(null)
    const failed = await action()
    if (failed) return setNotice({ tone: 'error', text: failed })
    setNotice({ tone: 'info', text: success })
    onChanged()
  }

  const { toPay, toConfirm } = inbox
  if (toPay.length === 0 && toConfirm.length === 0) {
    return notice ? <Banner tone={notice.tone} text={notice.text} /> : null
  }

  return (
    <Animated.View entering={FadeInDown.duration(motion.base)} style={{ gap: 26 }}>
      {toPay.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.title}>K zaplacení</Text>
          <View style={styles.list}>
            {toPay.map((item, i) => (
              <Press key={`${item.groupId}-${item.period}`} onPress={() => onOpenGroup(item.groupId)} scaleTo={0.985}>
                <View style={[styles.row, i > 0 && styles.divider]}>
                  <ServiceMark name={item.serviceName} color={item.serviceColor} slug={item.serviceSlug} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.serviceName}
                    </Text>
                    <Text style={styles.sub}>splatné {formatDate(item.period)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.amount}>{czk(item.amount)}</Text>
                    <PaymentStatusBadge status={item.status} />
                  </View>
                  <Feather name="chevron-right" size={16} color="#b6bfcd" />
                </View>
              </Press>
            ))}
          </View>
        </View>
      )}

      {toConfirm.length > 0 && (
        <View style={styles.section}>
          <View style={styles.head}>
            <Text style={styles.title}>Čeká na potvrzení</Text>
            <Text style={styles.count}>{toConfirm.length}</Text>
          </View>
          <View style={styles.list}>
            {toConfirm.map((item, i) => (
              <View key={item.paymentId} style={[styles.confirm, i > 0 && styles.divider]}>
                <View style={styles.row}>
                  <ServiceMark name={item.serviceName} color={item.serviceColor} slug={item.serviceSlug} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.payerName}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {item.serviceName} · {czk(item.amount)} · {formatDate(item.period)}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <ConfirmPaymentAction paymentId={item.paymentId as string} run={run} />
                  <RejectPaymentAction paymentId={item.paymentId as string} run={run} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {notice && <Banner tone={notice.tone} text={notice.text} />}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.navyDeep, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  count: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  list: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  confirm: { paddingBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  name: { color: colors.navyDeep, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  amount: { color: colors.navyDeep, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
})
