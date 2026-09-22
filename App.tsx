import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Animated, { FadeIn } from 'react-native-reanimated'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './src/lib/supabase'
import { loadHome, type Home, type Offer } from './src/lib/data'
import { Splash } from './src/components/Splash'
import { TabBar, type TabKey } from './src/components/TabBar'
import { AuthScreen } from './src/screens/AuthScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { DiscoverScreen } from './src/screens/DiscoverScreen'
import { GroupsScreen } from './src/screens/GroupsScreen'
import { ProfileScreen } from './src/screens/ProfileScreen'
import { OfferSheet } from './src/screens/OfferSheet'
import { CreateSheet } from './src/screens/CreateSheet'
import { OnboardingScreen } from './src/screens/OnboardingScreen'
import { colors, motion } from './src/theme'

const GUIDE_SEEN = 'usetri.guide.seen'

/** Reading storage can throw in odd states; a missing flag just means "show it". */
function guideSeen() {
  try {
    return localStorage.getItem(GUIDE_SEEN) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)

  const [data, setData] = useState<Home | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [tab, setTab] = useState<TabKey>('home')
  const [creating, setCreating] = useState(false)
  const [opened, setOpened] = useState<Offer | null>(null)
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: result }) => {
      setSession(result.session)
      setAuthReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // A different account must not inherit the previous one's groups.
      if (!next) setData(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  const load = useCallback(async () => {
    if (!userId) return
    try {
      setData(await loadHome(userId))
    } catch {
      Alert.alert('Nepovedlo se načíst data', 'Zkontroluj připojení k internetu.')
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setData(null)
    load()
    setGuide(!guideSeen())
  }, [userId, load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const dismissGuide = () => {
    try {
      localStorage.setItem(GUIDE_SEEN, '1')
    } catch {
      // A guide that cannot record itself is better shown twice than not at all.
    }
    setGuide(false)
  }

  // The offer in state is a snapshot; refresh it from the reloaded list.
  const openedNow = opened ? data?.mine.concat(data.open).find((o) => o.id === opened.id) ?? opened : null

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {!authReady ? null : !session ? (
          <AuthScreen />
        ) : guide ? (
          <OnboardingScreen onDone={dismissGuide} />
        ) : (
          <>
            <Animated.View key={tab} entering={FadeIn.duration(motion.base)} style={styles.screen}>
              {tab === 'home' && (
                <HomeScreen
                  user={session.user}
                  data={data}
                  refreshing={refreshing}
                  onRefresh={refresh}
                  onOpenOffer={setOpened}
                  onDiscover={() => setTab('discover')}
                  onCreate={() => setCreating(true)}
                />
              )}
              {tab === 'discover' && (
                <DiscoverScreen
                  data={data}
                  refreshing={refreshing}
                  onRefresh={refresh}
                  onOpenOffer={setOpened}
                  onCreate={() => setCreating(true)}
                />
              )}
              {tab === 'groups' && (
                <GroupsScreen
                  data={data}
                  refreshing={refreshing}
                  onRefresh={refresh}
                  onOpenOffer={setOpened}
                  onCreate={() => setCreating(true)}
                  onDiscover={() => setTab('discover')}
                />
              )}
              {tab === 'profile' && (
                <ProfileScreen
                  user={session.user}
                  data={data}
                  refreshing={refreshing}
                  onRefresh={refresh}
                  onChanged={load}
                  onReplayGuide={() => setGuide(true)}
                />
              )}
            </Animated.View>

            <TabBar active={tab} onChange={setTab} onCreate={() => setCreating(true)} />

            <OfferSheet
              offer={openedNow}
              userId={session.user.id}
              onClose={() => setOpened(null)}
              onChanged={load}
            />
            <CreateSheet
              open={creating}
              userId={session.user.id}
              onClose={() => setCreating(false)}
              onCreated={() => {
                setTab('groups')
                load()
              }}
            />
          </>
        )}

        {!splashDone && <Splash ready={authReady} onDone={() => setSplashDone(true)} />}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  screen: { flex: 1 },
})
