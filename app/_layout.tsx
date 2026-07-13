import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import 'react-native-reanimated';

import { AuthProvider } from '../context/AuthContext';
import { SelectedChildProvider } from '../context/SelectedChildContext';
import { ParentProfileProvider } from '../context/ParentProfileContext';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { usePushRegistration } from '../hooks/usePushRegistration';

export const unstable_settings = {
  anchor: 'onboarding',
};

SplashScreen.preventAutoHideAsync();

// Single app-wide React Query client. staleTime keeps screen re-focuses from
// refetching instantly; retry once smooths over flaky mobile networks.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ParentProfileProvider>
            <SelectedChildProvider>
              <ThemedAppShell />
            </SelectedChildProvider>
          </ParentProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// =================================================================
// ThemedAppShell - lives under ThemeProvider so it can read scheme
// and pass the right nav theme + status bar style down.
// =================================================================
function ThemedAppShell() {
  const { scheme, colors } = useTheme();
  usePushRegistration();

  // Customise the Navigation theme so default backdrops use our colors
  const navTheme = scheme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth + onboarding */}
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="chooser" />
        <Stack.Screen name="parent-login" />
        <Stack.Screen name="student-login" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="choose-child" />

        {/* Tab groups */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(student-tabs)" />

        {/* Student deep routes */}
        <Stack.Screen name="student/lesson" />
        <Stack.Screen name="student/stars" />
        <Stack.Screen name="student/videos" />
        <Stack.Screen name="student/live-classes" />
        <Stack.Screen name="student/library" />
        <Stack.Screen name="student/tests" />
        <Stack.Screen name="student/assignments" />
        <Stack.Screen name="student/portfolio" />
        <Stack.Screen name="student/code/scratch" />
        <Stack.Screen name="student/code/blockly" />
        <Stack.Screen name="student/code/python" />
        <Stack.Screen name="student/code/mobile" />
        <Stack.Screen name="student/code/robotics" />

        {/* Parent feature screens */}
        <Stack.Screen name="communication" />
        <Stack.Screen name="subscriptions" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="diary" />
        <Stack.Screen name="transport" />
        <Stack.Screen name="reminders" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="live-classes" />
        <Stack.Screen name="coding" />
        <Stack.Screen name="kid-learn" />

        {/* Parent feature screens */}
        <Stack.Screen name="communication-all" />   {/* ← add this line */}

        {/* Messaging + voice */}
        <Stack.Screen name="chat" />
        <Stack.Screen name="conversation" />
        <Stack.Screen name="call" />

        {/* Modal */}
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: true, title: 'Modal' }}
        />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}
