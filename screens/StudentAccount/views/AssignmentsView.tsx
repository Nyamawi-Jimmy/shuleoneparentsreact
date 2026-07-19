// Tasks — the student's real assessments from /api/student/assignments,
// grouped like the web AssignmentsView: category chips (Assignments / CATs /
// Term Papers), due-window sections (Overdue · Due today · This week · Later),
// then Done and Missed. Tapping a task opens the in-app TaskPlayer.

import React, { useCallback, useState } from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C, useSchemeTick } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../../../context/AuthContext';
import { getStudentAssignments } from '../../../api/student';
import { StudentAssignment, AssignmentSubmitResult } from '../../../api/student.types';
import { TaskPlayer } from './TaskPlayer';

const categoryKey = (a: StudentAssignment) => String(a.category || 'Assignment').trim().toLowerCase();

// Colours resolve through the scheme-adaptive C palette, so chips flip with
// the theme (dark accent on light chip → light accent on dark chip).
function categoryMeta(category: string | null | undefined) {
  const c = String(category || 'Assignment').trim().toLowerCase();
  if (c === 'cat') return { label: 'CAT', fg: C.ringInk, bg: C.ring };
  if (c === 'term paper') return { label: 'Term Paper', fg: C.infoInk, bg: C.infoSoft };
  if (c === 'assignment') return { label: 'Assignment', fg: C.warnInk, bg: C.warnSoft };
  return { label: String(category).trim(), fg: C.inkSoft, bg: C.soft };
}

function statusMeta(a: StudentAssignment) {
  switch (a.status) {
    case 'OVERDUE':
      return { label: 'Late · still open', emoji: '⏰', tint: C.badInk, bg: C.badSoft };
    case 'MISSED':
      return { label: 'Missed', emoji: '🚫', tint: C.faint, bg: C.soft };
    case 'SUBMITTED':
      return { label: 'Submitted', emoji: '📬', tint: C.infoInk, bg: C.infoSoft };
    case 'GRADED':
      return {
        label: a.score != null && a.maxScore != null ? `${a.score}/${a.maxScore}` : 'Graded',
        emoji: '🏅', tint: C.okInk, bg: C.okSoft,
      };
    default:
      return { label: 'To do', emoji: '✏️', tint: C.warnInk, bg: C.warnSoft };
  }
}

// Subject → emoji for the card's icon tile (falls back to a task glyph).
const SUBJECT_EMOJI: Record<string, string> = {
  math: '🔢', maths: '🔢', hisabati: '🔢', numeracy: '🔢',
  english: '📖', literacy: '📖', kiswahili: '🗣️', language: '🗣️',
  science: '🌱', biology: '🧬', chemistry: '⚗️', physics: '🔭',
  coding: '🤖', robot: '🤖', computer: '💻', computing: '💻', ict: '💻',
  art: '🎨', music: '🎵', social: '🌍', geograph: '🗺️', history: '🏛️', cre: '🙏',
};
function emojiFor(a: StudentAssignment): string {
  const s = String(a.subject || '').toLowerCase();
  for (const k in SUBJECT_EMOJI) if (s.includes(k)) return SUBJECT_EMOJI[k];
  return '📝';
}
const SUBJ_ACCENTS = ['#7c5cff', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];
function subjectAccent(a: StudentAssignment): string {
  const key = String(a.subject || a.title || 'T');
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJ_ACCENTS[h % SUBJ_ACCENTS.length];
}
const shortDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
// Human due countdown; `urgent` drives the red tint.
function dueInfo(a: StudentAssignment, isDone: boolean): { text: string; urgent: boolean } {
  if (a.status === 'MISSED') return { text: 'Missed', urgent: false };
  if (isDone) return { text: a.submittedAt ? `Submitted ${shortDate(a.submittedAt)}` : 'Submitted', urgent: false };
  if (a.status === 'OVERDUE') return { text: 'Overdue', urgent: true };
  const t = a.dueAt ? new Date(a.dueAt).getTime() : NaN;
  if (isNaN(t)) return { text: 'No due date', urgent: false };
  const days = Math.ceil((t - Date.now()) / 86400000);
  if (days < 0) return { text: 'Overdue', urgent: true };
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: true };
  if (days <= 6) return { text: `Due in ${days} days`, urgent: false };
  return { text: `Due ${shortDate(a.dueAt)}`, urgent: false };
}

