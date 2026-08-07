// My progress — "what have I done so far", ported from the web's
// student/MyProgressView.jsx (lms-react 9cda6f5).
//
// Progress was scattered: a ring on each quest card, XP and level on the home
// hero, and a full report only the PARENT could see. This answers "how far am
// I?" in the learner's own voice. Like the web, EVERYTHING here derives from
// the quest catalog JSON the app already fetches (/quests catalog with
// completedStages/totalStages/earnedXp per quest) — nothing new is fetched,
// and no number is shown the learner can't also see on a card.

import React, { useCallback, useState } from 'react';
import {
  StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, useSchemeTick,
} from '../studentTheme';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../../../context/AuthContext';
import { tierToAgeTier } from '../../../config/tier';
import { getQuestCatalog, listQuests } from '../../../api/quests';
import { QuestSummary } from '../../../api/quest.types';
import { ApiError } from '../../../config/api';

// Mirrors web useQuestProgress: level = floor(earnedXp / 100) + 1.
const XP_PER_LEVEL = 100;

// Per-subject glyph + colour (same substring table as QuestView, kept local —
// the QuestView copy is module-private).
const SUBJECT_LOOK: { match: string[]; emoji: string; tint: string }[] = [
  { match: ['math', 'hisabati', 'numer'], emoji: '🔢', tint: '#7c5cff' },
  { match: ['english', 'literac', 'read'], emoji: '📖', tint: '#3aa0ff' },
  { match: ['kiswahili', 'lugha'], emoji: '🗣️', tint: '#ec4899' },
  { match: ['scien', 'bio', 'chem', 'phys'], emoji: '🔬', tint: '#15c98c' },
  { match: ['cod', 'comput', 'ict', 'robot'], emoji: '🤖', tint: '#0ea5e9' },
  { match: ['art', 'craft', 'creativ'], emoji: '🎨', tint: '#f59e0b' },
  { match: ['music'], emoji: '🎵', tint: '#a855f7' },
  { match: ['social', 'geograph', 'histor'], emoji: '🌍', tint: '#14b8a6' },
  { match: ['cre', 'religio'], emoji: '🙏', tint: '#8b5cf6' },
  { match: ['health', 'life', 'hygien'], emoji: '🌱', tint: '#22c55e' },
];
const FALLBACK_TINTS = ['#7c5cff', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

function subjectLook(name: string) {
  const s = name.toLowerCase();
  return SUBJECT_LOOK.find((e) => e.match.some((m) => s.includes(m)));
}
function subjectEmoji(name: string): string {
  return subjectLook(name)?.emoji ?? '📚';
}
function subjectTint(name: string): string {
  const known = subjectLook(name);
  if (known) return known.tint;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_TINTS[h % FALLBACK_TINTS.length];
}

function timeAgo(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
}

// One subject's quests with roll-up progress — mirrors web groupBySubject:
// first-appearance order (quests arrive in curriculum order already).
type SubjGroup = {
  key: string; title: string; quests: QuestSummary[];
  totalStages: number; doneStages: number; pct: number;
};

function groupBySubject(quests: QuestSummary[]): SubjGroup[] {
  const groups = new Map<string, { key: string; title: string; quests: QuestSummary[] }>();
  for (const q of quests) {
    const key = q.learningArea || q.subject || 'More';
    if (!groups.has(key)) groups.set(key, { key, title: key, quests: [] });
    groups.get(key)!.quests.push(q);
  }
  return [...groups.values()].map((g) => {
    const totalStages = g.quests.reduce((n, q) => n + (q.totalStages || 0), 0);
    const doneStages = g.quests.reduce((n, q) => n + (q.completedStages || 0), 0);
    return {
      ...g,
      totalStages,
      doneStages,
      pct: totalStages ? Math.round((doneStages / totalStages) * 100) : 0,
    };
  });
}

export const ProgressView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  useSchemeTick(); // re-render on scheme flips (styles are scheme proxies)
  const { accessToken } = useAuth();

  const [quests, setQuests] = useState<QuestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Same source as QuestView: prefer the class-organised catalog, fall back
  // to the flat tier list on older backends.
  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const cat = await getQuestCatalog(accessToken);
      setQuests(cat?.quests ?? []);
    } catch {
      try {
        const list = await listQuests(accessToken, tierToAgeTier(tier));
        setQuests(list);
      } catch (e) {
        setQuests((prev) => prev ?? []);
        setError(e instanceof ApiError ? e.message : 'Could not load your progress.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [accessToken, tier]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = quests === null;
  const list = quests ?? [];

  // ── Derived (all client-side, mirrors the web) ─────────────────────
  const groups = groupBySubject(list);
  const started = groups.filter((g) => g.doneStages > 0);
  const untouched = groups.filter((g) => g.doneStages === 0);

  const totalStages = groups.reduce((n, g) => n + g.totalStages, 0);
  const doneStages = groups.reduce((n, g) => n + g.doneStages, 0);
  const overall = totalStages ? Math.round((doneStages / totalStages) * 100) : 0;

  const completedQuests = list.filter((q) => q.status === 'COMPLETED').length;
  const earnedXp = list.reduce((n, q) => n + (q.earnedXp || 0), 0);
  const level = Math.floor(earnedXp / XP_PER_LEVEL) + 1;

  const recent = [...list]
    .filter((q) => q.lastActivityAt)
    .sort((a, b) => new Date(b.lastActivityAt!).getTime() - new Date(a.lastActivityAt!).getTime())
    .slice(0, 5);

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tokens.accent1} />
        }
      >
        <View style={styles.head}>
          <Text style={styles.headTitle}>Your progress</Text>
          <Text style={styles.headSub}>Everything you’ve worked through so far.</Text>
        </View>

        {error != null && <Text style={styles.errNote}>⚠️ {error}</Text>}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={tokens.accent1} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📈</Text>
            <Text style={styles.emptyTitle}>Your progress</Text>
            <Text style={styles.emptyText}>
              Nothing here yet — finish a stage and it’ll start filling up!
            </Text>
          </View>
        ) : (
          <>
            {/* Headline tiles — overall %, quests, stages, XP/level */}
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Text style={styles.tileN}>{overall}%</Text>
                <Text style={styles.tileL}>of your stages done</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileN}>
                  {completedQuests}
                  <Text style={styles.tileNSmall}>/{list.length}</Text>
                </Text>
                <Text style={styles.tileL}>quests finished</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileN}>{doneStages}</Text>
                <Text style={styles.tileL}>stages completed</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileN}>{earnedXp}</Text>
                <Text style={styles.tileL}>XP earned · level {level}</Text>
              </View>
            </View>

            {/* By subject — started first; untouched still shown, because
                "haven't started" is a real answer to "how far am I?" */}
            <Text style={styles.secTitle}>By subject</Text>
            <View style={styles.listCard}>
              {started.map((g) => <SubjectRow key={g.key} group={g} />)}
              {untouched.length > 0 && started.length > 0 && (
                <Text style={styles.split}>Not started yet</Text>
              )}
              {untouched.map((g) => <SubjectRow key={g.key} group={g} />)}
            </View>

            {/* Recently worked on */}
            {recent.length > 0 && (
              <>
                <Text style={styles.secTitle}>Recently worked on</Text>
                <View style={styles.listCard}>
                  {recent.map((q) => (
                    <View key={q.id} style={styles.recRow}>
                      <Text style={styles.recIc}>{subjectEmoji(q.learningArea || q.subject || '')}</Text>
                      <Text style={styles.recTitle} numberOfLines={1}>{q.title}</Text>
                      <Text style={styles.recWhen}>{timeAgo(q.lastActivityAt)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// Subject row: emoji chip, name + progress bar, % and stage count.
// (Emoji lives in its OWN Text — bold Text starting with an emoji can swallow
// the label on some devices.)
const SubjectRow: React.FC<{ group: SubjGroup }> = ({ group }) => {
  const tint = subjectTint(group.title);
  return (
    <View style={styles.row}>
      <Text style={styles.rowIc}>{subjectEmoji(group.title)}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{group.title}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${group.pct}%`, backgroundColor: tint }]} />
        </View>
      </View>
      <View style={styles.rowNum}>
        <Text style={styles.rowPct}>{group.pct}%</Text>
        <Text style={styles.rowStages}>{group.doneStages}/{group.totalStages} stages</Text>
      </View>
    </View>
  );
};

const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  head: { marginBottom: 14 },
  headTitle: { fontSize: 22, fontWeight: '800', color: S.ink },
  headSub: { fontSize: 13, color: S.inkSoft, marginTop: 2 },
  errNote: {
    fontSize: 12.5, color: S.badInk, backgroundColor: S.badSoft,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
    overflow: 'hidden',
  },
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  tile: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: S.card, borderRadius: 16,
    borderWidth: 1, borderColor: S.line,
    paddingVertical: 14, paddingHorizontal: 14,
  },
  tileN: { fontSize: 22, fontWeight: '900', color: S.ink },
  tileNSmall: { fontSize: 14, fontWeight: '700', color: S.faint },
  tileL: { fontSize: 11.5, color: S.inkSoft, marginTop: 2, fontWeight: '600' },

  secTitle: {
    fontSize: 13, fontWeight: '800', color: S.inkSoft,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  listCard: {
    backgroundColor: S.card, borderRadius: 16,
    borderWidth: 1, borderColor: S.line,
    paddingVertical: 4, paddingHorizontal: 12, marginBottom: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rowIc: { fontSize: 20, width: 28, textAlign: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 13.5, fontWeight: '700', color: S.ink },
  barTrack: {
    height: 6, borderRadius: 4, backgroundColor: S.soft,
    marginTop: 5, overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 4 },
  rowNum: { alignItems: 'flex-end', minWidth: 64 },
  rowPct: { fontSize: 14, fontWeight: '900', color: S.ink },
  rowStages: { fontSize: 10.5, color: S.faint, marginTop: 1 },
  split: {
    fontSize: 11, fontWeight: '800', color: S.faint,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: S.divider, marginTop: 2,
  },

  recRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  recIc: { fontSize: 17, width: 26, textAlign: 'center' },
  recTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: S.ink },
  recWhen: { fontSize: 11.5, color: S.faint, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: S.ink, marginTop: 10 },
  emptyText: { fontSize: 13, color: S.inkSoft, textAlign: 'center', marginTop: 4 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));
