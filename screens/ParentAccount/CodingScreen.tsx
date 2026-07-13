// Parent Coding & Robotics — REAL data, read-only (parent monitors; child plays).
// Mirrors the web parent CodingPage: three tabs so a parent can genuinely FOLLOW
// the journey —
//   Journey       — pathway hero + per-lesson roadmap + XP / class-rank chips.
//   Class reports — the tutor's finalized session write-ups (what was taught,
//                   skills covered, what's next).
//   Showcase      — the child's actual work: web projects render LIVE in a
//                   WebView, other languages show the handed-in code, Scratch
//                   projects share as .sb3 for the ShuleOne Scratch site.
// Everything shown is real backend data (GuardianCodingController).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ParentHeader } from '../../components/ParentHeader';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import {
  CodingLessonSummary, CodingLessonProgress, CodingClassReport, CodingStats,
  CodingSubmission,
  getChildCodingLessons, getChildCodingProgress, getChildCodingReports,
  getChildCodingStats, getChildCodingSubmission, getChildCodingProject,
} from '../../api/guardian';
import { shareBase64File } from '../../utils/shareBase64File';

// The dedicated ShuleOne Scratch site — always linkable from a saved project.
const SCRATCH_PAGE_URL = 'https://shuleonescratch.shule.co.ke/';

type TabKey = 'journey' | 'reports' | 'showcase';

interface RoadmapRow {
  id: number;
  number: number | null;
  title: string;
  objective: string | null;
  sandboxKind: string | null;
  status: string;
  available: boolean;
  hasQuiz: boolean;
  quizPassed: boolean;
  lastQuizPercent: number | null;
  teacherScore: number | null;
  graded: boolean;
}

