import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { captureRef } from 'react-native-view-shot'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { formatDate, type PeriodStatus } from '../lib/billing'
import { buildSpd, paymentMessage } from '../lib/spd'
import { czk } from '../lib/data'
import {
  confirmPayment,
  markPaid,
  rejectPayment,
  reportPayment,
  undoReport,
  type PayoutAccount,
  type PeriodView,
} from '../lib/payments'
import { Button, Press } from './ui'
import { colors, radius } from '../theme'

/**
 * Runs one payment write. The screen that owns the data decides what a result
 * means — a notice, an error, a reload — so the controls stay dumb.
 */
export type RunPayment = (action: () => Promise<string | null>, success: string) => Promise<void>

const BADGES: Record<PeriodStatus, { label: string; bg: string; fg: string }> = {
  paid: { label: 'Zaplaceno', bg: 'rgba(0,217,154,0.16)', fg: colors.brandForeground },
  reported: { label: 'Čeká na potvrzení', bg: '#fdf3d7', fg: '#8a5a00' },
  due: { label: 'K zaplacení', bg: '#eef1f7', fg: colors.navyDeep },
  overdue: { label: 'Po splatnosti', bg: '#fdeceb', fg: '#a3241a' },
}

export function PaymentStatusBadge({ status }: { status: PeriodStatus }) {
  const badge = BADGES[status]
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
    </View>
  )
}

