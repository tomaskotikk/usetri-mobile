import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { formatIban, parseCzechAccount, toIban } from '../lib/czech-account'
import { savePayoutAccount } from '../lib/payments'
import { Banner, Button, Field } from './ui'
import { colors } from '../theme'

/** Bank account field that checks the number as you type and shows the IBAN it becomes. */
export function AccountField({
  value,
  onChangeText,
  label,
}: {
  value: string
  onChangeText: (value: string) => void
  label?: string
}) {
  const [touched, setTouched] = useState(false)
  const parsed = useMemo(() => parseCzechAccount(value), [value])
  const showError = touched && value.trim() !== '' && !parsed

  return (
    <View>
      <Field
        label={label}
        placeholder="např. 2000145399/0800"
        value={value}
        onChangeText={onChangeText}
        onBlur={() => setTouched(true)}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
      />
      {parsed && (
        <View style={styles.ok}>
          <Feather name="check" size={13} color={colors.brand} />
          <Text style={styles.okText}>{formatIban(toIban(parsed))}</Text>
        </View>
      )}
      {showError && (
        <Text style={styles.error}>
          Tohle číslo účtu nevypadá správně. Zkontroluj předčíslí, číslo i kód banky.
        </Text>
      )}
    </View>
  )
}

/** Field plus save, for editing the account outside the create flow. */
export function PayoutAccountForm({
  userId,
  current,
  onSaved,
}: {
  userId: string
  current?: string
  onSaved?: () => void
}) {
  const [value, setValue] = useState(current ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    const failed = await savePayoutAccount(userId, value)
    setBusy(false)
    setError(failed)
    setSaved(!failed)
    if (!failed) onSaved?.()
  }

  return (
    <View style={{ gap: 12 }}>
      <AccountField
        value={value}
        onChangeText={(next) => {
          setValue(next)
          setSaved(false)
        }}
      />
      {error && <Banner tone="error" text={error} />}
      {saved && <Banner tone="info" text="Číslo účtu je uložené." />}
      <Button label="Uložit účet" onPress={save} loading={busy} />
    </View>
  )
}

const styles = StyleSheet.create({
  ok: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  okText: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  error: { color: '#a3241a', fontSize: 12, lineHeight: 17, marginTop: 7 },
})