const STATUS_META: Record<string, { label: string; icon: any; dot: string }> = {
  COMPLETED:   { label: 'Completed',   icon: 'trophy',       dot: '#059669' },
  IN_PROGRESS: { label: 'In progress', icon: 'play-circle',  dot: '#DB2777' },
  AVAILABLE:   { label: 'Available',   icon: 'checkmark-circle', dot: '#2563EB' },
  LOCKED:      { label: 'Locked',      icon: 'lock-closed',  dot: '#A1A1AA' },
};
const statusMeta = (s?: string | null) => STATUS_META[String(s || '').toUpperCase()] || STATUS_META.AVAILABLE;

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtEpoch = (ms?: number | null) => {
  if (!ms) return '';
  const d = new Date(Number(ms));
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const CodingScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild: child } = useSelectedChild();
  const { accessToken } = useAuth();

  const studentId = child?.studentId ?? null;
  const childName = child?.firstName || 'your child';
  const hasCoding = !!child && (child.codingSchool || child.codingOnly);
  const codingSource = child?.codingSchool ? 'school' : 'direct';

  const [tab, setTab] = useState<TabKey>('journey');
  const [lessons, setLessons] = useState<CodingLessonSummary[]>([]);
  const [progress, setProgress] = useState<CodingLessonProgress[]>([]);
  const [stats, setStats] = useState<CodingStats | null>(null);
  const [reports, setReports] = useState<CodingClassReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    const [l, p, s, r] = await Promise.allSettled([
      getChildCodingLessons(accessToken, studentId),
      getChildCodingProgress(accessToken, studentId),
      getChildCodingStats(accessToken, studentId),
      getChildCodingReports(accessToken, studentId, 12),
    ]);
    setLessons(l.status === 'fulfilled' && Array.isArray(l.value) ? l.value : []);
    setProgress(p.status === 'fulfilled' && Array.isArray(p.value) ? p.value : []);
    setStats(s.status === 'fulfilled' && s.value ? s.value : null);
    setReports(r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
    setLoading(false);
    setRefreshing(false);
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Merge: progress drives the roadmap (status + scores); lessons add objective + sandbox kind.
  const roadmap: RoadmapRow[] = useMemo(() => {
    const byId = new Map(lessons.map((l) => [l.id, l]));
    const rows: RoadmapRow[] = progress.map((p) => ({
      id: p.lessonId,
      number: p.lessonNumber,
      title: p.title || 'Lesson',
      objective: byId.get(p.lessonId)?.objective || null,
      sandboxKind: byId.get(p.lessonId)?.sandboxKind || null,
      status: String(p.status || 'AVAILABLE').toUpperCase(),
      available: !!p.available,
      hasQuiz: !!p.hasQuiz,
      quizPassed: !!p.quizPassed,
      lastQuizPercent: p.lastQuizPercent,
      teacherScore: p.teacherScore,
      graded: !!p.graded,
    }));
    if (!rows.length && lessons.length) {
      return lessons.map((l) => ({
        id: l.id, number: l.lessonNumber, title: l.title || 'Lesson', objective: l.objective,
        sandboxKind: l.sandboxKind, status: 'AVAILABLE', available: true, hasQuiz: false,
        quizPassed: false, lastQuizPercent: null, teacherScore: null, graded: false,
      }));
    }
    return rows.sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [lessons, progress]);

  const total = roadmap.length;
  const completed = roadmap.filter((r) => r.status === 'COMPLETED').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const current = roadmap.find((r) => r.status === 'IN_PROGRESS')
    || roadmap.find((r) => r.status !== 'COMPLETED' && r.available)
    || roadmap.find((r) => r.status !== 'COMPLETED')
    || roadmap[roadmap.length - 1]
    || null;

  return (
    <View style={styles.root}>
      <ParentHeader title="Coding & Robotics" showBack rightIcon="none" />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : studentId == null ? (
        <View style={styles.center}>
          <Ionicons name="person-add-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>Select a child to see their coding & robotics.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {total === 0 ? (
            // No coding lessons for this child yet.
            <View style={styles.emptyBox}>
              <View style={[styles.emptyBadge, { backgroundColor: '#10B9811F' }]}>
                <MaterialCommunityIcons name="code-tags" size={26} color="#059669" />
              </View>
              {hasCoding ? (
                <>
                  <Text style={styles.emptyTitle}>Coding & Robotics is set up for {childName}</Text>
                  <Text style={styles.emptyText}>
                    {codingSource === 'school'
                      ? `${childName} takes coding & robotics with Educraft tutors at school. Lesson progress will appear here once it's recorded.`
                      : `Lessons will appear here as soon as ${childName} begins.`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Add Coding & Robotics for {childName}</Text>
                  <Text style={styles.emptyText}>
                    Hands-on coding & robotics — from block coding to real robots — guided by Educraft tutors.
                  </Text>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/subscriptions' as any)}>
                    <LinearGradient colors={['#9264FF', '#DB2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upsellBtn}>
                      <Ionicons name="sparkles" size={15} color="#FFF" />
                      <Text style={styles.upsellBtnText}>Learn more</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <>
              {/* Pathway overview — current lesson, completion, and REAL standing chips. */}
              <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <View style={styles.heroIcon}>
                  <MaterialCommunityIcons name="code-tags" size={22} color="#FFF" />
                </View>
                <Text style={styles.heroKicker}>
                  {current && current.status === 'COMPLETED' ? 'PATHWAY COMPLETE' : 'CURRENT LESSON'}
                </Text>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {current ? `${current.number != null ? `Lesson ${current.number}: ` : ''}${current.title}` : 'Coding & Robotics'}
                </Text>
                {!!current?.objective && (
                  <Text style={styles.heroBody} numberOfLines={2}>{current.objective}</Text>
                )}
                <View style={styles.chipRow}>
                  <View style={styles.heroChip}>
                    <Ionicons name="flash" size={12} color="#FDE68A" />
                    <Text style={styles.heroChipText}>{stats?.xp ?? completed * 10} XP</Text>
                  </View>
                  {stats?.classRank != null && stats?.classSize != null && (
                    <View style={styles.heroChip}>
                      <Ionicons name="medal" size={12} color="#DDD6FE" />
                      <Text style={styles.heroChipText}>#{stats.classRank} of {stats.classSize} in class</Text>
                    </View>
                  )}
                  <View style={styles.heroChip}>
                    <Ionicons name="trophy" size={12} color="#A7F3D0" />
                    <Text style={styles.heroChipText}>{completed} lessons done</Text>
                  </View>
                </View>
                <View style={styles.heroProgressRow}>
                  <Text style={styles.heroProgressLabel}>Pathway progress</Text>
                  <Text style={styles.heroProgressPct}>{pct}%</Text>
                </View>
                <View style={styles.heroTrack}>
                  <View style={[styles.heroFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.heroProgressNote}>{completed} of {total} lessons completed</Text>
              </LinearGradient>

              {/* Tab strip */}
              <View style={styles.tabStrip}>
                {([
                  { key: 'journey', label: 'Journey' },
                  { key: 'reports', label: `Class reports${reports.length ? ` (${reports.length})` : ''}` },
                  { key: 'showcase', label: 'Showcase' },
                ] as { key: TabKey; label: string }[]).map((t) => (
                  <TouchableOpacity
                    key={t.key} activeOpacity={0.7} onPress={() => setTab(t.key)}
                    style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                  >
                    <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tab === 'journey' && (
                <JourneyTab styles={styles} colors={colors} roadmap={roadmap} studentId={studentId} childName={childName} accessToken={accessToken!} />
              )}
              {tab === 'reports' && (
                <ReportsTab styles={styles} colors={colors} reports={reports} childName={childName} />
              )}
              {tab === 'showcase' && (
                <ShowcaseTab styles={styles} colors={colors} roadmap={roadmap} studentId={studentId} childName={childName} accessToken={accessToken!} />
              )}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
};

// ---- Journey: the per-lesson roadmap — every row expands to show the detail ----------
const JourneyTab: React.FC<{
  styles: any; colors: ColorPalette; roadmap: RoadmapRow[]; studentId: number; childName: string; accessToken: string;
}> = ({ styles, colors, roadmap, studentId, childName, accessToken }) => {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <View>
      {roadmap.map((r) => {
        const meta = statusMeta(r.status);
        const open = openId === r.id;
        return (
          <View key={r.id} style={styles.lessonCard}>
            <TouchableOpacity style={styles.lessonHead} activeOpacity={0.7} onPress={() => setOpenId(open ? null : r.id)}>
              <View style={[styles.lessonIcon, { backgroundColor: meta.dot + '1F' }]}>
                <Ionicons name={meta.icon} size={17} color={meta.dot} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lessonTitle} numberOfLines={1}>
                  {r.number != null ? <Text style={{ color: colors.textTertiary }}>L{r.number} · </Text> : null}{r.title}
                </Text>
                <View style={styles.lessonMetaRow}>
                  <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
                  <Text style={[styles.lessonStatus, { color: meta.dot }]}>{meta.label}</Text>
                  {r.graded && r.teacherScore != null && (
                    <Text style={styles.lessonScore}>  🏅 {r.teacherScore}%</Text>
                  )}
                  {!r.graded && r.hasQuiz && r.lastQuizPercent != null && (
                    <Text style={styles.lessonScore}>  Quiz {r.lastQuizPercent}%</Text>
                  )}
                </View>
              </View>
              <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            {open && (
              <LessonDetail styles={styles} colors={colors} row={r} studentId={studentId} childName={childName} accessToken={accessToken} />
            )}
          </View>
        );
      })}
      <Text style={styles.footNote}>
        {childName} works through these lessons in their own account — this is a read-only view of their progress.
      </Text>
    </View>
  );
};

/** The expanded lesson: what it was about, how it was scored, and the child's work. */
const LessonDetail: React.FC<{
  styles: any; colors: ColorPalette; row: RoadmapRow; studentId: number; childName: string; accessToken: string;
}> = ({ styles, colors, row, studentId, childName, accessToken }) => {
  const started = row.status === 'COMPLETED' || row.status === 'IN_PROGRESS';
  return (
    <View style={styles.lessonDetail}>
      {(row.objective || row.hasQuiz || row.graded) && (
        <View style={styles.lessonFacts}>
          {!!row.objective && (
            <Text style={styles.factText}>
              <Text style={styles.factLabel}>This lesson: </Text>{row.objective}
            </Text>
          )}
          {row.hasQuiz && (
            <Text style={styles.factText}>
              <Text style={styles.factLabel}>Challenge quiz: </Text>
              {row.lastQuizPercent != null
                ? `${row.lastQuizPercent}%${row.quizPassed ? ' · passed ✓' : ''}`
                : 'not attempted yet'}
            </Text>
          )}
          {row.graded && row.teacherScore != null && (
            <Text style={styles.factText}>
              <Text style={styles.factLabel}>Teacher’s mark: </Text>{row.teacherScore}%
            </Text>
          )}
        </View>
      )}
      {started ? (
        <LessonWork styles={styles} colors={colors} row={row} studentId={studentId} accessToken={accessToken} />
      ) : (
        <Text style={[styles.factText, { padding: 13 }]}>
          {row.status === 'LOCKED'
            ? 'This lesson unlocks after the earlier ones — nothing here yet.'
            : `${childName} hasn't started this lesson yet.`}
        </Text>
      )}
    </View>
  );
};

// ---- Class reports: the tutor's finalized session write-ups --------------------------
const ReportsTab: React.FC<{
  styles: any; colors: ColorPalette; reports: CodingClassReport[]; childName: string;
}> = ({ styles, colors, reports, childName }) => {
  if (!reports.length) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="calendar-outline" size={34} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No class reports yet</Text>
        <Text style={styles.emptyText}>
          After each coding & robotics class, {childName}’s tutor writes up what was covered. Those reports will appear here.
        </Text>
      </View>
    );
  }
  return (
    <View>
      {reports.map((r) => (
        <View key={r.id} style={styles.reportCard}>
          <View style={styles.reportHead}>
            <View style={[styles.lessonIcon, { backgroundColor: colors.purple + '1F' }]}>
              <Ionicons name="calendar" size={17} color={colors.purple} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.reportTopic}>{r.topic || 'Class session'}</Text>
              <Text style={styles.reportMeta} numberOfLines={1}>
                {[fmtDate(r.sessionDate), [r.className, r.streamName].filter(Boolean).join(' ')].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
          </View>
          {!!r.lessonTitle && <Text style={styles.reportLesson}>Curriculum lesson: {r.lessonTitle}</Text>}
          {!!r.summary && <Text style={styles.reportSummary}>{r.summary}</Text>}
          {!!r.skillsCovered && (
            <Text style={styles.factText}><Text style={styles.factLabel}>Skills covered: </Text>{r.skillsCovered}</Text>
          )}
          {!!r.nextFocus && (
            <Text style={[styles.factText, { marginTop: 4 }]}><Text style={styles.factLabel}>Coming next: </Text>{r.nextFocus}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

// ---- Showcase: the child's actual work -----------------------------------------------
const ShowcaseTab: React.FC<{
  styles: any; colors: ColorPalette; roadmap: RoadmapRow[]; studentId: number; childName: string; accessToken: string;
}> = ({ styles, colors, roadmap, studentId, childName, accessToken }) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const candidates = roadmap.filter((r) => r.status === 'COMPLETED' || r.status === 'IN_PROGRESS');

  if (!candidates.length) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="sparkles-outline" size={34} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>Nothing to show yet</Text>
        <Text style={styles.emptyText}>
          As soon as {childName} starts building and hands work in, their projects will appear here for you to explore.
        </Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={[styles.footNote, { marginTop: 0, marginBottom: 12 }]}>
        {childName}’s hands-on work, straight from their lessons. Web projects are interactive — open one and try it.
      </Text>
      {candidates.map((r) => {
        const open = openId === r.id;
        const kindLabel = r.sandboxKind === 'SCRATCH' || r.sandboxKind === 'BLOCKS' ? 'Scratch'
          : r.sandboxKind === 'WEB' ? 'Web' : (r.sandboxKind || 'Code');
        return (
          <View key={r.id} style={styles.lessonCard}>
            <TouchableOpacity style={styles.lessonHead} activeOpacity={0.7} onPress={() => setOpenId(open ? null : r.id)}>
              <View style={[styles.lessonIcon, { backgroundColor: colors.primary + '1F' }]}>
                <MaterialCommunityIcons name="code-tags" size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.lessonTitle} numberOfLines={1}>
                  {r.number != null ? <Text style={{ color: colors.textTertiary }}>L{r.number} · </Text> : null}{r.title}
                </Text>
                <Text style={styles.reportMeta}>{kindLabel} project · tap to {open ? 'close' : 'view'}</Text>
              </View>
              <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            {open && (
              <View style={styles.lessonDetail}>
                <LessonWork styles={styles} colors={colors} row={r} studentId={studentId} accessToken={accessToken} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

/**
 * Loads and renders the child's actual work for a lesson (lazily, on first open):
 * Scratch -> saved .sb3 (share / open Scratch site); anything else -> latest handed-in
 * submission (web renders live in a WebView, other languages show the code).
 * Shared by Journey and Showcase.
 */
const LessonWork: React.FC<{
  styles: any; colors: ColorPalette; row: RoadmapRow; studentId: number; accessToken: string;
}> = ({ styles, colors, row, studentId, accessToken }) => {
  const isScratch = row.sandboxKind === 'SCRATCH' || row.sandboxKind === 'BLOCKS';
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [submission, setSubmission] = useState<CodingSubmission | null>(null);
  const [sb3, setSb3] = useState<string | null>(null);

  // Fetch once per mount — the row identity never changes while an expanded
  // panel is open, so the initial 'loading' state covers the whole cycle.
  useEffect(() => {
    let cancelled = false;
    const load = isScratch
      ? getChildCodingProject(accessToken, studentId, row.id).then((p) => {
          if (cancelled) return;
          if (p?.sb3Base64) { setSb3(p.sb3Base64); setState('ready'); } else setState('empty');
        })
      : getChildCodingSubmission(accessToken, studentId, row.id).then((w) => {
          if (cancelled) return;
          if (w) { setSubmission(w); setState('ready'); } else setState('empty');
        });
    load.catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [isScratch, accessToken, studentId, row.id]);

  if (state === 'loading') {
    return <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (state === 'error') {
    return <Text style={[styles.factText, { padding: 13 }]}>Couldn’t load this project — try again later.</Text>;
  }
  if (state === 'empty') {
    return (
      <Text style={[styles.factText, { padding: 13 }]}>
        {isScratch
          ? 'No Scratch project saved for this lesson yet — it will appear here once saved in the editor.'
          : 'Nothing handed in for this lesson yet — it will appear here as soon as work is submitted.'}
      </Text>
    );
  }
  return isScratch
    ? <ScratchWork styles={styles} sb3Base64={sb3!} title={row.title} />
    : <SubmissionWork styles={styles} colors={colors} submission={submission!} />;
};

/** A handed-in code submission: web renders live in a WebView; anything else shows the code. */
const SubmissionWork: React.FC<{ styles: any; colors: ColorPalette; submission: CodingSubmission }> =
  ({ styles, colors, submission }) => {
  const [big, setBig] = useState(false);
  const isWeb = /html/i.test(submission.language || '') || /<\w+[^>]*>/.test(submission.content || '');
  return (
    <View>
      {isWeb ? (
        <View>
          <View style={[styles.webviewBox, { height: big ? 480 : 280 }]}>
            <WebView
              originWhitelist={['*']}
              source={{ html: submission.content || '' }}
              style={{ flex: 1, backgroundColor: '#FFF' }}
              javaScriptEnabled
              setSupportMultipleWindows={false}
            />
          </View>
          <TouchableOpacity style={styles.expandBtn} activeOpacity={0.7} onPress={() => setBig((b) => !b)}>
            <Feather name={big ? 'minimize-2' : 'maximize-2'} size={13} color={colors.textSecondary} />
            <Text style={styles.expandBtnText}>{big ? 'Shrink preview' : 'Expand preview'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.codeBox} nestedScrollEnabled>
          <Text style={styles.codeText}>{submission.content || '(empty submission)'}</Text>
        </ScrollView>
      )}
      <View style={styles.workMetaRow}>
        {!!submission.language && <Text style={styles.workMeta}>{String(submission.language).toUpperCase()}</Text>}
        {!!submission.submittedAt && <Text style={styles.workMeta}>Handed in {fmtEpoch(submission.submittedAt)}</Text>}
        {submission.score != null && (
          <Text style={[styles.workMeta, { fontFamily: fonts.bold }]}>
            🏅 {submission.score}{submission.maxScore ? `/${submission.maxScore}` : ''}
          </Text>
        )}
      </View>
      {!!submission.feedback && <Text style={[styles.factText, { paddingHorizontal: 13, paddingBottom: 12 }]}>💬 {submission.feedback}</Text>}
    </View>
  );
};

/**
 * A saved Scratch project. Phones can't run the Scratch player in-app, so this is the
 * honest fallback the web uses without a hosted player: share the .sb3 file, and link
 * to the ShuleOne Scratch site where it can be loaded and run.
 */
const ScratchWork: React.FC<{ styles: any; sb3Base64: string; title: string }> = ({ styles, sb3Base64, title }) => {
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareBase64File(sb3Base64, `${(title || 'scratch-project').replace(/[^\w.-]+/g, '-')}.sb3`, 'application/octet-stream');
    } finally {
      setSharing(false);
    }
  };
  return (
    <View style={{ padding: 13 }}>
      <Text style={styles.factText}>
        This is a Scratch project — it’s a game/animation, so it needs the Scratch player.
        Save the file, then open ShuleOne Scratch and load it to watch it run.
      </Text>
      <View style={styles.scratchBtnRow}>
        <TouchableOpacity activeOpacity={0.85} onPress={share} disabled={sharing}>
          <LinearGradient colors={['#FF8A3D', '#FF5E9C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scratchBtn}>
            <Ionicons name="download-outline" size={15} color="#FFF" />
            <Text style={styles.scratchBtnText}>{sharing ? 'Preparing…' : 'Save project (.sb3)'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scratchLinkBtn} activeOpacity={0.7} onPress={() => Linking.openURL(SCRATCH_PAGE_URL)}>
          <Text style={styles.scratchLinkText}>Open ShuleOne Scratch ↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },

    hero: {
      borderRadius: 20, padding: 18, marginBottom: 16,
      shadowColor: '#059669', shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 18, elevation: 8,
    },
    heroIcon: {
      width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 1 },
    heroTitle: { color: '#FFF', fontSize: 19, fontFamily: fonts.extrabold, letterSpacing: -0.4, marginTop: 4, lineHeight: 24 },
    heroBody: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, fontFamily: fonts.regular, marginTop: 5, lineHeight: 18 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    heroChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    heroChipText: { color: '#FFF', fontSize: 11, fontFamily: fonts.bold },
    heroProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 5 },
    heroProgressLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: fonts.medium },
    heroProgressPct: { color: '#FFF', fontSize: 11, fontFamily: fonts.extrabold },
    heroTrack: { height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
    heroFill: { height: '100%', borderRadius: 999, backgroundColor: '#FFF' },
    heroProgressNote: { color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontFamily: fonts.regular, marginTop: 5 },

    tabStrip: {
      flexDirection: 'row', gap: 6, backgroundColor: c.backgroundAlt,
      borderRadius: 12, padding: 4, marginBottom: 16,
    },
    tabBtn: { flex: 1, borderRadius: 9, paddingVertical: 8, alignItems: 'center' },
    tabBtnActive: { backgroundColor: c.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    tabBtnText: { fontSize: 12, fontFamily: fonts.semibold, color: c.textTertiary },
    tabBtnTextActive: { color: c.text },

    lessonCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      marginBottom: 10, overflow: 'hidden',
    },
    lessonHead: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
    lessonIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    lessonTitle: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text },
    lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    lessonStatus: { fontSize: 11, fontFamily: fonts.bold },
    lessonScore: { fontSize: 11, fontFamily: fonts.semibold, color: c.textSecondary },

    lessonDetail: { borderTopWidth: 1, borderTopColor: c.border },
    lessonFacts: { padding: 13, gap: 5, backgroundColor: c.backgroundAlt },
    factText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18 },
    factLabel: { fontFamily: fonts.bold, color: c.text },

    reportCard: {
      backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 10,
    },
    reportHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    reportTopic: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    reportMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    reportLesson: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 8 },
    reportSummary: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 8, lineHeight: 19 },

    webviewBox: { backgroundColor: '#FFF', overflow: 'hidden' },
    expandBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 8, backgroundColor: c.backgroundAlt,
    },
    expandBtnText: { fontSize: 11.5, fontFamily: fonts.semibold, color: c.textSecondary },
    codeBox: { maxHeight: 280, backgroundColor: c.backgroundAlt, padding: 13 },
    codeText: { fontSize: 11.5, color: c.text, fontFamily: 'monospace', lineHeight: 17 },
    workMetaRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 13, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    workMeta: { fontSize: 11, fontFamily: fonts.semibold, color: c.textTertiary },

    scratchBtnRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 },
    scratchBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    },
    scratchBtnText: { color: '#FFF', fontSize: 12.5, fontFamily: fonts.bold },
    scratchLinkBtn: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
    },
    scratchLinkText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.text },

    footNote: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 8, lineHeight: 16 },

    emptyBox: {
      alignItems: 'center', padding: 30, gap: 8,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    },
    emptyBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: c.text, textAlign: 'center', marginTop: 4 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
    upsellBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8,
    },
    upsellBtnText: { color: '#FFF', fontSize: 13, fontFamily: fonts.bold },
  });
}
