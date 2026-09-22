import { useEffect, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '../lib/supabase'
import { Globe } from '../components/Globe'
import { Banner, Button, Field, GoogleLogo } from '../components/ui'
import { colors } from '../theme'

WebBrowser.maybeCompleteAuthSession()

/** Deep link the browser finally lands on: usetri://auth/callback, or exp://<ip> in Expo Go. */
const nativeUrl = makeRedirectUri({ scheme: 'usetri', path: 'auth/callback' })

/**
 * Supabase rejects redirect URLs whose host is a raw IP address, and Expo Go can
 * only ever offer one. So Supabase returns to the website instead, which forwards
 * the result to nativeUrl — see app/auth/native/route.ts in the web project.
 */
const site = process.env.EXPO_PUBLIC_SITE_URL

if (!site) {
  throw new Error('Chybí EXPO_PUBLIC_SITE_URL v .env')
}

const redirectTo = `${site}/auth/native?next=${encodeURIComponent(nativeUrl)}`

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Nesprávný e-mail nebo heslo.',
  email_not_confirmed: 'Nejdřív potvrď svůj e-mail — poslali jsme ti odkaz.',
  user_already_exists: 'Účet s tímto e-mailem už existuje. Zkus se přihlásit.',
  weak_password: 'Heslo je příliš slabé. Použij aspoň 8 znaků.',
  over_email_send_rate_limit: 'Moc pokusů za sebou. Zkus to za chvíli.',
  validation_failed: 'Zkontroluj zadané údaje.',
}

const readable = (code?: string) => (code && MESSAGES[code]) || 'Něco se nepovedlo. Zkus to prosím znovu.'

