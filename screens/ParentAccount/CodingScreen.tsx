// Parent Coding & Robotics — REAL data, read-only (parent monitors; child plays).
//
// Mobile-first design (deliberately different from the web page's tab layout):
// one scrolling story in brand rose —
//   1. "Now learning" card riding over the app bar: progress ring + current
//      lesson + XP / class-rank / lessons-done chips.
//   2. "Latest from class" — the tutor's newest write-up, with the rest one
//      tap away ("All reports").
//   3. "Journey" — a vertical timeline of numbered lesson nodes; tapping a
//      node expands quiz/teacher marks and the child's actual work.
//   4. "Showcase" — a horizontal rail of the child's projects; tapping one
//      opens the viewer below it (web projects run live in a WebView, code
//      shows inline, Scratch shares as .sb3).
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
import Svg, { Circle } from 'react-native-svg';
import { GradientAppBar } from '../../components/GradientAppBar';
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

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const fmtEpoch = (ms?: number | null) => {
  if (!ms) return '';
  const d = new Date(Number(ms));
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const kindLabelOf = (kind?: string | null) =>
  kind === 'SCRATCH' || kind === 'BLOCKS' ? 'Scratch' : kind === 'WEB' ? 'Web' : (kind || 'Code');
const kindIconOf = (kind?: string | null): any =>
  kind === 'SCRATCH' || kind === 'BLOCKS' ? 'puzzle-outline' : kind === 'WEB' ? 'web' : 'code-tags';

/** Progress ring with the percentage in the middle. */
const Ring: React.FC<{ pct: number; color: string; track: string; size?: number; stroke?: number; textColor: string }> =
  ({ pct, color, track, size = 60, stroke = 6, textColor }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: size * 0.24, fontFamily: fonts.extrabold, color: textColor }}>{Math.round(pct)}%</Text>
    </View>
  );
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

  const [lessons, setLessons] = useState<CodingLessonSummary[]>([]);
  const [progress, setProgress] = useState<CodingLessonProgress[]>([]);
  const [stats, setStats] = useState<CodingStats | null>(null);
  const [reports, setReports] = useState<CodingClassReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allReports, setAllReports] = useState(false);
  const [openLessonId, setOpenLessonId] = useState<number | null>(null);
  const [showcaseId, setShowcaseId] = useState<number | null>(null);

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

  // Merge: progress drives the timeline (status + scores); lessons add objective + sandbox kind.
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
  const showcaseRows = roadmap.filter((r) => r.status === 'COMPLETED' || r.status === 'IN_PROGRESS');
  const latestReport = reports[0] ?? null;
  const selectedShowcase = showcaseRows.find((r) => r.id === showcaseId) ?? null;

  return (
    <View style={styles.root}>
      <GradientAppBar title="Coding & Robotics" subtitle={`${childName}’s journey, classes & builds`} showBack />

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
            <View style={[styles.emptyBox, { marginTop: 16 }]}>
              <View style={[styles.emptyBadge, { backgroundColor: colors.primary + '1F' }]}>
                <MaterialCommunityIcons name="robot-outline" size={26} color={colors.primary} />
              </View>
              {hasCoding ? (
                <>
                  <Text style={styles.emptyTitle}>Coding & Robotics is set up for {childName}</Text>
                  <Text style={styles.emptyText}>
                    {codingSource === 'school'
                      ? `${childName} takes coding & robotics with Educraft tutors at school. Lesson progress will appear here once it’s recorded.`
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
                    <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upsellBtn}>
                      <Ionicons name="sparkles" size={15} color="#FFF" />
                      <Text style={styles.upsellBtnText}>Learn more</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <>
              {/* ── Now learning — rides over the app bar ─────────────────── */}
              <View style={styles.nowCard}>
                <View style={styles.nowTop}>
                  <Ring pct={pct} color={colors.primary} track={colors.backgroundAlt} textColor={colors.text} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.nowKicker}>
                      {current && current.status === 'COMPLETED' ? 'PATHWAY COMPLETE 🎉' : 'NOW LEARNING'}
                    </Text>
                    <Text style={styles.nowTitle} numberOfLines={2}>
                      {current ? `${current.number != null ? `L${current.number} · ` : ''}${current.title}` : 'Coding & Robotics'}
                    </Text>
                    {!!current?.objective && (
                      <Text style={styles.nowObjective} numberOfLines={2}>{current.objective}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.nowChips}>
                  <View style={[styles.chip, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="flash" size={12} color={colors.warning} />
                    <Text style={[styles.chipText, { color: colors.warning }]}>{stats?.xp ?? completed * 10} XP</Text>
                  </View>
                  {stats?.classRank != null && stats?.classSize != null && (
                    <View style={[styles.chip, { backgroundColor: colors.backgroundAlt }]}>
                      <Ionicons name="medal-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.chipText, { color: colors.textSecondary }]}>#{stats.classRank} of {stats.classSize}</Text>
                    </View>
                  )}
                  <View style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="trophy-outline" size={12} color={colors.primary} />
                    <Text style={[styles.chipText, { color: colors.primary }]}>{completed}/{total} done</Text>
                  </View>
                </View>
              </View>

              {/* ── Latest from class ─────────────────────────────────────── */}
              {latestReport && (
                <>
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Latest from class</Text>
                    {reports.length > 1 && (
                      <TouchableOpacity hitSlop={8} activeOpacity={0.7} onPress={() => setAllReports((v) => !v)}>
                        <Text style={styles.sectionAction}>
                          {allReports ? 'Show less' : `All reports (${reports.length})`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {(allReports ? reports : [latestReport]).map((r) => (
                    <View key={r.id} style={styles.reportCard}>
                      <View style={styles.reportHead}>
                        <View style={styles.reportDateChip}>
                          <Text style={styles.reportDateText}>{fmtDate(r.sessionDate)}</Text>
                        </View>
                        <Text style={styles.reportTopic} numberOfLines={2}>{r.topic || 'Class session'}</Text>
                      </View>
                      {!!r.summary && <Text style={styles.reportSummary}>{r.summary}</Text>}
                      {!!r.skillsCovered && (
                        <View style={styles.reportMetaRow}>
                          <Ionicons name="construct-outline" size={13} color={colors.primary} />
                          <Text style={styles.reportMetaText}><Text style={styles.reportMetaLabel}>Skills: </Text>{r.skillsCovered}</Text>
                        </View>
                      )}
                      {!!r.nextFocus && (
                        <View style={styles.reportMetaRow}>
                          <Ionicons name="arrow-forward-circle-outline" size={13} color={colors.primary} />
                          <Text style={styles.reportMetaText}><Text style={styles.reportMetaLabel}>Next: </Text>{r.nextFocus}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* ── Journey timeline ──────────────────────────────────────── */}
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Journey</Text>
              <View style={styles.timeline}>
                {roadmap.map((r, i) => {
                  const done = r.status === 'COMPLETED';
                  const active = r.status === 'IN_PROGRESS';
                  const locked = r.status === 'LOCKED';
                  const open = openLessonId === r.id;
                  const last = i === roadmap.length - 1;
                  return (
                    <View key={r.id} style={styles.timelineRow}>
                      {/* Node + connector */}
                      <View style={styles.nodeCol}>
                        <View style={[
                          styles.node,
                          done && { backgroundColor: colors.primary, borderColor: colors.primary },
                          active && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                          locked && { borderColor: colors.border, backgroundColor: colors.backgroundAlt },
                        ]}>
                          {done ? (
                            <Ionicons name="checkmark" size={14} color="#FFF" />
                          ) : locked ? (
                            <Ionicons name="lock-closed" size={11} color={colors.textTertiary} />
                          ) : (
                            <Text style={[styles.nodeNum, { color: active ? colors.primary : colors.textSecondary }]}>
                              {r.number ?? i + 1}
                            </Text>
                          )}
                        </View>
                        {!last && <View style={[styles.connector, done && { backgroundColor: colors.primary + '55' }]} />}
                      </View>

                      {/* Lesson card */}
                      <View style={[styles.lessonCard, active && { borderColor: colors.primary + '66' }]}>
                        <TouchableOpacity style={styles.lessonHead} activeOpacity={0.7}
                          onPress={() => setOpenLessonId(open ? null : r.id)}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.lessonTitle} numberOfLines={2}>{r.title}</Text>
                            <View style={styles.lessonMetaRow}>
                              <Text style={[styles.lessonStatus, {
                                color: done || active ? colors.primary : colors.textTertiary,
                              }]}>
                                {done ? 'Completed' : active ? 'In progress' : locked ? 'Locked' : 'Up next'}
                              </Text>
                              {r.graded && r.teacherScore != null && (
                                <Text style={styles.lessonScore}>🏅 {r.teacherScore}%</Text>
                              )}
                              {!r.graded && r.hasQuiz && r.lastQuizPercent != null && (
                                <Text style={styles.lessonScore}>Quiz {r.lastQuizPercent}%</Text>
                              )}
                            </View>
                          </View>
                          <Feather name={open ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textTertiary} />
                        </TouchableOpacity>
                        {open && (
                          <LessonDetail styles={styles} colors={colors} row={r} studentId={studentId}
                            childName={childName} accessToken={accessToken!} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.footNote}>
                {childName} works through these lessons in their own account — this is a read-only view.
              </Text>

              {/* ── Showcase rail ─────────────────────────────────────────── */}
              {showcaseRows.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 22, marginBottom: 12 }]}>Showcase</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
                    {showcaseRows.map((r) => {
                      const selected = showcaseId === r.id;
                      return (
                        <TouchableOpacity key={r.id} activeOpacity={0.8}
                          style={[styles.projectCard, selected && { borderColor: colors.primary, backgroundColor: colors.primarySofter }]}
                          onPress={() => setShowcaseId(selected ? null : r.id)}>
                          <View style={[styles.projectIcon, { backgroundColor: selected ? colors.primary : colors.primarySoft }]}>
                            <MaterialCommunityIcons name={kindIconOf(r.sandboxKind)} size={19}
                              color={selected ? '#FFF' : colors.primary} />
                          </View>
                          <Text style={styles.projectTitle} numberOfLines={2}>{r.title}</Text>
                          <Text style={styles.projectKind}>{kindLabelOf(r.sandboxKind)} project</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {selectedShowcase ? (
                    <View style={styles.viewerCard}>
                      <View style={styles.viewerHead}>
                        <Text style={styles.viewerTitle} numberOfLines={1}>
                          {selectedShowcase.number != null ? `L${selectedShowcase.number} · ` : ''}{selectedShowcase.title}
                        </Text>
                        <TouchableOpacity hitSlop={8} onPress={() => setShowcaseId(null)}>
                          <Ionicons name="close" size={17} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </View>
                      <LessonWork styles={styles} colors={colors} row={selectedShowcase}
                        studentId={studentId} accessToken={accessToken!} />
                    </View>
                  ) : (
                    <Text style={styles.footNote}>Tap a project to open it — web builds are interactive, try the buttons {childName} coded.</Text>
                  )}
                </>
              )}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
};

/** Expanded timeline node: facts (objective, quiz, teacher mark) + the child's work. */
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
            : `${childName} hasn’t started this lesson yet.`}
        </Text>
      )}
    </View>
  );
};

/**
 * Loads and renders the child's actual work for a lesson (lazily, on first open):
 * Scratch -> saved .sb3 (share / open Scratch site); anything else -> latest handed-in
 * submission (web renders live in a WebView, other languages show the code).
 * Shared by the Journey timeline and the Showcase viewer.
 */
const LessonWork: React.FC<{
  styles: any; colors: ColorPalette; row: RoadmapRow; studentId: number; accessToken: string;
}> = ({ styles, colors, row, studentId, accessToken }) => {
  const isScratch = row.sandboxKind === 'SCRATCH' || row.sandboxKind === 'BLOCKS';
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [submission, setSubmission] = useState<CodingSubmission | null>(null);
  const [sb3, setSb3] = useState<string | null>(null);

  // Fetch once per mount — the row identity never changes while a panel is open.
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
    ? <ScratchWork styles={styles} colors={colors} sb3Base64={sb3!} title={row.title} />
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
 * honest path: share the .sb3 file, and link to the ShuleOne Scratch site where it can
 * be loaded and run.
 */
const ScratchWork: React.FC<{ styles: any; colors: ColorPalette; sb3Base64: string; title: string }> =
  ({ styles, colors, sb3Base64, title }) => {
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
          <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scratchBtn}>
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
    scroll: { paddingHorizontal: 16 },

    // Now learning
    nowCard: {
      backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.border,
      padding: 16, marginTop: 14, marginBottom: 22,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14, shadowRadius: 18, elevation: 6,
    },
    nowTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    nowKicker: { fontSize: 10, fontFamily: fonts.bold, color: c.primary, letterSpacing: 1 },
    nowTitle: { fontSize: 16.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginTop: 3, lineHeight: 21 },
    nowObjective: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3, lineHeight: 17 },
    nowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    },
    chipText: { fontSize: 11, fontFamily: fonts.bold },

    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    sectionAction: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },

    // Class reports
    reportCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 10,
    },
    reportHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    reportDateChip: {
      backgroundColor: c.primarySoft, borderRadius: 9,
      paddingHorizontal: 9, paddingVertical: 5,
    },
    reportDateText: { fontSize: 11, fontFamily: fonts.extrabold, color: c.primary },
    reportTopic: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, lineHeight: 19 },
    reportSummary: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 9, lineHeight: 18 },
    reportMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
    reportMetaText: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 17 },
    reportMetaLabel: { fontFamily: fonts.bold, color: c.text },

    // Journey timeline
    timeline: { },
    timelineRow: { flexDirection: 'row', gap: 12 },
    nodeCol: { alignItems: 'center', width: 30 },
    node: {
      width: 30, height: 30, borderRadius: 15, borderWidth: 2,
      borderColor: c.border, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    nodeNum: { fontSize: 12, fontFamily: fonts.extrabold },
    connector: { flex: 1, width: 2, backgroundColor: c.border, marginVertical: 3 },
    lessonCard: {
      flex: 1, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border,
      marginBottom: 12, overflow: 'hidden',
    },
    lessonHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
    lessonTitle: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text, lineHeight: 18 },
    lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
    lessonStatus: { fontSize: 11, fontFamily: fonts.bold },
    lessonScore: { fontSize: 11, fontFamily: fonts.semibold, color: c.textSecondary },

    lessonDetail: { borderTopWidth: 1, borderTopColor: c.border },
    lessonFacts: { padding: 13, gap: 5, backgroundColor: c.backgroundAlt },
    factText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18 },
    factLabel: { fontFamily: fonts.bold, color: c.text },

    // Showcase
    projectCard: {
      width: 132, backgroundColor: c.card, borderRadius: 16, borderWidth: 1.5, borderColor: c.border,
      padding: 12,
    },
    projectIcon: {
      width: 36, height: 36, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center', marginBottom: 9,
    },
    projectTitle: { fontSize: 12.5, fontFamily: fonts.bold, color: c.text, lineHeight: 16, letterSpacing: -0.2 },
    projectKind: { fontSize: 10.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 4 },
    viewerCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      marginTop: 12, overflow: 'hidden',
    },
    viewerHead: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 13, paddingVertical: 11,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    viewerTitle: { flex: 1, fontSize: 13, fontFamily: fonts.bold, color: c.text },

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

    footNote: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2, lineHeight: 16 },

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
