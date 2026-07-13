// Code Lab — real data, web parity (CodingView): identity strip with
// progress coins derived from the live curriculum, an "in class now"
// banner when the teacher has a lesson open, the real lesson quest list
// (status + quiz results + objectives), the Playground tools, and a
// progress snapshot. Interactive lesson content itself stays a classroom/
// desktop experience for now — rows show everything about each lesson.

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens, SHARED } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import {
  getCodingProgress, getCodingLessons, CodingProgressRow, CodingLessonInfo,
} from '../../../api/coding-student';
import { useStudentMe } from '../../../hooks/useStudentMe';

// Playground tools — the app's built-in coding sandboxes.
const TOOLS = [
  { id: 'scratch', emoji: '🐱', name: 'Scratch', sub: 'Visual blocks', colors: ['#ff5e9c', '#ffa3c6'] as [string, string], route: '/student/code/scratch' },
  { id: 'blockly', emoji: '🧩', name: 'Blockly', sub: 'Logic puzzles', colors: ['#f4a716', '#ffd766'] as [string, string], route: '/student/code/blockly' },
  { id: 'python', emoji: '🐍', name: 'Python', sub: 'Real code', colors: ['#3aa0ff', '#7fc4ff'] as [string, string], route: '/student/code/python' },
  { id: 'mobile', emoji: '📱', name: 'Mobile', sub: 'Build apps', colors: ['#15c98c', '#74e6b4'] as [string, string], route: '/student/code/mobile' },
  { id: 'robotics', emoji: '🤖', name: 'Robotics', sub: 'Code robots', colors: ['#5b6cff', '#9aa6ff'] as [string, string], route: '/student/code/robotics' },
];

