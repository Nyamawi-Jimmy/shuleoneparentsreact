// Academics — mobile-first redesign in the brand theme: rose app bar with a
// floating Results/Attendance segmented control riding over it.
//   Results    — selected-exam hero (grade, mean, trend, donut) with separate
//                "Subjects & analytics" and "Report PDF" actions, the
//                performance trend chart, and a tappable exam history list
//                (replaces the old horizontal chip strip).
//   Attendance — term-rate hero with streak, count tiles, month-at-a-glance
//                grid and the recent days log.
// Deep link: /academics?tab=attendance (Today's quick access + stat card).

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Dimensions, Modal, Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Polyline, Line as SvgLine, Path } from 'react-native-svg';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useChildAcademics, useChildAttendance } from '../../hooks/useAcademics';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { ExamResult, SubjectScore, AttendanceDay } from '../../api/academics.types';
import { downloadAuthFile } from '../../utils/downloadAuthFile';
import { API_BASE_URL } from '../../config/api';

type Tab = 'results' | 'attendance';

const num = (v: any): number | null => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const shortName = (name?: string | null) => {
  if (!name) return '';
  return String(name).replace(/EXAM/ig, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ');
};
const gradeHex = (grade: string | null, c: ColorPalette): string => {
  const g = String(grade || '').trim().toUpperCase();
  if (g.startsWith('A')) return c.success;
  if (g.startsWith('B')) return c.info;
  if (g.startsWith('C')) return c.warning;
  if (!g) return c.textTertiary;
  return c.danger;
};
const fmtDate = (iso?: string | null, opts?: Intl.DateTimeFormatOptions) => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', opts ?? { weekday: 'short', day: 'numeric', month: 'short' });
};
const fmtTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};
const pad2 = (n: number) => String(n).padStart(2, '0');

