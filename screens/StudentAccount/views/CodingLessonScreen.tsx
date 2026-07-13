// The coding lesson experience as a gamified quest stage, mirroring the web
// CodingLessonPlayer: learn (🎯 Mission) → play (🎮 Code) → prove (🏆 Challenge)
// → teacher's mark (🏅 Marks), plus the shared-device team bar ("adding your
// team") and the practice-mode note when the teacher hasn't opened the lesson.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import {
  CodingLessonDetail, CodingProgressRow, Classmate,
  CodingLessonGrade, CodingQuiz, QuizAnswerOut, QuizAttemptResult,
  codingLessonSeen, getLessonPartners, setLessonPartners, getClassmates,
  getLessonGrade, getLessonQuiz, submitQuizAttempt, getQuestionHint,
} from '../../../api/coding-student';

// Per-modality theme for the lesson hero — mirrors the web MODALITY map.
const MODALITY: Record<string, { icon: string; label: string; c1: string; c2: string }> = {
  SCRATCH: { icon: '🐱', label: 'Scratch', c1: '#ff8a3d', c2: '#ff5e9c' },
  BLOCKS: { icon: '🧩', label: 'Blocks', c1: '#ff9a3d', c2: '#ff6aa0' },
  WEB: { icon: '🌐', label: 'Web', c1: '#3a8bff', c2: '#e91e63' },
  PYTHON: { icon: '🐍', label: 'Python', c1: '#1fc99a', c2: '#0f9e8e' },
  MICROBIT: { icon: '📟', label: 'micro:bit', c1: '#00b8d4', c2: '#3a8bff' },
  ARDUINO: { icon: '🔌', label: 'Arduino', c1: '#19b39b', c2: '#1577c2' },
  ROBOT: { icon: '🤖', label: 'Robot', c1: '#e91e63', c2: '#ff8fc0' },
  TEXT: { icon: '📝', label: 'Activity', c1: '#ff8fc0', c2: '#ff9ec7' },
  NONE: { icon: '📘', label: 'Lesson', c1: '#e91e63', c2: '#ff8fc0' },
};

// Every sandbox kind opens the in-app playground runner (real engines).
const PLAYGROUND_ROUTE: Record<string, string> = {
  SCRATCH: '/student/playground?kind=SCRATCH',
  BLOCKS: '/student/playground?kind=BLOCKS',
  PYTHON: '/student/playground?kind=PYTHON',
  JS: '/student/playground?kind=JS',
  JAVASCRIPT: '/student/playground?kind=JS',
  WEB: '/student/playground?kind=WEB',
  SQL: '/student/playground?kind=SQL',
  BASH: '/student/playground?kind=BASH',
  TERMINAL: '/student/playground?kind=BASH',
  ROBOT: '/student/playground?kind=ROBOT',
  MICROBIT: '/student/playground?kind=MICROBIT',
  ARDUINO: '/student/playground?kind=ARDUINO',
};

interface Props {
  lesson: CodingLessonDetail;
  node: CodingProgressRow | null;
  playful: boolean;
  onClose: () => void;
  onProgressChanged: () => void;
}

