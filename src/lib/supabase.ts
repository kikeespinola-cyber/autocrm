import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const supabaseUrl = 'https://axkwixgbglrpkqqlgbfa.supabase.co'
const supabaseAnonKey = 'sb_publishable_pkAdPGNvjSMDoZ8BQgn-2Q_mpZUlnp_'

const isWeb = Platform.OS === 'web'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isWeb ? undefined : {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: !isWeb,
    detectSessionInUrl: false,
  },
})