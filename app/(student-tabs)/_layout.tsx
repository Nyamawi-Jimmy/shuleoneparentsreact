import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';

export default function StudentTabsLayout() {
  return (
    <SafeAreaProvider>
      <TierProvider>
        <LessonProgressProvider>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: '#7c5cff',
              tabBarInactiveTintColor: '#9b94c4',
              tabBarStyle: {
                height: 64,
                paddingTop: 6,
                paddingBottom: 8,
                borderTopWidth: 1,
                borderTopColor: '#f5f3fa',
                backgroundColor: '#fff',
              },
              tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
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
              }}
            />
            <Tabs.Screen
              name="events"
              options={{
                title: 'Events',
                tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
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
