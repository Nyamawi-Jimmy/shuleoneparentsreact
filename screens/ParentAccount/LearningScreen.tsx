import React, { useCallback, useMemo, useState } from 'react';
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

  // Subject drill-down: tapping a subject card lists that subject's quests, each with a
  // Play button that hands the device to the child (kid-learn mode, deep-linked).
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  const playQuest = (questId: number | null) => {
    router.push((questId != null ? `/kid-learn?questId=${questId}` : '/kid-learn') as any);
  };

  if (openSubject) {
    return (
      <SubjectQuestsView
        styles={styles}
        colors={colors}
        subject={openSubject}
        quests={quests.filter((q) => (q.subject || 'General') === openSubject)}
        childName={firstName}
        onBack={() => setOpenSubject(null)}
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

          {/* By subject (quests) */}
          {(academicCards.length > 0 || hasCoding || hasCodingQuest) && (
            <>
              <Text style={styles.sectionTitle}>By subject</Text>
              <View style={styles.subjectGrid}>
                {academicCards.map((s) => {
                  const accent = s.accent || colors.primary;
                  const questCount = quests.filter((q) => (q.subject || 'General') === s.subject).length;
                  return (
                    <TouchableOpacity
                      key={s.subject} style={styles.subjectCard} activeOpacity={questCount > 0 ? 0.7 : 1}
                      onPress={questCount > 0 ? () => setOpenSubject(s.subject) : undefined}
                    >
                      <View style={styles.subjectCardHead}>
                        <View style={[styles.subjectIcon, { backgroundColor: accent + '1F' }]}>
                          <MaterialCommunityIcons name={subjectIconName(s.subject)} size={18} color={accent} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.subjectName} numberOfLines={1}>{s.subject}</Text>
                          {s.latest
                            ? <Text style={styles.subjectLatest} numberOfLines={1}>Latest: {s.latest}</Text>
                            : s.completed > 0 ? <Text style={styles.subjectLatest} numberOfLines={1}>{s.completed} {s.completed === 1 ? 'lesson' : 'lessons'} completed</Text> : null}
                        </View>
                        {questCount > 0 && <Feather name="chevron-right" size={16} color={colors.textTertiary} />}
                      </View>
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

                {/* Coding & Robotics — only when it isn't already a real quest subject.
                    Honest about its source; never shows a fabricated percentage. */}
                {!hasCodingQuest && hasCoding && (
                  <TouchableOpacity style={styles.subjectCard} activeOpacity={0.7} onPress={() => router.push('/coding' as any)}>
                    <View style={styles.subjectCardHead}>
                      <View style={[styles.subjectIcon, { backgroundColor: '#10B9811F' }]}>
                        <MaterialCommunityIcons name="code-tags" size={18} color="#059669" />
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

                {/* Not available — soft upsell, no fake data. */}
                {!hasCodingQuest && !hasCoding && (
                  <TouchableOpacity style={styles.subjectCard} activeOpacity={0.7} onPress={() => router.push('/subscriptions' as any)}>
                    <View style={styles.subjectCardHead}>
                      <View style={[styles.subjectIcon, { backgroundColor: colors.backgroundAlt }]}>
                        <Ionicons name="lock-closed" size={17} color={colors.textTertiary} />
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

// ── Subject drill-down ───────────────────────────────────────────────────────
// The real quests behind one subject card — each with its live progress, a status
// line, and a Play button that drops straight into kid-learn mode deep-linked to
// that quest. Parent stays read-only; Play is the hand-the-device-over action.
const SubjectQuestsView: React.FC<{
  styles: any; colors: ColorPalette; subject: string; quests: QuestSummary[];
  childName: string; onBack: () => void; onPlay: (questId: number | null) => void;
}> = ({ styles, colors, subject, quests, childName, onBack, onPlay }) => {
  const rows = [...quests].sort((a, b) => rankStatus(a.status) - rankStatus(b.status));
  return (
    <View style={styles.root}>
      <GradientAppBar
        title={subject}
        subtitle={`${childName}’s quests in ${subject}`}
        right={
          <TouchableOpacity style={styles.appBarAction} activeOpacity={0.7} onPress={onBack}>
            <Ionicons name="chevron-back" size={15} color="#FFF" />
            <Text style={styles.appBarActionText}>Learning</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {rows.map((q) => (
          <GamifiedQuestCard key={String(q.id ?? q.key)} styles={styles} quest={q} onPlay={onPlay} />
        ))}
        {rows.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No quests in this subject yet.</Text>
          </View>
        )}
        <Text style={styles.handOverNote}>
          Tapping Start or Continue hands the device to {childName} — everything they do counts on their own account.
        </Text>
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
  featured?: boolean; kicker?: string;
}> = ({ styles, quest, onPlay, featured, kicker }) => {
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
      style={[styles.gqCard, { borderColor: accent + '3D' }, featured && styles.gqCardFeatured]}>
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

    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
    subjectCard: { flexBasis: '47.5%', flexGrow: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12 },
    subjectCardHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
    subjectIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    subjectName: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
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
