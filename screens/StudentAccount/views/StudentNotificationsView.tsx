// Student notifications — "What's New", the student side's own page (the
// parent /notifications screen talks to parent-only APIs). The backend has
// no student inbox, so this derives the same updates the web pushes as live
// toasts: classes that are live/upcoming, newly published tasks, and marked
// work — all from real student endpoints, grouped into clean sections.

import React, { useCallback, useState } from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C, useSchemeTick } from '../studentTheme';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { getStudentAssignments, getStudentLiveClasses } from '../../../api/student';
import {
  StudentAssignment, StudentLiveClass, liveNowClasses,
} from '../../../api/student.types';
import { LearningHeader } from '../components/LearningHeader';

interface Item {
  key: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
  target: string;
}

interface Section {
  key: string;
  label: string;
  items: Item[];
}

export const StudentNotificationsView: React.FC = () => {
  const { accessToken } = useAuth();
  useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)
  const [assignments, setAssignments] = useState<StudentAssignment[] | null>(null);
  const [liveClasses, setLiveClasses] = useState<StudentLiveClass[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true);
    const [a, l] = await Promise.allSettled([
      getStudentAssignments(accessToken),
      getStudentLiveClasses(accessToken),
    ]);
    setAssignments(a.status === 'fulfilled' && Array.isArray(a.value) ? a.value : []);
    setLiveClasses(l.status === 'fulfilled' && Array.isArray(l.value) ? l.value : []);
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = assignments === null || liveClasses === null;
  const sections = loading ? [] : buildSections(assignments!, liveClasses!);
  const totalCount = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <View style={styles.safe}>
      <LearningHeader
        title="Notifications"
        subtitle={loading ? 'Checking for updates…' : totalCount === 0 ? 'Nothing new right now' : `${totalCount} update${totalCount === 1 ? '' : 's'} for you`}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c5cff" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#7c5cff" />}
        >
          {totalCount === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyCircle}>
                <Text style={{ fontSize: 34 }}>🎈</Text>
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>
                New classes, tasks and marked results will appear here.
              </Text>
            </View>
          )}

          {sections.map((section) => section.items.length > 0 && (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{section.items.length}</Text>
                </View>
              </View>

              <View style={styles.groupCard}>
                {section.items.map((it, i) => (
                  <TouchableOpacity
                    key={it.key}
                    activeOpacity={0.75}
                    style={[styles.row, i > 0 && styles.rowLine]}
                    onPress={() => router.push(it.target as any)}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: it.tint + '1A' }]}>
                      <Text style={{ fontSize: 17 }}>{it.icon}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={2}>{it.title}</Text>
                      <Text style={[styles.rowSub, { color: it.tint }]} numberOfLines={1}>{it.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.faint} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =================================================================
function buildSections(assignments: StudentAssignment[], liveClasses: StudentLiveClass[]): Section[] {
  const now: Item[] = [];
  const todo: Item[] = [];
  const results: Item[] = [];

  for (const c of liveNowClasses(liveClasses)) {
    now.push({
      key: `live-${c.id}`, icon: '🔴', tint: '#e11d48',
      title: c.title ?? 'Your class has started',
      sub: 'LIVE now — tap to join',
      target: '/(student-tabs)/events',
    });
  }
  for (const c of liveClasses.filter((x) => x.status === 'Upcoming').slice(0, 3)) {
    now.push({
      key: `up-${c.id}`, icon: '📅', tint: '#3aa0ff',
      title: c.title ?? 'Upcoming class',
      sub: c.startsAt ? fmtWhen(String(c.startsAt)) : 'Scheduled',
      target: '/(student-tabs)/events',
    });
  }

  const overdue = assignments.filter((a) => a.status === 'OVERDUE');
  const due = assignments.filter((a) => a.status === 'DUE')
    .sort((a, b) => String(a.dueAt ?? '').localeCompare(String(b.dueAt ?? '')));
  for (const a of overdue) {
    todo.push({
      key: `over-${a.id}`, icon: '⏰', tint: '#ef4444',
      title: a.title ?? 'Task',
      sub: a.dueAt ? `Overdue — was due ${fmtWhen(a.dueAt)}` : 'Overdue',
      target: '/(student-tabs)/tasks',
    });
  }
  for (const a of due) {
    todo.push({
      key: `due-${a.id}`, icon: '📝', tint: '#d97706',
      title: a.title ?? 'New work',
      sub: `${a.category ?? 'Task'}${a.dueAt ? ` — due ${fmtWhen(a.dueAt)}` : ' — due soon'}`,
      target: '/(student-tabs)/tasks',
    });
  }

  const graded = assignments.filter((a) => a.status === 'GRADED' && a.score != null)
    .sort((a, b) => String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? '')))
    .slice(0, 5);
  for (const a of graded) {
    results.push({
      key: `graded-${a.id}`, icon: '✅', tint: '#15c98c',
      title: a.title ?? 'Your work',
      sub: a.maxScore != null ? `Marked — you scored ${a.score}/${a.maxScore}` : 'Marked — result is in',
      target: '/(student-tabs)/tasks',
    });
  }

  return [
    { key: 'now', label: 'HAPPENING NOW', items: now },
    { key: 'todo', label: 'TO DO', items: todo },
    { key: 'results', label: 'RESULTS', items: results },
  ];
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// =================================================================
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.soft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 64 },
  emptyCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: S.card, alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5, borderColor: S.line,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: S.ink },
  emptyText: {
    fontSize: 13, color: S.inkSoft, fontWeight: '600', marginTop: 6,
    textAlign: 'center', paddingHorizontal: 40, lineHeight: 19,
  },

  section: { marginBottom: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingHorizontal: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: S.inkSoft, letterSpacing: 0.8 },
  countBadge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: S.ringStrong, alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#7c5cff' },

  groupCard: {
    backgroundColor: S.card, borderRadius: 18,
    borderWidth: 1.5, borderColor: S.line,
    overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  rowLine: { borderTopWidth: 1, borderTopColor: S.divider },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 13.5, fontWeight: '800', color: S.ink, lineHeight: 18 },
  rowSub: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

