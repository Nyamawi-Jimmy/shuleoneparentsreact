// In-app assessment player, ported from the web AssignmentPlayer's core
// flow: load → intro (rules + attempt gate) → take (question pager, timer,
// MCQ + written answers) → submit (confirm unanswered) → result → marked
// review (choices keyed correct/yours, written answers + marking guide).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import {
  getAssignmentExam, submitAssignmentExam, getAssignmentReview,
} from '../../../api/student';
import {
  AssignmentExam, AssignmentSubmitResult, AssignmentReview,
} from '../../../api/student.types';

type Phase = 'loading' | 'error' | 'gate' | 'intro' | 'running' | 'result' | 'loadingReview' | 'review';
type AnswerVal = { choiceId?: number; text?: string };

const isMcq = (t: string | null | undefined) => t === 'Multiple choices';

const fmtClock = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
};

export const TaskPlayer: React.FC<{
  examId: number;
  onClose: () => void;
  onSubmitted: (result: AssignmentSubmitResult) => void;
}> = ({ examId, onClose, onSubmitted }) => {
  const { accessToken } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [exam, setExam] = useState<AssignmentExam | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerVal>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssignmentSubmitResult | null>(null);
  const [review, setReview] = useState<AssignmentReview | null>(null);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const startMsRef = useRef(0);
  const submittedRef = useRef(false);

  const loadReview = useCallback(() => {
    if (!accessToken) return;
    setPhase('loadingReview');
    setReviewErr(null);
    getAssignmentReview(accessToken, examId)
      .then((data) => { setReview(data); setPhase('review'); })
      .catch((e: any) => { setReviewErr(e?.message || 'Could not load your results.'); setPhase('review'); });
  }, [accessToken, examId]);

  // Load the paper; route to intro / review / gate exactly like the web.
  useEffect(() => {
    if (!accessToken) return;
    let off = false;
    getAssignmentExam(accessToken, examId)
      .then((data) => {
        if (off) return;
        setExam(data);
        const st = data?.attempt;
        const submittedBefore = !!(st && (st.submitted || st.submittedAt
          || st.status === 'COMPLETED' || st.status === 'AUTO_CLOSED'));
        const canRetakeNow = submittedBefore && data?.allowRetakes && st?.canAttempt === true;
        if (canRetakeNow) setPhase('intro');
        else if (submittedBefore) loadReview();
        else if (st && st.reason === 'CLOSED') loadReview();
        else if (st && st.canAttempt === false) setPhase('gate');
        else setPhase('intro');
      })
      .catch((e: any) => {
        if (!off) { setLoadErr(e?.message || 'Could not open this assessment.'); setPhase('error'); }
      });
    return () => { off = true; };
  }, [accessToken, examId, loadReview]);

  const questions = exam?.questions ?? [];
  const total = questions.length;
  const current = questions[idx] ?? null;
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return a && (isMcq(q.type) ? a.choiceId != null : !!(a.text && a.text.trim()));
  }).length;

  const start = () => {
    startedAtRef.current = new Date().toISOString();
    startMsRef.current = Date.now();
    submittedRef.current = false;
    if (exam?.durationMinutes && exam.durationMinutes > 0) setRemaining(exam.durationMinutes * 60);
    setIdx(0);
    setAnswers({});
    setPhase('running');
  };

  const doSubmit = useCallback(async (auto = false) => {
    if (!accessToken || submittedRef.current) return;
    const qs = exam?.questions ?? [];
    const answered = qs.filter((q) => {
      const a = answers[q.id];
      return a && (isMcq(q.type) ? a.choiceId != null : !!(a.text && a.text.trim()));
    }).length;
    if (!auto && answered < qs.length) {
      const ok = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Submit with blanks?',
          `You've answered ${answered} of ${qs.length} questions.`,
          [
            { text: 'Keep working', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Submit anyway', onPress: () => resolve(true) },
          ],
        );
      });
      if (!ok) return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payloadAnswers = qs.reduce<({ questionId: number; choiceId: number } | { questionId: number; text: string })[]>((acc, q) => {
        const a = answers[q.id];
        if (!a) return acc;
        if (isMcq(q.type)) { if (a.choiceId != null) acc.push({ questionId: q.id, choiceId: a.choiceId }); }
        else if (a.text && a.text.trim()) acc.push({ questionId: q.id, text: a.text });
        return acc;
      }, []);
      const res = await submitAssignmentExam(accessToken, examId, {
        startedAt: startedAtRef.current,
        durationSpentSeconds: Math.max(0, Math.round((Date.now() - startMsRef.current) / 1000)),
        answers: payloadAnswers,
      });
      setResult(res);
      setPhase('result');
      onSubmitted(res);
    } catch (e: any) {
      submittedRef.current = false;
      Alert.alert('Submit failed', e?.message || 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, exam, answers, examId, onSubmitted]);

  // Countdown — auto-submits at zero (deferred a tick so the effect stays pure).
  useEffect(() => {
    if (phase !== 'running' || remaining == null) return;
    if (remaining <= 0) {
      const t0 = setTimeout(() => { void doSubmit(true); }, 0);
      return () => clearTimeout(t0);
    }
    const t = setInterval(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, remaining, doSubmit]);

  const tryClose = () => {
    if (phase === 'running') {
      Alert.alert('Leave without submitting?', "Your answers won't be saved if you leave now.", [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onClose },
      ]);
      return;
    }
    onClose();
  };

  // ── Chrome ────────────────────────────────────────────
  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Text style={styles.topTitle} numberOfLines={1}>{exam?.title ?? 'Assessment'}</Text>
        {phase === 'running' && remaining != null && (
          <View style={[styles.timer, remaining <= 60 && styles.timerLow]}>
            <Text style={[styles.timerText, remaining <= 60 && { color: '#fff' }]}>⏱ {fmtClock(remaining)}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.closeX} hitSlop={8} onPress={tryClose}>
          <Ionicons name="close" size={17} color="#2c2550" />
        </TouchableOpacity>
      </View>

      {phase === 'loading' && (
        <View style={styles.center}><ActivityIndicator size="large" color="#7c5cff" /></View>
      )}

      {phase === 'error' && (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>😕</Text>
          <Text style={styles.mutedCenter}>{loadErr}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.linkBtn}>Close</Text></TouchableOpacity>
        </View>
      )}

      {phase === 'gate' && (
        <View style={styles.center}>
          <Text style={{ fontSize: 40 }}>🔒</Text>
          <Text style={styles.cardTitle}>Not open yet</Text>
          <Text style={styles.mutedCenter}>
            {exam?.attempt?.reason === 'CLOSED'
              ? 'This assessment has closed.'
              : 'Your teacher hasn’t opened this assessment yet — check back soon.'}
          </Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.linkBtn}>Close</Text></TouchableOpacity>
        </View>
      )}

      {phase === 'intro' && exam && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>📝</Text>
            <Text style={styles.introTitle}>{exam.title}</Text>
            <View style={styles.tagRow}>
              {!!exam.category && <Text style={styles.tag}>{exam.category}</Text>}
              <Text style={styles.tag}>{exam.questionCount ?? total} question{(exam.questionCount ?? total) === 1 ? '' : 's'}</Text>
              {exam.totalMarks != null && <Text style={styles.tag}>{exam.totalMarks} marks</Text>}
            </View>
            <View style={styles.rules}>
              <Text style={styles.rule}>
                {exam.durationMinutes
                  ? `⏱ You'll have ${exam.durationMinutes} minutes once you start — it auto-submits at zero.`
                  : '⏱ No time limit.'}
              </Text>
              <Text style={styles.rule}>✅ You can move between questions before submitting.</Text>
              {!exam.allowRetakes && <Text style={styles.rule}>⚠️ You can submit once, so check your answers first.</Text>}
            </View>
            {!!exam.attempt?.submitted && exam.allowRetakes && (
              <Text style={styles.retakeNote}>
                You’ve submitted before — your best work is what counts.
                {exam.maxTakes && exam.maxTakes > 0
                  ? ` This will be take ${(exam.attempt?.attemptNumber || 0) + 1} of ${exam.maxTakes}.`
                  : ''}
              </Text>
            )}
            <TouchableOpacity activeOpacity={0.85} onPress={start}>
              <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.cta}>
                <Text style={styles.ctaText}>
                  {exam.attempt?.submitted && exam.allowRetakes ? 'Retake →' : 'Start →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            {!!exam.attempt?.submitted && (
              <TouchableOpacity onPress={loadReview}>
                <Text style={styles.linkBtn}>See my last result</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {phase === 'running' && current && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Question {idx + 1} of {total}</Text>
            <Text style={styles.progressText}>{answeredCount}/{total} answered</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${((idx + 1) / total) * 100}%` }]} />
          </View>
          <View style={styles.dots}>
            {questions.map((q, i) => {
              const a = answers[q.id];
              const done = a && (isMcq(q.type) ? a.choiceId != null : !!(a.text && a.text.trim()));
              return (
                <TouchableOpacity key={q.id} hitSlop={4} onPress={() => setIdx(i)}
                  style={[styles.dot, done && styles.dotDone, i === idx && styles.dotNow]} />
              );
            })}
          </View>

          {/* Question */}
          <View style={styles.qCard}>
            <Text style={styles.qType}>{isMcq(current.type) ? 'MULTIPLE CHOICE' : 'WRITTEN ANSWER'}
              {current.maxMarks != null ? `  ·  ${current.maxMarks} mark${current.maxMarks === 1 ? '' : 's'}` : ''}
            </Text>
            <Text style={styles.qText}>{current.questionText}</Text>

            {isMcq(current.type) ? (
              (current.choices ?? []).map((c) => {
                const on = answers[current.id]?.choiceId === c.id;
                return (
                  <TouchableOpacity key={c.id} activeOpacity={0.8}
                    style={[styles.choice, on && styles.choiceOn]}
                    onPress={() => setAnswers((m) => ({ ...m, [current.id]: { choiceId: c.id } }))}>
                    <View style={[styles.choiceLbl, on && { backgroundColor: '#7c5cff' }]}>
                      <Text style={[styles.choiceLblText, on && { color: '#fff' }]}>{c.label}</Text>
                    </View>
                    <Text style={[styles.choiceText, on && { color: '#5b45c9', fontWeight: '800' }]}>{c.text}</Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TextInput
                style={styles.written}
                multiline
                placeholder="Write your answer…"
                placeholderTextColor="#9b94c4"
                value={answers[current.id]?.text ?? ''}
                onChangeText={(t) => setAnswers((m) => ({ ...m, [current.id]: { text: t } }))}
              />
            )}
          </View>

          {/* Nav */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, idx === 0 && { opacity: 0.4 }]}
              disabled={idx === 0}
              onPress={() => setIdx((i) => Math.max(0, i - 1))}>
              <Ionicons name="chevron-back" size={18} color="#2c2550" />
            </TouchableOpacity>

            {idx < total - 1 ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setIdx((i) => Math.min(total - 1, i + 1))}>
                <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.nextBtn}>
                  <Text style={styles.ctaText}>Next</Text>
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.85} disabled={submitting} onPress={() => doSubmit()}>
                <LinearGradient colors={submitting ? ['#cbc6e2', '#a8a3c4'] : ['#15c98c', '#0fae78']} style={styles.nextBtn}>
                  <Text style={styles.ctaText}>{submitting ? 'Submitting…' : '📤 Submit'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {phase === 'result' && (
        <View style={styles.center}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
          <Text style={styles.cardTitle}>Handed in!</Text>
          {result?.pendingMarking ? (
            <Text style={styles.mutedCenter}>Your written answers will be marked by your teacher — results come later.</Text>
          ) : result?.score != null ? (
            <Text style={styles.resultScore}>{result.score}/{result.maxScore ?? '—'}</Text>
          ) : (
            <Text style={styles.mutedCenter}>Your answers are in — results aren’t released yet.</Text>
          )}
          <TouchableOpacity activeOpacity={0.85} onPress={loadReview}>
            <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.cta}>
              <Text style={styles.ctaText}>See my paper →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.linkBtn}>Done</Text></TouchableOpacity>
        </View>
      )}

      {phase === 'loadingReview' && (
        <View style={styles.center}><ActivityIndicator size="large" color="#7c5cff" /></View>
      )}

      {phase === 'review' && (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {reviewErr ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 40 }}>😕</Text>
              <Text style={styles.mutedCenter}>{reviewErr}</Text>
            </View>
          ) : (
            <>
              <View style={styles.rvTop}>
                {review?.released && review.score != null ? (
                  <>
                    <Text style={styles.rvScore}>{review.score}<Text style={styles.rvMax}> / {review.maxScore ?? '—'}</Text></Text>
                    {review.pendingMarking && <Text style={styles.rvNote}>Written answers are still being marked.</Text>}
                  </>
                ) : (
                  <Text style={styles.rvPending}>⏳ Your answers are in — results aren’t released yet.</Text>
                )}
              </View>

              {(review?.items ?? []).map((it, i) => {
                const released = !!review?.released;
                return (
                  <View key={it.questionId ?? i} style={styles.rvItem}>
                    <View style={styles.rvHead}>
                      <Text style={styles.rvQ}>Q{it.sequenceNumber ?? i + 1}</Text>
                      <Text style={[
                        styles.rvMarks,
                        released && it.awardedMarks != null && (it.correct ? { color: '#0fae78' } : it.awardedMarks === 0 ? { color: '#ef4444' } : null),
                      ]}>
                        {released && it.awardedMarks != null
                          ? `${it.awardedMarks} / ${it.maxMarks ?? '—'}`
                          : `${it.maxMarks ?? '—'} mark${it.maxMarks === 1 ? '' : 's'}`}
                      </Text>
                    </View>
                    <Text style={styles.rvText}>{it.questionText}</Text>

                    {isMcq(it.type) && it.choices ? (
                      it.choices.map((c) => {
                        const good = released && c.isCorrect;
                        const badPick = released && c.chosen && !c.isCorrect;
                        return (
                          <View key={c.id} style={[
                            styles.rvChoice,
                            good && { borderColor: '#15c98c', backgroundColor: '#eafef3' },
                            badPick && { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
                            !released && c.chosen && { borderColor: '#7c5cff', backgroundColor: '#efeaff' },
                          ]}>
                            <Text style={styles.rvChoiceLbl}>{c.label}</Text>
                            <Text style={styles.rvChoiceText}>{c.text}</Text>
                            {c.chosen && <Text style={styles.rvTag}>You</Text>}
                            {good && !c.chosen && <Text style={[styles.rvTag, { color: '#0fae78' }]}>Correct</Text>}
                          </View>
                        );
                      })
                    ) : (
                      <>
                        <View style={styles.rvAnswerBox}>
                          <Text style={styles.rvAnswerText}>{it.yourAnswer || '—'}</Text>
                        </View>
                        {released && !!it.markingScheme && (
                          <Text style={styles.rvScheme}>📖 Marking guide: {it.markingScheme}</Text>
                        )}
                      </>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity onPress={onClose}><Text style={styles.linkBtn}>Close</Text></TouchableOpacity>
            </>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// =================================================================
const styles = StyleSheet.create({
  wrap: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  body: { padding: 16 },

  top: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  topTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: '#2c2550' },
  timer: { backgroundColor: '#efeaff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  timerLow: { backgroundColor: '#ef4444' },
  timerText: { fontSize: 12.5, fontWeight: '800', color: '#5b45c9' },
  closeX: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    alignItems: 'center', justifyContent: 'center',
  },

  mutedCenter: { fontSize: 13, color: '#6f679c', fontWeight: '600', textAlign: 'center', lineHeight: 19 },
  linkBtn: { color: '#7c5cff', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 14 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },

  introCard: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 20,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  introTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550', textAlign: 'center', marginTop: 8 },
  tagRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, flexWrap: 'wrap', marginTop: 10 },
  tag: {
    fontSize: 11, fontWeight: '800', color: '#5b45c9',
    backgroundColor: '#efeaff', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden',
  },
  rules: { marginTop: 14, gap: 7 },
  rule: { fontSize: 12.5, color: '#4b4570', fontWeight: '600', lineHeight: 18 },
  retakeNote: {
    fontSize: 12, color: '#92400e', fontWeight: '600', backgroundColor: '#fff7e6',
    borderRadius: 10, padding: 10, marginTop: 12, lineHeight: 17,
  },
  cta: { borderRadius: 999, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 11.5, fontWeight: '700', color: '#6f679c' },
  bar: { height: 6, borderRadius: 99, backgroundColor: '#ece8fb', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99, backgroundColor: '#7c5cff' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 12 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ece8fb' },
  dotDone: { backgroundColor: '#a78bfa' },
  dotNow: { borderWidth: 2.5, borderColor: '#7c5cff', backgroundColor: '#fff' },

  qCard: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 16,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  qType: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#7c5cff' },
  qText: { fontSize: 15, fontWeight: '700', color: '#2c2550', lineHeight: 22, marginTop: 8, marginBottom: 14 },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: '#ece8fb', borderRadius: 14,
    padding: 12, marginBottom: 8,
  },
  choiceOn: { borderColor: '#7c5cff', backgroundColor: '#efeaff' },
  choiceLbl: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#f4f1ff',
    alignItems: 'center', justifyContent: 'center',
  },
  choiceLblText: { fontSize: 12, fontWeight: '800', color: '#5b45c9' },
  choiceText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#2c2550', lineHeight: 19 },
  written: {
    borderWidth: 2, borderColor: '#ece8fb', borderRadius: 14,
    padding: 12, minHeight: 120, textAlignVertical: 'top',
    fontSize: 13.5, fontWeight: '600', color: '#2c2550', backgroundColor: '#fbfaff',
  },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  navBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 24, paddingVertical: 13,
  },

  resultScore: { fontSize: 34, fontWeight: '800', color: '#0fae78' },

  rvTop: { alignItems: 'center', marginBottom: 14 },
  rvScore: { fontSize: 34, fontWeight: '800', color: '#2c2550' },
  rvMax: { fontSize: 17, color: '#6f679c', fontWeight: '700' },
  rvPending: {
    fontSize: 12.5, fontWeight: '700', color: '#92400e', textAlign: 'center',
    backgroundColor: '#fff7e6', borderRadius: 12, padding: 12, overflow: 'hidden',
  },
  rvNote: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 4 },
  rvItem: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 14, marginBottom: 10,
  },
  rvHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rvQ: { fontSize: 12.5, fontWeight: '800', color: '#7c5cff' },
  rvMarks: { fontSize: 12, fontWeight: '800', color: '#6f679c' },
  rvText: { fontSize: 13.5, fontWeight: '700', color: '#2c2550', lineHeight: 19, marginBottom: 10 },
  rvChoice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#ece8fb', borderRadius: 12,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 6,
  },
  rvChoiceLbl: { fontSize: 11.5, fontWeight: '800', color: '#5b45c9' },
  rvChoiceText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#2c2550' },
  rvTag: { fontSize: 10, fontWeight: '800', color: '#7c5cff' },
  rvAnswerBox: { backgroundColor: '#f8f6ff', borderRadius: 12, padding: 11 },
  rvAnswerText: { fontSize: 12.5, fontWeight: '600', color: '#2c2550', lineHeight: 18 },
  rvScheme: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 8, lineHeight: 16 },
});
