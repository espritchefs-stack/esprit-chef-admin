import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// URL polyfill is only required for Native platforms.
// Importing it on Web SSR (Node.js) causes 'window is not defined' errors.
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// Safely define window for SSR environments purely to prevent GoTrueClient crashes
if (Platform.OS === 'web' && typeof window === 'undefined') {
  global.window = {} as any;
}

// WARNING: These should ideally be in a .env file
// For now, placeholder values to demonstrate architecture as in Web
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// AppState is only reliable on native platforms for Supabase auto-refresh
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
