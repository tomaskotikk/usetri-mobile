import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useDerivedValue, useSharedValue } from 'react-native-reanimated'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './src/lib/supabase'
import { loadHome, syncProfileAvatar, type Home, type Offer } from './src/lib/data'
import { Splash } from './src/components/Splash'
import { TabBar, type TabKey } from './src/components/TabBar'
import { Pager } from './src/components/Pager'
import { AuthScreen } from './src/screens/AuthScreen'
import { HomeScreen } from './src/screens/HomeScreen'
import { DiscoverScreen } from './src/screens/DiscoverScreen'
import { GroupsScreen } from './src/screens/GroupsScreen'
import { ProfileScreen } from './src/screens/ProfileScreen'
import { OfferSheet } from './src/screens/OfferSheet'
import { MemberSheet } from './src/screens/MemberSheet'
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
  const [member, setMember] = useState<string | null>(null)
  /** The offer to slide back to once a member's profile closes. */
  const resume = useRef<Offer | null>(null)
  const [guide, setGuide] = useState(false)

  /** The pager's offset in pixels, and the same as a page number for the tab bar. */
  const { width } = useWindowDimensions()
  const pagerX = useSharedValue(0)
  const page = useDerivedValue(() => -pagerX.value / width)
  /** A sheet or overlay is over the tabs: no swiping, and the figures behind it rest. */
  const covered = Boolean(opened || member || creating)

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

  // Publish the Google picture to the profile row so other members can see it.
  useEffect(() => {
    if (!session?.user) return
    void syncProfileAvatar(session.user.id, session.user.user_metadata)
  }, [session?.user])

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

  /**
   * The profile overlay is not a Modal, so it can no longer be smothered by one —
   * but a Modal still renders in its own window above every view, so the offer
   * sheet has to be gone before the profile appears. Hence the handover.
   */
  const HANDOVER = motion.base + 80

  const openMember = (id: string) => {
    resume.current = opened
    setOpened(null)
    setTimeout(() => setMember(id), opened ? HANDOVER : 0)
  }

  const closeMember = () => {
    setMember(null)
    const back = resume.current
    resume.current = null
    if (back) setTimeout(() => setOpened(back), HANDOVER)
  }

  const openOfferFromProfile = (offer: Offer) => {
    resume.current = null
    setMember(null)
    setTimeout(() => setOpened(offer), HANDOVER)
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
            <StatusBar style={tab === 'home' ? 'light' : 'dark'} />
            <Pager
              tab={tab}
              onChange={setTab}
              enabled={!covered}
              paused={covered}
              x={pagerX}
              pages={{
                home: (
                  <HomeScreen
                    user={session.user}
                    data={data}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    onOpenOffer={setOpened}
                    onDiscover={() => setTab('discover')}
                    onCreate={() => setCreating(true)}
                    onChanged={load}
                  />
                ),
                discover: (
                  <DiscoverScreen
                    data={data}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    onOpenOffer={setOpened}
                    onCreate={() => setCreating(true)}
                  />
                ),
                groups: (
                  <GroupsScreen
                    data={data}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    onOpenOffer={setOpened}
                    onCreate={() => setCreating(true)}
                    onDiscover={() => setTab('discover')}
                  />
                ),
                profile: (
                  <ProfileScreen
                    user={session.user}
                    data={data}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    onChanged={load}
                    onReplayGuide={() => setGuide(true)}
                  />
                ),
              }}
            />

            <TabBar page={page} onChange={setTab} onCreate={() => setCreating(true)} />

            <OfferSheet
              offer={openedNow}
              userId={session.user.id}
              onClose={() => setOpened(null)}
              onChanged={load}
              onOpenMember={openMember}
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

            <MemberSheet
              userId={member}
              viewerId={session.user.id}
              onClose={closeMember}
              onOpenOffer={openOfferFromProfile}
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
})
