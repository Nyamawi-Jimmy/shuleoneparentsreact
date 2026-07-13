// "Me" — the student dashboard, feature-matched to the web StudentHome
// (recommended next, trial state, path roadmap, daily goal, skill mastery,
// tasks due, live-now) but laid out in the app's own gamified language:
// lilac canvas, white cards with purple shadows, tier-token gradients,
// emoji pills and the mascot for the play tiers.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTier, pickByTier, Tier, TIER_LAYOUT } from '../TierContext';
import { useTokens, SHARED, SHADOWS } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { Mascot } from '../components/Mascot';
import { useStudentMe } from '../../../hooks/useStudentMe';
import { masteryPct } from '../../../api/learner-me';
import { dueAssignments, liveNowClasses } from '../../../api/student.types';

// Per-tier vocabulary — mirrors the web's VOCAB map so the same feature
// reads age-appropriately everywhere.
const VOCAB: Record<Tier, { focus: string; cta: string; mastery: string; path: string; tagline: string; emoji: string }> = {
  sprout:   { focus: "Today's adventure", cta: "Let's Go!", mastery: 'My skills',       path: 'My path',       tagline: "let's play and learn!", emoji: '🌟' },
  explorer: { focus: "Today's mission",   cta: 'Start',     mastery: 'Skill mastery',   path: 'Your path',     tagline: "let's explore today.",   emoji: '🚀' },
  voyager:  { focus: "Today's focus",     cta: 'Start',     mastery: 'Subject mastery', path: 'Your roadmap',  tagline: "let's close one gap today.", emoji: '🎯' },
  scholar:  { focus: 'Recommended',       cta: 'Start',     mastery: 'Exam readiness',  path: 'Your syllabus', tagline: "let's get exam-ready.", emoji: '🎯' },
  campus:   { focus: 'Recommended next',  cta: 'Continue',  mastery: 'Skill mastery',   path: 'Course path',   tagline: 'pick up where you left off.', emoji: '✨' },
};

const BAR_COLORS = [SHARED.amber1, SHARED.green1, SHARED.blue1, SHARED.purple1, SHARED.teal1, SHARED.pink1];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const isTier = (t: string | null | undefined): t is Tier => !!t && t in TIER_LAYOUT;

