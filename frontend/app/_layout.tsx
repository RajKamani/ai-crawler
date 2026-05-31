import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useThemeContext } from '../context/ThemeContext';
import { AuthScreen } from '../components/AuthScreen';
import { OnboardingScreen } from '../components/OnboardingScreen';
import { supabase } from '../utils/supabase';
import { API_BASE_URL } from '../constants/Config';
import { useTheme } from '../hooks/useTheme';

// Global Fetch Interceptor to inject Supabase Auth JWT Bearer token dynamically
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input && typeof input === 'object') {
      const inputObj = input as any;
      if ('url' in inputObj) {
        url = inputObj.url;
      } else if ('href' in inputObj) {
        url = inputObj.href;
      } else {
        url = inputObj.toString();
      }
    } else if (input) {
      url = (input as any).toString();
    }

    if (url && url.startsWith(API_BASE_URL)) {
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      } catch (err) {
        console.error('[Fetch Interceptor] Error getting Supabase session:', err);
      }
      
      // Copy headers safely as a plain object to prevent React Native Headers class issues
      const plainHeaders: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            plainHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            plainHeaders[key] = value;
          });
        } else {
          Object.assign(plainHeaders, init.headers);
        }
      }

      if (session?.access_token) {
        plainHeaders['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        plainHeaders['Authorization'] = 'Bearer mock-user-session-token-12345';
      }

      // Clone init to prevent modifying frozen/read-only parameters in React Native / Hermes
      const clonedInit = init ? { ...init } : {};
      clonedInit.headers = plainHeaders;
      init = clonedInit;
    }
  } catch (err) {
    console.error('[Fetch Interceptor] General interceptor crash:', err);
  }
  return originalFetch(input, init);
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('../assets/fonts/SpaceMono-Bold.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}
function RootLayoutNav() {
  const { theme } = useThemeContext();
  const colors = useTheme();
  const { session, isLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (session?.user) {
      setIsOnboarded(!!session.user.user_metadata?.onboarding_completed);
    } else {
      setIsOnboarded(null);
    }
  }, [session]);

  if (isLoading || (session && isOnboarded === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (isOnboarded === false) {
    return <OnboardingScreen onComplete={() => setIsOnboarded(true)} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              headerShown: true,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: 'SpaceMono', fontWeight: '700' },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </NavigationThemeProvider>
    </SafeAreaProvider>
  );
}
