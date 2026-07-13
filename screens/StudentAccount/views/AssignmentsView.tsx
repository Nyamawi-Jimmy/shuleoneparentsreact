// Tasks — the student's real assessments from /api/student/assignments,
// grouped like the web AssignmentsView: category chips (Assignments / CATs /
// Term Papers), due-window sections (Overdue · Due today · This week · Later),
// then Done and Missed. Tapping a task opens the in-app TaskPlayer.

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import { getStudentAssignments } from '../../../api/student';
import { StudentAssignment, AssignmentSubmitResult } from '../../../api/student.types';
import { TaskPlayer } from './TaskPlayer';

const categoryKey = (a: StudentAssignment) => String(a.category || 'Assignment').trim().toLowerCase();

function categoryMeta(category: string | null | undefined) {
  const c = String(category || 'Assignment').trim().toLowerCase();
  if (c === 'cat') return { label: 'CAT', fg: '#7c3aed', bg: '#efeaff' };
  if (c === 'term paper') return { label: 'Term Paper', fg: '#4f46e5', bg: '#e7e9ff' };
  if (c === 'assignment') return { label: 'Assignment', fg: '#b45309', bg: '#fff3da' };
  return { label: String(category).trim(), fg: '#6f679c', bg: '#f0edfb' };
}

function statusMeta(a: StudentAssignment) {
  switch (a.status) {
    case 'OVERDUE':
      return { label: 'Late · still open', emoji: '⏰', tint: '#ef4444', bg: '#fee2e2' };
    case 'MISSED':
      return { label: 'Missed', emoji: '🚫', tint: '#64748b', bg: '#eef1f5' };
    case 'SUBMITTED':
      return { label: 'Submitted', emoji: '📬', tint: '#3aa0ff', bg: '#e3f1ff' };
    case 'GRADED':
      return {
        label: a.score != null && a.maxScore != null ? `${a.score}/${a.maxScore}` : 'Graded',
        emoji: '🏅', tint: '#0fae78', bg: '#eafef3',
      };
    default:
      return { label: 'To do', emoji: '✏️', tint: '#b45309', bg: '#fff3da' };
  }
}

