import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { useStudentBadges } from '../../hooks/useStudentBadges';
import { useTheme } from '../../theme/ThemeContext';

// One signature colour per destination. The bar surface stays neutral and the
// COLOUR lives in the icons; an inactive tab keeps its hue at ~42% alpha rather
// than greying out, so the row still reads as a colourful set.
const TINTS = {
  me: '#7C5CFF',      // violet
  quest: '#15C98C',   // green
  games: '#FF9D2E',   // amber
  code: '#3AA0FF',    // blue
  tasks: '#FF5E9C',   // pink
  events: '#F4A716',  // gold
} as const;
const DIM = '6B'; // 8-digit hex alpha ≈ 42%

export default function StudentTabsLayout() {
  // Live badge counts like the web sidebar: due tasks + classes live now.
  const { due, live } = useStudentBadges();
  const { scheme } = useTheme();
  const dark = scheme === 'dark';
  // Grow the tab bar by the device's bottom system-UI inset (Android nav keys /
  // iOS home indicator) so the tabs never sit underneath them.
  const insets = useSafeAreaInsets();

  return (
    <TierProvider>
        <LessonProgressProvider>
          <Tabs
            // Keep inactive tabs LIVE (not frozen) so a theme flip re-renders
            // every mounted screen at once — a frozen tab would otherwise show
            // the old scheme until you navigated to it and it thawed.
            detachInactiveScreens={false}
            screenOptions={{
              headerShown: false,
              freezeOnBlur: false,
              // Neutral surface — the colour lives in the icons (see TINTS).
              tabBarStyle: {
                height: 64 + insets.bottom,
                paddingTop: 6,
                paddingBottom: 8 + insets.bottom,
                borderTopWidth: 1,
                borderTopColor: dark ? '#2c2750' : '#f5f3fa',
                backgroundColor: dark ? '#1b1735' : '#fff',
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
                tabBarActiveTintColor: TINTS.me,
                tabBarInactiveTintColor: TINTS.me + DIM,
                tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="quest"
              options={{
                title: 'Quests',
                tabBarActiveTintColor: TINTS.quest,
                tabBarInactiveTintColor: TINTS.quest + DIM,
                tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="games"
              options={{
                title: 'Games',
                tabBarActiveTintColor: TINTS.games,
                tabBarInactiveTintColor: TINTS.games + DIM,
                tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="code"
              options={{
                title: 'Code Lab',
                tabBarActiveTintColor: TINTS.code,
                tabBarInactiveTintColor: TINTS.code + DIM,
                tabBarIcon: ({ color, size }) => <Ionicons name="code-slash" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="tasks"
              options={{
                title: 'Tasks',
                tabBarActiveTintColor: TINTS.tasks,
                tabBarInactiveTintColor: TINTS.tasks + DIM,
                tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
                tabBarBadge: due > 0 ? due : undefined,
              }}
            />
            <Tabs.Screen
              name="events"
              options={{
                title: 'Events',
                tabBarActiveTintColor: TINTS.events,
                tabBarInactiveTintColor: TINTS.events + DIM,
                tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
                tabBarBadge: live > 0 ? live : undefined,
              }}
            />
            {/* Avatar/profile — merged into Me (header avatar), not a tab. */}
            <Tabs.Screen name="me" options={{ href: null }} />
          </Tabs>
        </LessonProgressProvider>
      </TierProvider>
  );
}
