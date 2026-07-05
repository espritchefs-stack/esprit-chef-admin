import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/ctx/auth';
import '@/lib/i18n';
import '@/lib/i18n';
// import { LogLevel, OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';
import { setupPurchases } from '@/lib/purchases';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading, isGuest } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';
    const hasAccess = session || isGuest;

    if (!hasAccess && !inAuthGroup) {
      // Redirect to the login page.
      router.replace('/login');
    } else if (hasAccess && inAuthGroup) {
      // Redirect away from the login page.
      router.replace('/(tabs)');
    }
  }, [session, isLoading, isGuest, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      
      // Initialize RevenueCat
      setupPurchases().catch(e => console.warn("RevenueCat Init Error (Likely Expo Go):", e));
      
      // Initialize OneSignal Push Notifications (Requires EAS Build/Native Client)
      // Remove this check or handle properly when moving to production with real App ID
      // NOTE: Commented out for Expo Go compatibility. Uncomment when building with EAS.
      /*
      if (Platform.OS !== 'web') {
        const ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID_HERE"; // Placeholder
        OneSignal.Debug.setLogLevel(LogLevel.Verbose);
        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Optional: Request permission right away, or later in the app flow
        OneSignal.Notifications.requestPermission(true);
      }
      */
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