export const AssignmentsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { accessToken } = useAuth();

  const [items, setItems] = useState<StudentAssignment[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cat, setCat] = useState('all');
  const [openId, setOpenId] = useState<number | null>(null);
  // "Now" is captured at fetch time so due-window bucketing stays pure in render.
  const [nowMs, setNowMs] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true);
    try {
      const list = await getStudentAssignments(accessToken);
      setItems(Array.isArray(list) ? list : []);
      setNowMs(Date.now());
    } catch {
      setItems((prev) => prev ?? []);
    }
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Patch a card on submit so the list updates instantly (the web's single-source rule).
  const handleSubmitted = (examId: number, result: AssignmentSubmitResult) => {
    setItems((prev) => (prev ?? []).map((a) => a.id === examId ? {
      ...a,
      status: result?.pendingMarking ? 'SUBMITTED' : (result?.score != null ? 'GRADED' : 'SUBMITTED'),
      score: result?.score ?? a.score,
      maxScore: result?.maxScore ?? a.maxScore,
      submittedAt: new Date().toISOString(),
    } : a));
  };

  const title = pickByTier(tier, {
    base: '📝 Tasks',
    sprout: '📝 My Homework',
    explorer: '📝 My Homework',
    scholar: '📝 Assessments',
    campus: '📝 Assessments',
  });

  // ── Player open ───────────────────────────────────────
  if (openId != null) {
    return (
      <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
        <TopBar />
        <TaskPlayer
          examId={openId}
          onClose={() => setOpenId(null)}
          onSubmitted={(r) => handleSubmitted(openId, r)}
        />
      </View>
    );
  }

  if (items === null) {
    return (
      <View style={[styles.safe, styles.center, { backgroundColor: tokens.bgColor }]}>
        <ActivityIndicator size="large" color={tokens.accent1} />
        <Text style={styles.loadingText}>Fetching your tasks…</Text>
      </View>
    );
  }

  const list = items;
  // Category chips: only the categories that exist, fixed friendly order.
  const ORDER = ['assignment', 'cat', 'term paper'];
  const present = [...new Set(list.map(categoryKey))];
  const cats = ORDER.filter((c) => present.includes(c)).concat(present.filter((c) => !ORDER.includes(c)));
  const showChips = cats.length > 1;
  const visible = cat === 'all' ? list : list.filter((a) => categoryKey(a) === cat);

  // Due-window grouping: "what's due TODAY" is the question a student asks.
  const base = nowMs ?? 0;
  const baseDate = new Date(base);
  const endToday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 23, 59, 59).getTime();
  const endWeekDate = new Date(endToday);
  endWeekDate.setDate(endWeekDate.getDate() + ((7 - endWeekDate.getDay()) % 7 || 7));
  const endWeek = endWeekDate.getTime();
  const bucketOf = (a: StudentAssignment) => {
    if (a.status === 'OVERDUE') return 'Overdue';
    const t = a.dueAt ? new Date(a.dueAt).getTime() : NaN;
    if (isNaN(t)) return 'Later';
    if (t <= endToday) return 'Due today';
    if (t <= endWeek) return 'This week';
    return 'Later';
  };

  const todo = visible.filter((a) => a.status === 'DUE' || a.status === 'OVERDUE');
  const done = visible.filter((a) => a.status === 'SUBMITTED' || a.status === 'GRADED');
  const missed = visible.filter((a) => a.status === 'MISSED');
  const buckets: { name: string; tone: string; rows: StudentAssignment[] }[] = [
    { name: 'Overdue', tone: '#ef4444', rows: todo.filter((a) => bucketOf(a) === 'Overdue') },
    { name: 'Due today', tone: '#f4a716', rows: todo.filter((a) => bucketOf(a) === 'Due today') },
    { name: 'This week', tone: '#3aa0ff', rows: todo.filter((a) => bucketOf(a) === 'This week') },
    { name: 'Later', tone: '#9b94c4', rows: todo.filter((a) => bucketOf(a) === 'Later') },
  ];

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tokens.accent1} />}
      >
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>
        <Text style={styles.subline}>
          {todo.length} to do{done.length ? ` · ${done.length} done` : ''}
        </Text>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🏆</Text>
            <Text style={styles.emptyTitle}>You’re all caught up</Text>
            <Text style={styles.emptyText}>Nothing due right now — nice work.</Text>
          </View>
        ) : (
          <>
            {showChips && (
              <View style={styles.chipRow}>
                {['all', ...cats].map((c) => {
                  const on = cat === c;
                  const n = c === 'all' ? list.length : list.filter((a) => categoryKey(a) === c).length;
                  return (
                    <TouchableOpacity key={c} activeOpacity={0.8} onPress={() => setCat(c)}
                      style={[styles.chip, on && { backgroundColor: tokens.accent1, borderColor: tokens.accent1 }]}>
                      <Text style={[styles.chipText, on && { color: '#fff' }]}>
                        {c === 'all' ? 'All' : `${categoryMeta(c).label}s`} {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {buckets.map((b) => b.rows.length > 0 && (
              <Section key={b.name} name={b.name} tone={b.tone} rows={b.rows} radius={tokens.radius} onOpen={setOpenId} />
            ))}
            {done.length > 0 && (
              <Section name="Done" tone="#15c98c" rows={done} radius={tokens.radius} onOpen={setOpenId} />
            )}
            {missed.length > 0 && (
              <Section name="Missed" tone="#9b94c4" rows={missed} radius={tokens.radius} onOpen={setOpenId} />
            )}
            {visible.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Nothing in this category yet.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// =================================================================
// Task cards — the app's OWN look (deliberately unlike the web rows):
// a status-tinted accent stripe, a calendar date block for the due /
// submitted day, chips beneath the title, and a real action button.
// =================================================================
const dateParts = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return {
    day: String(d.getDate()),
    mon: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
  };
};

const Section: React.FC<{
  name: string; tone: string; rows: StudentAssignment[]; radius: number;
  onOpen: (id: number) => void;
}> = ({ name, tone, rows, radius, onOpen }) => (
  <View style={{ marginBottom: 18 }}>
    <View style={styles.sectionHead}>
      <View style={[styles.sectionDot, { backgroundColor: tone }]} />
      <Text style={styles.sectionTitle}>{name}</Text>
      <View style={styles.countBadge}><Text style={styles.countBadgeText}>{rows.length}</Text></View>
      <View style={styles.sectionLine} />
    </View>
    {rows.map((a) => {
      const s = statusMeta(a);
      const c = categoryMeta(a.category);
      const isDone = a.status === 'GRADED' || a.status === 'SUBMITTED';
      const when = dateParts(isDone ? (a.submittedAt ?? a.dueAt) : a.dueAt);
      return (
        <TouchableOpacity key={a.id} activeOpacity={0.85} onPress={() => onOpen(a.id)}
          style={[styles.card, { borderRadius: radius }]}>
          {/* Status accent stripe */}
          <View style={[styles.stripe, { backgroundColor: s.tint }]} />

          {/* Calendar date block */}
          <View style={[styles.dateBlock, { backgroundColor: s.bg }]}>
            {when ? (
              <>
                <Text style={[styles.dateDay, { color: s.tint }]}>{when.day}</Text>
                <Text style={[styles.dateMon, { color: s.tint }]}>{when.mon}</Text>
              </>
            ) : (
              <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{a.title ?? 'Task'}</Text>
            <View style={styles.chipLine}>
              <View style={[styles.catPill, { backgroundColor: c.bg }]}>
                <Text style={[styles.catPillText, { color: c.fg }]}>{c.label}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                <Text style={[styles.statusPillText, { color: s.tint }]}>{s.emoji} {s.label}</Text>
              </View>
            </View>
            {(a.subject || a.teacher) && (
              <Text style={styles.cardMeta} numberOfLines={1}>
                {a.subject ?? ''}{a.subject && a.teacher ? ' · ' : ''}{a.teacher ?? ''}
              </Text>
            )}
          </View>

          {/* Action */}
          <LinearGradient
            colors={isDone ? ['#f4f1ff', '#f4f1ff'] : ['#7c5cff', '#a78bfa']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.actionBtn}
          >
            <Text style={[styles.actionText, isDone && { color: '#7c5cff' }]}>
              {isDone ? 'View' : 'Start'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      );
    })}
  </View>
);

// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6f679c', marginTop: 14, fontWeight: '600' },
  scroll: { padding: 16 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },
  subline: { fontSize: 12, color: '#6f679c', fontWeight: '700', marginBottom: 14 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: '#6f679c' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  countBadge: {
    minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 6,
    backgroundColor: '#e4defc', alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontSize: 10, fontWeight: '800', color: '#7c5cff' },
  sectionLine: { flex: 1, height: 2, borderRadius: 2, backgroundColor: '#ece8fb' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    paddingVertical: 13, paddingLeft: 16, paddingRight: 12,
    marginBottom: 10, overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 7, elevation: 2,
  },
  stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  dateBlock: {
    width: 46, height: 50, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  dateDay: { fontSize: 17, fontWeight: '800', lineHeight: 20 },
  dateMon: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550', lineHeight: 18 },
  chipLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  catPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2.5 },
  catPillText: { fontSize: 9.5, fontWeight: '800' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2.5 },
  statusPillText: { fontSize: 9.5, fontWeight: '800' },
  cardMeta: { fontSize: 11, color: '#9b94c4', fontWeight: '600', marginTop: 4 },
  actionBtn: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  actionText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: '#2c2550', marginTop: 10 },
  emptyText: { fontSize: 12.5, color: '#6f679c', fontWeight: '600', marginTop: 4, textAlign: 'center' },
});
