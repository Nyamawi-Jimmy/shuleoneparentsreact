// Code Lab — full web CodingView parity on live data, in the app's gamified
// skin: identity strip with progress coins, FOUR sections (🗺️ Lessons ·
// 🎮 Playground · 🏅 Exams · 🏆 Progress), the Today banner when the teacher
// has a lesson open, lessons that OPEN into the quest-stage player (Mission /
// Code / Challenge / Marks + team bar), the boss/champion node, coding exams,
// and the gamified progress profile.

import React, { useCallback, useState } from 'react';
import { useTheme } from '../../../theme/ThemeContext';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTier } from '../TierContext';
import { useTokens, SHARED } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import {
  getCodingProgress, getCodingLesson, CodingProgressRow, CodingLessonDetail,
} from '../../../api/coding-student';
import { getStudentProfile } from '../../../api/student';
import { StudentProfile } from '../../../api/student.types';
import { CodingLessonScreen } from './CodingLessonScreen';
import { CodingExamsSection } from './CodingExamsSection';

const SECTIONS = [
  { key: 'lessons', icon: '🗺️', label: 'Lessons' },
  { key: 'playground', icon: '🎮', label: 'Playground' },
  { key: 'exams', icon: '🏅', label: 'Exams' },
  { key: 'progress', icon: '🏆', label: 'Progress' },
] as const;
type SectionKey = typeof SECTIONS[number]['key'];

// Playground languages — the exact catalogue the web PlaygroundTab offers.
// Every kind opens the in-app runner, where Python/JS/SQL/Web/Terminal
// genuinely RUN (same engines as the web) and Scratch/MakeCode open their
// real editors.
const PG_KINDS = [
  { kind: 'PYTHON', icon: '🐍', label: 'Python', language: 'Python', colors: ['#1fc99a', '#0f9e8e'] as [string, string] },
  { kind: 'WEB', icon: '🌐', label: 'Web', language: 'HTML / CSS / JS', colors: ['#3a8bff', '#e91e63'] as [string, string] },
  { kind: 'JS', icon: '🟨', label: 'JavaScript', language: 'JavaScript', colors: ['#f4a716', '#d97706'] as [string, string] },
  { kind: 'SQL', icon: '🗄️', label: 'SQL', language: 'SQL (SQLite)', colors: ['#5b6cff', '#9aa6ff'] as [string, string] },
  { kind: 'BASH', icon: '💻', label: 'Terminal', language: 'Bash + Git (emulated)', colors: ['#475569', '#64748b'] as [string, string] },
  { kind: 'SCRATCH', icon: '🐱', label: 'Scratch', language: 'Shule One Scratch', colors: ['#ff8a3d', '#ff5e9c'] as [string, string] },
  { kind: 'MICROBIT', icon: '📟', label: 'micro:bit', language: 'micro:bit (MakeCode)', colors: ['#00b8d4', '#3a8bff'] as [string, string] },
  { kind: 'ARDUINO', icon: '🔌', label: 'Arduino', language: 'Arduino (C++)', colors: ['#19b39b', '#1577c2'] as [string, string] },
  { kind: 'ROBOT', icon: '🤖', label: 'Robot', language: 'mBot2', colors: ['#e91e63', '#ff8fc0'] as [string, string] },
];

