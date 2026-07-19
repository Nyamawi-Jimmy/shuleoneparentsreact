import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { useAuth } from '../../../context/AuthContext';
import { useStudentExams } from '../../../hooks/useStudentExams';
import { buildStudentReportPdfUrl } from '../../../api/student';
import { ExamResult, SubjectScore } from '../../../api/academics.types';
import { downloadAuthFile } from '../../../utils/downloadAuthFile';

const num = (v: any): number | null => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const gradeHex = (grade?: string | null): string => {
  const g = String(grade || '').trim().toUpperCase();
  if (g.startsWith('A')) return '#15c98c';
  if (g.startsWith('B')) return '#3aa0ff';
  if (g.startsWith('C')) return '#f59e0b';
  if (!g) return '#9b93c4';
  return '#ef4444';
};
const shortName = (n?: string | null) => (n ? String(n).replace(/EXAM/ig, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 2).join(' ') : '');

export const TestsView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { accessToken } = useAuth();
  const { exams: rawExams, loading, refreshing, error, refresh } = useStudentExams();
  const [selected, setSelected] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const exams = useMemo(() => [...(rawExams ?? [])].sort((a, b) => (num(b.examId) || 0) - (num(a.examId) || 0)), [rawExams]);
  const safe = Math.min(selected, Math.max(0, exams.length - 1));
  const sel = exams[safe] as ExamResult | undefined;

  const title = pickByTier(tier, {
    base: '📊 My Exams', sprout: '📊 My Report', explorer: '📊 My Report',
    scholar: '📊 Exam Results', campus: '📊 Assessment Results',
  });

  const download = async () => {
    if (!sel?.examId || !accessToken) return;
    setDownloading(true);
    await downloadAuthFile(accessToken, buildStudentReportPdfUrl(sel.examId), { fileName: `report-${sel.examId}.pdf` }).catch(() => {});
    setDownloading(false);
  };

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader title={title} subtitle={exams.length ? `${exams.length} exam${exams.length === 1 ? '' : 's'} on record` : 'Your exam results'} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.accent1} />}
      >
        {loading && exams.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" color={tokens.accent1} /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Couldn’t load your exams</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
          </View>
        ) : exams.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No exam results yet</Text>
            <Text style={styles.emptyText}>Your published exam results will appear here once the school releases them.</Text>
          </View>
        ) : (
          <>
            {/* Exam selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipStrip}>
              {exams.map((e, i) => {
                const active = i === safe;
                const hex = gradeHex(e.grade);
                return (
                  <TouchableOpacity key={e.examId ?? i} activeOpacity={0.85} onPress={() => setSelected(i)}
                    style={[styles.examChip, active && { borderColor: hex, backgroundColor: hex + '14' }]}>
                    <View style={[styles.examChipGrade, { backgroundColor: hex + '22' }]}>
                      <Text style={[styles.examChipGradeText, { color: hex }]}>{e.grade || '—'}</Text>
                    </View>
                    <Text style={[styles.examChipName, active && { color: '#2c2550' }]} numberOfLines={1}>{shortName(e.examName)}</Text>
                    <Text style={styles.examChipMean}>Mean {e.mean ?? '—'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected exam analytics */}
            {sel && (
              <View style={[styles.card, { borderRadius: tokens.radius }]}>
                <View style={styles.analyticsTop}>
                  <View style={[styles.gradeSquare, { backgroundColor: gradeHex(sel.grade) + '18' }]}>
                    <Text style={[styles.gradeSquareText, { color: gradeHex(sel.grade) }]}>{sel.grade || '—'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.examName} numberOfLines={1}>{sel.examName}</Text>
                    <Text style={styles.examMean}>Mean {sel.mean ?? '—'}{sel.points ? ` · ${sel.points} pts` : ''}</Text>
                    {!!sel.overallRemark && <Text style={styles.remark} numberOfLines={2}>“{sel.overallRemark}”</Text>}
                  </View>
                </View>

                {/* Subject breakdown */}
                <Text style={styles.breakTitle}>Subjects</Text>
                {(sel.subjects ?? []).length > 0 ? (
                  <View>
                    {(sel.subjects as SubjectScore[]).map((s, i) => {
                      const hex = gradeHex(s.grade);
                      const d = num(s.scoreDiff);
                      return (
                        <View key={i} style={[styles.subjRow, i > 0 && styles.divider]}>
                          <View style={[styles.subjDot, { backgroundColor: hex }]} />
                          <Text style={styles.subjName} numberOfLines={1}>{s.subject || '—'}</Text>
                          {d != null && d !== 0 && (
                            <Text style={[styles.subjDelta, { color: d > 0 ? '#15c98c' : '#ef4444' }]}>{d > 0 ? '↑' : '↓'}{Math.abs(d)}</Text>
                          )}
                          <Text style={styles.subjScore}>{s.score ?? '—'}</Text>
                          {!!s.grade && <View style={[styles.subjGrade, { backgroundColor: hex + '18' }]}><Text style={[styles.subjGradeText, { color: hex }]}>{s.grade}</Text></View>}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noSubjects}>No subject breakdown recorded for this exam.</Text>
                )}

                <TouchableOpacity style={[styles.pdfBtn, { backgroundColor: tokens.accent1 }]} activeOpacity={0.85} onPress={download} disabled={downloading}>
                  {downloading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="download-outline" size={16} color="#fff" /><Text style={styles.pdfBtnText}>Download report card</Text></>}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  center: { paddingVertical: 60, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 44 },
  emptyIcon: { fontSize: 54, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  emptyText: { fontSize: 13, color: '#6f679c', fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  retry: { color: '#7c5cff', fontWeight: '800', fontSize: 13, marginTop: 10 },

  chipStrip: { gap: 10, paddingRight: 8, paddingBottom: 4, marginBottom: 14 },
  examChip: { width: 132, backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#ece8fb', padding: 12 },
  examChipGrade: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  examChipGradeText: { fontSize: 15, fontWeight: '900' },
  examChipName: { fontSize: 12.5, fontWeight: '800', color: '#6f679c' },
  examChipMean: { fontSize: 11, fontWeight: '600', color: '#9b93c4', marginTop: 2 },

  card: {
    backgroundColor: '#fff', padding: 14, borderWidth: 2, borderColor: '#fff',
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  analyticsTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  gradeSquare: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gradeSquareText: { fontSize: 20, fontWeight: '900' },
  examName: { fontSize: 15, fontWeight: '800', color: '#2c2550' },
  examMean: { fontSize: 12, fontWeight: '700', color: '#6f679c', marginTop: 2 },
  remark: { fontSize: 11.5, fontStyle: 'italic', color: '#9b93c4', marginTop: 4 },

  breakTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550', marginBottom: 4 },
  subjRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  divider: { borderTopWidth: 2, borderTopColor: '#f2eefc' },
  subjDot: { width: 8, height: 8, borderRadius: 4 },
  subjName: { flex: 1, fontSize: 13, fontWeight: '700', color: '#2c2550' },
  subjDelta: { fontSize: 11, fontWeight: '800' },
  subjScore: { fontSize: 13, fontWeight: '800', color: '#2c2550', minWidth: 44, textAlign: 'right' },
  subjGrade: { minWidth: 30, alignItems: 'center', borderRadius: 7, paddingVertical: 2, paddingHorizontal: 4 },
  subjGradeText: { fontSize: 10.5, fontWeight: '900' },
  noSubjects: { fontSize: 12.5, color: '#9b93c4', fontWeight: '600', paddingVertical: 12, textAlign: 'center' },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  pdfBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
