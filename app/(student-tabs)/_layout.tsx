import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TierProvider, useTier } from '../../screens/StudentAccount/TierContext';
import { useTokens } from '../../screens/StudentAccount/tokens';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { useStudentBadges } from '../../hooks/useStudentBadges';

export default function StudentTabsLayout() {
  // The tab bar is tinted with the tier accent, and useTier() only works BELOW
  // the provider — so the tabs live in their own component inside it.
  return (
    <TierProvider>
      <LessonProgressProvider>
        <StudentTabs />
      </LessonProgressProvider>
    </TierProvider>
  );
}

function StudentTabs() {
  // Live badge counts like the web sidebar: due tasks + classes live now.
  const { due, live } = useStudentBadges();
  const { tier } = useTier();
  const tokens = useTokens(tier);
  // Grow the tab bar by the device's bottom system-UI inset (Android nav keys /
  // iOS home indicator) so the tabs never sit underneath them.
  const insets = useSafeAreaInsets();

  return (
          <Tabs
            // Keep inactive tabs LIVE (not frozen) so a theme flip re-renders
            // every mounted screen at once — a frozen tab would otherwise show
            // the old scheme until you navigated to it and it thawed.
            detachInactiveScreens={false}
            screenOptions={{
              headerShown: false,
              freezeOnBlur: false,
              // Coloured bar in the tier's accent — white vs translucent white
              // for contrast, matching the parent side's rose bar.
              tabBarActiveTintColor: '#FFFFFF',
              tabBarInactiveTintColor: 'rgba(255,255,255,0.70)',
              tabBarStyle: {
                height: 64 + insets.bottom,
                paddingTop: 6,
                paddingBottom: 8 + insets.bottom,
                borderTopWidth: 0,
                backgroundColor: tokens.accent1,
              },
              tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
              tabBarBadgeStyle: {
                backgroundColor: '#ff5e9c',
                color: '#fff',
                fontSize: 10,
                fontWeight: '800',
                minWidth: 17,
                height: 17,
                lineHeight: 15,
                borderRadius: 9,
              },
            }}
          >
            {/* Web parity: Me · Quests · Games · Code Lab · Tasks · Events */}
            <Tabs.Screen
              name="index"
              options={{
                title: 'Me',
                tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="quest"
              options={{
                title: 'Quests',
                tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="games"
              options={{
                title: 'Games',
                tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="code"
              options={{
                title: 'Code Lab',
                tabBarIcon: ({ color, size }) => <Ionicons name="code-slash" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="tasks"
              options={{
                title: 'Tasks',
                tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
                tabBarBadge: due > 0 ? due : undefined,
              }}
            />
            <Tabs.Screen
              name="events"
              options={{
                title: 'Events',
                tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
                tabBarBadge: live > 0 ? live : undefined,
              }}
            />
            {/* Avatar/profile — merged into Me (header avatar), not a tab. */}
            <Tabs.Screen name="me" options={{ href: null }} />
          </Tabs>
  );
}