/** A compact action for rows, where a full-height Button would crowd the member. */
export function SmallAction({
  label,
  icon,
  tone = 'ghost',
  onPress,
}: {
  label: string
  icon: React.ComponentProps<typeof Feather>['name']
  tone?: 'brand' | 'ghost'
  onPress: () => Promise<void> | void
}) {
  const [busy, setBusy] = useState(false)
  const brand = tone === 'brand'

  const press = async () => {
    setBusy(true)
    try {
      await onPress()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Press onPress={press} disabled={busy} scaleTo={0.94}>
      <View style={[styles.small, brand && styles.smallBrand, busy && { opacity: 0.55 }]}>
        <Feather name={icon} size={13} color={brand ? colors.brandForeground : colors.muted} />
        <Text style={[styles.smallText, brand && { color: colors.brandForeground }]}>{label}</Text>
      </View>
    </Press>
  )
}

export function ConfirmPaymentAction({ paymentId, run }: { paymentId: string; run: RunPayment }) {
  return (
    <SmallAction
      label="Potvrdit"
      icon="check"
      tone="brand"
      onPress={() => run(() => confirmPayment(paymentId), 'Platba potvrzena.')}
    />
  )
}

export function RejectPaymentAction({ paymentId, run }: { paymentId: string; run: RunPayment }) {
  const ask = () =>
    new Promise<void>((resolve) =>
      Alert.alert(
        'Nedorazilo?',
        'Platba ti nedorazila? Člen ji uvidí znovu jako nezaplacenou.',
        [
          { text: 'Zrušit', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Nedorazilo',
            style: 'destructive',
            onPress: () =>
              void run(() => rejectPayment(paymentId), 'Platba vrácena mezi nezaplacené.').finally(resolve),
          },
        ],
        // Dismissing the dialog on Android must not leave the button spinning.
        { cancelable: true, onDismiss: () => resolve() },
      ),
    )

  return <SmallAction label="Nedorazilo" icon="x" onPress={ask} />
}

/** What the owner can do about one member's current period. */
export function MemberPaymentControls({
  groupId,
  userId,
  view,
  run,
}: {
  groupId: string
  userId: string
  view: PeriodView
  run: RunPayment
}) {
  if (view.status === 'reported' && view.paymentId) {
    return (
      <>
        <ConfirmPaymentAction paymentId={view.paymentId} run={run} />
        <RejectPaymentAction paymentId={view.paymentId} run={run} />
      </>
    )
  }
  if (view.status === 'due' || view.status === 'overdue') {
    return (
      <SmallAction
        label="Označit jako zaplacené"
        icon="check"
        onPress={() => run(() => markPaid(groupId, userId, view.period), 'Zapsáno jako zaplacené.')}
      />
    )
  }
  return null
}

/**
 * One period the member owes. On a phone the QR cannot be scanned from its own
 * screen, so the copy rows come first and the QR can be shared as an image to
 * open in the bank's app.
 */
export function PaymentCard({
  groupId,
  userId,
  serviceName,
  payerName,
  account,
  vs,
  view,
  run,
}: {
  groupId: string
  userId: string
  serviceName: string
  payerName: string
  account: PayoutAccount | null
  vs: number
  view: PeriodView
  run: RunPayment
}) {
  const header = (
    <View style={styles.head}>
      <Text style={styles.amount}>
        {czk(view.amount)} <Text style={styles.due}>splatné {formatDate(view.period)}</Text>
      </Text>
      <PaymentStatusBadge status={view.status} />
    </View>
  )

  if (view.status === 'paid') {
    return (
      <View style={styles.card}>
        {header}
        <View style={styles.line}>
          <Feather name="check-circle" size={15} color={colors.brand} />
          <Text style={styles.muted}>Zakladatel platbu potvrdil. Tenhle měsíc máš vyřízený.</Text>
        </View>
      </View>
    )
  }

  if (!account) {
    return (
      <View style={styles.card}>
        {header}
        <Text style={[styles.muted, { marginTop: 10 }]}>
          Zakladatel ještě nezadal číslo účtu. Jakmile ho doplní, objeví se tu QR platba.
        </Text>
      </View>
    )
  }

  const message = paymentMessage(serviceName, view.period, payerName)
  const spd = buildSpd({ iban: account.iban, amount: view.amount, vs, message })

  return (
    <View style={styles.card}>
      {header}

      <View style={styles.rows}>
        <CopyRow label="Účet" shown={account.display} copy={account.display} />
        <CopyRow label="Částka" shown={czk(view.amount)} copy={String(view.amount)} />
        <CopyRow label="VS" shown={String(vs)} copy={String(vs)} />
        <CopyRow label="Zpráva" shown={message} copy={message} last />
      </View>

      <SharedQr spd={spd} caption={`${czk(view.amount)} · VS ${vs}`} />

      <View style={{ marginTop: 14 }}>
        {view.status === 'reported' && view.paymentId ? (
          <View style={styles.waiting}>
            <View style={[styles.line, { marginTop: 0, flex: 1 }]}>
              <Feather name="clock" size={15} color={colors.muted} />
              <Text style={styles.waitingText}>Čeká na potvrzení od zakladatele</Text>
            </View>
            <SmallAction
              label="Vzít zpět"
              icon="corner-up-left"
              onPress={() => run(() => undoReport(view.paymentId as string, userId), 'Nahlášení je zrušené.')}
            />
          </View>
        ) : (
          <ReportButton
            onPress={() =>
              run(() => reportPayment(groupId, userId, view.period), 'Díky! Zakladatel teď platbu potvrdí.')
            }
          />
        )}
      </View>
    </View>
  )
}

function ReportButton({ onPress }: { onPress: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      label="Zaplatil jsem"
      icon="check"
      loading={busy}
      onPress={async () => {
        setBusy(true)
        try {
          await onPress()
        } finally {
          setBusy(false)
        }
      }}
    />
  )
}

/** Tap to copy; the icon turns into a tick for a moment so the tap is felt. */
function CopyRow({ label, shown, copy, last }: { label: string; shown: string; copy: string; last?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const press = async () => {
    let ok = false
    try {
      ok = await Clipboard.setStringAsync(copy)
    } catch {
      ok = false
    }
    setState(ok ? 'copied' : 'failed')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 1600)
  }

  return (
    <Press onPress={press} scaleTo={0.985}>
      <View style={[styles.row, !last && styles.rowDivider]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {shown}
        </Text>
        {state === 'idle' ? (
          <View style={styles.copy}>
            <Feather name="copy" size={14} color={colors.muted} />
          </View>
        ) : (
          <View style={styles.copied}>
            <Feather
              name={state === 'copied' ? 'check' : 'alert-circle'}
              size={12}
              color={state === 'copied' ? colors.brandForeground : '#a3241a'}
            />
            <Text style={[styles.copiedText, state === 'failed' && { color: '#a3241a' }]}>
              {state === 'copied' ? 'Zkopírováno' : 'Nepovedlo se'}
            </Text>
          </View>
        )}
      </View>
    </Press>
  )
}

/** The QR, plus a way to hand it to the bank app as a picture. */
function SharedQr({ spd, caption }: { spd: string; caption: string }) {
  const shot = useRef<View>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const share = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable')
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' })
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Sdílet QR platbu' })
    } catch {
      setError('QR se nepodařilo sdílet. Použij prosím údaje výše.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.qrBlock}>
      {/* collapsable={false} keeps the view real on Android, or there is nothing to capture. */}
      <View ref={shot} collapsable={false} style={styles.qrShot}>
        <QRCode value={spd} size={176} ecl="M" color="#0b1730" backgroundColor={colors.white} quietZone={0} />
        <Text style={styles.qrCaption}>{caption}</Text>
      </View>
      <Text style={styles.qrHint}>
        QR z vlastního displeje nenaskenuješ. Zkopíruj údaje výše, nebo QR ulož a nahraj v aplikaci své
        banky.
      </Text>
      <Button label="Sdílet QR" icon="share" variant="outline" loading={busy} onPress={share} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  amount: { color: colors.navyDeep, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  due: { color: colors.muted, fontSize: 12.5, fontWeight: '500', letterSpacing: 0 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  muted: { flex: 1, color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  rows: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: {
    width: 54,
    color: colors.muted,
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  rowValue: { flex: 1, color: colors.navyDeep, fontSize: 13.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  copy: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,217,154,0.12)',
  },
  copiedText: { color: colors.brandForeground, fontSize: 11, fontWeight: '700' },
  qrBlock: { marginTop: 14, gap: 10 },
  qrShot: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  qrCaption: { color: colors.navyDeep, fontSize: 12, fontWeight: '700' },
  qrHint: { color: colors.muted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  waitingText: { flex: 1, color: colors.navyDeep, fontSize: 13 },
  small: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
  },
  smallBrand: { backgroundColor: colors.brand },
  smallText: { color: colors.muted, fontSize: 12.5, fontWeight: '700' },
  error: { color: '#a3241a', fontSize: 12, lineHeight: 17, textAlign: 'center' },
})
