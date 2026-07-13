// Student "What's New" — the student side's own notifications page (the
// parent /notifications screen talks to parent-only APIs). The backend has
// no student inbox, so this derives the same updates the web pushes as live
// toasts: classes that are live/upcoming, newly published tasks, and marked
// work — all from real student endpoints.

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { getStudentAssignments, getStudentLiveClasses } from '../../../api/student';
import {
  StudentAssignment, StudentLiveClass, liveNowClasses,
} from '../../../api/student.types';
import { LearningHeader } from '../components/LearningHeader';

interface Item {
  key: string;
  emoji: string;
  tint: string;
  title: string;
  sub: string;
  target: '/(student-tabs)/events' | '/(student-tabs)/tasks';
}

export const StudentNotificationsView: React.FC = () => {
  const { accessToken } = useAuth();
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
  const items = loading ? [] : buildFeed(assignments!, liveClasses!);

  return (
    <View style={styles.safe}>
      <LearningHeader title="🔔 What’s New" subtitle="Classes, tasks and results" />

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
          {items.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎈</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>New classes, tasks and results will show up here.</Text>
            </View>
          )}

          {items.map((it) => (
            <TouchableOpacity
              key={it.key}
              activeOpacity={0.85}
              style={styles.card}
              onPress={() => router.push(it.target as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: it.tint + '22' }]}>
                <Text style={{ fontSize: 20 }}>{it.emoji}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{it.title}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{it.sub}</Text>
              </View>
              <Text style={[styles.chev, { color: it.tint }]}>›</Text>
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =================================================================
function buildFeed(assignments: StudentAssignment[], liveClasses: StudentLiveClass[]): Item[] {
  const items: Item[] = [];

  for (const c of liveNowClasses(liveClasses)) {
    items.push({
      key: `live-${c.id}`,
      emoji: '🔴', tint: '#e11d48',
      title: `LIVE now: ${c.title ?? 'Your class has started'}`,
      sub: 'Tap to join from Events',
      target: '/(student-tabs)/events',
    });
  }
  for (const c of liveClasses.filter((x) => x.status === 'Upcoming').slice(0, 3)) {
    items.push({
      key: `up-${c.id}`,
      emoji: '📅', tint: '#3aa0ff',
      title: `Upcoming class: ${c.title ?? 'Class'}`,
      sub: c.startsAt ? fmtWhen(String(c.startsAt)) : 'Scheduled',
      target: '/(student-tabs)/events',
    });
  }

  const overdue = assignments.filter((a) => a.status === 'OVERDUE');
  const due = assignments.filter((a) => a.status === 'DUE')
    .sort((a, b) => String(a.dueAt ?? '').localeCompare(String(b.dueAt ?? '')));
  const graded = assignments.filter((a) => a.status === 'GRADED' && a.score != null)
    .sort((a, b) => String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? '')))
    .slice(0, 5);

  for (const a of overdue) {
    items.push({
      key: `over-${a.id}`,
      emoji: '⏰', tint: '#ef4444',
      title: `Overdue: ${a.title ?? 'Task'}`,
      sub: a.dueAt ? `Was due ${fmtWhen(a.dueAt)}` : 'Past its due date',
      target: '/(student-tabs)/tasks',
    });
  }
  for (const a of due) {
    items.push({
      key: `due-${a.id}`,
      emoji: '📝', tint: '#f4a716',
      title: `${a.category ?? 'Task'}: ${a.title ?? 'New work'}`,
      sub: a.dueAt ? `Due ${fmtWhen(a.dueAt)}` : 'Due soon',
      target: '/(student-tabs)/tasks',
    });
  }
  for (const a of graded) {
    items.push({
      key: `graded-${a.id}`,
      emoji: '✅', tint: '#15c98c',
      title: `Marked: ${a.title ?? 'Your work'}`,
      sub: a.maxScore != null ? `You scored ${a.score}/${a.maxScore}` : 'Result is in',
      target: '/(student-tabs)/tasks',
    });
  }

  return items;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f1ff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#2c2550' },
  emptyText: { fontSize: 13, color: '#6f679c', fontWeight: '600', marginTop: 6, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 18, padding: 13, marginBottom: 10,
    borderWidth: 1.5, borderColor: '#ece8fb',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  cardSub: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  chev: { fontSize: 22, fontWeight: '800' },
});