export const CodingLessonScreen: React.FC<Props> = ({ lesson, node, playful, onClose, onProgressChanged }) => {
  const { accessToken } = useAuth();
  const outcomes = (lesson.learningOutcomes ?? []).filter((o) => o && o !== lesson.objective);
  const kind = lesson.sandbox?.kind ?? 'NONE';
  const modality = MODALITY[kind] || MODALITY.NONE;
  const hasSandbox = !!(lesson.sandbox && kind && kind !== 'NONE' && kind !== 'TEXT');
  const done = !!(node && (node.quizPassed || node.status === 'COMPLETED'));

  const [sec, setSec] = useState<'mission' | 'play' | 'prove' | 'mark'>(
    outcomes.length ? 'mission' : hasSandbox ? 'play' : 'prove',
  );
  const [grade, setGrade] = useState<CodingLessonGrade | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // Heartbeat while the lesson is on screen — feeds the tutor's live board.
  useEffect(() => {
    if (!accessToken) return;
    const ping = () => codingLessonSeen(accessToken, lesson.id).catch(() => {});
    ping();
    const t = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(t);
  }, [accessToken, lesson.id]);

  // Teacher's classwork mark (only once graded).
  useEffect(() => {
    if (!accessToken) return;
    let off = false;
    getLessonGrade(accessToken, lesson.id)
      .then((g) => { if (!off) setGrade(g && g.graded ? g : null); })
      .catch(() => {});
    return () => { off = true; };
  }, [accessToken, lesson.id]);

  const status = done
    ? { label: '✓ Completed', bg: '#eafef3', fg: '#0fae78' }
    : node?.teacherOpen
      ? { label: 'In class', bg: '#fff3da', fg: '#b45309' }
      : { label: 'In progress', bg: '#efeaff', fg: '#7c5cff' };

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Back + status */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="chevron-back" size={16} color="#2c2550" />
          <Text style={styles.backText}>Back to map</Text>
        </TouchableOpacity>
        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>

      {/* Team bar — shared-device group */}
      <PairBar lessonId={lesson.id} grade={lesson.grade} playful={playful} />

      {/* Practice mode note */}
      {node && !node.teacherOpen && (
        <View style={styles.practice}>
          <Text style={{ fontSize: 20 }}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.practiceTitle}>Practice mode</Text>
            <Text style={styles.practiceBody}>
              Your teacher hasn’t opened this lesson yet. You can read ahead and try the quiz,
              but marks and XP won’t be recorded until they open it.
            </Text>
          </View>
        </View>
      )}

      {/* Slim modality hero */}
      <LinearGradient colors={[modality.c1, modality.c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={{ fontSize: 30 }}>{modality.icon}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.heroEyebrow}>Stage {lesson.lessonNumber} · {modality.label}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{lesson.title}</Text>
        </View>
      </LinearGradient>

      {/* Section tabs */}
      <View style={styles.secTabs}>
        {outcomes.length > 0 && (
          <SecTab label="🎯 Mission" on={sec === 'mission'} onPress={() => setSec('mission')} />
        )}
        <SecTab label="🎮 Code" on={sec === 'play'} onPress={() => setSec('play')} />
        <SecTab label={`🏆 Challenge${done ? ' ✓' : ''}`} on={sec === 'prove'} onPress={() => setSec('prove')} />
        {grade?.graded && (
          <SecTab label="🏅 Marks" on={sec === 'mark'} onPress={() => setSec('mark')} />
        )}
      </View>

      {/* 1) Mission */}
      {sec === 'mission' && outcomes.length > 0 && (
        <View style={styles.card}>
          {!!lesson.objective && <Text style={styles.objective}>{lesson.objective}</Text>}
          {outcomes.map((o, i) => (
            <View key={i} style={styles.missionRow}>
              <View style={styles.missionCheck}><Text style={styles.missionCheckText}>✓</Text></View>
              <Text style={styles.missionText}>{o}</Text>
            </View>
          ))}
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSec(hasSandbox ? 'play' : 'prove')}>
            <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.cta}>
              <Text style={styles.ctaText}>{hasSandbox ? "Let’s code! →" : 'Take the challenge →'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* 2) Code */}
      {sec === 'play' && (
        <View style={styles.card}>
          <Text style={styles.secHeading}>🎮 Code</Text>
          {hasSandbox ? (
            <>
              <View style={styles.sandboxRow}>
                <Text style={{ fontSize: 34 }}>{modality.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sandboxTitle}>{modality.label} workspace</Text>
                  <Text style={styles.sandboxBody}>
                    {lesson.sandbox?.language ? `${lesson.sandbox.language} · ` : ''}
                    The full editor runs on the classroom computer — practise the same ideas here in the Playground.
                  </Text>
                </View>
              </View>
              {!!lesson.assignment?.instructions && (
                <View style={styles.brief}>
                  <Text style={styles.briefTitle}>📋 {lesson.assignment.title ?? 'Your task'}</Text>
                  <Text style={styles.briefBody}>{lesson.assignment.instructions}</Text>
                </View>
              )}
              {PLAYGROUND_ROUTE[kind] && (
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(PLAYGROUND_ROUTE[kind] as any)}>
                  <LinearGradient colors={[modality.c1, modality.c2]} style={styles.cta}>
                    <Text style={styles.ctaText}>Open the {modality.label} playground →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.sandboxRow}>
              <Text style={{ fontSize: 34 }}>🧠</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sandboxTitle}>Hands-on / discussion stage</Text>
                <Text style={styles.sandboxBody}>
                  No editor needed here — do the activity with your class, then take the challenge to continue.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 3) Challenge */}
      {sec === 'prove' && (
        showQuiz ? (
          <LessonQuizRN
            lessonId={lesson.id}
            onPassed={onProgressChanged}
            onClose={() => setShowQuiz(false)}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.secHeading}>🏆 Challenge</Text>
            {lesson.assignment ? (
              <>
                <Text style={styles.challengeTitle}>
                  {done ? '✅ Challenge complete!' : 'Beat the challenge to unlock the next stage'}
                </Text>
                <Text style={styles.challengeSub}>
                  Score 70%+ to pass.
                  {node?.lastQuizPercent != null ? `  ·  Your best: ${node.lastQuizPercent}%` : ''}
                </Text>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setShowQuiz(true)}>
                  <LinearGradient colors={['#f4a716', '#ff5e9c']} style={styles.cta}>
                    <Text style={styles.ctaText}>{done ? 'Retake →' : 'Start challenge →'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.challengeSub}>No challenge for this stage yet — explore and move on. 🚀</Text>
            )}
          </View>
        )
      )}

      {/* 4) Teacher's mark */}
      {sec === 'mark' && grade?.graded && (
        <View style={styles.card}>
          <View style={styles.gradeTop}>
            <Text style={styles.gradeScore}>
              {grade.teacherScore ?? '—'}
              {grade.totalMax ? <Text style={styles.gradeMax}>/{grade.totalMax}</Text> : null}
            </Text>
            <Text style={styles.gradeLabel}>Great effort! 🌟</Text>
          </View>
          {(grade.indicators ?? []).map((ind, i) => (
            <View key={i} style={styles.indRow}>
              <Text style={styles.indName}>{ind.indicator}</Text>
              <Text style={styles.indMark}>
                {ind.score ?? '–'}{ind.maxScore ? `/${ind.maxScore}` : ''}
              </Text>
              {!!ind.remark && <Text style={styles.indRemark}>{ind.remark}</Text>}
            </View>
          ))}
          {!!grade.feedback && <Text style={styles.gradeFb}>💬 {grade.feedback}</Text>}
        </View>
      )}

      <View style={{ height: 90 }} />
    </ScrollView>
  );
};