export const MeView: React.FC = () => {
  const { tier, setTier } = useTier();
  const tokens = useTokens(tier);
  const {
    profile, game, next, mastery, access, assignments, liveClasses,
    loading, refreshing, refresh, error,
  } = useStudentMe();

  // The backend tier is authoritative — sync it into the theme once known.
  useEffect(() => {
    if (isTier(profile?.tier)) setTier(profile.tier);
  }, [profile?.tier]); // eslint-disable-line react-hooks/exhaustive-deps

  // Monday-indexed "today" for the week strip; computed once per mount.
  const [todayIdx] = useState(() => (new Date().getDay() + 6) % 7);

  const v = VOCAB[tier];
  const firstName = profile?.firstName
    ? profile.firstName.charAt(0) + profile.firstName.slice(1).toLowerCase()
    : 'there';
  const classChip = profile?.className
    ? `${profile.className}${profile.streamName ? ' · ' + profile.streamName : ''}`
    : undefined;

  const streak = game.streak?.current ?? 0;
  const level = game.level ?? 1;
  const totalXp = game.totalXp ?? 0;
  const goalTarget = game.streak?.dailyGoal ?? null;
  const goalDone = game.streak?.todayCount ?? 0;

  const due = dueAssignments(assignments);
  const overdue = due.filter((a) => a.status === 'OVERDUE');
  const liveNow = liveNowClasses(liveClasses);

  // Roadmap rows: mastered → in progress → locked (web's ranking).
  const roadmap = useMemo(() => {
    const rank = (m: { score: number | null; attempts?: number | null }) =>
      masteryPct(m.score) >= 85 ? 0 : ((m.attempts ?? 0) > 0 ? 1 : 2);
    return [...mastery].sort((a, b) => rank(a) - rank(b) || masteryPct(b.score) - masteryPct(a.score)).slice(0, 6);
  }, [mastery]);
  const skillBars = useMemo(
    () => [...mastery].sort((a, b) => masteryPct(b.score) - masteryPct(a.score)).slice(0, 5),
    [mastery],
  );
  const focusId = next?.subStrandId ?? null;

  const openQuests = () => router.push('/(student-tabs)/quest' as any);
  const locked = !!next && (next.premiumLocked || next.type === 'LOCKED');

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
        <TopBar />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tokens.accent1} />
          <Text style={styles.loadingText}>Getting your world ready…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar
        streak={streak}
        stars={totalXp}
        onAvatarPress={() => router.push('/(student-tabs)/me' as any)}
        onBellPress={() => router.push('/notifications' as any)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.accent1} />}
      >
        {!!error && (
          <TouchableOpacity style={styles.errorRow} onPress={refresh} activeOpacity={0.8}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </TouchableOpacity>
        )}

        {/* ── LIVE now — jump straight in ─────────────────────── */}
        {liveNow.length > 0 && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(student-tabs)/events' as any)}>
            <LinearGradient
              colors={[SHARED.pink1, '#e11d48']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.liveBanner, { borderRadius: tokens.radius }]}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveText} numberOfLines={1}>
                LIVE now: {liveNow[0].title ?? 'Your class has started'}
              </Text>
              <Text style={styles.liveJoin}>Join ▶</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Greeting + mascot ───────────────────────────────── */}
        <View style={[styles.greetCard, { borderRadius: tokens.radius }]}>
          {tokens.mascotSize > 0 && (
            <View style={{ marginRight: 12 }}>
              <Mascot size={Math.min(tokens.mascotSize, 96)} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.greetTop}>
              <Text style={styles.greetTitle}>Hi {firstName}! 👋</Text>
              <View style={[styles.lvlChip, { backgroundColor: SHARED.ring }]}>
                <Text style={[styles.lvlChipText, { color: tokens.accent1 }]}>💎 Lvl {level}</Text>
              </View>
            </View>
            <Text style={styles.greetSub}>
              {[classChip, tierName(tier)].filter(Boolean).join(' · ')}
              {due.length > 0
                ? ` — ${due.length} to do${due[0]?.title ? `, next: ${due[0].title}` : ''}`
                : ` — ${v.tagline}`}
            </Text>
          </View>
        </View>

        {/* ── Free-month ribbon ───────────────────────────────── */}
        {access?.trialActive && !access.paid && (
          <View style={[styles.trialRow, { borderRadius: tokens.radius }]}>
            <Text style={{ fontSize: 18 }}>🎁</Text>
            <Text style={styles.trialText}>
              <Text style={{ fontWeight: '800', color: tokens.accent1 }}>Free month</Text>
              {'  '}·  {access.daysLeft} {access.daysLeft === 1 ? 'day' : 'days'} left to explore everything
            </Text>
          </View>
        )}

        {/* ── Recommended hero / locked state ─────────────────── */}
        {locked ? (
          <View style={[styles.lockCard, { borderRadius: tokens.radius }]}>
            <Text style={{ fontSize: 34 }}>🚀</Text>
            <Text style={styles.lockTitle}>Keep exploring everything</Text>
            <Text style={styles.lockSub}>Your free month is over — bring it all back.</Text>
            <View style={styles.lockPerks}>
              <Text style={styles.lockPerk}>🤖  Your own AI tutor, any time</Text>
              <Text style={styles.lockPerk}>🎯  A fresh challenge picked just for you</Text>
              <Text style={styles.lockPerk}>📈  Watch every skill level up</Text>
            </View>
            <LinearGradient colors={[tokens.accent1, tokens.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lockCta}>
              <Text style={styles.lockCtaText}>Ask a parent to unlock</Text>
            </LinearGradient>
          </View>
        ) : next ? (
          <TouchableOpacity activeOpacity={0.9} onPress={openQuests}>
            <LinearGradient
              colors={[tokens.accent1, tokens.accent2]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.hero, { borderRadius: tokens.radius }]}
            >
              <View style={styles.heroKick}>
                <Text style={styles.heroKickText}>{v.emoji} {v.focus.toUpperCase()}</Text>
              </View>
              <Text style={styles.heroTitle}>{next.title ?? next.subStrandName ?? 'Your next lesson'}</Text>
              {!!next.reason && <Text style={styles.heroBody}>{next.reason}</Text>}
              <View style={styles.heroGo}>
                <Text style={[styles.heroGoText, { color: tokens.accent1 }]}>{v.cta} ▶</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {/* ── Today's goal + week strip ───────────────────────── */}
        {goalTarget != null && goalTarget > 0 && (
          <View style={[styles.card, { borderRadius: tokens.radius }]}>
            <Text style={styles.cardTitle}>🎯 Today’s goal</Text>
            <View style={styles.goalRow}>
              <Text style={styles.goalBig}>{goalDone}<Text style={styles.goalOf}> of {goalTarget}</Text></Text>
              <View style={styles.goalDots}>
                {Array.from({ length: goalTarget }).map((_, i) => (
                  <View key={i} style={[styles.goalDot, i < goalDone && { backgroundColor: tokens.accent1, borderColor: 'transparent' }]} />
                ))}
              </View>
            </View>
            <Text style={styles.goalHint}>
              {goalDone >= goalTarget
                ? 'Goal reached — amazing! 🎉'
                : `${goalTarget - goalDone} more lesson${goalTarget - goalDone === 1 ? '' : 's'} to hit today's goal.`}
            </Text>
            <View style={styles.weekRow}>
              {DAY_LETTERS.map((d, i) => {
                const on = i <= todayIdx && (todayIdx - i) < streak;
                return (
                  <View key={i} style={[
                    styles.dayChip,
                    on && { backgroundColor: tokens.accent1 },
                    i === todayIdx && { borderWidth: 2, borderColor: tokens.accent2 },
                  ]}>
                    <Text style={[styles.dayText, on && { color: '#fff' }]}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Tasks due ───────────────────────────────────────── */}
        {due.length > 0 && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(student-tabs)/tasks' as any)}>
            <LinearGradient
              colors={['#fff3d6', '#ffe9f3']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.tasksBanner, { borderRadius: tokens.radius }]}
            >
              <Text style={{ fontSize: 32 }}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tasksTitle}>
                  {pickByTier(tier, { base: 'Tasks', sprout: 'My Homework', explorer: 'My Homework' })} — {due.length} to do
                  {overdue.length > 0 ? ` · ${overdue.length} overdue` : ''}
                </Text>
                {!!due[0]?.title && (
                  <Text style={styles.tasksSub} numberOfLines={1}>
                    Next: {due[0].title}{due[0].dueAt ? ` · ${fmtDue(due[0].dueAt)}` : ''}
                  </Text>
                )}
              </View>
              <LinearGradient colors={[SHARED.orange1, SHARED.pink1]} style={styles.tasksBtn}>
                <Text style={styles.tasksBtnText}>Open</Text>
              </LinearGradient>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── My path (roadmap) ───────────────────────────────── */}
        {roadmap.length > 0 && (
          <View style={[styles.card, { borderRadius: tokens.radius }]}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>🗺️ {v.path}</Text>
              <TouchableOpacity hitSlop={8} onPress={openQuests}>
                <Text style={[styles.seeAll, { color: tokens.accent1 }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {roadmap.map((m, idx) => {
              const p = masteryPct(m.score);
              const state = p >= 85 ? 'done' : ((m.attempts ?? 0) > 0 ? 'cur' : 'lock');
              return (
                <View key={m.subStrandId} style={[styles.pathRow, idx > 0 && styles.pathRowLine]}>
                  {state === 'done' ? (
                    <LinearGradient colors={[tokens.accent1, tokens.accent2]} style={styles.node}>
                      <Text style={styles.nodeText}>✓</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.node, state === 'cur'
                      ? { backgroundColor: SHARED.ring, borderWidth: 2, borderColor: tokens.accent1 }
                      : { backgroundColor: SHARED.ring }]}>
                      <Text style={styles.nodeText}>{state === 'cur' ? '⭐' : '🔒'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.pathTitle} numberOfLines={1}>{m.subStrandName ?? `Skill ${m.subStrandId}`}</Text>
                    <Text style={styles.pathSub}>
                      {state === 'done' ? 'mastered ✨' : state === 'cur' ? 'in progress' : 'locked'}
                    </Text>
                  </View>
                  {state === 'cur' && (
                    <View style={styles.pathRight}>
                      <View style={styles.miniBar}>
                        <View style={[styles.miniFill, { width: `${p}%`, backgroundColor: tokens.accent1 }]} />
                      </View>
                      <Text style={[styles.miniPct, { color: tokens.accent1 }]}>{p}%</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── My skills (mastery bars) ────────────────────────── */}
        {skillBars.length > 0 && (
          <View style={[styles.card, { borderRadius: tokens.radius }]}>
            <Text style={styles.cardTitle}>💪 {v.mastery}</Text>
            {skillBars.map((m, i) => {
              const p = masteryPct(m.score);
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <View key={m.subStrandId} style={styles.skillRow}>
                  <View style={[styles.skillDot, { backgroundColor: color }]} />
                  <Text style={styles.skillName} numberOfLines={1}>{m.subStrandName ?? `Skill ${m.subStrandId}`}</Text>
                  {m.subStrandId === focusId && (
                    <View style={styles.focusChip}><Text style={styles.focusChipText}>FOCUS</Text></View>
                  )}
                  <View style={styles.skillBar}>
                    <View style={[styles.skillFill, { width: `${p}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.skillPct}>{p}%</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <AgeSwitcher />
    </SafeAreaView>
  );
};

function tierName(t: Tier): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function fmtDue(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: SHARED.inkSoft, fontWeight: '600', fontSize: 13 },

  errorRow: {
    backgroundColor: '#fee2e2', borderRadius: 14, padding: 12, marginBottom: 12,
  },
  errorText: { color: '#b91c1c', fontWeight: '700', fontSize: 12.5 },

  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13, marginBottom: 12,
    ...SHADOWS.cardSm,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  liveText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 13 },
  liveJoin: { color: '#fff', fontWeight: '800', fontSize: 13 },

  greetCard: {
    backgroundColor: '#fff', padding: 18, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
    ...SHADOWS.card,
  },
  greetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  greetTitle: { flexShrink: 1, fontSize: 22, fontWeight: '800', color: SHARED.ink, letterSpacing: -0.3 },
  greetSub: { color: SHARED.inkSoft, fontWeight: '600', marginTop: 6, fontSize: 13, lineHeight: 18 },
  lvlChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  lvlChipText: { fontWeight: '800', fontSize: 11.5 },

  trialRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: SHARED.ring, borderWidth: 1.5, borderColor: SHARED.line,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  trialText: { flex: 1, color: SHARED.ink, fontWeight: '600', fontSize: 12.5 },

  hero: { padding: 18, marginBottom: 12, ...SHADOWS.card },
  heroKick: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroKickText: { color: '#fff', fontWeight: '800', fontSize: 9.5, letterSpacing: 0.6 },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 19, marginTop: 10, letterSpacing: -0.3 },
  heroBody: { color: 'rgba(255,255,255,0.92)', fontSize: 12.5, fontWeight: '500', marginTop: 5, lineHeight: 18 },
  heroGo: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 14,
  },
  heroGoText: { fontWeight: '800', fontSize: 13.5 },

  lockCard: {
    backgroundColor: '#fff', alignItems: 'center', padding: 22, marginBottom: 12,
    ...SHADOWS.card,
  },
  lockTitle: { fontWeight: '800', fontSize: 17, color: SHARED.ink, marginTop: 8 },
  lockSub: { color: SHARED.inkSoft, fontSize: 12.5, fontWeight: '600', marginTop: 4 },
  lockPerks: { marginTop: 14, gap: 8, alignSelf: 'flex-start' },
  lockPerk: { fontSize: 13, fontWeight: '600', color: SHARED.ink },
  lockCta: { borderRadius: 13, paddingHorizontal: 22, paddingVertical: 12, marginTop: 16 },
  lockCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  card: { backgroundColor: '#fff', padding: 16, marginBottom: 12, ...SHADOWS.cardSm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: SHARED.ink, marginBottom: 10 },
  seeAll: { fontWeight: '800', fontSize: 12.5, marginBottom: 10 },

  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalBig: { fontSize: 26, fontWeight: '800', color: SHARED.ink, letterSpacing: -0.5 },
  goalOf: { fontSize: 14, color: SHARED.inkSoft, fontWeight: '700' },
  goalDots: { flexDirection: 'row', gap: 7 },
  goalDot: {
    width: 26, height: 10, borderRadius: 99,
    borderWidth: 2, borderColor: SHARED.line, backgroundColor: 'transparent',
  },
  goalHint: { color: SHARED.inkSoft, fontSize: 12, fontWeight: '600', marginTop: 8 },
  weekRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  dayChip: {
    flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center',
    backgroundColor: SHARED.ring,
  },
  dayText: { fontSize: 11, fontWeight: '800', color: SHARED.inkSoft },

  tasksBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 12,
    borderWidth: 2, borderColor: '#fff', ...SHADOWS.cardSm,
  },
  tasksTitle: { fontSize: 14, fontWeight: '800', color: SHARED.ink },
  tasksSub: { fontSize: 11.5, color: SHARED.inkSoft, fontWeight: '600', marginTop: 2 },
  tasksBtn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  tasksBtnText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },

  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  pathRowLine: { borderTopWidth: 1.5, borderTopColor: SHARED.line },
  node: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  nodeText: { fontSize: 15, color: '#fff', fontWeight: '800' },
  pathTitle: { fontSize: 13.5, fontWeight: '800', color: SHARED.ink },
  pathSub: { fontSize: 11, color: SHARED.inkSoft, fontWeight: '600', marginTop: 1 },
  pathRight: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  miniBar: { width: 56, height: 7, borderRadius: 99, backgroundColor: SHARED.ring, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 99 },
  miniPct: { fontSize: 11.5, fontWeight: '800' },

  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  skillDot: { width: 8, height: 8, borderRadius: 4 },
  skillName: { maxWidth: 110, fontSize: 12.5, fontWeight: '700', color: SHARED.ink },
  focusChip: { backgroundColor: '#fff3da', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  focusChipText: { color: '#b45309', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 },
  skillBar: { flex: 1, height: 8, borderRadius: 99, backgroundColor: SHARED.ring, overflow: 'hidden', minWidth: 30 },
  skillFill: { height: '100%', borderRadius: 99 },
  skillPct: { width: 36, textAlign: 'right', fontSize: 12, fontWeight: '800', color: SHARED.ink },
});