export const AcademicsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild } = useSelectedChild();
  // ?tab=attendance deep link (Today's quick access) — also honoured when the
  // tab is already mounted and the parent taps the shortcut again. Derived-state
  // pattern: adopt the param during render whenever it changes.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(tabParam === 'attendance' ? 'attendance' : 'results');
  const [seenParam, setSeenParam] = useState(tabParam);
  if (tabParam !== seenParam) {
    setSeenParam(tabParam);
    if (tabParam === 'attendance' || tabParam === 'results') setTab(tabParam);
  }

  const childName = selectedChild?.firstName || selectedChild?.fullName || 'your child';

  return (
    <View style={styles.root}>
      <GradientAppBar title="Academics" subtitle={`${childName}’s results & attendance`} />

      {/* Floating segmented control — rides over the app bar edge */}
      <View style={styles.segmentWrap}>
        <View style={styles.segment}>
          {(['results', 'attendance'] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity key={t} style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                activeOpacity={0.8} onPress={() => setTab(t)}>
                <Ionicons
                  name={t === 'results' ? 'ribbon-outline' : 'checkmark-done-outline'}
                  size={14} color={active ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t === 'results' ? 'Exam results' : 'Attendance'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === 'results'
        ? <ResultsView styles={styles} colors={colors} childName={childName} />
        : <AttendanceView styles={styles} colors={colors} childName={childName} />}
    </View>
  );
};

// ── Results ──────────────────────────────────────────────────────────────────
const ResultsView: React.FC<{ styles: any; colors: ColorPalette; childName: string }> = ({ styles, colors, childName }) => {
  const { exams: rawExams, loading, refreshing, error, refresh } = useChildAcademics();
  const { selectedChild } = useSelectedChild();
  const { accessToken } = useAuth();
  const [selected, setSelected] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const exams = useMemo(() => [...(rawExams ?? [])].sort((a, b) => (num(b.examId) || 0) - (num(a.examId) || 0)), [rawExams]);
  const safe = Math.min(selected, Math.max(0, exams.length - 1));
  const sel = exams[safe] as ExamResult | undefined;
  const selMean = num(sel?.mean);
  const prevMean = exams[safe + 1] ? num(exams[safe + 1].mean) : null;
  const delta = (selMean != null && prevMean != null) ? +(selMean - prevMean).toFixed(2) : num(sel?.dev);

  const chrono = [...exams].reverse();
  const chartData = chrono.map((e) => ({ label: shortName(e.examName), mean: num(e.mean) })).filter((p) => p.mean != null) as { label: string; mean: number }[];

  const downloadPdf = async (examId: number | null) => {
    if (!examId || !selectedChild?.studentId || !accessToken || downloading) return;
    setDownloading(true);
    const slug = (selectedChild.fullName || 'student').replace(/\s+/g, '-');
    await downloadAuthFile(
      accessToken,
      `${API_BASE_URL}/api/parent/children/${selectedChild.studentId}/academics/report-pdf?examId=${examId}`,
      { fileName: `report-${slug}-${examId}.pdf` },
    ).catch(() => {});
    setDownloading(false);
  };

  if (loading && exams.length === 0) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      {exams.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name={error ? 'alert-circle-outline' : 'school-outline'} size={30} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{error ? "Couldn’t load exam results" : 'No exam results yet'}</Text>
          <Text style={styles.emptyText}>
            {error ? "We couldn’t reach the school’s records just now. Pull to refresh in a moment."
              : `Results for ${childName} will appear here once the school publishes them.`}
          </Text>
          {error && (
            <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.85}>
              <Feather name="refresh-cw" size={14} color="#FFF" /><Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* Selected exam hero */}
          {sel && (
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={[styles.gradeSquare, { backgroundColor: gradeHex(sel.grade, colors) + '1A' }]}>
                  <Text style={[styles.gradeSquareText, { color: gradeHex(sel.grade, colors) }]}>{sel.grade || '—'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroKicker}>{safe === 0 ? 'LATEST EXAM' : 'SELECTED EXAM'}</Text>
                  <Text style={styles.heroName} numberOfLines={2}>{sel.examName}</Text>
                  <View style={styles.heroMetaRow}>
                    <Text style={styles.heroMeta}>
                      Mean <Text style={{ fontFamily: fonts.extrabold, color: colors.text }}>{sel.mean ?? '—'}</Text>
                      {sel.points ? ` · ${sel.points} pts` : ''}
                    </Text>
                    {delta != null && delta !== 0 && (
                      <View style={[styles.trendChip, { backgroundColor: (delta > 0 ? colors.success : colors.danger) + '1A' }]}>
                        <Ionicons name={delta > 0 ? 'trending-up' : 'trending-down'} size={11} color={delta > 0 ? colors.success : colors.danger} />
                        <Text style={[styles.trendChipText, { color: delta > 0 ? colors.success : colors.danger }]}>{delta > 0 ? '+' : ''}{delta}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {selMean != null && <Donut pct={selMean} color={colors.primary} track={colors.backgroundAlt} textColor={colors.text} />}
              </View>
              {!!sel.overallRemark && <Text style={styles.remark} numberOfLines={2}>“{sel.overallRemark}”</Text>}

              <View style={styles.actionRow}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={() => setModalOpen(true)}>
                  <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
                    <MaterialCommunityIcons name="chart-box-outline" size={16} color="#FFF" />
                    <Text style={styles.primaryBtnText}>Subjects & analytics</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.75} disabled={downloading}
                  onPress={() => downloadPdf(sel.examId)}>
                  {downloading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <><Feather name="download" size={15} color={colors.primary} /><Text style={styles.outlineBtnText}>Report</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Performance trend */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Performance trend</Text>
              <Text style={styles.chartHint}>mean score</Text>
            </View>
            {chartData.length > 1
              ? <LineChart data={chartData} color={colors.primary} colors={colors} />
              : <Text style={styles.chartNote}>One exam on record — the trend line appears with two or more.</Text>}
          </View>

          {/* Exam history — tap a row to inspect it in the hero above */}
          <Text style={styles.sectionTitle}>Exam history</Text>
          <View style={styles.card}>
            {exams.map((e, i) => {
              const active = i === safe;
              const hex = gradeHex(e.grade, colors);
              const prev = exams[i + 1] ? num(exams[i + 1].mean) : null;
              const rowDelta = num(e.mean) != null && prev != null ? +(num(e.mean)! - prev).toFixed(1) : null;
              return (
                <TouchableOpacity key={e.examId ?? i} style={[styles.examRow, i > 0 && styles.divider]}
                  activeOpacity={0.7} onPress={() => setSelected(i)}>
                  <View style={[styles.examRowGrade, { backgroundColor: hex + '1A' }]}>
                    <Text style={[styles.examRowGradeText, { color: hex }]}>{e.grade || '—'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.examRowName, active && { color: colors.primary }]} numberOfLines={1}>{shortName(e.examName)}</Text>
                    <Text style={styles.examRowMeta}>
                      Mean {e.mean ?? '—'}
                      {rowDelta != null && rowDelta !== 0 ? `  ·  ${rowDelta > 0 ? '↑' : '↓'} ${Math.abs(rowDelta)}` : ''}
                    </Text>
                  </View>
                  {active
                    ? <View style={styles.activePill}><Text style={styles.activePillText}>Viewing</Text></View>
                    : <Feather name="chevron-up" size={15} color={colors.textTertiary} style={{ transform: [{ rotate: '45deg' }] }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      <View style={{ height: 28 }} />

      {sel && (
        <AnalyticsModal
          visible={modalOpen} onClose={() => setModalOpen(false)} styles={styles} colors={colors}
          exam={sel} delta={delta} downloading={downloading} onPrint={() => downloadPdf(sel.examId)}
        />
      )}
    </ScrollView>
  );
};

const AnalyticsModal: React.FC<{
  visible: boolean; onClose: () => void; styles: any; colors: ColorPalette;
  exam: ExamResult; delta: number | null; downloading: boolean; onPrint: () => void;
}> = ({ visible, onClose, styles, colors, exam, delta, downloading, onPrint }) => {
  const subjects = (exam.subjects ?? []) as SubjectScore[];
  const up = delta != null && delta >= 0;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetKicker}>EXAM ANALYTICS</Text>
              <Text style={styles.sheetTitle} numberOfLines={2}>{exam.examName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} hitSlop={8}><Ionicons name="close" size={18} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>GRADE</Text>
              <Text style={[styles.tileValue, { color: gradeHex(exam.grade, colors) }]}>{exam.grade || '—'}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>MEAN</Text>
              <Text style={styles.tileValue}>{exam.mean ?? '—'}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>TREND</Text>
              <Text style={[styles.tileValueSm, { color: delta == null ? colors.text : (up ? colors.success : colors.danger) }]}>
                {delta == null ? '—' : up ? 'Improving' : 'Slipping'}
              </Text>
              <Text style={styles.tileSub}>{delta == null ? 'Needs two exams' : `${delta > 0 ? '+' : ''}${delta} vs prev`}</Text>
            </View>
          </View>

          <Text style={styles.breakdownTitle}>Subject breakdown</Text>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
            {subjects.length > 0 ? subjects.map((s, i) => {
              const hex = gradeHex(s.grade, colors);
              const d = num(s.scoreDiff);
              return (
                <View key={i} style={[styles.subjRow, i > 0 && styles.divider]}>
                  <View style={[styles.subjDot, { backgroundColor: hex }]} />
                  <Text style={styles.subjName} numberOfLines={1}>{s.subject || '—'}</Text>
                  <Text style={styles.subjScore}>{s.score ?? '—'}</Text>
                  {s.grade ? <View style={[styles.subjGrade, { backgroundColor: hex + '1A' }]}><Text style={[styles.subjGradeText, { color: hex }]}>{s.grade}</Text></View> : <View style={{ width: 30, marginLeft: 8 }} />}
                  {d != null && d !== 0
                    ? <Text style={[styles.subjDelta, { color: d > 0 ? colors.success : colors.danger }]}>{d > 0 ? '↑' : '↓'}{Math.abs(d)}</Text>
                    : <Text style={styles.subjDeltaNone}>·</Text>}
                </View>
              );
            }) : <Text style={styles.chartNote}>No subject breakdown recorded for this exam.</Text>}
          </ScrollView>

          <TouchableOpacity activeOpacity={0.85} onPress={onPrint} disabled={downloading}>
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.printBtn}>
              {downloading ? <ActivityIndicator size="small" color="#FFF" /> : <><Feather name="printer" size={16} color="#FFF" /><Text style={styles.printBtnText}>Print assessment (PDF)</Text></>}
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ── Attendance ───────────────────────────────────────────────────────────────
const ATT = {
  PRESENT: { label: 'Present', icon: 'checkmark' as const },
  LATE: { label: 'Late', icon: 'time' as const },
  ABSENT: { label: 'Absent', icon: 'close' as const },
  EXCUSED: { label: 'Excused', icon: 'calendar' as const },
};
const attColor = (status: string | null, c: ColorPalette): string => {
  const s = String(status || '').toUpperCase();
  if (s === 'PRESENT') return c.success;
  if (s === 'LATE') return c.warning;
  if (s === 'ABSENT') return c.danger;
  if (s === 'EXCUSED') return c.info;
  return c.textTertiary;
};

const AttendanceView: React.FC<{ styles: any; colors: ColorPalette; childName: string }> = ({ styles, colors, childName }) => {
  const { summary, days, loading, refreshing, error, refresh } = useChildAttendance();

  if (loading && !summary) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  const hasRecords = summary && (summary.recordedDays ?? 0) > 0;
  if (!hasRecords) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name={error ? 'alert-circle-outline' : 'calendar-blank-outline'} size={30} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{error ? "Couldn’t load attendance" : 'No attendance records yet'}</Text>
          <Text style={styles.emptyText}>{error ? 'Pull to refresh in a moment.' : `Attendance will appear here once the school records it for ${childName}.`}</Text>
        </View>
      </ScrollView>
    );
  }

  const present = summary!.present ?? 0, late = summary!.late ?? 0, absent = summary!.absent ?? 0, excused = summary!.excused ?? 0;
  const rate = summary!.attendanceRate;
  const streak = presentStreak(days);
  const tiles = [
    { label: 'Present', value: present, color: colors.success, icon: 'checkmark-circle' as const },
    { label: 'Late', value: late, color: colors.warning, icon: 'time' as const },
    { label: 'Absent', value: absent, color: colors.danger, icon: 'close-circle' as const },
    { label: 'Excused', value: excused, color: colors.info, icon: 'calendar' as const },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      {/* Rate hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Donut pct={rate ?? 0} color={colors.primary} track={colors.backgroundAlt} textColor={colors.text} size={72} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroKicker}>ATTENDANCE RATE</Text>
            <Text style={styles.rateDesc}>
              {rate != null
                ? <>Present or late on <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{present + late}</Text> of <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{present + late + absent}</Text> school days</>
                : 'Not enough records to calculate a rate yet'}
            </Text>
            <Text style={styles.rateWindow}>{fmtDate(summary!.from, { day: 'numeric', month: 'short' })} – {fmtDate(summary!.to, { day: 'numeric', month: 'short' })}</Text>
          </View>
        </View>
        {streak.count >= 5 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakEmoji}>🎉</Text>
            <Text style={styles.streakText}>{streak.count} days present in a row</Text>
          </View>
        )}
      </View>

      {/* Count tiles */}
      <View style={styles.tileGrid}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.countTile}>
            <View style={[styles.countIcon, { backgroundColor: t.color + '1A' }]}><Ionicons name={t.icon} size={18} color={t.color} /></View>
            <View>
              <Text style={styles.countValue}>{t.value}</Text>
              <Text style={styles.countLabel}>{t.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Month grid */}
      {days.length > 0 && <MonthGrid days={days} styles={styles} colors={colors} />}

      {/* Recent days */}
      <Text style={styles.sectionTitle}>Recent days</Text>
      <View style={styles.card}>
        {[...days].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 12).map((d, i) => {
          const hex = attColor(d.status, colors);
          const meta = ATT[String(d.status || '').toUpperCase() as keyof typeof ATT];
          const inT = fmtTime(d.firstIn), outT = fmtTime(d.lastOut);
          return (
            <View key={`${d.date}-${i}`} style={[styles.dayRow, i > 0 && styles.divider]}>
              <View style={[styles.dayIcon, { backgroundColor: hex + '1A' }]}><Ionicons name={(meta?.icon ?? 'calendar') as any} size={15} color={hex} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayDate}>{fmtDate(d.date)}</Text>
                <Text style={styles.dayTimes}>{inT ? `In ${inT}${outT ? ` · Out ${outT}` : ''}` : 'No sign-in recorded'}</Text>
              </View>
              <View style={[styles.dayChip, { backgroundColor: hex + '1A' }]}><Text style={[styles.dayChipText, { color: hex }]}>{meta?.label ?? d.status ?? '—'}</Text></View>
            </View>
          );
        })}
      </View>
      <View style={{ height: 28 }} />
    </ScrollView>
  );
};

const MonthGrid: React.FC<{ days: AttendanceDay[]; styles: any; colors: ColorPalette }> = ({ days, styles, colors }) => {
  const map: Record<string, string | null> = {};
  let latest: string | null = null;
  for (const d of days) {
    const iso = String(d.date).slice(0, 10);
    map[iso] = d.status;
    if (!latest || iso > latest) latest = iso;
  }
  const anchor = latest ? new Date(latest + 'T00:00:00') : new Date();
  const year = anchor.getFullYear(), month = anchor.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const title = anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <>
      <Text style={styles.sectionTitle}>Month at a glance</Text>
      <View style={styles.gridCard}>
        <View style={styles.gridHead}>
          <Text style={styles.gridMonth}>{title}</Text>
          <View style={styles.gridLegend}>
            {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((k) => (
              <View key={k} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: attColor(k, colors) }]} />
                <Text style={styles.legendText}>{ATT[k].label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.gridWeekdays}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={styles.gridWeekday}>{d}</Text>)}
        </View>
        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (d == null) return <View key={`e${i}`} style={styles.gridCell} />;
            const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`;
            const st = map[iso];
            const hex = st ? attColor(st, colors) : null;
            return (
              <View key={iso} style={styles.gridCell}>
                <View style={[styles.gridDay, hex ? { backgroundColor: hex } : { backgroundColor: colors.backgroundAlt }]}>
                  <Text style={[styles.gridDayText, hex ? { color: '#FFF' } : { color: colors.textTertiary }]}>{d}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </>
  );
};

function presentStreak(days: AttendanceDay[]): { count: number; since: string | null } {
  if (!Array.isArray(days) || days.length === 0) return { count: 0, since: null };
  const sorted = [...days].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  let count = 0, since: string | null = null;
  for (const d of sorted) {
    if (String(d.status || '').toUpperCase() !== 'PRESENT') break;
    count += 1; since = d.date;
  }
  return { count, since };
}

// ── Charts ───────────────────────────────────────────────────────────────────
const Donut: React.FC<{ pct: number; color: string; track: string; textColor: string; size?: number }> = ({ pct, color, track, textColor, size = 60 }) => {
  const stroke = size >= 70 ? 8 : 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - p / 100)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ fontFamily: fonts.extrabold, fontSize: size >= 70 ? 16 : 12, color: textColor }}>{Math.round(p)}%</Text>
    </View>
  );
};

const LineChart: React.FC<{ data: { label: string; mean: number }[]; color: string; colors: ColorPalette }> = ({ data, color, colors }) => {
  const W = Dimensions.get('window').width - 32 - 28; // screen - screen padding - card padding
  const H = 150;
  const padX = 8, padTop = 16, padBottom = 22;
  const means = data.map((d) => d.mean);
  const lo = Math.min(...means), hi = Math.max(...means);
  const span = Math.max(4, Math.round((hi - lo) * 0.4));
  const domLo = Math.max(0, Math.floor(lo - span)), domHi = Math.min(100, Math.ceil(hi + span));
  const range = Math.max(1, domHi - domLo);
  const stepX = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;
  const y = (v: number) => padTop + (1 - (v - domLo) / range) * (H - padTop - padBottom);
  const pts = data.map((d, i) => ({ x: padX + i * stepX, y: y(d.mean) }));
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = `M ${pts[0].x},${H - padBottom} L ${pts.map((p) => `${p.x},${p.y}`).join(' L ')} L ${pts[pts.length - 1].x},${H - padBottom} Z`;

  return (
    <View>
      <Svg width={W} height={H}>
        {[domHi, Math.round((domHi + domLo) / 2), domLo].map((gl, i) => (
          <SvgLine key={i} x1={padX} y1={y(gl)} x2={W - padX} y2={y(gl)} stroke={colors.border} strokeWidth={1} strokeDasharray="3 4" />
        ))}
        <Path d={areaPath} fill={color} fillOpacity={0.12} />
        <Polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} stroke={colors.card} strokeWidth={2} />)}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: colors.textTertiary }}>{data[0].label}</Text>
        <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: colors.textTertiary }}>{data[data.length - 1].label}</Text>
      </View>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    // Floating segmented control over the app bar edge
    segmentWrap: { paddingHorizontal: 16, marginTop: -20 },
    segment: {
      flexDirection: 'row', backgroundColor: c.card, borderRadius: 14, padding: 4,
      borderWidth: 1, borderColor: c.border,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
    },
    segmentBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 10, borderRadius: 11,
    },
    segmentBtnActive: { backgroundColor: c.primarySoft },
    segmentText: { fontSize: 13, fontFamily: fonts.semibold, color: c.textSecondary },
    segmentTextActive: { color: c.primary, fontFamily: fonts.bold },

    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 34, alignItems: 'center', marginTop: 8 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.primary, borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10, marginTop: 16 },
    retryText: { color: '#FFF', fontSize: 13, fontFamily: fonts.bold },

    // Hero (shared: selected exam / attendance rate)
    heroCard: {
      backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 16,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    heroKicker: { fontSize: 10, fontFamily: fonts.bold, color: c.primary, letterSpacing: 1 },
    heroName: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginTop: 3, lineHeight: 20 },
    heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
    heroMeta: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary },
    gradeSquare: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    gradeSquareText: { fontSize: 19, fontFamily: fonts.extrabold },
    trendChip: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    trendChipText: { fontSize: 10.5, fontFamily: fonts.bold },
    remark: { fontSize: 12, fontFamily: fonts.regular, fontStyle: 'italic', color: c.textTertiary, marginTop: 12 },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      borderRadius: 12, paddingVertical: 12,
    },
    primaryBtnText: { color: '#FFF', fontSize: 13, fontFamily: fonts.bold },
    outlineBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      borderWidth: 1.5, borderColor: c.primary + '55', borderRadius: 12,
      paddingHorizontal: 15, minWidth: 96,
    },
    outlineBtnText: { color: c.primary, fontSize: 13, fontFamily: fonts.bold },

    chartCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 20 },
    chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    chartTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text },
    chartHint: { fontSize: 11, fontFamily: fonts.medium, color: c.textTertiary },
    chartNote: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', paddingVertical: 16, lineHeight: 18 },

    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4, marginBottom: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 20 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    examRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    examRowGrade: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    examRowGradeText: { fontSize: 14, fontFamily: fonts.extrabold },
    examRowName: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    examRowMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    activePill: { backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    activePillText: { fontSize: 10.5, fontFamily: fonts.bold, color: c.primary },

    // Analytics sheet
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30 },
    sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 14 },
    sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
    sheetKicker: { fontSize: 10, fontFamily: fonts.bold, color: c.primary, letterSpacing: 1 },
    sheetTitle: { fontSize: 16.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginTop: 2 },
    sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.backgroundAlt, alignItems: 'center', justifyContent: 'center' },

    tileRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tile: { flex: 1, backgroundColor: c.backgroundAlt, borderRadius: 13, padding: 12, alignItems: 'center' },
    tileLabel: { fontSize: 9.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.7 },
    tileValue: { fontSize: 20, fontFamily: fonts.extrabold, color: c.text, marginTop: 3 },
    tileValueSm: { fontSize: 14, fontFamily: fonts.extrabold, marginTop: 5 },
    tileSub: { fontSize: 9.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },

    breakdownTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, marginBottom: 6 },
    subjRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
    subjDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    subjName: { flex: 1, fontSize: 13.5, fontFamily: fonts.semibold, color: c.text, marginRight: 8 },
    subjScore: { width: 40, textAlign: 'right', fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    subjGrade: { width: 30, alignItems: 'center', borderRadius: 7, paddingVertical: 2, marginLeft: 8 },
    subjGradeText: { fontSize: 11, fontFamily: fonts.extrabold },
    subjDelta: { width: 40, textAlign: 'right', fontSize: 12, fontFamily: fonts.bold },
    subjDeltaNone: { width: 40, textAlign: 'right', fontSize: 12, color: c.textTertiary },

    printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, paddingVertical: 13, marginTop: 14 },
    printBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },

    // Attendance
    rateDesc: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    rateWindow: { fontSize: 11, fontFamily: fonts.medium, color: c.textTertiary, marginTop: 4 },
    streakPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, marginTop: 12,
    },
    streakEmoji: { fontSize: 12 },
    streakText: { fontSize: 11.5, fontFamily: fonts.bold, color: c.primary },

    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    countTile: {
      flexBasis: '47.5%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 11,
      backgroundColor: c.card, borderRadius: 15, borderWidth: 1, borderColor: c.border, padding: 13,
    },
    countIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    countValue: { fontSize: 17, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    countLabel: { fontSize: 11, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 1 },

    gridCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 20 },
    gridHead: { marginBottom: 10 },
    gridMonth: { fontSize: 14, fontFamily: fonts.bold, color: c.text },
    gridLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { fontSize: 10, fontFamily: fonts.medium, color: c.textSecondary },
    gridWeekdays: { flexDirection: 'row', marginBottom: 4 },
    gridWeekday: { flex: 1, textAlign: 'center', fontSize: 10, fontFamily: fonts.bold, color: c.textTertiary },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
    gridDay: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    gridDayText: { fontSize: 11, fontFamily: fonts.bold },

    dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    dayIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    dayDate: { fontSize: 13, fontFamily: fonts.semibold, color: c.text },
    dayTimes: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    dayChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    dayChipText: { fontSize: 10.5, fontFamily: fonts.bold },
  });
}