const SecTab: React.FC<{ label: string; on: boolean; onPress: () => void }> = ({ label, on, onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[styles.secTab, on && styles.secTabOn]}>
    <Text style={[styles.secTabText, on && styles.secTabTextOn]}>{label}</Text>
  </TouchableOpacity>
);

// =================================================================
// PairBar — "sharing a device? add your team": the logged-in learner
// declares who's working with them; presence mirrors to the tutor's
// board, quizzes stay individual.
// =================================================================
const PairBar: React.FC<{ lessonId: number; grade: number | null; playful: boolean }> = ({ lessonId, grade, playful }) => {
  const { accessToken } = useAuth();
  const [members, setMembers] = useState<Classmate[]>([]);
  const [mates, setMates] = useState<Classmate[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    let off = false;
    getLessonPartners(accessToken, lessonId)
      .then((d) => { if (!off) setMembers(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { off = true; };
  }, [accessToken, lessonId]);

  const loadMates = () => {
    if (mates || !accessToken) return;
    getClassmates(accessToken, grade ?? undefined)
      .then((d) => setMates(Array.isArray(d) ? d : []))
      .catch(() => setMates([]));
  };

  const save = (next: Classmate[]) => {
    if (!accessToken) return;
    setBusy(true);
    setLessonPartners(accessToken, lessonId, next.map((m) => m.id))
      .then(() => setMembers(next))
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  const options = (mates ?? [])
    .filter((m) => !members.some((x) => x.id === m.id))
    .filter((m) => !search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <View style={styles.pairBar}>
      <View style={styles.pairHead}>
        <Text style={styles.pairTitle}>
          👥 {members.length > 0 ? (playful ? 'My team' : 'Working with') : (playful ? 'Sharing a device? Add your team!' : 'Sharing a device? Add who’s with you')}
        </Text>
        <TouchableOpacity hitSlop={8} onPress={() => { setOpen(!open); if (!open) loadMates(); }}>
          <Text style={styles.pairAdd}>{open ? 'Done' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {members.length > 0 && (
        <View style={styles.chipsWrap}>
          {members.map((m) => (
            <View key={m.id} style={styles.pairChip}>
              <Text style={styles.pairChipText}>{m.name}</Text>
              <TouchableOpacity hitSlop={8} disabled={busy}
                onPress={() => save(members.filter((x) => x.id !== m.id))}>
                <Text style={styles.pairChipX}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {open && (
        mates === null ? (
          <Text style={styles.pairHint}>Loading classmates…</Text>
        ) : mates.length === 0 ? (
          <Text style={styles.pairHint}>No classmates found for your class yet.</Text>
        ) : (
          <>
            {/* Search a long class list instead of scrolling it */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={14} color="#9b94c4" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search a classmate…"
                placeholderTextColor="#9b94c4"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity hitSlop={8} onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={15} color="#9b94c4" />
                </TouchableOpacity>
              )}
            </View>
            {options.length === 0 ? (
              <Text style={styles.pairHint}>
                {search.trim() ? `No classmate matches “${search.trim()}”.` : 'Everyone’s already in!'}
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mateRow}>
                {options.map((m) => (
                  <TouchableOpacity key={m.id} style={styles.mateChip} disabled={busy}
                    onPress={() => { save([...members, m]); setSearch(''); }} activeOpacity={0.8}>
                    <Text style={styles.mateChipText}>+ {m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )
      )}
    </View>
  );
};

// =================================================================
// LessonQuizRN — the Challenge: all 7 question types, one attempt at a
// time, auto-graded result with per-question review + AI hints.
// =================================================================
type AnswerVal = number | number[] | string | Record<number, string> | null;

function initialAnswers(quiz: CodingQuiz): Record<number, AnswerVal> {
  const a: Record<number, AnswerVal> = {};
  for (const q of quiz.questions) {
    if (q.type === 'MCQ_MULTI') a[q.id] = [];
    else if (q.type === 'ORDERING') a[q.id] = shuffleIds((q.options ?? []).map((o) => o.id));
    else if (q.type === 'MATCHING') a[q.id] = Object.fromEntries((q.options ?? []).map((o) => [o.id, '']));
    else a[q.id] = q.type === 'MCQ_SINGLE' || q.type === 'TRUE_FALSE' ? null : '';
  }
  return a;
}

function shuffleIds(ids: number[]): number[] {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSubmission(quiz: CodingQuiz, answers: Record<number, AnswerVal>): QuizAnswerOut[] {
  return quiz.questions.map((q) => {
    const v = answers[q.id];
    if (q.type === 'MCQ_SINGLE' || q.type === 'TRUE_FALSE') {
      return { questionId: q.id, selectedOptionIds: v == null ? [] : [v as number] };
    }
    if (q.type === 'MCQ_MULTI') return { questionId: q.id, selectedOptionIds: (v as number[]) || [] };
    if (q.type === 'ORDERING') return { questionId: q.id, orderedOptionIds: (v as number[]) || [] };
    if (q.type === 'MATCHING') {
      const matches = Object.entries((v as Record<number, string>) || {})
        .filter(([, t]) => t)
        .map(([optionId, target]) => ({ optionId: Number(optionId), target }));
      return { questionId: q.id, matches };
    }
    return { questionId: q.id, text: v == null ? '' : String(v) };
  });
}

const LessonQuizRN: React.FC<{
  lessonId: number;
  onPassed: () => void;
  onClose: () => void;
}> = ({ lessonId, onPassed, onClose }) => {
  const [quiz, setQuiz] = useState<CodingQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerVal>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { accessToken } = useAuth();
  const quizRef = useRef<CodingQuiz | null>(null);

  // Async-only loader: state resets happen in the retry HANDLER, not here,
  // so the mount effect never calls setState synchronously.
  const loadQuiz = useCallback(() => {
    if (!accessToken) return;
    getLessonQuiz(accessToken, lessonId)
      .then((data) => {
        quizRef.current = data;
        setQuiz(data);
        setAnswers(initialAnswers(data));
      })
      .catch((e: any) => {
        setError(e?.status === 404 ? 'No quiz for this lesson yet.' : e?.message || 'Failed to load the quiz');
      });
  }, [accessToken, lessonId]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  const retryQuiz = () => {
    setError(null);
    setResult(null);
    setQuiz(null);
    loadQuiz();
  };

  const attemptsLeft = quiz?.maxAttempts == null
    ? Infinity
    : Math.max(0, quiz.maxAttempts - (quiz.attemptsUsed || 0));

  const setAnswer = (qid: number, value: AnswerVal) => setAnswers((a) => ({ ...a, [qid]: value }));

  const submit = async () => {
    if (!accessToken || !quiz) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await submitQuizAttempt(accessToken, lessonId, buildSubmission(quiz, answers));
      setResult(data);
      if (data.passed) onPassed();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit the quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !quiz) {
    return (
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Text style={{ fontSize: 36 }}>😕</Text>
        <Text style={styles.challengeSub}>{error}</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.linkBtn}>Close</Text></TouchableOpacity>
      </View>
    );
  }
  if (!quiz) {
    return (
      <View style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
        <ActivityIndicator color="#7c5cff" />
        <Text style={styles.challengeSub}>Loading the quiz…</Text>
      </View>
    );
  }

  // ---- Results ----
  if (result) {
    const resultFor = (qid: number) => (result.questions ?? []).find((r) => r.questionId === qid);
    return (
      <View style={styles.card}>
        <Text style={styles.secHeading}>🏆 Challenge</Text>
        <View style={[styles.scoreCircle, { borderColor: result.passed ? '#15c08a' : '#ff8a3d' }]}>
          <Text style={styles.scorePct}>{result.scorePercent}%</Text>
          <Text style={styles.scorePts}>{result.scorePoints}/{result.maxPoints}</Text>
        </View>
        <Text style={styles.resultTitle}>{result.passed ? '🎉 Passed!' : 'Keep going! 💪'}</Text>
        {result.recorded === false && (
          <Text style={styles.practiceNote}>🧪 Practice run — ask your teacher to open this lesson for it to count.</Text>
        )}
        {result.passed && result.nextLessonUnlocked && result.recorded !== false && (
          <Text style={styles.challengeSub}>You unlocked the next lesson! 🔓</Text>
        )}
        {!result.passed && (
          <Text style={styles.challengeSub}>
            You need {quiz.passPercent}% to pass.{' '}
            {attemptsLeft === Infinity ? 'Try again when you’re ready.' : `${attemptsLeft} attempt(s) left.`}
          </Text>
        )}

        <View style={{ marginTop: 12 }}>
          {quiz.questions.map((q) => {
            const r = resultFor(q.id);
            const ok = !!r?.correct;
            return (
              <View key={q.id} style={styles.reviewRow}>
                <Text style={[styles.reviewMark, { color: ok ? '#15c08a' : '#ef4444' }]}>{ok ? '✓' : '✗'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewQ}>{q.prompt}</Text>
                  {!!r?.explanation && <Text style={styles.reviewExp}>{r.explanation}</Text>}
                  {!ok && <HintRow questionId={q.id} />}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.resultBtns}>
          {!result.passed && attemptsLeft > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={retryQuiz}>
              <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.cta}>
                <Text style={styles.ctaText}>Try again{attemptsLeft === Infinity ? '' : ` (${attemptsLeft} left)`}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.linkBtn}>{result.passed ? 'Back to map' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- Quiz form ----
  const outOfAttempts = quiz.maxAttempts != null && attemptsLeft <= 0;
  return (
    <View style={styles.card}>
      <Text style={styles.secHeading}>🏆 Challenge</Text>
      <View style={styles.quizChips}>
        <Text style={styles.quizChip}>📝 {quiz.questions.length} questions</Text>
        <Text style={styles.quizChip}>🎯 pass {quiz.passPercent}%</Text>
        {quiz.maxAttempts != null && <Text style={styles.quizChip}>🔁 {attemptsLeft} left</Text>}
      </View>
      <Text style={styles.quizTitle}>{quiz.title ?? 'Lesson quiz'}</Text>

      {outOfAttempts ? (
        <>
          <Text style={styles.challengeSub}>You’ve used all {quiz.maxAttempts} attempts for this quiz.</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.linkBtn}>Back to map</Text></TouchableOpacity>
        </>
      ) : (
        <>
          {quiz.questions.map((q, qi) => (
            <View key={q.id} style={styles.qBlock}>
              <View style={styles.qPromptRow}>
                <View style={styles.qNum}><Text style={styles.qNumText}>{qi + 1}</Text></View>
                <Text style={styles.qPrompt}>{q.prompt}</Text>
              </View>

              {(q.type === 'MCQ_SINGLE' || q.type === 'TRUE_FALSE') && (q.options ?? []).map((o) => (
                <TouchableOpacity key={o.id} activeOpacity={0.8}
                  style={[styles.qOpt, answers[q.id] === o.id && styles.qOptOn]}
                  onPress={() => setAnswer(q.id, o.id)}>
                  <Text style={[styles.qOptText, answers[q.id] === o.id && styles.qOptTextOn]}>{o.content}</Text>
                </TouchableOpacity>
              ))}

              {q.type === 'MCQ_MULTI' && (q.options ?? []).map((o) => {
                const sel = ((answers[q.id] as number[]) || []).includes(o.id);
                return (
                  <TouchableOpacity key={o.id} activeOpacity={0.8}
                    style={[styles.qOpt, sel && styles.qOptOn]}
                    onPress={() => {
                      const cur = (answers[q.id] as number[]) || [];
                      setAnswer(q.id, sel ? cur.filter((x) => x !== o.id) : [...cur, o.id]);
                    }}>
                    <Text style={[styles.qOptText, sel && styles.qOptTextOn]}>{sel ? '☑ ' : '☐ '}{o.content}</Text>
                  </TouchableOpacity>
                );
              })}

              {(q.type === 'SHORT_ANSWER' || q.type === 'NUMERIC') && (
                <TextInput
                  style={styles.qInput}
                  value={String(answers[q.id] ?? '')}
                  keyboardType={q.type === 'NUMERIC' ? 'numeric' : 'default'}
                  placeholder={q.type === 'NUMERIC' ? 'Enter a number' : 'Type your answer…'}
                  placeholderTextColor="#9b94c4"
                  onChangeText={(t) => setAnswer(q.id, t)}
                />
              )}

              {q.type === 'ORDERING' && ((answers[q.id] as number[]) || []).map((oid, idx, arr) => {
                const o = (q.options ?? []).find((x) => x.id === oid);
                return (
                  <View key={oid} style={styles.orderRow}>
                    <View style={styles.qNum}><Text style={styles.qNumText}>{idx + 1}</Text></View>
                    <Text style={styles.orderText}>{o?.content ?? ''}</Text>
                    <TouchableOpacity hitSlop={6} disabled={idx === 0}
                      onPress={() => {
                        const a2 = arr.slice(); [a2[idx - 1], a2[idx]] = [a2[idx], a2[idx - 1]];
                        setAnswer(q.id, a2);
                      }}>
                      <Text style={[styles.orderArrow, idx === 0 && { opacity: 0.3 }]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity hitSlop={6} disabled={idx === arr.length - 1}
                      onPress={() => {
                        const a2 = arr.slice(); [a2[idx], a2[idx + 1]] = [a2[idx + 1], a2[idx]];
                        setAnswer(q.id, a2);
                      }}>
                      <Text style={[styles.orderArrow, idx === arr.length - 1 && { opacity: 0.3 }]}>▼</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {q.type === 'MATCHING' && (q.options ?? []).map((o) => {
                const chosen = ((answers[q.id] as Record<number, string>) || {})[o.id] || '';
                return (
                  <View key={o.id} style={styles.matchBlock}>
                    <Text style={styles.matchLeft}>{o.content} →</Text>
                    <View style={styles.matchTargets}>
                      {(q.matchTargets ?? []).map((t) => (
                        <TouchableOpacity key={t} activeOpacity={0.8}
                          style={[styles.matchChip, chosen === t && styles.matchChipOn]}
                          onPress={() => setAnswer(q.id, {
                            ...((answers[q.id] as Record<number, string>) || {}),
                            [o.id]: chosen === t ? '' : t,
                          })}>
                          <Text style={[styles.matchChipText, chosen === t && { color: '#fff' }]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {!!error && <Text style={[styles.challengeSub, { color: '#ef4444' }]}>{error}</Text>}
          <TouchableOpacity activeOpacity={0.85} disabled={submitting} onPress={submit}>
            <LinearGradient colors={submitting ? ['#cbc6e2', '#a8a3c4'] : ['#7c5cff', '#a78bfa']} style={styles.cta}>
              <Text style={styles.ctaText}>{submitting ? 'Submitting…' : 'Submit quiz'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

/** AI hint under a missed question — a nudge, never the answer. */
const HintRow: React.FC<{ questionId: number }> = ({ questionId }) => {
  const { accessToken } = useAuth();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [hint, setHint] = useState('');

  const get = () => {
    if (!accessToken) return;
    setState('loading');
    getQuestionHint(accessToken, questionId)
      .then((d) => { setHint(d?.hint || 'Try re-reading the question and think about the key idea.'); setState('done'); })
      .catch(() => { setHint('Try re-reading the question and think about the key idea.'); setState('done'); });
  };

  if (state === 'done') return <Text style={styles.hintText}>💡 {hint}</Text>;
  return (
    <TouchableOpacity onPress={get} disabled={state === 'loading'} hitSlop={6}>
      <Text style={styles.hintBtn}>{state === 'loading' ? 'Getting a hint…' : '💡 Get a hint'}</Text>
    </TouchableOpacity>
  );
};

// =================================================================
const styles = StyleSheet.create({
  scroll: { padding: 16 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7,
  },
  backText: { fontSize: 12.5, fontWeight: '800', color: '#2c2550' },
  statusChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  statusText: { fontSize: 11.5, fontWeight: '800' },

  pairBar: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 12, marginBottom: 12,
  },
  pairHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pairTitle: { flex: 1, fontSize: 12.5, fontWeight: '800', color: '#2c2550' },
  pairAdd: { fontSize: 12.5, fontWeight: '800', color: '#7c5cff' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  pairChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#efeaff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  pairChipText: { fontSize: 11.5, fontWeight: '800', color: '#5b45c9' },
  pairChipX: { fontSize: 15, fontWeight: '800', color: '#8b7fd0' },
  pairHint: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 9 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#f4f1ff', borderRadius: 12,
    paddingHorizontal: 11, paddingVertical: 8, marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#2c2550', padding: 0 },
  mateRow: { gap: 7, marginTop: 9, paddingRight: 8 },
  mateChip: {
    backgroundColor: '#f4f1ff', borderWidth: 1.5, borderColor: '#ded7f8',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
  },
  mateChipText: { fontSize: 11.5, fontWeight: '700', color: '#2c2550' },

  practice: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#fff7e6', borderRadius: 16, padding: 12, marginBottom: 12,
  },
  practiceTitle: { fontSize: 12.5, fontWeight: '800', color: '#92400e' },
  practiceBody: { fontSize: 11.5, color: '#92400e', fontWeight: '500', marginTop: 2, lineHeight: 16 },

  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 15, marginBottom: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  heroTitle: { color: '#fff', fontSize: 16.5, fontWeight: '800', marginTop: 2 },

  secTabs: { flexDirection: 'row', gap: 7, marginBottom: 12, flexWrap: 'wrap' },
  secTab: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ece8fb',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  secTabOn: { backgroundColor: '#7c5cff', borderColor: '#7c5cff' },
  secTabText: { fontSize: 12, fontWeight: '800', color: '#6f679c' },
  secTabTextOn: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, borderColor: '#ece8fb',
    padding: 16, marginBottom: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  secHeading: { fontSize: 15, fontWeight: '800', color: '#2c2550', marginBottom: 12 },
  objective: { fontSize: 13.5, fontWeight: '700', color: '#2c2550', marginBottom: 12, lineHeight: 19 },
  missionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  missionCheck: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#eafef3',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  missionCheckText: { color: '#0fae78', fontSize: 11, fontWeight: '800' },
  missionText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#2c2550', lineHeight: 18 },

  cta: { borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  linkBtn: { color: '#7c5cff', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 12 },

  sandboxRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  sandboxTitle: { fontSize: 14.5, fontWeight: '800', color: '#2c2550' },
  sandboxBody: { fontSize: 12, color: '#6f679c', fontWeight: '600', marginTop: 3, lineHeight: 17 },
  brief: { backgroundColor: '#f8f6ff', borderRadius: 14, padding: 12, marginTop: 12 },
  briefTitle: { fontSize: 12.5, fontWeight: '800', color: '#2c2550' },
  briefBody: { fontSize: 12, color: '#4b4570', fontWeight: '500', marginTop: 4, lineHeight: 17 },

  challengeTitle: { fontSize: 14.5, fontWeight: '800', color: '#2c2550' },
  challengeSub: { fontSize: 12.5, color: '#6f679c', fontWeight: '600', marginTop: 6, lineHeight: 18, textAlign: 'center' },

  gradeTop: { alignItems: 'center', marginBottom: 12 },
  gradeScore: { fontSize: 34, fontWeight: '800', color: '#2c2550' },
  gradeMax: { fontSize: 17, color: '#6f679c' },
  gradeLabel: { fontSize: 12.5, fontWeight: '700', color: '#6f679c', marginTop: 2 },
  indRow: { borderTopWidth: 1, borderTopColor: '#f2effc', paddingVertical: 9 },
  indName: { fontSize: 12.5, fontWeight: '700', color: '#2c2550' },
  indMark: { fontSize: 12.5, fontWeight: '800', color: '#7c5cff', marginTop: 2 },
  indRemark: { fontSize: 11.5, color: '#6f679c', fontWeight: '500', marginTop: 2 },
  gradeFb: { fontSize: 12.5, color: '#4b4570', fontWeight: '600', marginTop: 10, lineHeight: 18 },

  // Quiz
  quizChips: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 8 },
  quizChip: {
    fontSize: 11, fontWeight: '800', color: '#2c2550',
    backgroundColor: '#f4f1ff', borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 4, overflow: 'hidden',
  },
  quizTitle: { fontSize: 16, fontWeight: '800', color: '#2c2550', marginBottom: 8 },
  qBlock: { marginTop: 12 },
  qPromptRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginBottom: 9 },
  qNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#efeaff',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  qNumText: { fontSize: 11.5, fontWeight: '800', color: '#7c5cff' },
  qPrompt: { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#2c2550', lineHeight: 19 },
  qOpt: {
    borderWidth: 2, borderColor: '#ece8fb', borderRadius: 13,
    paddingHorizontal: 13, paddingVertical: 11, marginBottom: 7,
  },
  qOptOn: { borderColor: '#7c5cff', backgroundColor: '#efeaff' },
  qOptText: { fontSize: 13, fontWeight: '600', color: '#2c2550' },
  qOptTextOn: { color: '#5b45c9', fontWeight: '800' },
  qInput: {
    borderWidth: 2, borderColor: '#ece8fb', borderRadius: 13,
    paddingHorizontal: 13, paddingVertical: 10,
    fontSize: 13.5, fontWeight: '600', color: '#2c2550', backgroundColor: '#fbfaff',
  },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderWidth: 1.5, borderColor: '#ece8fb', borderRadius: 13,
    paddingHorizontal: 11, paddingVertical: 9, marginBottom: 7,
  },
  orderText: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#2c2550' },
  orderArrow: { fontSize: 15, color: '#7c5cff', paddingHorizontal: 5 },
  matchBlock: { marginBottom: 10 },
  matchLeft: { fontSize: 13, fontWeight: '700', color: '#2c2550', marginBottom: 6 },
  matchTargets: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  matchChip: {
    borderWidth: 1.5, borderColor: '#ded7f8', backgroundColor: '#f4f1ff',
    borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
  },
  matchChipOn: { backgroundColor: '#7c5cff', borderColor: '#7c5cff' },
  matchChipText: { fontSize: 11.5, fontWeight: '700', color: '#2c2550' },

  // Result
  scoreCircle: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 7,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  scorePct: { fontSize: 20, fontWeight: '800', color: '#2c2550' },
  scorePts: { fontSize: 11, fontWeight: '700', color: '#6f679c' },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550', textAlign: 'center', marginTop: 10 },
  practiceNote: {
    fontSize: 12, fontWeight: '700', color: '#92400e', textAlign: 'center',
    backgroundColor: '#fff7e6', borderRadius: 10, padding: 8, marginTop: 8,
  },
  reviewRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#f2effc', paddingVertical: 9 },
  reviewMark: { fontSize: 15, fontWeight: '800', marginTop: 1 },
  reviewQ: { fontSize: 12.5, fontWeight: '700', color: '#2c2550', lineHeight: 17 },
  reviewExp: { fontSize: 11.5, color: '#6f679c', fontWeight: '500', marginTop: 3, lineHeight: 16 },
  hintBtn: { fontSize: 11.5, fontWeight: '800', color: '#7c5cff', marginTop: 4 },
  hintText: { fontSize: 11.5, color: '#6f679c', fontWeight: '600', marginTop: 4, lineHeight: 16 },
  resultBtns: { marginTop: 6 },
});
