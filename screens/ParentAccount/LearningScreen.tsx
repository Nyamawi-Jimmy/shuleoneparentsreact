import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, TextInput, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useChildLearning } from '../../hooks/useChildLearning';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { SubjectProgress, ActivityItem } from '../../api/learner-progress.types';
import {
  QuestSummary, ChildInsights, InsightItem, CoachTurn,
  askChildCoach, getChildCoachHistory,
} from '../../api/guardian';
import { getRecommendedNext, RecommendedNext } from '../../api/learner-me';

const num = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isCoding = (s?: string | null) => /cod|robot/i.test(String(s || ''));
const rankStatus = (x?: string | null) => ({ IN_PROGRESS: 0, AVAILABLE: 1, COMPLETED: 2, LOCKED: 3 } as any)[String(x)] ?? 4;
const fmtMinutes = (min?: number | null) => {
  const m = num(min); if (m <= 0) return '0m';
  const h = Math.floor(m / 60), r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
};
const shortDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const subjectIconName = (subject?: string | null): any => {
  const s = String(subject || '').toLowerCase();
  if (isCoding(s)) return 'code-tags';
  if (s.includes('math') || s.includes('hisabati')) return 'brain';
  return 'book-open-variant';
};

// One subject's quests, with roll-up progress and the child's academic weakness
// (avg score; Infinity when unknown) — used to order groups weakest-first.
type QuestGroup = {
  subject: string; quests: QuestSummary[];
  total: number; done: number; pct: number; weakness: number;
};