/** Tokens can arrive in the query string or the fragment, depending on the flow. */
function parseAuthParams(url: string) {
  const out: Record<string, string> = {}
  for (const part of url.split(/[?#]/).slice(1)) {
    for (const pair of part.split('&')) {
      const [k, v] = pair.split('=')
      if (k && v) out[decodeURIComponent(k)] = decodeURIComponent(v)
    }
  }
  return out
}

export function AuthScreen() {
  const insets = useSafeAreaInsets()
  // Small phones (SE-sized) need tighter spacing for the sign-up form to fit.
  const compact = useWindowDimensions().height < 700
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<null | 'form' | 'google'>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // The globe takes whatever height is left over, so the screen never scrolls.
  const [globeBox, setGlobeBox] = useState({ width: 0, height: 0 })
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTyping(true),
    )
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setTyping(false),
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  const measureGlobe = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setGlobeBox((box) => (box.width === width && box.height === height ? box : { width, height }))
  }

  // Fit the sphere to the smaller side of the gap it was given.
  const globeSize = Math.min(globeBox.width, globeBox.height)

  const isLogin = mode === 'login'

  const switchMode = () => {
    setMode(isLogin ? 'signup' : 'login')
    setError(null)
    setNotice(null)
  }

  const submit = async () => {
    setError(null)
    setNotice(null)

    const mail = email.trim()
    if (!mail || !password) return setError('Vyplň e-mail i heslo.')
    if (!isLogin && !name.trim()) return setError('Vyplň svoje jméno.')
    if (!isLogin && password.length < 8) return setError('Heslo musí mít aspoň 8 znaků.')

    setBusy('form')
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
        if (error) setError(readable(error.code))
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          // Without this the confirmation link points at the website's Site URL,
          // which a phone cannot open when the site runs on localhost.
          options: { data: { full_name: name.trim() }, emailRedirectTo: redirectTo },
        })
        if (error) setError(readable(error.code))
        else if (!data.session) setNotice(`Poslali jsme ti potvrzovací odkaz na ${mail}.`)
      }
    } finally {
      setBusy(null)
    }
    // A successful sign-in fires onAuthStateChange in App.tsx, which swaps the screen.
  }

  const signInWithGoogle = async () => {
    setError(null)
    setNotice(null)
    setBusy('google')
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      })
      if (error || !data?.url) return setError('Přihlášení přes Google se nepodařilo spustit.')

      const result = await WebBrowser.openAuthSessionAsync(data.url, nativeUrl)
      if (result.type !== 'success') {
        // Supabase falls back to the project's Site URL when redirectTo below is
        // not on its allow list, and the browser then dead-ends on the website.
        setError(
          __DEV__
            ? `Google se nevrátil do appky. Povol v Supabase tenhle web: ${site}/**`
            : 'Přihlášení přes Google se nedokončilo.',
        )
        return
      }

      const params = parseAuthParams(result.url)
      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        })
        if (error) setError('Session se nepodařilo uložit.')
      } else if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code)
        if (error) setError('Přihlášení přes Google se nepovedlo.')
      } else {
        setError(`Google nevrátil přihlašovací údaje. Adresa návratu: ${nativeUrl}`)
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View
          style={[
            styles.page,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Text style={styles.wordmark}>
            Ušetři<Text style={{ color: colors.brand }}>.</Text>
          </Text>

          {!typing && (
            <View style={styles.globeSlot} onLayout={measureGlobe}>
              {globeSize > 96 && <Globe size={globeSize} />}
            </View>
          )}

          <View style={styles.content}>
            <Text style={[styles.headline, compact && styles.headlineCompact]}>
              {isLogin ? 'Přihlas se' : 'Vytvoř si účet'}
            </Text>
            {/* the sign-up form is one field taller; on a small screen this line goes */}
            {!(compact && !isLogin) && (
              <Text style={styles.sub}>
                {isLogin
                  ? 'Pokračuj ke svým skupinám a platbám.'
                  : 'Pár údajů a můžeš se přidat k první skupině.'}
              </Text>
            )}

            <Button
              label="Pokračovat přes Google"
              onPress={signInWithGoogle}
              variant="outline"
              loading={busy === 'google'}
              disabled={busy !== null}
              leading={<GoogleLogo />}
              style={compact ? styles.googleCompact : styles.google}
            />

            <View style={[styles.divider, compact && styles.dividerCompact]}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>nebo e-mailem</Text>
              <View style={styles.line} />
            </View>

            <View style={[styles.fields, compact && styles.fieldsCompact]}>
              {!isLogin && (
                <Field
                  label="Jméno"
                  placeholder="Tomáš Kotík"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              )}
              <Field
                label="E-mail"
                placeholder="ty@email.cz"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Field
                label="Heslo"
                placeholder={isLogin ? '••••••••' : 'Aspoň 8 znaků'}
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </View>

            {(error || notice) && (
              <View style={styles.banner}>
                {error ? <Banner tone="error" text={error} /> : <Banner tone="info" text={notice!} />}
              </View>
            )}

            <Button
              label={isLogin ? 'Přihlásit se' : 'Vytvořit účet'}
              onPress={submit}
              loading={busy === 'form'}
              disabled={busy !== null}
              style={compact ? styles.submitCompact : styles.submit}
            />
          </View>

          <Pressable onPress={switchMode} style={[styles.switch, compact && styles.switchCompact]} hitSlop={8}>
            <Text style={styles.switchText}>
              {isLogin ? 'Nemáš účet? ' : 'Už máš účet? '}
              <Text style={styles.switchLink}>{isLogin ? 'Zaregistruj se' : 'Přihlas se'}</Text>
            </Text>
          </Pressable>

          {__DEV__ && (
            <Text style={styles.devHint} numberOfLines={2}>
              Návrat přes {site} do {nativeUrl}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  page: { flex: 1, paddingHorizontal: 24 },
  globeSlot: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: colors.navyDeep, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  content: { paddingTop: 4 },
  headline: { color: colors.navyDeep, fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  headlineCompact: { fontSize: 24 },
  sub: { color: colors.muted, fontSize: 14.5, lineHeight: 20, marginTop: 6 },
  google: { marginTop: 22 },
  googleCompact: { marginTop: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerCompact: { marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: '#e8ecf4' },
  dividerText: { color: colors.muted, fontSize: 12 },
  fields: { gap: 14 },
  fieldsCompact: { gap: 10 },
  banner: { marginTop: 14 },
  submit: { marginTop: 18 },
  submitCompact: { marginTop: 12 },
  switch: { alignItems: 'center', paddingTop: 16 },
  switchCompact: { paddingTop: 10 },
  switchText: { color: colors.muted, fontSize: 14 },
  switchLink: { color: colors.navyDeep, fontWeight: '700' },
  devHint: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 2,
    color: '#b9bfcb',
    fontSize: 10,
    textAlign: 'center',
  },
})