export const CodeView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { accessToken } = useAuth();
  const { profile } = useStudentMe();
  const playful = tier === 'sprout' || tier === 'explorer';

  const [progress, setProgress] = useState<CodingProgressRow[] | null>(null);
  const [lessons, setLessons] = useState<CodingLessonInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true);
    const [p, l] = await Promise.allSettled([
      getCodingProgress(accessToken),
      getCodingLessons(accessToken),
    ]);
    if (p.status === 'fulfilled' && Array.isArray(p.value)) {
      setProgress(p.value);
      setFailed(false);
    } else {
      setProgress((prev) => prev ?? []);
      setFailed(true);
    }
    if (l.status === 'fulfilled' && Array.isArray(l.value)) setLessons(l.value);
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rows = progress ?? [];
  const done = rows.filter((r) => r.quizPassed || r.status === 'COMPLETED').length;
  const pct = rows.length ? Math.round((100 * done) / rows.length) : 0;
  const objectiveFor = (lessonId: number) =>
    lessons.find((l) => l.id === lessonId)?.objective ?? null;

  // The web's "Today" banner: the teacher has this lesson open in class.
  const inClassNow = rows.find((r) => r.teacherOpen && r.available && r.status !== 'COMPLETED') ?? null;

  const firstName = profile?.firstName
    ? profile.firstName.charAt(0) + profile.firstName.slice(1).toLowerCase()
    : 'coder';

  const showLessonInfo = (r: CodingProgressRow) => {
    const obj = objectiveFor(r.lessonId);
    Alert.alert(
      `Lesson ${r.lessonNumber}: ${r.title ?? ''}`,
      [
        obj ? `🎯 ${obj}` : null,
        r.status === 'LOCKED'
          ? '🔒 Finish the lesson before this one to unlock it.'
          : r.quizPassed
            ? `✅ Quiz passed${r.lastQuizPercent != null ? ` — ${r.lastQuizPercent}%` : ''}`
            : r.lastQuizPercent != null
              ? `📝 Best quiz so far: ${r.lastQuizPercent}% — try again in class!`
              : '📝 The quiz is waiting — you do it in class.',
        r.teacherOpen ? '📣 Your teacher has this lesson open right now.' : null,
      ].filter(Boolean).join('\n\n'),
    );
  };

  if (progress === null) {
    return (
      <View style={[styles.safe, styles.center, { backgroundColor: tokens.bgColor }]}>
        <ActivityIndicator size="large" color={tokens.accent1} />
        <Text style={styles.loadingText}>Opening the Code Lab…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tokens.accent1} />}
      >
        {/* Identity strip — mirrors the web's slim coding brand row */}
        <View style={[styles.brandCard, { borderRadius: tokens.radius }]}>
          {playful && <Text style={{ fontSize: 34 }}>🦄</Text>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.brandTitle}>
              {pickByTier(tier, { base: 'ShuleOne Coding', scholar: 'Coding', campus: 'Coding' })}
            </Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              {playful
                ? `Hi ${firstName}! Ready for today’s adventure? 🌟`
                : `Welcome back, ${firstName}.`}
            </Text>
          </View>
          <View style={styles.coins}>
            <Text style={styles.coin}>⭐ {done}</Text>
            <Text style={styles.coin}>🏅 {pct}%</Text>
          </View>
        </View>

        {failed && (
          <TouchableOpacity style={styles.errorRow} onPress={() => load(true)} activeOpacity={0.8}>
            <Text style={styles.errorText}>⚠️ Could not load your lessons — tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* In class now */}
        {inClassNow && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => showLessonInfo(inClassNow)}>
            <LinearGradient
              colors={[SHARED.orange1, SHARED.pink1]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.todayBanner, { borderRadius: tokens.radius }]}
            >
              <Text style={{ fontSize: 26 }}>📣</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.todayKick}>IN CLASS NOW</Text>
                <Text style={styles.todayTitle} numberOfLines={1}>
                  Lesson {inClassNow.lessonNumber}: {inClassNow.title}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Lesson quest list */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>
            {pickByTier(tier, { base: '🗺️ My lessons', sprout: '🗺️ My coding quest', explorer: '🗺️ My coding quest' })}
          </Text>
          <View style={styles.secHLine} />
        </View>

        {rows.length === 0 && !failed && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 44 }}>🌱</Text>
            <Text style={styles.emptyTitle}>No coding lessons yet</Text>
            <Text style={styles.emptyText}>Your class programme will appear here.</Text>
          </View>
        )}

        {rows.length > 0 && (
          <View style={[styles.lessonCard, { borderRadius: tokens.radius }]}>
            {rows.map((r, i) => {
              const state = r.quizPassed || r.status === 'COMPLETED' ? 'done'
                : r.available ? 'cur' : 'lock';
              return (
                <TouchableOpacity
                  key={r.lessonId}
                  activeOpacity={0.75}
                  onPress={() => showLessonInfo(r)}
                  style={[styles.lessonRow, i > 0 && styles.lessonRowLine]}
                >
                  {state === 'done' ? (
                    <LinearGradient colors={[SHARED.green1, '#0fae78']} style={styles.numBubble}>
                      <Text style={styles.numBubbleText}>✓</Text>
                    </LinearGradient>
                  ) : state === 'cur' ? (
                    <LinearGradient colors={[SHARED.orange1, SHARED.pink1]} style={styles.numBubble}>
                      <Text style={styles.numBubbleText}>{r.lessonNumber}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.numBubble, { backgroundColor: '#d9d4ee' }]}>
                      <Text style={[styles.numBubbleText, { color: '#8b84b3' }]}>🔒</Text>
                    </View>
                  )}

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.lessonTitle, state === 'lock' && { color: '#8b84b3' }]} numberOfLines={1}>
                      {r.title ?? `Lesson ${r.lessonNumber}`}
                    </Text>
                    <Text style={styles.lessonSub} numberOfLines={1}>
                      {state === 'done' ? 'completed ✨'
                        : state === 'cur' ? 'ready to learn'
                        : 'locked'}
                      {r.teacherOpen && state !== 'done' ? ' · 📣 open in class' : ''}
                    </Text>
                  </View>

                  {r.hasQuiz && r.lastQuizPercent != null && (
                    <View style={[
                      styles.quizChip,
                      { backgroundColor: r.quizPassed ? '#eafef3' : '#fff3da' },
                    ]}>
                      <Text style={[styles.quizChipText, { color: r.quizPassed ? '#0fae78' : '#b45309' }]}>
                        {r.lastQuizPercent}%
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Playground */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>
            {pickByTier(tier, { base: '🎮 Playground', sprout: '🎮 Play & Build' })}
          </Text>
          <View style={styles.secHLine} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
          {TOOLS.map((t) => (
            <TouchableOpacity key={t.id} activeOpacity={0.85} onPress={() => router.push(t.route as any)}>
              <LinearGradient colors={t.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.toolCard, { borderRadius: tokens.radius }]}>
                <Text style={{ fontSize: 30 }}>{t.emoji}</Text>
                <Text style={styles.toolName}>{t.name}</Text>
                <Text style={styles.toolSub}>{t.sub}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Progress snapshot */}
        {rows.length > 0 && (
          <>
            <View style={styles.secH}>
              <Text style={styles.secHTitle}>🏆 My progress</Text>
              <View style={styles.secHLine} />
            </View>
            <View style={styles.statsRow}>
              <StatBox value={done} label="Done" tint={SHARED.green1} />
              <StatBox value={rows.filter((r) => r.available && !(r.quizPassed || r.status === 'COMPLETED')).length} label="In progress" tint={SHARED.orange1} />
              <StatBox value={rows.filter((r) => !r.available).length} label="Locked" tint="#8b84b3" />
              <StatBox value={`${pct}%`} label="Complete" tint={SHARED.purple1} />
            </View>
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const StatBox: React.FC<{ value: number | string; label: string; tint: string }> = ({ value, label, tint }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6f679c', marginTop: 14, fontWeight: '600' },
  scroll: { padding: 16 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 16 },
  secHTitle: { fontSize: 16.5, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  brandCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 14,
    borderWidth: 1.5, borderColor: '#ece8fb',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  brandTitle: { fontSize: 16, fontWeight: '800', color: '#2c2550' },
  brandSub: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  coins: { gap: 4, alignItems: 'flex-end' },
  coin: {
    fontSize: 11, fontWeight: '800', color: '#2c2550',
    backgroundColor: '#f4f1ff', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
  },

  errorRow: { backgroundColor: '#fee2e2', borderRadius: 14, padding: 12, marginTop: 12 },
  errorText: { color: '#b91c1c', fontWeight: '700', fontSize: 12.5 },

  todayBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginTop: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 10, elevation: 3,
  },
  todayKick: { color: 'rgba(255,255,255,0.9)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  todayTitle: { color: '#fff', fontSize: 14.5, fontWeight: '800', marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#2c2550', marginTop: 8 },
  emptyText: { fontSize: 12.5, color: '#6f679c', fontWeight: '600', marginTop: 4 },

  lessonCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#ece8fb',
    paddingHorizontal: 14, paddingVertical: 4,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  lessonRowLine: { borderTopWidth: 1, borderTopColor: '#f2effc' },
  numBubble: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  numBubbleText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lessonTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  lessonSub: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  quizChip: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  quizChipText: { fontSize: 11.5, fontWeight: '800' },

  toolsRow: { gap: 12, paddingRight: 16 },
  toolCard: {
    width: 118, padding: 12, minHeight: 108,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 10, elevation: 3,
  },
  toolName: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 8 },
  toolSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.92, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#ece8fb',
    paddingVertical: 12,
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#6f679c', fontWeight: '700', marginTop: 2 },
});
