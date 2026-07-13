import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { useStudentBadges } from '../../hooks/useStudentBadges';
import { useTheme } from '../../theme/ThemeContext';

export default function StudentTabsLayout() {
  // Live badge counts like the web sidebar: due tasks + classes live now.
  const { due, live } = useStudentBadges();
  const { scheme } = useTheme();
  const dark = scheme === 'dark';

  return (
    <SafeAreaProvider>
      <TierProvider>
        <LessonProgressProvider>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: dark ? '#a78bfa' : '#7c5cff',
              tabBarInactiveTintColor: dark ? '#7d76a8' : '#9b94c4',
              tabBarStyle: {
                height: 64,
                paddingTop: 6,
                paddingBottom: 8,
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
        </LessonProgressProvider>
      </TierProvider>
    </SafeAreaProvider>
  );
}
