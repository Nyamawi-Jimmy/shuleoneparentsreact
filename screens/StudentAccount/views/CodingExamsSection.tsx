// 🏅 Coding exams — end-of-term coding & robotics assessments, ported from
// the web StudentExams: list what's open, sit one (MCQ / short / long /
// code answers), and read the released report (score, band, topics,
// per-question feedback).

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import {
  CodingExamRow, CodingExamTake, CodingExamReport,
  listCodingExams, startCodingExam, submitCodingExam, getCodingExamReport,
} from '../../../api/coding-student';

const BANDS: Record<number, string> = { 4: 'Exceeding', 3: 'Meeting', 2: 'Approaching', 1: 'Below' };

export const CodingExamsSection: React.FC<{ studentId: number | null }> = ({ studentId }) => {
  const { accessToken } = useAuth();
  const [exams, setExams] = useState<CodingExamRow[] | null>(null);
  const [take, setTake] = useState<CodingExamTake | null>(null);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [report, setReport] = useState<CodingExamReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const loadList = useCallback(() => {
    if (!accessToken || studentId == null) return;
    listCodingExams(accessToken, studentId)
      .then((d) => setExams(Array.isArray(d) ? d : []))
      .catch(() => setExams([]));
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { loadList(); }, [loadList]));

  const openExam = async (exam: CodingExamRow) => {
    if (!accessToken || studentId == null) return;
    setErr(''); setBusy(true);
    try {
      const t = await startCodingExam(accessToken, studentId, exam.id);
      setTake(t);
      setResponses((t?.responses as Record<number, string>) ?? {});
    } catch {
      setErr('Could not open this exam. Please try again.');
    }
    setBusy(false);
  };

  const openReport = async (exam: CodingExamRow) => {
    if (!accessToken || studentId == null || exam.attemptId == null) return;
    setErr(''); setBusy(true);
    try {
      setReport(await getCodingExamReport(accessToken, studentId, exam.attemptId));
    } catch {
      setErr('Results are not available yet.');
    }
    setBusy(false);
  };

  const submit = async () => {
    if (!accessToken || studentId == null || !take?.attemptId) return;
    setBusy(true); setErr('');
    try {
      const answers = (take.questions ?? []).map((q) => ({ questionId: q.id, response: responses[q.id] ?? '' }));
      await submitCodingExam(accessToken, studentId, take.attemptId, answers);
      setTake(null);
      loadList();
    } catch {
      setErr('Submit failed — check your connection and try again.');
    }
    setBusy(false);
  };

  // ── Report view ───────────────────────────────────────
  if (report) {
    return (
      <View>
        <TouchableOpacity onPress={() => { setReport(null); loadList(); }} hitSlop={8}>
          <Text style={styles.back}>← Exams</Text>
        </TouchableOpacity>
        <LinearGradient colors={['#7c5cff', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reportHero}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rhTitle}>{report.examTitle}</Text>
            <Text style={styles.rhSub}>
              {report.term ? `Term ${report.term}` : ''}{report.examYear ? ` · ${report.examYear}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.rhScore}>{report.totalScore ?? 0}<Text style={styles.rhMax}>/{report.maxScore ?? 0}</Text></Text>
            <Text style={styles.rhBand}>
              {report.percent ?? 0}% · {BANDS[report.band ?? 0] ?? `Band ${report.band}`}
              {report.passed != null ? (report.passed ? ' · Passed' : ' · Not yet') : ''}
            </Text>
          </View>
        </LinearGradient>

        {(report.topics ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.secTitle}>By topic</Text>
            {report.topics!.map((t) => {
              const p = t.max > 0 ? Math.round((t.earned / t.max) * 100) : 0;
              return (
                <View key={t.subStrandId} style={styles.topicRow}>
                  <Text style={styles.topicName} numberOfLines={1}>{t.name}</Text>
                  <View style={styles.topicBar}>
                    <View style={[styles.topicFill, { width: `${p}%` }]} />
                  </View>
                  <Text style={styles.topicN}>{t.earned}/{t.max}</Text>
                </View>
              );
            })}
          </View>
        )}

        {(report.questions ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.secTitle}>Question feedback</Text>
            {report.questions!.map((q, i) => (
              <View key={i} style={styles.fbRow}>
                <View style={styles.fbHead}>
                  <Text style={styles.fbN}>Q{i + 1}</Text>
                  <Text style={styles.fbPrompt} numberOfLines={2}>{q.prompt}</Text>
                  <Text style={styles.fbMarks}>{q.marksAwarded ?? 0}/{q.maxMarks ?? 0}</Text>
                </View>
                {!!q.feedback && (
                  <Text style={styles.fbText}>
                    {q.feedback}{q.markedBy ? ` — ${q.markedBy.toLowerCase()}` : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Take view ─────────────────────────────────────────
  if (take) {
    const readOnly = !!(take.exam?.attemptStatus && take.exam.attemptStatus !== 'IN_PROGRESS');
    return (
      <View>
        <TouchableOpacity onPress={() => { setTake(null); loadList(); }} hitSlop={8}>
          <Text style={styles.back}>← Exams</Text>
        </TouchableOpacity>
        <Text style={styles.takeTitle}>{take.exam?.title}</Text>
        <Text style={styles.takeSub}>
          {readOnly ? 'Submitted — awaiting results.' : 'Answer every question, then submit. You can only submit once.'}
        </Text>
        {!!err && <Text style={styles.err}>{err}</Text>}

        {(take.questions ?? []).map((q, i) => (
          <View key={q.id} style={styles.card}>
            <View style={styles.fbHead}>
              <Text style={styles.fbN}>Q{i + 1}</Text>
              <Text style={styles.fbPrompt}>{q.prompt}</Text>
              {q.maxMarks != null && <Text style={styles.fbMarks}>{q.maxMarks} mk</Text>}
            </View>

            {q.type === 'MCQ' ? (
              (q.options ?? []).map((opt, idx) => {
                const on = String(responses[q.id]) === String(idx);
                return (
                  <TouchableOpacity key={idx} activeOpacity={0.8} disabled={readOnly}
                    style={[styles.opt, on && styles.optOn]}
                    onPress={() => setResponses((r) => ({ ...r, [q.id]: String(idx) }))}>
                    <Text style={[styles.optText, on && styles.optTextOn]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TextInput
                style={[styles.input, q.type !== 'SHORT' && styles.area, q.type === 'CODE' && styles.code]}
                editable={!readOnly}
                multiline={q.type !== 'SHORT'}
                numberOfLines={q.type === 'CODE' ? 8 : q.type === 'SHORT' ? 1 : 4}
                placeholder={q.type === 'CODE' ? `Write your ${q.language || 'code'} here…` : 'Write your answer…'}
                placeholderTextColor="#9b94c4"
                value={responses[q.id] ?? (q.type === 'CODE' ? (q.starterCode || '') : '')}
                onChangeText={(t) => setResponses((r) => ({ ...r, [q.id]: t }))}
              />
            )}
          </View>
        ))}

        {!readOnly && (
          <TouchableOpacity activeOpacity={0.85} disabled={busy} onPress={submit}>
            <LinearGradient colors={busy ? ['#cbc6e2', '#a8a3c4'] : ['#7c5cff', '#22d3ee']} style={styles.submit}>
              <Text style={styles.submitText}>{busy ? 'Submitting…' : '📤 Submit exam'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── List view ─────────────────────────────────────────
  return (
    <View>
      <Text style={styles.headTitle}>🎓 Coding exams</Text>
      <Text style={styles.headSub}>End-of-term coding & robotics assessments for your class.</Text>
      {!!err && <Text style={styles.err}>{err}</Text>}

      {exams === null ? (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 26 }]}>
          <ActivityIndicator color="#7c5cff" />
        </View>
      ) : exams.length === 0 ? (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 26 }]}>
          <Text style={{ fontSize: 30 }}>🏅</Text>
          <Text style={styles.emptyTitle}>No exams open right now.</Text>
          <Text style={styles.emptySub}>Your tutor will open the term exam when it’s time.</Text>
        </View>
      ) : (
        exams.map((e) => {
          const released = e.attemptStatus === 'RELEASED';
          const submitted = e.attemptStatus === 'SUBMITTED' || e.attemptStatus === 'MARKED';
          return (
            <View key={e.id} style={[styles.card, styles.examRow]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.examTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.examMeta}>
                  {e.term ? `Term ${e.term}` : 'Term exam'}
                  {e.totalMarks ? ` · ${e.totalMarks} marks` : ''}
                  {e.durationMinutes ? ` · ⏱ ${e.durationMinutes} min` : ''}
                </Text>
              </View>
              {released ? (
                <TouchableOpacity style={styles.ghostBtn} disabled={busy} onPress={() => openReport(e)}>
                  <Text style={styles.ghostBtnText}>View report</Text>
                </TouchableOpacity>
              ) : submitted ? (
                <View style={styles.donePill}><Text style={styles.donePillText}>✓ Submitted</Text></View>
              ) : (
                <TouchableOpacity activeOpacity={0.85} disabled={busy} onPress={() => openExam(e)}>
                  <LinearGradient colors={['#7c5cff', '#22d3ee']} style={styles.goBtn}>
                    <Text style={styles.goBtnText}>{e.attemptStatus === 'IN_PROGRESS' ? 'Continue' : 'Start'} ›</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </View>
  );
};

// =================================================================
const styles = StyleSheet.create({
  headTitle: { fontSize: 16.5, fontWeight: '800', color: '#2c2550' },
  headSub: { fontSize: 12, color: '#6f679c', fontWeight: '600', marginTop: 3, marginBottom: 12 },
  back: { fontSize: 13, fontWeight: '800', color: '#6f679c', marginBottom: 10 },
  err: {
    backgroundColor: '#fff1f1', color: '#b42318', borderRadius: 12,
    padding: 10, fontSize: 12, fontWeight: '700', marginBottom: 10, overflow: 'hidden',
  },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 14, marginBottom: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  secTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550', marginBottom: 10 },

  examRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550' },
  examMeta: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 3 },
  goBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  goBtnText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
  ghostBtn: {
    borderWidth: 1.5, borderColor: '#7c5cff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  ghostBtnText: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },
  donePill: { backgroundColor: '#e9f9ef', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  donePillText: { color: '#15803d', fontWeight: '800', fontSize: 11.5 },

  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550', marginTop: 8 },
  emptySub: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 3 },

  takeTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  takeSub: { fontSize: 12, color: '#6f679c', fontWeight: '600', marginTop: 3, marginBottom: 12 },
  fbHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  fbN: { fontWeight: '800', color: '#7c5cff', fontSize: 12.5 },
  fbPrompt: { flex: 1, fontSize: 13, fontWeight: '700', color: '#2c2550', lineHeight: 18 },
  fbMarks: { fontSize: 11, fontWeight: '800', color: '#6f679c' },
  fbRow: { borderTopWidth: 1, borderTopColor: '#f2effc', paddingTop: 9, marginTop: 9 },
  fbText: { fontSize: 12, color: '#6f679c', fontWeight: '500', lineHeight: 17 },

  opt: {
    borderWidth: 2, borderColor: '#ece8fb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 7,
  },
  optOn: { borderColor: '#7c5cff', backgroundColor: '#efeaff' },
  optText: { fontSize: 13, fontWeight: '600', color: '#2c2550' },
  optTextOn: { color: '#5b45c9', fontWeight: '800' },
  input: {
    borderWidth: 2, borderColor: '#ece8fb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontWeight: '600', color: '#2c2550', backgroundColor: '#fbfaff',
  },
  area: { minHeight: 90, textAlignVertical: 'top' },
  code: {
    fontFamily: 'monospace', fontSize: 12.5, minHeight: 150,
    backgroundColor: '#1e1b3a', color: '#e8e6ff', borderColor: '#2a2550',
  },
  submit: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 10 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  reportHero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  rhTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  rhSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  rhScore: { color: '#fff', fontSize: 26, fontWeight: '800' },
  rhMax: { fontSize: 14, fontWeight: '700', opacity: 0.85 },
  rhBand: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },

  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 },
  topicName: { width: '36%', fontSize: 12, fontWeight: '600', color: '#2c2550' },
  topicBar: { flex: 1, height: 8, borderRadius: 99, backgroundColor: '#efeaff', overflow: 'hidden' },
  topicFill: { height: '100%', borderRadius: 99, backgroundColor: '#7c5cff' },
  topicN: { width: 44, textAlign: 'right', fontSize: 11.5, fontWeight: '800', color: '#2c2550' },
});
