import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { TierProvider, useTier, Tier } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { useStudentBadges } from '../../hooks/useStudentBadges';
import { useTheme } from '../../theme/ThemeContext';
import { FluidTabBar } from '../../components/FluidTabBar';

// Navigation adapts to the learner's level, a direct port of lms-react's
// StudentDashboard NAV so a CBC pupil, a high-schooler and a college student
// each get the destinations that make sense for them:
//
//   NAV.filter(n => (!n.tiers   || n.tiers.includes(tier))
//                && (!n.school  || inSchool)
//                && (!n.adultOnly || !isForm34))
//
// Labels shift with the tier too — "Quests" for a six-year-old is "Learning"
// for a Form 4 candidate.
interface NavItem {
  name: string;                     // route file name
  tiers?: Tier[];                   // undefined = every tier
  school?: boolean;                 // needs a partner-school enrolment
  adultOnly?: boolean;              // hidden for 8-4-4 Form 3/4
  tint: string;
  icon: (active: boolean) => React.ComponentProps<typeof Ionicons>['name'];
  labels: Partial<Record<Tier, string>> & { base: string };
}

const ALL: Tier[] = ['sprout', 'explorer', 'voyager', 'scholar', 'campus'];

const NAV: NavItem[] = [
  {
    name: 'index', tint: '#7C5CFF',
    icon: (a) => (a ? 'home' : 'home-outline'),
    labels: { base: 'Me', scholar: 'Dashboard' },
  },
  {
    // Voyager+ fold Games into Learn; the play tiers keep Quests separate.
    name: 'quest', tiers: ALL, tint: '#15C98C',
    icon: (a) => (a ? 'map' : 'map-outline'),
    // "Quests" only up to G3 (sprout); everyone from G4 up says "Learn".
    labels: { base: 'Learn', sprout: 'Quests', voyager: 'Learn', scholar: 'Learning', campus: 'Coding' },
  },
  {
    // Standalone Games only for the play tiers.
    name: 'games', tiers: ['sprout', 'explorer'], tint: '#FF9D2E',
    icon: (a) => (a ? 'game-controller' : 'game-controller-outline'),
    labels: { base: 'Games' },
  },
  {
    // Campus reaches coding through Learn, so no separate lab tab.
    name: 'code', tiers: ['sprout', 'explorer', 'voyager', 'scholar'], tint: '#3AA0FF',
    icon: (a) => (a ? 'code-slash' : 'code-slash-outline'),
    labels: { base: 'Coding Lab', sprout: 'Code Lab', explorer: 'Code Lab', voyager: 'Coding', scholar: 'Coding' },
  },
  {
    // E-learning tasks / CATs / term papers — partner-school learners only.
    name: 'tasks', tiers: ALL, school: true, tint: '#FF5E9C',
    icon: (a) => (a ? 'clipboard' : 'clipboard-outline'),
    labels: { base: 'Assessments', sprout: 'Tasks', explorer: 'Tasks' },
  },
  {
    // School exams + transcripts — G7+ and in-school only.
    name: 'exams', tiers: ['voyager', 'scholar', 'campus'], school: true, tint: '#059669',
    icon: (a) => (a ? 'school' : 'school-outline'),
    labels: { base: 'Exams', campus: 'School exams' },
  },
  {
    name: 'events', tint: '#F4A716',
    icon: (a) => (a ? 'calendar' : 'calendar-outline'),
    labels: { base: 'Events' },
  },
];

const labelFor = (item: NavItem, tier: Tier) => item.labels[tier] ?? item.labels.base;

export default function StudentTabsLayout() {
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
  const { scheme } = useTheme();
  const { tier, inSchool, isForm34 } = useTier();
  const dark = scheme === 'dark';

  const visible = NAV.filter((n) =>
    (!n.tiers || n.tiers.includes(tier)) &&
    (!n.school || inSchool) &&
    (!n.adultOnly || !isForm34),
  );
  const shown = new Set(visible.map((n) => n.name));

  const tints = Object.fromEntries(NAV.map((n) => [n.name, n.tint]));
  const iconFor = (name: string, active: boolean) =>
    NAV.find((n) => n.name === name)?.icon(active) ?? 'ellipse-outline';

  return (
    <Tabs
      // Keep inactive tabs LIVE (not frozen) so a theme flip re-renders
      // every mounted screen at once — a frozen tab would otherwise show
      // the old scheme until you navigated to it and it thawed.
      detachInactiveScreens={false}
      screenOptions={{ headerShown: false, freezeOnBlur: false }}
      tabBar={(props) => (
        <FluidTabBar
          {...props}
          tints={tints}
          // Only this learner's destinations, in NAV order.
          include={visible.map((n) => n.name)}
          badges={{ tasks: due, events: live }}
          surface={dark ? '#1b1735' : '#ffffff'}
          border={dark ? '#2c2750' : '#f5f3fa'}
          dark={dark}
          renderIcon={(name, active, color, size) => (
            <Ionicons name={iconFor(name, active)} size={size} color={color} />
          )}
        />
      )}
    >
      {NAV.map((n) => (
        <Tabs.Screen
          key={n.name}
          name={n.name}
          options={{
            title: labelFor(n, tier),
            // href: null removes the tab for this learner's level entirely —
            // the route still exists, it just isn't a destination for them.
            href: shown.has(n.name) ? undefined : null,
          }}
        />
      ))}
      {/* Avatar/profile — merged into Me (header avatar), not a tab. */}
      <Tabs.Screen name="me" options={{ href: null }} />
    </Tabs>
  );
}
