import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Circle, Path, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useChildAcademics } from '../../hooks/useAcademics';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { ExamResult, SubjectScore, AcademicReport } from '../../api/academics.types';
import { downloadAuthFile } from '../../utils/downloadAuthFile';
import { API_BASE_URL } from '../../config/api';

// =================================================================
// Dummy/demo data — shown when the backend has nothing yet so the
// screen renders meaningfully. Removed automatically the moment real
// exam data starts flowing through useChildAcademics().
// =================================================================
const DUMMY_REPORT: AcademicReport = {
  studentId: 0,
  studentName: 'Sample Student',
  admNo: '',
  className: 'Grade 6',
  streamName: 'Class 6B',
  exams: [],
};

const DUMMY_EXAMS: ExamResult[] = [
  {
    examId: 1,
    examName: 'Term 1',
    grade: 'B',
    mean: '70',
    points: null,
    overallRemark: 'Good start to the year.',
    dev: null,
    subjects: [
      { subject: 'Mathematics', code: 'MAT', score: '78', grade: 'B+', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'English',     code: 'ENG', score: '68', grade: 'B-', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Science',     code: 'SCI', score: '66', grade: 'B-', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Kiswahili',   code: 'KIS', score: '72', grade: 'B',  points: null, position: null, average: null, scoreDiff: null, remark: null },
    ],
  },
  {
    examId: 2,
    examName: 'Mid Term',
    grade: 'B',
    mean: '68',
    points: null,
    overallRemark: 'Steady progress in core subjects.',
    dev: null,
    subjects: [
      { subject: 'Mathematics', code: 'MAT', score: '74', grade: 'B',  points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'English',     code: 'ENG', score: '70', grade: 'B',  points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Science',     code: 'SCI', score: '65', grade: 'C+', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Kiswahili',   code: 'KIS', score: '69', grade: 'B-', points: null, position: null, average: null, scoreDiff: null, remark: null },
    ],
  },
  {
    examId: 3,
    examName: 'Term 2',
    grade: 'B+',
    mean: '76',
    points: null,
    overallRemark: 'Brian is participating well in class. Focus on problem solving in Mathematics and reading comprehension.',
    dev: null,
    subjects: [
      { subject: 'Mathematics', code: 'MAT', score: '82', grade: 'B+', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'English',     code: 'ENG', score: '74', grade: 'B',  points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Science',     code: 'SCI', score: '71', grade: 'B-', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Kiswahili',   code: 'KIS', score: '77', grade: 'B+', points: null, position: null, average: null, scoreDiff: null, remark: null },
    ],
  },
  {
    examId: 4,
    examName: 'Term 3',
    grade: 'B',
    mean: '73',
    points: null,
    overallRemark: 'Maintaining good performance.',
    dev: null,
    subjects: [
      { subject: 'Mathematics', code: 'MAT', score: '79', grade: 'B+', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'English',     code: 'ENG', score: '72', grade: 'B',  points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Science',     code: 'SCI', score: '70', grade: 'B-', points: null, position: null, average: null, scoreDiff: null, remark: null },
      { subject: 'Kiswahili',   code: 'KIS', score: '73', grade: 'B',  points: null, position: null, average: null, scoreDiff: null, remark: null },
    ],
  },
];

// =================================================================
function metaFor(c: ColorPalette, subject: string | null) {
  if (!subject) return { color: c.textSecondary, icon: <Ionicons name="library" size={14} color="#fff" /> };
  const key = subject.toLowerCase().trim();
  if (key.includes('math'))     return { color: c.subjectMath,     icon: <FontAwesome5 name="square-root-alt" size={14} color="#fff" /> };
  if (key.includes('english'))  return { color: c.subjectEnglish,  icon: <Ionicons name="book" size={16} color="#fff" /> };
  if (key.includes('science'))  return { color: c.subjectScience,  icon: <MaterialCommunityIcons name="flask" size={16} color="#fff" /> };
  if (key.includes('kiswa'))    return { color: c.subjectKiswahili,icon: <MaterialCommunityIcons name="comment-text" size={14} color="#fff" /> };
  if (key.includes('social'))   return { color: c.subjectSocial,   icon: <MaterialCommunityIcons name="earth" size={16} color="#fff" /> };
  if (key.includes('cre') || key.includes('ire')) return { color: c.subjectCRE, icon: <Ionicons name="book-outline" size={15} color="#fff" /> };
  if (key.includes('comp'))     return { color: c.subjectComputer, icon: <Ionicons name="laptop" size={14} color="#fff" /> };
  if (key.includes('art'))      return { color: c.subjectArt,      icon: <MaterialCommunityIcons name="palette" size={14} color="#fff" /> };
  return { color: c.textSecondary, icon: <Ionicons name="library" size={14} color="#fff" /> };
}

function gradeMeta(c: ColorPalette, grade: string | null) {
  const letter = (grade ?? '').trim().toUpperCase();
  const first = letter[0] ?? '';
  const isDark = c.scheme === 'dark';
  if (first === 'A')                            return { bg: isDark ? '#0F2F26' : '#D1FAE5', color: c.success };
  if (first === 'B' && letter.includes('+'))    return { bg: isDark ? '#0F2F26' : '#D1FAE5', color: c.success };
  if (first === 'B' && letter.includes('-'))    return { bg: isDark ? '#3A2A0F' : '#FEF3C7', color: c.warning };
  if (first === 'B')                            return { bg: isDark ? '#152340' : '#DBEAFE', color: c.info };
  if (first === 'C')                            return { bg: isDark ? '#3A2A0F' : '#FEF3C7', color: c.warning };
  if (first === 'D')                            return { bg: isDark ? '#3A1F0F' : '#FED7AA', color: '#C2410C' };
  if (first === 'E' || first === 'F')           return { bg: isDark ? '#3A1414' : '#FEE2E2', color: c.danger };
  return { bg: isDark ? '#2A3744' : '#F3F4F6', color: c.textSecondary };
}

// =================================================================
export const AcademicsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { selectedChild } = useSelectedChild();
  const { accessToken } = useAuth();
  const { data, exams, loading, refreshing, refresh, error } = useChildAcademics();

  // Apply dummy fallback when backend has no exams
  const usingDummyData = !loading && exams.length === 0;
  const displayExams = usingDummyData ? DUMMY_EXAMS : exams;
  const displayReport = data ?? (usingDummyData ? DUMMY_REPORT : null);

  // Auto-select the term that matches the marketing (Term 2) when in dummy mode
  const defaultIdx = usingDummyData ? 2 : 0;
  const [selectedExamIdx, setSelectedExamIdx] = useState(defaultIdx);

  // Keep selection valid when exams change
  React.useEffect(() => {
    if (selectedExamIdx >= displayExams.length) setSelectedExamIdx(0);
  }, [displayExams.length]);

  const currentExam: ExamResult | null = displayExams[selectedExamIdx] ?? displayExams[0] ?? null;

  const handleDownloadReport = async () => {
    if (usingDummyData) {
      Alert.alert('Sample report', 'This is sample data. Once the school publishes real reports, downloads will work.');
      return;
    }
    if (!selectedChild?.studentId || !accessToken) { Alert.alert('Not ready', 'No child selected.'); return; }
    const url = `${API_BASE_URL}/api/parent/children/${selectedChild.studentId}/academics/report.pdf`;
    const childSlug = (selectedChild.fullName || 'student').replace(/\s+/g, '-');
    const examSlug = currentExam?.examName?.replace(/\s+/g, '-') || 'report';
    await downloadAuthFile(accessToken, url, { fileName: `academic-report-${childSlug}-${examSlug}.pdf` });
  };

  return (
    <View style={styles.safe}>
      <ParentHeader title="Academics" rightIcon="filter" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading academic report…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {/* Demo data banner */}
        {usingDummyData && (
          <View style={styles.demoBanner}>
            <Ionicons name="information-circle" size={14} color={colors.info} />
            <Text style={styles.demoBannerText}>
              Showing sample report. Real exam data will appear once the school publishes it.
            </Text>
          </View>
        )}

        {!loading && currentExam && (
          <>
            {/* Latest Exam Average hero */}
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Latest Exam Average</Text>
                <Text style={styles.heroValue}>
                  {currentExam.mean ?? '—'}
                  {currentExam.mean && !String(currentExam.mean).includes('%') ? '%' : ''}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {currentExam.examName ? `${currentExam.examName} Midterm Exams` : 'Latest exam'}
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <View style={styles.heroStar}>
                  <Ionicons name="star" size={26} color="#fff" />
                </View>
                <Text style={styles.heroBadgeText}>{currentExam.overallRemark ? 'Good work!' : 'Keep it up!'}</Text>
              </View>
            </View>

            {/* Exam chips */}
            {displayExams.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {displayExams.map((e, idx) => {
                  const active = idx === selectedExamIdx;
                  return (
                    <TouchableOpacity
                      key={e.examId ?? idx}
                      activeOpacity={0.85}
                      onPress={() => setSelectedExamIdx(idx)}
                      style={[styles.examChip, active && styles.examChipActive]}
                    >
                      <Text style={[styles.examChipText, active && styles.examChipTextActive]}>
                        {e.examName ?? `Exam ${idx + 1}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Subjects */}
            <Text style={styles.sectionTitle}>Subject Performance</Text>
            <View style={styles.subjectsList}>
              {(currentExam.subjects ?? []).map((s, idx, arr) => (
                <SubjectRow
                  key={`${s.code}-${idx}`}
                  subject={s}
                  isLast={idx === arr.length - 1}
                  colors={colors} styles={styles}
                />
              ))}
              {(!currentExam.subjects || currentExam.subjects.length === 0) && (
                <View style={styles.emptySubjects}>
                  <Text style={styles.emptyText}>No subject scores recorded.</Text>
                </View>
              )}
            </View>

            {/* Trend */}
            {displayExams.length > 1 && (
              <>
                <Text style={styles.sectionTitle}>Performance Trend</Text>
                <View style={styles.trendCard}>
                  <PerformanceTrendChart exams={displayExams} highlightIdx={selectedExamIdx} colors={colors} />
                </View>
              </>
            )}

            {/* Teacher comments */}
            {(currentExam.overallRemark || currentExam.dev) && (
              <>
                <Text style={styles.sectionTitle}>Teacher Comments</Text>
                <View style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.teacherAvatar}>
                      <Text style={styles.teacherInitials}>TM</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.teacherName}>Mr. Thomas Mwangi</Text>
                      <Text style={styles.commentMeta}>12 May 2025</Text>
                    </View>
                  </View>
                  {!!currentExam.overallRemark && <Text style={styles.commentBody}>{currentExam.overallRemark}</Text>}
                  {!!currentExam.dev && (
                    <Text style={[styles.commentBody, { marginTop: 8, color: colors.textSecondary }]}>{currentExam.dev}</Text>
                  )}
                </View>
              </>
            )}

            {/* View full report CTA */}
            <TouchableOpacity activeOpacity={0.85} style={styles.reportBtnWrap} onPress={handleDownloadReport}>
              <LinearGradient
                colors={[colors.purple, colors.purpleDeep]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.reportBtn}
              >
                <Ionicons name="document-text" size={18} color="#fff" />
                <Text style={styles.reportBtnText}>View full report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// =================================================================
const SubjectRow: React.FC<{ subject: SubjectScore; isLast: boolean; colors: ColorPalette; styles: any }> = ({ subject, isLast, colors, styles }) => {
  const meta = metaFor(colors, subject.subject);
  const grade = gradeMeta(colors, subject.grade);
  const pctRaw = (subject.score ?? '').toString().replace(/[^0-9.]/g, '');
  const pct = parseFloat(pctRaw);
  const showPct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;

  return (
    <View style={[styles.subjectRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[styles.subjectIcon, { backgroundColor: meta.color }]}>{meta.icon}</View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.subjectTopLine}>
          <Text style={styles.subjectName} numberOfLines={1}>{subject.subject ?? '—'}</Text>
          <Text style={styles.subjectScore}>
            {Number.isFinite(pct) ? `${Math.round(pct)}%` : (subject.score ?? '—')}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { backgroundColor: meta.color, width: `${showPct}%` }]} />
        </View>
      </View>
      <View style={[styles.gradeBadge, { backgroundColor: grade.bg }]}>
        <Text style={[styles.gradeText, { color: grade.color }]}>{subject.grade ?? '—'}</Text>
      </View>
    </View>
  );
};

const PerformanceTrendChart: React.FC<{ exams: ExamResult[]; highlightIdx: number; colors: ColorPalette }> = ({ exams, highlightIdx, colors }) => {
  const W = Dimensions.get('window').width - 18 * 2 - 12 * 2;
  const H = 180;
  const padL = 32, padR = 12, padT = 28, padB = 32;
  const points = exams.map((e) => {
    const raw = (e.mean ?? '').toString().replace(/[^0-9.]/g, '');
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  });
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const stepX = exams.length > 1 ? chartW / (exams.length - 1) : 0;
  const xs = exams.map((_, i) => padL + i * stepX);
  const ys = points.map((p) => padT + (1 - p / 100) * chartH);
  const polylinePts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <Svg width={W} height={H}>
      {yTicks.map((t) => {
        const y = padT + (1 - t / 100) * chartH;
        return (
          <React.Fragment key={t}>
            <SvgLine x1={padL} y1={y} x2={W - padR} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray={t === 0 ? '0' : '3,3'} />
            <SvgText x={padL - 8} y={y + 3} fontSize={9} fill={colors.textTertiary} fontWeight="600" textAnchor="end">{t}%</SvgText>
          </React.Fragment>
        );
      })}
      {points.length >= 2 && (
        <Polyline points={polylinePts} fill="none" stroke={colors.purple} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {xs.map((x, i) => {
        const highlighted = i === highlightIdx;
        return (
          <React.Fragment key={i}>
            <Circle cx={x} cy={ys[i]} r={highlighted ? 6 : 4} fill={highlighted ? colors.purple : colors.card} stroke={colors.purple} strokeWidth={2} />
            {highlighted && (
              <>
                <Circle cx={x} cy={ys[i]} r={3} fill={colors.card} />
                <Path
                  d={`M ${x - 22},${ys[i] - 28} L ${x + 22},${ys[i] - 28} L ${x + 22},${ys[i] - 12} L ${x + 4},${ys[i] - 12} L ${x},${ys[i] - 6} L ${x - 4},${ys[i] - 12} L ${x - 22},${ys[i] - 12} Z`}
                  fill={colors.purple}
                />
                <SvgText x={x} y={ys[i] - 16} fontSize={11} fontWeight="800" fill="#fff" textAnchor="middle">{points[i]}%</SvgText>
              </>
            )}
          </React.Fragment>
        );
      })}
      {xs.map((x, i) => (
        <SvgText key={`xl-${i}`} x={x} y={H - 8} fontSize={10} fill={colors.textSecondary} fontWeight="600" textAnchor="middle">
          {(exams[i].examName ?? '—').length > 8 ? (exams[i].examName ?? '').slice(0, 8) + '…' : (exams[i].examName ?? '')}
        </SvgText>
      ))}
    </Svg>
  );
};

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { color: c.textSecondary, fontSize: 12.5, marginTop: 8, fontWeight: '500' },
    emptyText: { fontSize: 12.5, color: c.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
    emptySubjects: { padding: 18, alignItems: 'center' },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },

    demoBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.infoSoft, borderRadius: 12,
      padding: 10, marginBottom: 12,
    },
    demoBannerText: { flex: 1, fontSize: 11.5, color: c.info, fontWeight: '600', lineHeight: 15 },

    heroCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.purpleLight,
      borderRadius: 22, padding: 18, marginBottom: 16,
    },
    heroLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, color: c.textSecondary, marginBottom: 4 },
    heroValue: { fontSize: 36, fontWeight: '900', color: c.purple, letterSpacing: -1 },
    heroSubtitle: { fontSize: 11.5, color: c.textSecondary, marginTop: 6 },
    heroBadge: { alignItems: 'center', maxWidth: 90 },
    heroStar: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 6,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    heroBadgeText: { fontSize: 10.5, fontWeight: '700', color: c.text, textAlign: 'center' },

    chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingVertical: 4 },
    examChip: {
      backgroundColor: c.card, borderRadius: 999,
      paddingHorizontal: 14, paddingVertical: 7,
      borderWidth: 1, borderColor: c.border,
    },
    examChipActive: { backgroundColor: c.purple, borderColor: c.purple },
    examChipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    examChipTextActive: { color: '#fff' },

    sectionTitle: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 12, marginTop: 16 },

    subjectsList: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    subjectRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: c.border },
    subjectIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    subjectTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    subjectName: { fontSize: 13.5, fontWeight: '700', color: c.text, flex: 1 },
    subjectScore: { fontSize: 13.5, fontWeight: '700', color: c.text, marginLeft: 6 },
    progressTrack: { height: 6, backgroundColor: c.scheme === 'dark' ? '#2A3744' : '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    gradeBadge: {
      minWidth: 36, paddingHorizontal: 8, paddingVertical: 5,
      borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginLeft: 12,
    },
    gradeText: { fontSize: 11.5, fontWeight: '800', letterSpacing: -0.2 },

    trendCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, padding: 12,
    },

    commentCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, padding: 12,
    },
    commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    teacherAvatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.purpleLight,
      alignItems: 'center', justifyContent: 'center',
    },
    teacherInitials: { color: c.purple, fontSize: 13, fontWeight: '800' },
    teacherName: { fontSize: 13.5, fontWeight: '700', color: c.text },
    commentMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },
    commentBody: { fontSize: 13.5, color: c.text, lineHeight: 19, fontWeight: '500' },

    reportBtnWrap: {
      marginTop: 16,
      shadowColor: c.purple, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.20, shadowRadius: 12, elevation: 6,
    },
    reportBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 16,
    },
    reportBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  });
}
