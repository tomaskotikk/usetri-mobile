// SDK 57 ships a localStorage shim backed by SQLite — the storage Supabase expects.
import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

// EXPO_PUBLIC_* values are inlined at build time — same keys the website uses.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Chybí EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY v .env')
}

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There is no URL to read a session from on iOS or Android.
    detectSessionInUrl: false,
  },
})

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})
