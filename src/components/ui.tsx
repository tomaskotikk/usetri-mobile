import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import Svg, { Path } from 'react-native-svg'
import { colors } from '../theme'

/** Google's own four-colour mark. */
export function GoogleLogo({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <Path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4.01-3.09Z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.63l4.01 3.09C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </Svg>
  )
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  leading,
  style,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'outline'
  loading?: boolean
  disabled?: boolean
  icon?: React.ComponentProps<typeof Feather>['name']
  leading?: React.ReactNode
  style?: ViewStyle
}) {
  const tone =
    variant === 'primary'
      ? { bg: colors.brand, fg: colors.brandForeground, border: 'transparent' }
      : { bg: colors.white, fg: colors.navyDeep, border: colors.border }

  const off = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone.bg, borderColor: tone.border, opacity: off ? 0.55 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <>
          {leading}
          {icon && <Feather name={icon} size={17} color={tone.fg} />}
          <Text style={[styles.buttonLabel, { color: tone.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

export function Field({
  label,
  secure = false,
  ...props
}: TextInputProps & { label: string; secure?: boolean }) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(secure)

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          {...props}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="#9aa3b4"
          style={styles.input}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  )
}

export function Banner({ tone, text }: { tone: 'error' | 'info'; text: string }) {
  const error = tone === 'error'
  return (
    <View style={[styles.banner, { backgroundColor: error ? '#fdeceb' : 'rgba(0,217,154,0.12)' }]}>
      <Feather
        name={error ? 'alert-circle' : 'check-circle'}
        size={15}
        color={error ? '#d63b2f' : colors.brandForeground}
      />
      <Text style={[styles.bannerText, { color: error ? '#a3241a' : colors.brandForeground }]}>
        {text}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 },
  label: { color: colors.navyDeep, fontSize: 13, fontWeight: '600', marginBottom: 7 },
  field: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e6ef',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  fieldFocused: { borderColor: colors.navy },
  input: { flex: 1, color: colors.navyDeep, fontSize: 15.5, height: '100%' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  bannerText: { flex: 1, fontSize: 13.5, lineHeight: 19 },
})