export const AssignmentsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)
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

  const nOverdue = todo.filter((a) => a.status === 'OVERDUE').length;
  const totalV = todo.length + done.length + missed.length;
  const pctDone = totalV ? Math.round((done.length / totalV) * 100) : 0;

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

        {/* Overview — the at-a-glance dashboard: counts + completion. */}
        {list.length > 0 && (
          <View style={[styles.statsCard, { borderRadius: tokens.radius }]}>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={[styles.statNum, { color: tokens.accent1 }]}>{todo.length}</Text>
                <Text style={styles.statLabel}>To do</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.statCell}>
                <Text style={[styles.statNum, { color: '#15c98c' }]}>{done.length}</Text>
                <Text style={styles.statLabel}>Done</Text>
              </View>
              <View style={styles.statDiv} />
              <View style={styles.statCell}>
                <Text style={[styles.statNum, { color: nOverdue ? '#ef4444' : C.faint }]}>{nOverdue}</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
            </View>
            <View style={styles.statsBar}><View style={[styles.statsFill, { width: `${pctDone}%` }]} /></View>
            <Text style={styles.statsCaption}>{pctDone}% complete this term</Text>
          </View>
        )}

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
              <Section key={b.name} name={b.name} tone={b.tone} rows={b.rows} radius={tokens.radius} accent={tokens.accent1} onOpen={setOpenId} />
            ))}
            {done.length > 0 && (
              <Section name="Done" tone="#15c98c" rows={done} radius={tokens.radius} accent={tokens.accent1} onOpen={setOpenId} />
            )}
            {missed.length > 0 && (
              <Section name="Missed" tone="#9b94c4" rows={missed} radius={tokens.radius} accent={tokens.accent1} onOpen={setOpenId} />
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
  name: string; tone: string; rows: StudentAssignment[]; radius: number; accent: string;
  onOpen: (id: number) => void;
}> = ({ name, tone, rows, radius, accent, onOpen }) => (
  <View style={{ marginBottom: 18 }}>
    <View style={styles.sectionHead}>
      <View style={[styles.sectionPill, { backgroundColor: tone + '1F' }]}>
        <View style={[styles.sectionDot, { backgroundColor: tone }]} />
        <Text style={[styles.sectionTitle, { color: tone }]}>{name}</Text>
        <Text style={[styles.sectionCount, { color: tone }]}>{rows.length}</Text>
      </View>
      <View style={styles.sectionLine} />
    </View>
    {rows.map((a) => {
      const s = statusMeta(a);
      const cm = categoryMeta(a.category);
      const isDone = a.status === 'GRADED' || a.status === 'SUBMITTED';
      const graded = a.status === 'GRADED';
      const subjTint = subjectAccent(a);
      const due = dueInfo(a, isDone);
      const action = isDone ? 'View' : a.status === 'OVERDUE' ? 'Finish' : 'Start';
      return (
        <TouchableOpacity key={a.id} activeOpacity={0.85} onPress={() => onOpen(a.id)}
          style={[styles.card, { borderRadius: radius, borderLeftColor: s.tint }]}>
          {/* Top row — subject tile, title/meta, score or status */}
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { backgroundColor: subjTint + '1F' }]}>
              <Text style={{ fontSize: 20 }}>{emojiFor(a)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardTitle} numberOfLines={2}>{a.title ?? 'Task'}</Text>
              {(a.subject || a.teacher) && (
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {a.subject ?? ''}{a.subject && a.teacher ? ' · ' : ''}{a.teacher ?? ''}
                </Text>
              )}
            </View>
            {graded && a.score != null && a.maxScore != null ? (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreNum}>{a.score}<Text style={styles.scoreDen}>/{a.maxScore}</Text></Text>
                <Text style={styles.scoreLbl}>SCORE</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                <Text style={[styles.statusPillText, { color: s.tint }]}>{s.emoji} {s.label}</Text>
              </View>
            )}
          </View>

          {/* Footer — category, due countdown, action */}
          <View style={styles.cardFoot}>
            <View style={styles.footLeft}>
              <View style={[styles.catPill, { backgroundColor: cm.bg }]}>
                <Text style={[styles.catPillText, { color: cm.fg }]}>{cm.label}</Text>
              </View>
              <View style={[styles.duePill, { backgroundColor: due.urgent ? C.badSoft : C.soft }]}>
                <Text style={[styles.duePillText, { color: due.urgent ? C.badInk : C.inkSoft }]}>🕓 {due.text}</Text>
              </View>
            </View>
            <View style={[styles.actionBtn, { backgroundColor: isDone ? C.soft : accent }]}>
              <Text style={[styles.actionText, isDone && { color: accent }]}>{action} ›</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

// =================================================================
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: S.inkSoft, marginTop: 14, fontWeight: '600' },
  scroll: { padding: 16 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: S.ink },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: S.line },
  subline: { fontSize: 12, color: S.inkSoft, fontWeight: '700', marginBottom: 14 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: '800', color: S.inkSoft },

  // Section header pill
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '800' },
  sectionCount: { fontSize: 11, fontWeight: '900', opacity: 0.9 },
  sectionLine: { flex: 1, height: 2, borderRadius: 2, backgroundColor: S.line },

  // Stats overview card
  statsCard: {
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line, padding: 14, marginBottom: 16,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10.5, fontWeight: '700', color: S.inkSoft, marginTop: 2 },
  statDiv: { width: 1, height: 34, backgroundColor: S.line },
  statsBar: { height: 8, borderRadius: 99, backgroundColor: S.line, overflow: 'hidden', marginTop: 14 },
  statsFill: { height: '100%', borderRadius: 99, backgroundColor: '#15c98c' },
  statsCaption: { fontSize: 10.5, fontWeight: '700', color: S.inkSoft, marginTop: 7, textAlign: 'center' },

  // Task card — two-row, status-edged
  card: {
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line, borderLeftWidth: 4,
    padding: 13, marginBottom: 11, overflow: 'hidden',
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: S.ink, lineHeight: 18 },
  cardMeta: { fontSize: 11, color: S.faint, fontWeight: '600', marginTop: 3 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  scoreBadge: { alignItems: 'center', backgroundColor: S.okSoft, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6, minWidth: 52 },
  scoreNum: { fontSize: 15, fontWeight: '900', color: S.okInk },
  scoreDen: { fontSize: 10, fontWeight: '800', color: S.okInk },
  scoreLbl: { fontSize: 7.5, fontWeight: '800', color: S.okInk, letterSpacing: 0.5, marginTop: 1 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  footLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  catPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  catPillText: { fontSize: 9.5, fontWeight: '800' },
  duePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  duePillText: { fontSize: 9.5, fontWeight: '800' },
  actionBtn: { borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9 },
  actionText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: S.ink, marginTop: 10 },
  emptyText: { fontSize: 12.5, color: S.inkSoft, fontWeight: '600', marginTop: 4, textAlign: 'center' },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