export const LearningScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild: child } = useSelectedChild();
  const { accessToken } = useAuth();
  const {
    report, quests, insights, loading, refreshing, insightsRefreshing, error, refresh, refreshInsights, studentId,
  } = useChildLearning();

  const firstName = child?.firstName || report?.learnerName || 'your child';
  const hasCoding = !!child && (child.codingSchool || child.codingOnly);
  const codingSource = child?.codingSchool ? 'school' : 'direct';

  // Premium signal: backend marks insights LOCKED for non-Premium children.
  const locked = insights?.state === 'LOCKED';
  const subscribed = !!insights && !locked;

  const subjects = (report?.subjects ?? []).filter((s): s is SubjectProgress => !!s);
  const recent = (report?.recent ?? []).filter((r): r is ActivityItem => !!r).slice(0, 5);

  // Weakest real subject drives the focus-area hero + "why" card.
  const weakest = useMemo(() => {
    const subs = subjects.filter((s) => s.avgScorePct != null);
    if (!subs.length) return null;
    return [...subs].sort((a, b) => num(a.avgScorePct) - num(b.avgScorePct))[0];
  }, [subjects]);

  // "By subject": every subject the child has — quest completion % where a quest
  // exists, otherwise the academic average from the report. (School students carry
  // their several subjects in report.subjects; quests may only cover one or two.)
  const subjectCards = useMemo(() => {
    const groups = new Map<string, { total: number; done: number; rep: QuestSummary | null }>();
    for (const q of quests) {
      const key = q.subject || 'General';
      const g = groups.get(key) || { total: 0, done: 0, rep: null };
      g.total += q.totalStages || 0;
      g.done += q.completedStages || 0;
      if (!g.rep || rankStatus(q.status) < rankStatus(g.rep.status)) g.rep = q;
      groups.set(key, g);
    }
    // Union of subject names: quests first (they carry the latest title), then academic.
    // One brand color throughout — every accent comes from the primary theme.
    const order: string[] = [];
    const seen = new Set<string>();
    const push = (name?: string | null) => { const n = (name || '').trim(); if (n && !seen.has(n)) { seen.add(n); order.push(n); } };
    quests.forEach((q) => push(q.subject));
    subjects.forEach((s) => push(s.subject));
    const ACCENTS = [colors.info, colors.success, colors.warning, colors.purple, colors.danger, colors.primary];
    return order.map((name, i) => {
      const g = groups.get(name);
      const academic = subjects.find((s) => (s.subject || '').trim() === name);
      const hasQuest = !!g && g.total > 0;
      return {
        subject: name,
        latest: g?.rep?.title || null,
        completed: num(academic?.completed),
        pct: hasQuest
          ? Math.round((g!.done / g!.total) * 100)
          : Math.max(0, Math.min(100, num(academic?.avgScorePct))),
        metric: hasQuest ? ('complete' as const) : ('score' as const),
        accent: ACCENTS[i % ACCENTS.length],
        coding: isCoding(name),
      };
    });
  }, [quests, subjects, colors]);
  const academicCards = subjectCards.filter((s) => !s.coding);
  const hasCodingQuest = subjectCards.some((s) => s.coding);

  const hasReport = !!report && num(report.stagesCompleted) > 0;

  // "Continue where you left off": the most recently touched in-progress quest — the
  // clock is server-side (lastActivityAt over the child's progress rows), so a quest
  // half-finished on the student app resumes here, and vice versa.
  const resumeQuest = useMemo(() => {
    const list = quests.filter((q) => q.status === 'IN_PROGRESS');
    if (!list.length) return null;
    return [...list].sort((a, b) => String(b.lastActivityAt || '').localeCompare(String(a.lastActivityAt || '')))[0];
  }, [quests]);

  // Academic weakness per subject (avg score; Infinity = unknown) — the signal
  // that orders both the recommended picks and the by-subject rows weakest-first.
  const subjectWeakness = useMemo(() => {
    const m = new Map<string, number>();
    subjects.forEach((s) => {
      if (s.subject) m.set(s.subject.trim(), s.avgScorePct != null ? num(s.avgScorePct) : Infinity);
    });
    return m;
  }, [subjects]);

  // Every quest grouped under its subject, weakest subject first. This is the
  // backbone of the redesign — quests are never shown as one flat list.
  const questGroups = useMemo<QuestGroup[]>(() => {
    const g = new Map<string, QuestSummary[]>();
    for (const q of quests) {
      const key = (q.subject || 'General').trim();
      const list = g.get(key);
      if (list) list.push(q); else g.set(key, [q]);
    }
    return Array.from(g.entries())
      .map(([subject, qs]) => {
        const total = qs.reduce((s, q) => s + (q.totalStages || 0), 0);
        const done = qs.reduce((s, q) => s + (q.completedStages || 0), 0);
        return {
          subject,
          quests: [...qs].sort((a, b) => rankStatus(a.status) - rankStatus(b.status)),
          total, done,
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
          weakness: subjectWeakness.get(subject) ?? Infinity,
        };
      })
      .sort((a, b) => a.weakness - b.weakness || a.subject.localeCompare(b.subject));
  }, [quests, subjectWeakness]);

  // Recommended = subjects that have actionable quests (available / in-progress),
  // ordered weakest-first. Rendered as compact subject tiles, so no per-subject
  // slicing is needed — the tile shows the real actionable count.
  const recommendedGroups = useMemo<QuestGroup[]>(() =>
    questGroups
      .map((g) => ({ ...g, quests: g.quests.filter((q) => q.status === 'IN_PROGRESS' || q.status === 'AVAILABLE') }))
      .filter((g) => g.quests.length > 0),
    [questGroups]);

  // AI "recommended next" for THIS child, straight from the backend
  // (GET /api/learner/{childId}/next — the guardian may read a child they own).
  // Same source the web parent uses; falls back to the weakest-subject tiles
  // below when the endpoint has nothing actionable.
  const [childNext, setChildNext] = useState<RecommendedNext | null>(null);
  useEffect(() => {
    if (!accessToken || studentId == null) { setChildNext(null); return; }
    let cancelled = false;
    getRecommendedNext(accessToken, studentId)
      .then((n) => { if (!cancelled) setChildNext(n); })
      .catch(() => { if (!cancelled) setChildNext(null); });
    return () => { cancelled = true; };
  }, [accessToken, studentId]);
  const aiRec = childNext && childNext.type !== 'LOCKED' && (childNext.title || childNext.subStrandName)
    ? childNext : null;

  // Subject drill-down: tapping a subject's "See all" opens the grouped + search
  // view scoped to that subject; "See all" at the section head opens it for all.
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [openAll, setOpenAll] = useState(false);

  const playQuest = (questId: number | null) => {
    router.push((questId != null ? `/kid-learn?questId=${questId}` : '/kid-learn') as any);
  };

  if (openSubject || openAll) {
    return (
      <AllQuestsView
        styles={styles}
        colors={colors}
        quests={quests}
        initialSubject={openAll ? null : openSubject}
        childName={firstName}
        onBack={() => { setOpenSubject(null); setOpenAll(false); }}
        onPlay={playQuest}
      />
    );
  }

  return (
    <View style={styles.root}>
      <GradientAppBar large title="Learning" subtitle={`${firstName}’s progress & practice`} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !studentId ? (
        <View style={styles.center}>
          <Ionicons name="person-add-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Select a child to see their learning.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {/* Pick up exactly where the child stopped — on any device. Tapping hands over
              the screen straight into that quest; progress lands on the child's account. */}
          {resumeQuest && resumeQuest.id != null && (
            <GamifiedQuestCard
              styles={styles} quest={resumeQuest} onPlay={playQuest} featured
              kicker={`▶  CONTINUE WHERE ${firstName.toUpperCase()} LEFT OFF`}
            />
          )}

          {/* Quests grouped by subject — compact tiles (subject + quest count)
              in one horizontal row, so it stays small and the sections below
              aren't pushed down. Tapping a tile opens that subject's quests;
              "View all" opens the full grouped + searchable page. */}
          {/* Recommended — straight from the backend AI endpoint
              (GET /api/learner/{childId}/next). Eye-catching gradient card with
              the real "what to do next" + why. Tapping opens the matching
              subject's quests, else the full grouped page. */}
          {aiRec && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => {
              const name = (aiRec.subStrandName || '').toLowerCase().trim();
              const match = name
                ? questGroups.find((g) => g.subject.toLowerCase().includes(name) || name.includes(g.subject.toLowerCase()))
                : undefined;
              if (match) setOpenSubject(match.subject); else setOpenAll(true);
            }}>
              <View style={styles.recCard}>
                <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.recHeader}>
                  <Text style={styles.recHeaderEmoji}>🎯</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.recHeaderTitle}>Recommended for {firstName}</Text>
                    <Text style={styles.recHeaderSub}>Picked from how {firstName} has been doing.</Text>
                  </View>
                </LinearGradient>
                <View style={styles.recAiBody}>
                  <Text style={styles.recAiTitle} numberOfLines={2}>{aiRec.title ?? aiRec.subStrandName}</Text>
                  {!!aiRec.reason && <Text style={styles.recAiWhy} numberOfLines={3}>{aiRec.reason}</Text>}
                  <View style={[styles.recAiCta, { backgroundColor: colors.primary }]}>
                    <Text style={styles.recAiCtaText}>View quests</Text>
                    <Feather name="arrow-right" size={13} color="#FFF" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Quests by subject — compact tiles browse (weaker subjects tagged). */}
          {questGroups.length > 0 && (
            <>
              <View style={styles.sectionHeadRow}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Quests by subject</Text>
                <View style={styles.countPill}><Text style={styles.countPillText}>{quests.length}</Text></View>
                <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.8} onPress={() => setOpenAll(true)}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>View all</Text>
                  <Feather name="arrow-right" size={13} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.subjRowScrollWrap} contentContainerStyle={styles.subjChipRow}>
                {questGroups.map((g) => (
                  <SubjectChip
                    key={`q-${g.subject}`} styles={styles} colors={colors} group={g}
                    recommended={g.weakness !== Infinity} onOpen={() => setOpenSubject(g.subject)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* Focus card — the web hero's content on a quiet card */}
          {subscribed ? (
            <View style={styles.focusCard}>
              <View style={styles.focusHead}>
                <View style={[styles.focusIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="flag" size={15} color={colors.primary} />
                </View>
                <Text style={styles.focusKicker}>FOCUS AREA</Text>
                <View style={styles.planChipMini}><Text style={styles.planChipMiniText}>Premium</Text></View>
              </View>
              <Text style={styles.focusTitle}>
                {weakest ? `More practice in ${weakest.subject}` : `${firstName} is on track`}
              </Text>
              <Text style={styles.focusBody}>
                {weakest
                  ? `${firstName} averages ${num(weakest.avgScorePct)}% in ${weakest.subject}${weakest.completed ? ` across ${num(weakest.completed)} ${num(weakest.completed) === 1 ? 'lesson' : 'lessons'}` : ''}. A little regular practice here moves the needle most.`
                  : `Keep the momentum going — short, steady practice keeps ${firstName} progressing.`}
              </Text>
            </View>
          ) : (
            <View style={styles.focusCard}>
              <View style={styles.focusHead}>
                <View style={[styles.focusIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="sparkles" size={15} color={colors.primary} />
                </View>
                <Text style={styles.focusKicker}>PREMIUM</Text>
                <View style={styles.planChipMini}><Text style={styles.planChipMiniText}>Basic</Text></View>
              </View>
              <Text style={styles.focusTitle}>See where {firstName} is — and what’s next</Text>
              <Text style={styles.focusBody}>
                Unlock the full learning report: mastery, focus areas, and what to practise next.
              </Text>
              <TouchableOpacity style={styles.unlockBtn} activeOpacity={0.85} onPress={() => router.push('/subscriptions' as any)}>
                <Text style={styles.unlockBtnText}>Unlock Premium</Text>
                <Ionicons name="arrow-forward" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* AI insights (Premium) */}
          {subscribed && (
            <InsightsCard styles={styles} colors={colors} insights={insights} refreshing={insightsRefreshing} onRefresh={refreshInsights} />
          )}

          {/* AI coach (Premium) */}
          {subscribed && studentId != null && accessToken && (
            <CoachPanel styles={styles} colors={colors} studentId={studentId} accessToken={accessToken} childName={firstName} />
          )}

          {/* Snapshot — Level · XP head plus the full stat row */}
          {hasReport && (
            <View style={styles.statCard}>
              <View style={styles.statHeadRow}>
                <View style={styles.statHeadLeft}>
                  <MaterialCommunityIcons name="school-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.statHeadText}>Level {num(report!.level) || 1} · {num(report!.totalXp)} XP</Text>
                </View>
                <Text style={styles.statHeadRight}>Best streak {num(report!.longestStreak)}d</Text>
              </View>
              <View style={styles.statStrip}>
                <MiniStat styles={styles} icon="ribbon" tint={colors.purple} value={report!.avgScorePct != null ? `${num(report!.avgScorePct)}%` : '—'} label="Avg score" />
                <View style={styles.statDividerV} />
                <MiniStat styles={styles} icon="star" tint={colors.warning} value={`${num(report!.masteryCount)}`} label="Mastered" />
                <View style={styles.statDividerV} />
                <MiniStat styles={styles} icon="flame" tint={colors.danger} value={`${num(report!.currentStreak)}d`} label="Streak" />
                <View style={styles.statDividerV} />
                <MiniStat styles={styles} icon="time" tint={colors.info} value={fmtMinutes(report!.minutesInvested)} label="Time" />
              </View>
            </View>
          )}

          {/* Subject progress — overview of every subject (incl. academic-only
              subjects with no quests) plus the Coding & Robotics entry. */}
          {(academicCards.length > 0 || hasCoding || hasCodingQuest) && (
            <>
              <Text style={styles.sectionTitle}>Subject progress</Text>
              <View style={styles.subjectGrid}>
                {/* Coding & Robotics FIRST — its own accent, full-width, above subjects. */}
                {!hasCodingQuest && hasCoding && (
                  <TouchableOpacity style={[styles.subjectCard, styles.codingCard]} activeOpacity={0.7} onPress={() => router.push('/coding' as any)}>
                    <View style={styles.subjectCardHead}>
                      <View style={[styles.subjectIcon, { backgroundColor: '#10B9811F' }]}>
                        <MaterialCommunityIcons name="robot-happy" size={18} color="#059669" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.subjectName}>Coding & Robotics</Text>
                        <Text style={styles.subjectLatest} numberOfLines={1}>
                          {codingSource === 'school' ? 'With Educraft tutors at school' : 'Educraft programme'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.subjectPctText}>
                      {codingSource === 'school'
                        ? `${firstName} takes coding & robotics with Educraft tutors at school.`
                        : `Coding & robotics activities are available for ${firstName}.`}
                    </Text>
                  </TouchableOpacity>
                )}
                {!hasCodingQuest && !hasCoding && (
                  <TouchableOpacity style={[styles.subjectCard, styles.codingCard]} activeOpacity={0.7} onPress={() => router.push('/subscriptions' as any)}>
                    <View style={styles.subjectCardHead}>
                      <View style={[styles.subjectIcon, { backgroundColor: colors.backgroundAlt }]}>
                        <MaterialCommunityIcons name="robot-outline" size={18} color={colors.textTertiary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.subjectName}>Coding & Robotics</Text>
                        <Text style={styles.subjectLatest}>Not active yet</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.subjectPctText}>Add coding & robotics to {firstName}’s learning.</Text>
                  </TouchableOpacity>
                )}

                {/* Then the academic subjects */}
                {academicCards.map((s) => {
                  const accent = s.accent || colors.primary;
                  const questCount = quests.filter((q) => (q.subject || 'General') === s.subject).length;
                  return (
                    <TouchableOpacity
                      key={s.subject} style={styles.subjectCard} activeOpacity={questCount > 0 ? 0.7 : 1}
                      onPress={questCount > 0 ? () => setOpenSubject(s.subject) : undefined}
                    >
                      {/* Icon and chevron take their own row so the subject
                          name gets the card's FULL width. Squeezed between
                          them it had ~85px — about seven characters — so
                          anything past "Maths" was an ellipsis. */}
                      <View style={styles.subjTopRow}>
                        <View style={[styles.subjectIcon, { backgroundColor: accent + '1F' }]}>
                          <MaterialCommunityIcons name={subjectIconName(s.subject)} size={18} color={accent} />
                        </View>
                        {questCount > 0 && <Feather name="chevron-right" size={16} color={colors.textTertiary} />}
                      </View>
                      <Text style={styles.subjectNameWide} numberOfLines={2}>{s.subject}</Text>
                      {s.latest
                        ? <Text style={styles.subjectLatest} numberOfLines={1}>Latest: {s.latest}</Text>
                        : s.completed > 0 ? <Text style={styles.subjectLatest} numberOfLines={1}>{s.completed} {s.completed === 1 ? 'lesson' : 'lessons'} completed</Text> : null}
                      <View style={styles.subjectPctRow}>
                        <Text style={styles.subjectPctText}>{s.pct}% {s.metric === 'complete' ? 'complete' : 'avg score'}</Text>
                        {questCount > 0 && (
                          <Text style={styles.subjectPctText}>{questCount} {questCount === 1 ? 'quest' : 'quests'}</Text>
                        )}
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, s.pct))}%`, backgroundColor: accent }]} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Recent activity */}
          {recent.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <View style={styles.card}>
                {recent.map((a, i) => (
                  <View key={i} style={[styles.activityRow, i > 0 && styles.divider]}>
                    <View style={[styles.activityIcon, { backgroundColor: colors.primarySofter }]}>
                      <MaterialCommunityIcons name="book-open-variant" size={15} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{a.title || 'Lesson'}</Text>
                      <Text style={styles.activityMeta} numberOfLines={1}>{[a.subject, shortDate(a.completedAt)].filter(Boolean).join(' · ')}</Text>
                    </View>
                    {num((a as any).stars) > 0 && <Text style={styles.activityStars}>{'★'.repeat(Math.min(3, num((a as any).stars)))}</Text>}
                    {a.scorePct != null && <Text style={styles.activityScore}>{num(a.scorePct)}%</Text>}
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Why this focus (Premium + weakest) */}
          {subscribed && weakest && (
            <View style={styles.whyCard}>
              <View style={[styles.whyIcon, { backgroundColor: colors.purple + '1A' }]}>
                <Ionicons name="bulb" size={17} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.whyTitle}>Why this focus</Text>
                <Text style={styles.whyBody}>
                  {firstName} is doing well overall. {weakest.subject} has the most room to grow right now
                  {weakest.avgScorePct != null ? ` (${num(weakest.avgScorePct)}% average so far)` : ''}. Short, regular practice will strengthen it and build confidence.
                </Text>
              </View>
            </View>
          )}

          {/* Empty */}
          {!hasReport && academicCards.length === 0 && !hasCodingQuest && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={44} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No learning activity yet</Text>
              <Text style={styles.emptyText}>When {firstName} starts lessons, their progress shows up here.</Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
};

// ── Subject tile — a compact card: subject name + how many quests. Grouped
// quests without the vertical bulk of full quest cards; tapping opens that
// subject's quests. Weakest subjects carry an "avg" tag in recommended mode.
const SubjectChip: React.FC<{
  styles: any; colors: ColorPalette; group: QuestGroup;
  recommended?: boolean; onOpen: () => void;
}> = ({ styles, colors, group, recommended, onOpen }) => {
  const n = group.quests.length;
  return (
    <TouchableOpacity style={styles.subjChip} activeOpacity={0.85} onPress={onOpen}>
      <View style={styles.subjChipTop}>
        <View style={[styles.subjChipIcon, { backgroundColor: colors.primarySoft }]}>
          <MaterialCommunityIcons name={subjectIconName(group.subject)} size={19} color={colors.primary} />
        </View>
        {recommended && group.weakness !== Infinity && (
          <View style={styles.subjChipTag}><Text style={styles.subjChipTagText}>{Math.round(group.weakness)}% avg</Text></View>
        )}
      </View>
      <Text style={styles.subjChipName} numberOfLines={2}>{group.subject}</Text>
      <View style={styles.subjChipFoot}>
        <Text style={styles.subjChipCount}>{n} {n === 1 ? 'quest' : 'quests'}</Text>
        <Feather name="arrow-right" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

// ── All quests — grouped by subject, searchable, with collapsible sections so
// the reader always sees where each subject's quests begin and end. Opened for
// every subject (initialSubject = null) or scoped to one (from a row's See all).
const AllQuestsView: React.FC<{
  styles: any; colors: ColorPalette; quests: QuestSummary[];
  initialSubject: string | null; childName: string;
  onBack: () => void; onPlay: (questId: number | null) => void;
}> = ({ styles, colors, quests, initialSubject, childName, onBack, onPlay }) => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const g = new Map<string, QuestSummary[]>();
    for (const quest of quests) {
      const subject = (quest.subject || 'General').trim();
      if (initialSubject && subject !== initialSubject) continue;
      if (q && !(`${quest.title || ''} ${subject} ${quest.description || ''}`.toLowerCase().includes(q))) continue;
      const list = g.get(subject);
      if (list) list.push(quest); else g.set(subject, [quest]);
    }
    return Array.from(g.entries())
      .map(([subject, qs]) => {
        const total = qs.reduce((s, x) => s + (x.totalStages || 0), 0);
        const done = qs.reduce((s, x) => s + (x.completedStages || 0), 0);
        return {
          subject,
          quests: [...qs].sort((a, b) => rankStatus(a.status) - rankStatus(b.status)),
          total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.quests.length - a.quests.length || a.subject.localeCompare(b.subject));
  }, [quests, q, initialSubject]);

  const totalShown = groups.reduce((s, g) => s + g.quests.length, 0);
  const toggle = (subject: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(subject) ? next.delete(subject) : next.add(subject);
      return next;
    });

  return (
    <View style={styles.root}>
      <GradientAppBar
        title={initialSubject ?? 'All quests'}
        subtitle={initialSubject
          ? `${childName}’s quests in ${initialSubject}`
          : `Every quest for ${childName}, grouped by subject`}
        right={
          <TouchableOpacity style={styles.appBarAction} activeOpacity={0.7} onPress={onBack}>
            <Ionicons name="chevron-back" size={15} color="#FFF" />
            <Text style={styles.appBarActionText}>Learning</Text>
          </TouchableOpacity>
        }
      />

      {/* Search — filters across every subject at once. */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search quests…"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Feather name="x" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="magnify-close" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{q ? `No quests match “${query}”.` : 'No quests here yet.'}</Text>
          </View>
        ) : groups.map((g) => {
          const isCollapsed = collapsed.has(g.subject);
          return (
            <View key={g.subject} style={styles.groupBlock}>
              <TouchableOpacity style={styles.groupHeader} activeOpacity={0.7} onPress={() => toggle(g.subject)}>
                <View style={[styles.subjRowIcon, { backgroundColor: colors.primarySoft }]}>
                  <MaterialCommunityIcons name={subjectIconName(g.subject)} size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.groupHeaderName} numberOfLines={1}>{g.subject}</Text>
                  <Text style={styles.groupHeaderMeta} numberOfLines={1}>
                    {g.quests.length} {g.quests.length === 1 ? 'quest' : 'quests'}{g.total > 0 ? ` · ${g.pct}% complete` : ''}
                  </Text>
                </View>
                <Feather name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
              {g.total > 0 && (
                <View style={styles.groupProgressTrack}>
                  <View style={[styles.groupProgressFill, { width: `${g.pct}%`, backgroundColor: colors.primary }]} />
                </View>
              )}
              {/* Each subject's quests run in a horizontal row, so browsing is
                  sideways-within-subject rather than one long downward scroll. */}
              {!isCollapsed && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  style={styles.groupRowWrap} contentContainerStyle={styles.groupRowScroll}
                  snapToInterval={300} decelerationRate="fast">
                  {g.quests.map((quest) => (
                    <GamifiedQuestCard key={String(quest.id ?? quest.key)} styles={styles} quest={quest} onPlay={onPlay} carousel />
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}

        {groups.length > 0 && (
          <Text style={styles.handOverNote}>
            Showing {totalShown} {totalShown === 1 ? 'quest' : 'quests'}. Tapping Start or Continue hands the device to {childName} — everything they do counts on their own account.
          </Text>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

// ── Gamified quest card — the SAME playful design as the student side, reused
// on the parent side for "Continue where you left off" and the subject quest
// lists: an accent-gradient cover (subject pill + status badge), then title,
// stat chips (stages · XP) and a progress bar with the action label.
const QUEST_BADGE: Record<string, { label: string; bg: string }> = {
  COMPLETED: { label: '✓ Done', bg: 'rgba(21,201,140,0.92)' },
  IN_PROGRESS: { label: 'In progress', bg: 'rgba(255,255,255,0.26)' },
  AVAILABLE: { label: 'New', bg: 'rgba(255,255,255,0.26)' },
  LOCKED: { label: '🔒 Locked', bg: 'rgba(20,20,40,0.35)' },
};

const GamifiedQuestCard: React.FC<{
  styles: any; quest: QuestSummary; onPlay: (id: number | null) => void;
  featured?: boolean; kicker?: string; carousel?: boolean;
}> = ({ styles, quest, onPlay, featured, kicker, carousel }) => {
  const accent = quest.accentColor || '#7c5cff';
  const pct = quest.totalXp > 0
    ? (quest.earnedXp / quest.totalXp) * 100
    : quest.totalStages > 0 ? ((quest.completedStages || 0) / quest.totalStages) * 100 : 0;
  const locked = quest.status === 'LOCKED';
  const badge = QUEST_BADGE[String(quest.status || 'AVAILABLE').toUpperCase()] || QUEST_BADGE.AVAILABLE;
  const action = locked ? '🔒 Locked'
    : quest.status === 'COMPLETED' ? 'Replay →'
    : quest.status === 'IN_PROGRESS' ? 'Continue →' : 'Start →';
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPlay(quest.id)} disabled={locked}
      style={[styles.gqCard, { borderColor: accent + '3D' }, featured && styles.gqCardFeatured, carousel && styles.gqCardCarousel]}>
      <View style={[styles.gqCover, featured && styles.gqCoverTall]}>
        {quest.coverImageUrl ? (
          <Image source={{ uri: quest.coverImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <LinearGradient colors={[accent + 'E6', accent + '99']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {!!kicker && <Text style={styles.gqKicker}>{kicker}</Text>}
        <View style={styles.gqCoverInner}>
          <View style={styles.gqThemePill}><Text style={styles.gqThemePillText} numberOfLines={1}>{quest.subject || 'Quest'}</Text></View>
          <View style={[styles.gqBadge, { backgroundColor: badge.bg }]}><Text style={styles.gqBadgeText}>{badge.label}</Text></View>
        </View>
      </View>
      <View style={styles.gqBody}>
        <Text style={styles.gqTitle} numberOfLines={1}>{quest.title || 'Quest'}</Text>
        {!!quest.description && <Text style={styles.gqDesc} numberOfLines={1}>{quest.description}</Text>}
        <View style={styles.gqStatsRow}>
          <View style={styles.gqStatChip}>
            <Ionicons name="flag" size={11} color={accent} />
            <Text style={[styles.gqStatChipText, { color: accent }]}>{quest.completedStages || 0}/{quest.totalStages || 0} stages</Text>
          </View>
          <View style={styles.gqStatChip}>
            <Ionicons name="flash" size={11} color="#f4a716" />
            <Text style={[styles.gqStatChipText, { color: '#f4a716' }]}>{quest.earnedXp || 0}/{quest.totalXp || 0} XP</Text>
          </View>
        </View>
        <View style={styles.gqProgRow}>
          <View style={styles.gqTrack}>
            <LinearGradient colors={[accent, accent + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.gqFill, { width: `${pct}%` }]} />
          </View>
          <Text style={[styles.gqAction, { color: accent }]}>{action}</Text>
        </View>
      </View>
      {featured && !locked && (
        <View style={styles.gqPlayFab}><Ionicons name="play" size={22} color={accent} /></View>
      )}
    </TouchableOpacity>
  );
};

const MiniStat: React.FC<{ styles: any; icon: any; tint: string; value: string; label: string }> =
  ({ styles, icon, tint, value, label }) => (
  <View style={styles.miniStat}>
    <Ionicons name={icon} size={13} color={tint} />
    <Text style={styles.miniStatValue}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

// ── AI insights ──────────────────────────────────────────────────────────────
const InsightsCard: React.FC<{ styles: any; colors: ColorPalette; insights: ChildInsights | null; refreshing: boolean; onRefresh: () => void }> =
  ({ styles, colors, insights, refreshing, onRefresh }) => {
  if (!insights || insights.state !== 'READY') {
    // legacy free-text fallback
    if (insights?.content) {
      return (
        <View style={styles.insightCard}>
          <View style={styles.insightHead}><MaterialCommunityIcons name="lightbulb-on-outline" size={17} color={colors.purple} /><Text style={styles.insightHeadText}>AI insights</Text></View>
          <Text style={styles.insightSummary}>{insights.content}</Text>
        </View>
      );
    }
    return null;
  }
  const strengths = (insights.strengths ?? []) as InsightItem[];
  const focusAreas = (insights.focusAreas ?? []) as InsightItem[];
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeadRow}>
        <View style={styles.insightHead}>
          <View style={[styles.insightBadge, { backgroundColor: colors.purple + '1A' }]}><MaterialCommunityIcons name="lightbulb-on" size={15} color={colors.purple} /></View>
          <Text style={styles.insightHeadText}>AI insights</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing} hitSlop={8}>
          {refreshing ? <ActivityIndicator size="small" color={colors.textTertiary} /> : <Feather name="refresh-cw" size={14} color={colors.textTertiary} />}
        </TouchableOpacity>
      </View>
      {!!insights.headline && <Text style={styles.insightHeadline}>{insights.headline}</Text>}
      {!!insights.summary && <Text style={styles.insightSummary}>{insights.summary}</Text>}
      {strengths.length > 0 && (
        <View style={styles.insightGroup}>
          <Text style={styles.insightGroupLabel}>STRENGTHS</Text>
          {strengths.map((s, i) => (
            <View key={i} style={styles.insightItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginTop: 1 }} />
              <Text style={styles.insightItemText}>{s.area ? <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{s.area}. </Text> : null}{s.note}</Text>
            </View>
          ))}
        </View>
      )}
      {focusAreas.length > 0 && (
        <View style={styles.insightGroup}>
          <Text style={styles.insightGroupLabel}>FOCUS AREAS</Text>
          {focusAreas.map((f, i) => (
            <View key={i} style={styles.insightItem}>
              <Ionicons name="locate" size={14} color={colors.warning} style={{ marginTop: 1 }} />
              <Text style={styles.insightItemText}>{f.area ? <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{f.area}. </Text> : null}{f.note}</Text>
            </View>
          ))}
        </View>
      )}
      {!!insights.nextStep && (
        <View style={styles.nextStep}>
          <Ionicons name="bulb" size={14} color={colors.purple} style={{ marginTop: 1 }} />
          <Text style={styles.insightItemText}><Text style={{ fontFamily: fonts.bold, color: colors.text }}>Next step. </Text>{insights.nextStep}</Text>
        </View>
      )}
    </View>
  );
};

// ── AI coach ─────────────────────────────────────────────────────────────────
const SUGGESTIONS = ["What's affecting the grades?", 'How can we improve this week?', 'Which subject needs the most help?'];
const CoachPanel: React.FC<{ styles: any; colors: ColorPalette; studentId: number; accessToken: string; childName: string }> =
  ({ styles, colors, studentId, accessToken, childName }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<CoachTurn[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next && !loaded) {
        setLoaded(true);
        getChildCoachHistory(accessToken, studentId).then((h) => { if (Array.isArray(h) && h.length) setMessages(h); }).catch(() => {});
      }
      return next;
    });
  }, [loaded, accessToken, studentId]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'parent', content: msg }]);
    setInput(''); setSending(true);
    try {
      const r = await askChildCoach(accessToken, studentId, msg, history);
      setMessages((m) => [...m, { role: 'coach', content: r?.reply || 'Sorry — no reply came back.' }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'coach', content: e?.status === 402 ? 'This is a Premium feature.' : 'Sorry — could not reach the coach. Please try again.' }]);
    } finally { setSending(false); }
  };

  return (
    <View style={styles.coachCard}>
      <TouchableOpacity style={styles.coachHead} activeOpacity={0.7} onPress={toggle}>
        <View style={[styles.insightBadge, { backgroundColor: colors.purple + '1A' }]}><Ionicons name="chatbubbles" size={15} color={colors.purple} /></View>
        <Text style={styles.coachHeadText}>Ask about {childName}</Text>
        <Text style={styles.coachToggle}>{open ? 'Hide' : 'Open'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: 12 }}>
          {messages.length === 0 ? (
            <>
              <Text style={styles.coachHint}>Ask anything about {childName}’s learning — answers come from their real progress.</Text>
              <View style={styles.suggestRow}>
                {SUGGESTIONS.map((q, i) => (
                  <TouchableOpacity key={i} style={styles.suggestChip} activeOpacity={0.7} onPress={() => send(q)}>
                    <Text style={styles.suggestChipText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={{ gap: 8, marginBottom: 10 }}>
              {messages.map((m, i) => (
                <View key={i} style={[styles.bubble, m.role === 'parent' ? styles.bubbleMe : styles.bubbleCoach]}>
                  <Text style={[styles.bubbleText, m.role === 'parent' && { color: colors.text }]}>{m.content}</Text>
                </View>
              ))}
              {sending && <View style={[styles.bubble, styles.bubbleCoach]}><Text style={styles.bubbleText}>thinking…</Text></View>}
            </View>
          )}
          <View style={styles.coachInputRow}>
            <TextInput
              style={styles.coachInput}
              value={input}
              onChangeText={setInput}
              placeholder={`Ask about ${childName}…`}
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={() => send()}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.coachSend, (!input.trim() || sending) && { opacity: 0.5 }]} disabled={!input.trim() || sending} onPress={() => send()}>
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.coachFoot}>AI coach · grounded in real progress · not a diagnosis</Text>
        </View>
      )}
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    // ── Gamified quest card (student-side look, reused on parent) ──
    gqCard: {
      backgroundColor: c.card, borderRadius: 20, borderWidth: 1.5, overflow: 'hidden',
      marginBottom: 14,
      shadowColor: '#3b2d7a', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14, shadowRadius: 16, elevation: 5,
    },
    gqCardFeatured: { marginBottom: 18, borderRadius: 22 },
    gqCover: { height: 84, justifyContent: 'flex-end', padding: 12 },
    gqCoverTall: { height: 104 },
    gqKicker: {
      position: 'absolute', top: 12, left: 12, right: 12,
      fontSize: 10.5, fontFamily: fonts.extrabold, color: '#FFF',
      letterSpacing: 0.8, opacity: 0.95,
    },
    gqCoverInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    gqThemePill: {
      backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999,
      paddingHorizontal: 10, paddingVertical: 4, maxWidth: '62%',
    },
    gqThemePillText: { fontSize: 10.5, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: 0.3 },
    gqBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    gqBadgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: '#FFF' },
    gqPlayFab: {
      position: 'absolute', right: 16, top: 82, width: 44, height: 44, borderRadius: 22,
      backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', zIndex: 5,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
    gqBody: { padding: 14 },
    gqTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    gqDesc: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    gqStatsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    gqStatChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.backgroundAlt, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
    },
    gqStatChipText: { fontSize: 11, fontFamily: fonts.bold },
    gqProgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    gqTrack: { flex: 1, height: 9, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    gqFill: { height: '100%', borderRadius: 999 },
    gqAction: { fontSize: 12.5, fontFamily: fonts.extrabold },

    resumeCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 18, padding: 15, marginBottom: 14,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
    },
    resumePlay: {
      width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    resumeKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 9.5, fontFamily: fonts.bold, letterSpacing: 0.8 },
    resumeTitle: { color: '#FFF', fontSize: 14.5, fontFamily: fonts.extrabold, marginTop: 2, letterSpacing: -0.2 },
    resumeMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontFamily: fonts.regular, marginTop: 1 },

    appBarAction: {
      flexDirection: 'row', alignItems: 'center', gap: 2,
      backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
      borderRadius: 999, paddingLeft: 8, paddingRight: 12, paddingVertical: 7,
    },
    appBarActionText: { color: '#FFF', fontSize: 12, fontFamily: fonts.bold },
    questRowCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 10,
    },
    questRowHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    questRowTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, lineHeight: 18 },
    questRowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
    questRowStages: { fontSize: 11, fontFamily: fonts.semibold, color: c.textTertiary },
    doneChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    doneChipText: { fontSize: 11.5, fontFamily: fonts.bold },
    questPlayBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderRadius: 12, paddingVertical: 10, marginTop: 12,
    },
    questPlayBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },
    handOverNote: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 8, lineHeight: 16 },

    // Focus card (the web hero's content, quiet card treatment)
    focusCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 12,
    },
    focusHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
    focusIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    focusKicker: { flex: 1, fontSize: 9.5, fontFamily: fonts.bold, color: c.primary, letterSpacing: 0.9 },
    focusTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, lineHeight: 20 },
    focusBody: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    planChipMini: { backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    planChipMiniText: { color: c.primary, fontSize: 10, fontFamily: fonts.extrabold },
    unlockBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: c.primary, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9, marginTop: 11,
    },
    unlockBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },

    // Stat card: Level·XP header + slim 4-stat strip
    statCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      marginBottom: 16, overflow: 'hidden',
    },
    statHeadRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 13, paddingVertical: 9,
      borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.backgroundAlt,
    },
    statHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statHeadText: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary },
    statHeadRight: { fontSize: 11, fontFamily: fonts.semibold, color: c.textTertiary },
    statStrip: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 11,
    },
    statDividerV: { width: 1, alignSelf: 'stretch', backgroundColor: c.border, marginVertical: 3 },
    miniStat: { flex: 1, alignItems: 'center', gap: 2 },
    miniStatValue: { fontSize: 14, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    miniStatLabel: { fontSize: 9.5, fontFamily: fonts.regular, color: c.textTertiary },

    insightCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 15, marginBottom: 16 },
    insightHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    insightHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    insightBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    insightHeadText: { fontSize: 14, fontFamily: fonts.bold, color: c.text },
    insightHeadline: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, lineHeight: 20 },
    insightSummary: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 19 },
    insightGroup: { marginTop: 14 },
    insightGroupLabel: { fontSize: 9.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 1, marginBottom: 7 },
    insightItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    insightItemText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19 },
    nextStep: { flexDirection: 'row', gap: 8, backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 12, marginTop: 14 },

    coachCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 15, marginBottom: 20 },
    coachHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    coachHeadText: { fontSize: 14, fontFamily: fonts.bold, color: c.text, flex: 1 },
    coachToggle: { fontSize: 12, fontFamily: fonts.semibold, color: c.textTertiary },
    coachHint: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18, marginBottom: 10 },
    suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    suggestChip: { borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
    suggestChipText: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary },
    bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
    bubbleMe: { alignSelf: 'flex-end', backgroundColor: c.primarySofter },
    bubbleCoach: { alignSelf: 'flex-start', backgroundColor: c.backgroundAlt },
    bubbleText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19 },
    coachInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    coachInput: { flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.background, paddingHorizontal: 12, height: 44, fontSize: 13.5, fontFamily: fonts.regular, color: c.text },
    coachSend: { width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
    coachFoot: { fontSize: 10, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 8 },


    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    countPill: { backgroundColor: c.primarySofter, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
    countPillText: { fontSize: 11.5, fontFamily: fonts.bold, color: c.primary },
    swipeHint: { marginLeft: 'auto', fontSize: 11.5, fontFamily: fonts.semibold, color: c.textTertiary },
    seeAllBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingLeft: 8 },
    seeAllText: { fontSize: 12, fontFamily: fonts.bold },
    sectionSub: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: -6, marginBottom: 12, lineHeight: 18 },

    // Recommended card (eye-catching, matches the student side)
    recCard: {
      backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border,
      overflow: 'hidden', marginBottom: 20,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 5,
    },
    recHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    recHeaderEmoji: { fontSize: 26 },
    recHeaderTitle: { color: '#FFF', fontSize: 16, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
    recHeaderSub: { color: 'rgba(255,255,255,0.92)', fontSize: 11.5, fontFamily: fonts.medium, marginTop: 2, lineHeight: 15 },
    recList: { paddingHorizontal: 8 },
    recItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 },
    recItemLine: { borderTopWidth: 1, borderTopColor: c.border },
    recNum: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    recTopic: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    recWhy: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    recGo: { fontSize: 12, fontFamily: fonts.bold },
    recFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.border },
    recFooterText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },
    // AI single-recommendation body (from /learner/{id}/next)
    recAiBody: { padding: 16 },
    recAiTitle: { fontSize: 16, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, lineHeight: 21 },
    recAiWhy: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 6, lineHeight: 18 },
    recAiCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 },
    recAiCtaText: { color: '#FFF', fontSize: 13, fontFamily: fonts.bold },

    // Per-subject quest row (main Learning screen)
    subjRowBlock: { marginBottom: 18 },
    subjRowHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    subjRowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    subjRowName: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    subjRowMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    subjRowSeeAll: { fontSize: 12, fontFamily: fonts.bold, color: c.primary },
    subjRowScrollWrap: { marginHorizontal: -16 },
    subjRowScroll: { gap: 12, paddingHorizontal: 16, paddingBottom: 6 },

    // Compact subject tile (recommended / quests-by-subject)
    subjChipRow: { gap: 10, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 2 },
    subjChip: {
      width: 138, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 12, justifyContent: 'space-between',
    },
    subjChipTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
    subjChipIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    subjChipTag: { backgroundColor: c.primarySofter, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
    subjChipTagText: { fontSize: 10, fontFamily: fonts.bold, color: c.primary },
    subjChipName: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, lineHeight: 18, minHeight: 36 },
    subjChipFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    subjChipCount: { fontSize: 12, fontFamily: fonts.semibold, color: c.textSecondary },

    // All-quests grouped + search view
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 12,
      paddingHorizontal: 12, height: 46, marginHorizontal: 16, marginTop: 6, marginBottom: 8,
    },
    searchInput: { flex: 1, fontSize: 13.5, fontFamily: fonts.regular, color: c.text, padding: 0 },
    groupBlock: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12, marginBottom: 12,
    },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    groupHeaderName: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.2 },
    groupHeaderMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    groupProgressTrack: { height: 5, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden', marginBottom: 4 },
    groupProgressFill: { height: '100%', borderRadius: 999 },
    // Horizontal quest row, full-bleed within the section card (padding 12).
    groupRowWrap: { marginHorizontal: -12 },
    groupRowScroll: { gap: 12, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2 },
    groupCount: { backgroundColor: c.primarySofter, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
    groupCountText: { fontSize: 11, fontFamily: fonts.bold, color: c.primary },

    // Subject filter inside the all-quests list
    filterStrip: { gap: 8, paddingBottom: 4, marginBottom: 14, paddingRight: 4 },
    filterChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1.5, borderColor: c.border, backgroundColor: c.card,
      borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 200,
    },
    filterChipText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.textSecondary, flexShrink: 1 },
    filterCount: {
      minWidth: 20, paddingHorizontal: 5, paddingVertical: 1,
      borderRadius: 8, backgroundColor: c.backgroundAlt, alignItems: 'center',
    },
    filterCountText: { fontSize: 10.5, fontFamily: fonts.bold, color: c.textTertiary },
    // Full-bleed horizontal carousel: cards run edge-to-edge and snap.
    questCarouselWrap: { marginHorizontal: -16, marginBottom: 22 },
    questCarousel: { gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
    gqCardCarousel: { width: 288, marginBottom: 0 },

    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
    subjectCard: { flexBasis: '47.5%', flexGrow: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12 },
    codingCard: { flexBasis: '100%', borderColor: '#10B98133', backgroundColor: '#10B9810A' },
    subjectCardHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
    subjectIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    subjectName: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    subjTopRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 9,
    },
    // Full-width name, up to two lines. minHeight reserves the second line so
    // the progress bars still line up across a row of mixed-length names.
    subjectNameWide: {
      fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2,
      lineHeight: 18, minHeight: 36,
    },
    subjectLatest: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    subjectPctRow: { marginBottom: 6 },
    subjectPctText: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textSecondary },
    track: { height: 7, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 22 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
    activityIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    activityTitle: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text },
    activityMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    activityStars: { fontSize: 12, color: c.warning },
    activityScore: { fontSize: 13, fontFamily: fonts.bold, color: c.textSecondary },

    whyCard: { flexDirection: 'row', gap: 12, backgroundColor: c.purple + '0D', borderRadius: 16, borderWidth: 1, borderColor: c.purple + '26', padding: 14, marginBottom: 22 },
    whyIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    whyTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, marginBottom: 4 },
    whyBody: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 19 },

    emptyBox: { alignItems: 'center', padding: 34, gap: 6 },
    emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: c.text, marginTop: 6 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
  });
}
