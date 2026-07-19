import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { useStudentBadges } from '../../hooks/useStudentBadges';
import { useTheme } from '../../theme/ThemeContext';
import { FluidTabBar } from '../../components/FluidTabBar';

// One signature colour per destination — same idea as the parent shell, in the
// student palette. Idle tabs keep their hue dimmed rather than greying out.
const TINTS: Record<string, string> = {
  index: '#7C5CFF',   // violet — Me
  quest: '#15C98C',   // green — Quests
  games: '#FF9D2E',   // amber — Games
  code: '#3AA0FF',    // blue — Code Lab
  tasks: '#FF5E9C',   // pink — Tasks
  events: '#F4A716',  // gold — Events
};

const ICONS: Record<string, (active: boolean) => React.ComponentProps<typeof Ionicons>['name']> = {
  index: (a) => (a ? 'home' : 'home-outline'),
  quest: (a) => (a ? 'map' : 'map-outline'),
  games: (a) => (a ? 'game-controller' : 'game-controller-outline'),
  code: (a) => (a ? 'code-slash' : 'code-slash-outline'),
  tasks: (a) => (a ? 'clipboard' : 'clipboard-outline'),
  events: (a) => (a ? 'calendar' : 'calendar-outline'),
};

export default function StudentTabsLayout() {
  // Live badge counts like the web sidebar: due tasks + classes live now.
  const { due, live } = useStudentBadges();
  const { scheme } = useTheme();
  const dark = scheme === 'dark';

  return (
    <TierProvider>
      <LessonProgressProvider>
        <Tabs
          // Keep inactive tabs LIVE (not frozen) so a theme flip re-renders
          // every mounted screen at once — a frozen tab would otherwise show
          // the old scheme until you navigated to it and it thawed.
          detachInactiveScreens={false}
          screenOptions={{ headerShown: false, freezeOnBlur: false }}
          // Same animated bar as the parent shell; safe-area padding is handled
          // inside it, so no tabBarStyle height maths is needed here.
          tabBar={(props) => (
            <FluidTabBar
              {...props}
              tints={TINTS}
              badges={{ tasks: due, events: live }}
              surface={dark ? '#1b1735' : '#ffffff'}
              border={dark ? '#2c2750' : '#f5f3fa'}
              dark={dark}
              renderIcon={(name, active, color, size) => (
                <Ionicons name={ICONS[name]?.(active) ?? 'ellipse-outline'} size={size} color={color} />
              )}
            />
          )}
        >
          {/* Web parity: Me · Quests · Games · Code Lab · Tasks · Events */}
          <Tabs.Screen name="index" options={{ title: 'Me' }} />
          <Tabs.Screen name="quest" options={{ title: 'Quests' }} />
          <Tabs.Screen name="games" options={{ title: 'Games' }} />
          <Tabs.Screen name="code" options={{ title: 'Code Lab' }} />
          <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
          <Tabs.Screen name="events" options={{ title: 'Events' }} />
          {/* Avatar/profile — merged into Me (header avatar), not a tab. */}
          <Tabs.Screen name="me" options={{ href: null }} />
        </Tabs>
      </LessonProgressProvider>
    </TierProvider>
  );
}