export const CodeView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  useTheme(); // subscribe — styles/C proxies resolve the active scheme
  const { accessToken } = useAuth();
  const playful = tier === 'sprout' || tier === 'explorer';

  const [section, setSection] = useState<SectionKey>('lessons');
  const [progress, setProgress] = useState<CodingProgressRow[] | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [openLesson, setOpenLesson] = useState<{ lesson: CodingLessonDetail; node: CodingProgressRow | null } | null>(null);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) return;
    if (isRefresh) setRefreshing(true);
    const [p, prof] = await Promise.allSettled([
      getCodingProgress(accessToken),
      getStudentProfile(accessToken),
    ]);
    if (p.status === 'fulfilled' && Array.isArray(p.value)) {
      setProgress(p.value);
      setFailed(false);
    } else {
      setProgress((prev) => prev ?? []);
      setFailed(true);
    }
    if (prof.status === 'fulfilled') setProfile(prof.value);
    setRefreshing(false);
  }, [accessToken]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rows = progress ?? [];
  const done = rows.filter((r) => r.quizPassed || r.status === 'COMPLETED').length;
  const pct = rows.length ? Math.round((100 * done) / rows.length) : 0;
  // The web's Today banner: the FURTHEST teacher-opened lesson not yet completed.
  const today = [...rows].reverse().find((r) => r.teacherOpen && !(r.quizPassed || r.status === 'COMPLETED')) ?? null;
  const firstName = profile?.firstName
    ? profile.firstName.charAt(0) + profile.firstName.slice(1).toLowerCase()
    : 'coder';

  const open = async (r: CodingProgressRow) => {
    if (!accessToken || opening) return;
    if (!r.available) {
      Alert.alert('🔒 Locked', `“${r.title}” is locked — pass the earlier lessons first!`);
      return;
    }
    setOpening(true);
    try {
      const lesson = await getCodingLesson(accessToken, r.lessonId);
      setOpenLesson({ lesson, node: r });
    } catch (e: any) {
      Alert.alert('Oops', e?.message || 'Could not open that lesson.');
    } finally {
      setOpening(false);
    }
  };

  const openBoss = () => {
    const allDone = rows.length > 0 && done >= rows.length;
    Alert.alert(
      allDone ? '🏆 Coding Champion!' : '🏆 The Champion stage',
      allDone
        ? 'You cleared every stage — amazing work!'
        : 'Finish every lesson to become the Coding Champion!',
    );
  };

  // ── A lesson is open: immersive mode (only the top bar stays) ──
  if (openLesson) {
    return (
      <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
        <TopBar />
        <CodingLessonScreen
          lesson={openLesson.lesson}
          node={openLesson.node}
          playful={playful}
          onClose={() => { setOpenLesson(null); load(true); }}
          onProgressChanged={() => load(true)}
        />
      </View>
    );
  }

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
        {/* Identity strip — the web's slim coding brand row */}
        <View style={[styles.brandCard, { borderRadius: tokens.radius }]}>
          {playful && <Text style={{ fontSize: 32 }}>🦄</Text>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.brandTitle}>ShuleOne Coding</Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              {playful ? `Hi ${firstName}! Ready for today’s adventure? 🌟` : `Welcome back, ${firstName}.`}
            </Text>
          </View>
          <View style={styles.coins}>
            <Text style={styles.coin}>⭐ {done}</Text>
            <Text style={styles.coin}>🏅 {pct}%</Text>
            {playful && <Text style={styles.coin}>💎 {done * 10}</Text>}
          </View>
        </View>

        {/* Section pills */}
        <View style={styles.sectionTabs}>
          {SECTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.8}
              onPress={() => setSection(s.key)}
              style={[styles.sectionTab, section === s.key && { backgroundColor: tokens.accent1, borderColor: tokens.accent1 }]}
            >
              <Text style={styles.sectionTabIcon}>{s.icon}</Text>
              <Text style={[styles.sectionTabText, section === s.key && { color: '#fff' }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {failed && (
          <TouchableOpacity style={styles.errorRow} onPress={() => load(true)} activeOpacity={0.8}>
            <Text style={styles.errorText}>⚠️ Could not load your lessons — tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* ═══ 🗺️ LESSONS ═══ */}
        {section === 'lessons' && (
          <>
            {today && (
              <TouchableOpacity activeOpacity={0.9} onPress={() => open(today)}>
                <LinearGradient
                  colors={[SHARED.orange1, SHARED.pink1]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.todayBanner, { borderRadius: tokens.radius }]}
                >
                  <Text style={{ fontSize: 26 }}>🔔</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.todayKick}>📣 TODAY’S LESSON — JOIN IN!</Text>
                    <Text style={styles.todayTitle} numberOfLines={1}>
                      Lesson {today.lessonNumber}: {today.title}
                    </Text>
                  </View>
                  <Text style={styles.todayGo}>Jump in ›</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {rows.length === 0 && !failed ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 44 }}>🌱</Text>
                <Text style={styles.emptyTitle}>No coding lessons for your grade yet</Text>
                <Text style={styles.emptyText}>Check back soon!</Text>
              </View>
            ) : (
              <View style={[styles.lessonCard, { borderRadius: tokens.radius }]}>
                {rows.map((r, i) => {
                  const state = r.quizPassed || r.status === 'COMPLETED' ? 'done'
                    : r.available ? 'cur' : 'lock';
                  return (
                    <TouchableOpacity
                      key={r.lessonId}
                      activeOpacity={0.75}
                      onPress={() => open(r)}
                      disabled={opening}
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
                          <Text style={[styles.numBubbleText, { color: C.faint }]}>🔒</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.lessonTitle, state === 'lock' && { color: C.faint }]} numberOfLines={1}>
                          {r.title ?? `Lesson ${r.lessonNumber}`}
                        </Text>
                        <Text style={styles.lessonSub} numberOfLines={1}>
                          {state === 'done' ? 'completed ✨' : state === 'cur' ? 'tap to open' : 'locked'}
                          {r.teacherOpen && state !== 'done' ? ' · 📣 open in class' : ''}
                        </Text>
                      </View>
                      {r.hasQuiz && r.lastQuizPercent != null && (
                        <View style={[styles.quizChip, { backgroundColor: r.quizPassed ? '#eafef3' : '#fff3da' }]}>
                          <Text style={[styles.quizChipText, { color: r.quizPassed ? '#0fae78' : '#b45309' }]}>
                            {r.lastQuizPercent}%
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Boss / champion node */}
                <TouchableOpacity activeOpacity={0.8} onPress={openBoss}
                  style={[styles.lessonRow, styles.lessonRowLine]}>
                  <LinearGradient colors={['#f4a716', '#ff9d2e']} style={[styles.numBubble, { width: 42, height: 42, borderRadius: 21 }]}>
                    <Text style={{ fontSize: 19 }}>🏆</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle}>Coding Champion</Text>
                    <Text style={styles.lessonSub}>
                      {done >= rows.length && rows.length > 0 ? 'You made it! 🎉' : 'Clear every stage to claim it'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {opening && (
              <View style={styles.openingRow}>
                <ActivityIndicator color={tokens.accent1} />
                <Text style={styles.openingText}>Opening lesson…</Text>
              </View>
            )}
          </>
        )}

        {/* ═══ 🎮 PLAYGROUND ═══ */}
        {section === 'playground' && (
          <PlaygroundSection radius={tokens.radius} />
        )}

        {/* ═══ 🏅 EXAMS ═══ */}
        {section === 'exams' && (
          <CodingExamsSection studentId={profile?.studentId ?? null} />
        )}

        {/* ═══ 🏆 PROGRESS ═══ */}
        {section === 'progress' && (
          <ProgressSection rows={rows} onGoToLessons={() => setSection('lessons')} />
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// =================================================================
// 🎮 Playground — the web PlaygroundTab: language chip picker + the
// selected workspace. Where the app has its own editor screen the
// workspace opens it; the rest run on the classroom computer.
// =================================================================
const PlaygroundSection: React.FC<{ radius: number }> = ({ radius }) => {
  const [kind, setKind] = useState(PG_KINDS[0].kind);
  const k = PG_KINDS.find((x) => x.kind === kind) ?? PG_KINDS[0];

  return (
    <View>
      <Text style={styles.pgTitle}>🎮 Playground</Text>
      <Text style={styles.pgSub}>Pick a language and start building — no lesson needed.</Text>

      <View style={styles.pgPicker}>
        {PG_KINDS.map((x) => (
          <TouchableOpacity
            key={x.kind}
            activeOpacity={0.8}
            onPress={() => setKind(x.kind)}
            style={[styles.pgChip, kind === x.kind && styles.pgChipOn]}
          >
            <Text style={styles.pgChipIcon}>{x.icon}</Text>
            <Text style={[styles.pgChipText, kind === x.kind && { color: '#fff' }]}>{x.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <LinearGradient colors={k.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.pgWorkspace, { borderRadius: radius }]}>
        <Text style={{ fontSize: 44 }}>{k.icon}</Text>
        <Text style={styles.pgWsTitle}>{k.label} workspace</Text>
        <Text style={styles.pgWsLang}>{k.language}</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/student/playground?kind=${k.kind}` as any)}
          style={styles.pgOpenBtn}
        >
          <Text style={[styles.pgOpenText, { color: k.colors[0] }]}>Open the editor ▶</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

// =================================================================
// 🏆 Progress — the web ProgressTab: ring, stat chips, next-up, dots.
// =================================================================
const ProgressSection: React.FC<{ rows: CodingProgressRow[]; onGoToLessons: () => void }> = ({ rows, onGoToLessons }) => {
  if (!rows.length) {
    return (
      <View style={styles.empty}>
        <Text style={{ fontSize: 42 }}>🧭</Text>
        <Text style={styles.emptyTitle}>No adventure yet</Text>
        <Text style={styles.emptyText}>Your class isn’t mapped to a coding grade.</Text>
      </View>
    );
  }

  const total = rows.length;
  const doneRows = rows.filter((r) => r.quizPassed || r.status === 'COMPLETED');
  const done = doneRows.length;
  const inProgress = rows.filter((r) => r.available && !(r.quizPassed || r.status === 'COMPLETED')).length;
  const locked = rows.filter((r) => !r.available).length;
  const pct = total ? Math.round((100 * done) / total) : 0;
  const current = rows.find((r) => r.available && !(r.quizPassed || r.status === 'COMPLETED')) ?? null;
  const scores = rows.map((r) => r.lastQuizPercent).filter((x): x is number => x != null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const headline = pct === 0 ? 'Your coding adventure awaits! 🚀'
    : pct >= 100 ? 'Quest complete — you’re a Coding Champion! 🏆'
    : pct >= 50 ? 'Over halfway — keep going! 🔥'
    : 'You’re on your way! 💪';

  return (
    <View>
      <View style={styles.cpHero}>
        <View style={[styles.cpRing, { borderColor: pct >= 100 ? '#15c08a' : '#e91e63' }]}>
          <Text style={styles.cpRingPct}>{pct}%</Text>
          <Text style={styles.cpRingLbl}>complete</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cpH}>{headline}</Text>
          <Text style={styles.cpSub}>{done} of {total} stages cleared. {pct >= 100 ? 'Amazing work.' : 'One stage at a time.'}</Text>
          <TouchableOpacity activeOpacity={0.85} onPress={onGoToLessons}>
            <LinearGradient colors={['#e91e63', '#ff8fc0']} style={styles.cpCta}>
              <Text style={styles.cpCtaText}>{current ? 'Continue the quest →' : 'Open the map →'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cpStats}>
        <CpStat icon="⭐" value={done} label="Stars earned" />
        <CpStat icon="🎯" value={inProgress} label="In progress" />
        <CpStat icon="🔒" value={locked} label="Locked" />
        <CpStat icon="📊" value={avgScore == null ? '—' : `${avgScore}%`} label="Avg quiz" />
      </View>

      {current && (
        <View style={styles.cpNext}>
          <Text style={styles.cpNextH}>🚩 Next up</Text>
          <View style={styles.cpNextRow}>
            <View style={styles.cpNextNum}><Text style={styles.cpNextNumText}>{current.lessonNumber}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cpNextTitle} numberOfLines={1}>{current.title}</Text>
              <Text style={styles.cpNextSub}>Stage {current.lessonNumber} of {total}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={onGoToLessons}>
              <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.cpGo}>
                <Text style={styles.cpGoText}>Go ›</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.cpTrackWrap}>
        <Text style={styles.cpTrackH}>Your stages</Text>
        <View style={styles.cpTrack}>
          {rows.map((r) => {
            const isDone = r.quizPassed || r.status === 'COMPLETED';
            const color = isDone ? '#15c98c' : r.available ? '#ff9d2e' : '#d9d4ee';
            return <View key={r.lessonId} style={[styles.cpDot, { backgroundColor: color }]} />;
          })}
        </View>
      </View>
    </View>
  );
};

const CpStat: React.FC<{ icon: string; value: number | string; label: string }> = ({ icon, value, label }) => (
  <View style={styles.cpStat}>
    <Text style={{ fontSize: 17 }}>{icon}</Text>
    <Text style={styles.cpStatV}>{value}</Text>
    <Text style={styles.cpStatL}>{label}</Text>
  </View>
);

// =================================================================
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: S.inkSoft, marginTop: 14, fontWeight: '600' },
  scroll: { padding: 16 },

  brandCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: S.card, padding: 13,
    borderWidth: 1.5, borderColor: S.line,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  brandTitle: { fontSize: 15.5, fontWeight: '800', color: S.ink },
  brandSub: { fontSize: 11.5, color: S.inkSoft, fontWeight: '600', marginTop: 2 },
  coins: { gap: 4, alignItems: 'flex-end' },
  coin: {
    fontSize: 10.5, fontWeight: '800', color: S.ink,
    backgroundColor: S.soft, borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
  },

  sectionTabs: { flexDirection: 'row', gap: 7, marginTop: 12, marginBottom: 14, flexWrap: 'wrap' },
  sectionTab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  sectionTabIcon: { fontSize: 12 },
  sectionTabText: { fontSize: 12, fontWeight: '800', color: S.inkSoft },

  errorRow: { backgroundColor: S.badSoft, borderRadius: 14, padding: 12, marginBottom: 12 },
  errorText: { color: '#b91c1c', fontWeight: '700', fontSize: 12.5 },

  todayBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginBottom: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16, shadowRadius: 10, elevation: 3,
  },
  todayKick: { color: 'rgba(255,255,255,0.92)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7 },
  todayTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  todayGo: { color: '#fff', fontWeight: '800', fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 15.5, fontWeight: '800', color: S.ink, marginTop: 8, textAlign: 'center' },
  emptyText: { fontSize: 12.5, color: S.inkSoft, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  lessonCard: {
    backgroundColor: S.card,
    borderWidth: 1.5, borderColor: S.line,
    paddingHorizontal: 14, paddingVertical: 4,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  lessonRowLine: { borderTopWidth: 1, borderTopColor: S.divider },
  numBubble: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  numBubbleText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lessonTitle: { fontSize: 13.5, fontWeight: '800', color: S.ink },
  lessonSub: { fontSize: 11, color: S.inkSoft, fontWeight: '600', marginTop: 2 },
  quizChip: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  quizChipText: { fontSize: 11.5, fontWeight: '800' },
  openingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12 },
  openingText: { fontSize: 12, color: S.inkSoft, fontWeight: '700' },

  pgTitle: { fontSize: 16.5, fontWeight: '800', color: S.ink },
  pgSub: { fontSize: 12.5, color: S.inkSoft, fontWeight: '600', marginTop: 3, marginBottom: 12 },
  pgPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pgChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  pgChipOn: { backgroundColor: '#7c5cff', borderColor: '#7c5cff' },
  pgChipIcon: { fontSize: 12 },
  pgChipText: { fontSize: 12, fontWeight: '800', color: S.ink },
  pgWorkspace: {
    alignItems: 'center', padding: 24,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  pgWsTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 10 },
  pgWsLang: { color: 'rgba(255,255,255,0.92)', fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  pgOpenBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 11, marginTop: 16,
  },
  pgOpenText: { fontWeight: '800', fontSize: 13.5 },
  pgWsNote: {
    color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '600',
    textAlign: 'center', lineHeight: 17, marginTop: 14, paddingHorizontal: 10,
  },

  // Progress section
  cpHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: S.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: S.line,
    padding: 16,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  cpRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  cpRingPct: { fontSize: 17, fontWeight: '800', color: S.ink },
  cpRingLbl: { fontSize: 9, fontWeight: '700', color: S.inkSoft },
  cpH: { fontSize: 14.5, fontWeight: '800', color: S.ink, lineHeight: 20 },
  cpSub: { fontSize: 11.5, color: S.inkSoft, fontWeight: '600', marginTop: 3 },
  cpCta: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 9 },
  cpCtaText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  cpStats: { flexDirection: 'row', gap: 9, marginTop: 12 },
  cpStat: {
    flex: 1, alignItems: 'center',
    backgroundColor: S.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: S.line,
    paddingVertical: 11,
  },
  cpStatV: { fontSize: 16, fontWeight: '800', color: S.ink, marginTop: 2 },
  cpStatL: { fontSize: 9.5, color: S.inkSoft, fontWeight: '700', marginTop: 1 },

  cpNext: {
    backgroundColor: S.card, borderRadius: 18,
    borderWidth: 1.5, borderColor: S.line,
    padding: 14, marginTop: 12,
  },
  cpNextH: { fontSize: 12, fontWeight: '800', color: S.inkSoft, marginBottom: 9 },
  cpNextRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cpNextNum: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: S.ring,
    alignItems: 'center', justifyContent: 'center',
  },
  cpNextNumText: { fontSize: 15, fontWeight: '800', color: '#7c5cff' },
  cpNextTitle: { fontSize: 13.5, fontWeight: '800', color: S.ink },
  cpNextSub: { fontSize: 11, color: S.inkSoft, fontWeight: '600', marginTop: 1 },
  cpGo: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  cpGoText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },

  cpTrackWrap: {
    backgroundColor: S.card, borderRadius: 18,
    borderWidth: 1.5, borderColor: S.line,
    padding: 14, marginTop: 12,
  },
  cpTrackH: { fontSize: 12, fontWeight: '800', color: S.inkSoft, marginBottom: 10 },
  cpTrack: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  cpDot: { width: 16, height: 16, borderRadius: 8 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

