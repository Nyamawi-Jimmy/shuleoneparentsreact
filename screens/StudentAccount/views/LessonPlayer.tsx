import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { LearningHeader } from '../components/LearningHeader';
import { useAuth } from '../../../context/AuthContext';
import { getLesson, completeStage } from '../../../api/quests';
import { Lesson, LessonActivity, StageCompletionResult } from '../../../api/quest.types';
import { ApiError } from '../../../config/api';

// =================================================================
// Lesson screen. Receives lessonId from /student/lesson?lessonId=X
// (plus optional questId+stageId so we can mark stage complete).
// =================================================================
export const LessonPlayer: React.FC = () => {
  const { lessonId, questId, stageId } = useLocalSearchParams<{
    lessonId?: string; questId?: string; stageId?: string;
  }>();
  const { accessToken } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Slide state - 0 = intro, 1..N = content/activities, N+1 = result
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [completionResult, setCompletionResult] = useState<StageCompletionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch lesson ──────────────────────────────────────
  useEffect(() => {
    if (!lessonId) {
      setError('No lesson selected.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getLesson(accessToken, Number(lessonId));
        if (!cancelled) setLesson(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Could not load lesson.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lessonId, accessToken]);

  // Stop TTS on step change / unmount
  useEffect(() => {
    return () => { Speech.stop(); };
  }, [step]);

  // ── States ────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.safe}>
        <LearningHeader title="Lesson" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c5cff" />
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={styles.safe}>
        <LearningHeader title="Lesson" />
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>😞</Text>
          <Text style={styles.emptyTitle}>Could not load lesson</Text>
          <Text style={styles.emptyText}>{error ?? 'Lesson not found.'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Build a flat list of "slides" we can step through
  const totalSlides = 1 + lesson.activities.length;   // 1 intro + N activities
  const isIntro = step === 0;
  const activityIndex = step - 1;
  const currentActivity: LessonActivity | undefined =
    !isIntro ? lesson.activities[activityIndex] : undefined;
  const isLast = step === totalSlides - 1;
  const allQuizAnswered = lesson.activities.every((a, i) =>
    isQuiz(a.kind) ? answers[i] !== undefined : true,
  );

  // ── Listen (TTS) ──────────────────────────────────────
  const handleListen = () => {
    Speech.stop();
    const text = isIntro
      ? lesson.intro || stripHtml(lesson.contentHtml)
      : currentActivity?.narration ?? currentActivity?.prompt ?? '';
    if (!text) return;
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.05,
      rate: 0.92,
      onError: () => Alert.alert('Sorry', 'Audio is not available on this device.'),
    });
  };

  // ── Quiz answer ───────────────────────────────────────
  const handleSelectAnswer = (idx: number) => {
    if (currentActivity == null) return;
    if (answers[activityIndex] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [activityIndex]: idx }));
  };

  // ── Navigation ────────────────────────────────────────
  const goNext = async () => {
    if (step < totalSlides - 1) {
      setStep(step + 1);
      return;
    }
    // Last slide - submit completion if we have quest+stage context
    if (!questId || !stageId || !accessToken) {
      // No backend context (e.g. came from a direct "Resume" link) - just exit
      Alert.alert('All done!', 'Great work!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      const result = await completeStage(accessToken, Number(questId), Number(stageId));
      setCompletionResult(result);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not submit completion.';
      Alert.alert('Submission failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const goPrev = () => { if (step > 0) setStep(step - 1); };

  // ── Result screen ─────────────────────────────────────
  if (completionResult) {
    return <ResultScreen lesson={lesson} result={completionResult} />;
  }

  // ── Render ────────────────────────────────────────────
  return (
    <View style={styles.safe}>
      <LearningHeader
        title={lesson.title}
        subtitle={`${step + 1} of ${totalSlides}`}
      />

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && styles.dotActive,
              i < step && styles.dotVisited,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {isIntro && (
          <View>
            <LinearGradient
              colors={['#efeaff', '#fce7f3']}
              style={styles.slideCard}
            >
              <Text style={styles.bigEmoji}>{emojiForSubject(lesson.subject)}</Text>
              <Text style={styles.slideTitle}>{lesson.title}</Text>
              <Text style={styles.slideMeta}>
                {lesson.subject} • {lesson.difficulty}
                {lesson.estimatedMinutes ? ` • ${lesson.estimatedMinutes} min` : ''}
              </Text>
              {lesson.intro ? (
                <Text style={styles.slideBody}>{lesson.intro}</Text>
              ) : (
                <Text style={styles.slideBody}>{stripHtml(lesson.contentHtml)}</Text>
              )}
              {lesson.audioIntroUrl && (
                <View style={styles.mediaHint}>
                  <Ionicons name="musical-note" size={14} color="#7c5cff" />
                  <Text style={styles.mediaHintText}>Audio intro available</Text>
                </View>
              )}
              {lesson.videoUrl && (
                <View style={styles.mediaHint}>
                  <Ionicons name="play-circle" size={14} color="#7c5cff" />
                  <Text style={styles.mediaHintText}>Video available</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {!isIntro && currentActivity && (
          <ActivityRenderer
            activity={currentActivity}
            selectedIndex={answers[activityIndex]}
            onSelect={handleSelectAnswer}
          />
        )}

        {/* Listen button (works for intro + activities) */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleListen} style={styles.listenBtn}>
          <Ionicons name="volume-high" size={16} color="#7c5cff" />
          <Text style={styles.listenBtnText}>Tap to Listen</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer nav */}
      <View style={styles.footer}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goPrev}
          disabled={step === 0}
          style={[styles.prevBtn, step === 0 && styles.btnDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color={step === 0 ? '#cbc6e2' : '#2c2550'} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goNext}
          disabled={
            submitting ||
            (currentActivity != null &&
              isQuiz(currentActivity.kind) &&
              answers[activityIndex] === undefined)
          }
        >
          <LinearGradient
            colors={
              currentActivity != null &&
              isQuiz(currentActivity.kind) &&
              answers[activityIndex] === undefined
                ? ['#cbc6e2', '#a8a3c4']
                : ['#7c5cff', '#a78bfa']
            }
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>
              {submitting ? 'Saving...' :
                isLast ? (allQuizAnswered ? 'Finish' : 'Answer first') : 'Next'}
            </Text>
            {!submitting && !isLast && <Ionicons name="arrow-forward" size={16} color="#fff" />}
            {!submitting && isLast && allQuizAnswered && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =================================================================
// Activity renderer - handles QUIZ + falls through for other kinds
// =================================================================
const ActivityRenderer: React.FC<{
  activity: LessonActivity;
  selectedIndex: number | undefined;
  onSelect: (i: number) => void;
}> = ({ activity, selectedIndex, onSelect }) => {
  const isQuizKind = isQuiz(activity.kind);
  const answered = selectedIndex !== undefined;
  // Correct answer index from the config map (server-side authoritative,
  // but UI can show right/wrong if present in config).
  const correctIndex = typeof activity.config?.correctIndex === 'number'
    ? (activity.config!.correctIndex as number)
    : undefined;

  return (
    <View>
      <View style={styles.activityBanner}>
        <Ionicons name="help-circle" size={20} color="#fff" />
        <Text style={styles.activityBannerText}>{String(activity.kind).toUpperCase()}</Text>
      </View>

      <Text style={styles.activityPrompt}>{activity.prompt}</Text>

      {isQuizKind && activity.options && (
        <View style={styles.options}>
          {activity.options.map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isCorrect = correctIndex === i;
            const showRightWrong = answered && correctIndex !== undefined;
            let bgStyle = styles.optDefault;
            let textColor = '#2c2550';
            let icon: any = null;

            if (showRightWrong) {
              if (isCorrect) {
                bgStyle = styles.optCorrect;
                textColor = '#15c98c';
                icon = 'checkmark-circle';
              } else if (isSelected) {
                bgStyle = styles.optWrong;
                textColor = '#ef4444';
                icon = 'close-circle';
              }
            } else if (isSelected) {
              bgStyle = styles.optSelected;
              textColor = '#7c5cff';
            }

            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={() => onSelect(i)}
                disabled={answered}
                style={[styles.optBase, bgStyle]}
              >
                <Text style={[styles.optText, { color: textColor }]}>{opt}</Text>
                {icon && <Ionicons name={icon} size={20} color={textColor} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Unknown activity kind - placeholder */}
      {!isQuizKind && (
        <View style={styles.placeholder}>
          <Ionicons name="construct-outline" size={20} color="#f4a716" />
          <Text style={styles.placeholderText}>
            "{activity.kind}" activity coming soon. Tap Next to continue.
          </Text>
        </View>
      )}
    </View>
  );
};

// =================================================================
// Result screen
// =================================================================
const ResultScreen: React.FC<{ lesson: Lesson; result: StageCompletionResult }> = ({ lesson, result }) => {
  const message =
    result.stars === 3 ? 'AMAZING! Perfect work!'
    : result.stars === 2 ? 'Great job! Try again for 3 stars!'
    : 'Nice try! Practice makes perfect.';

  return (
    <View style={styles.safe}>
      <LearningHeader title="Results" />
      <ScrollView contentContainerStyle={styles.resultScroll}>
        <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.resultCard}>
          <Text style={styles.resultEmoji}>{emojiForSubject(lesson.subject)}</Text>
          <Text style={styles.resultLessonName}>{lesson.title}</Text>
          <Text style={styles.resultMessage}>{message}</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3].map((s) => (
              <Text key={s} style={[styles.starBig, s > result.stars && styles.starDim]}>⭐</Text>
            ))}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBig}>+{result.awardedXp}</Text>
              <Text style={styles.statLbl}>XP earned</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBig}>{result.totalEarnedXp}</Text>
              <Text style={styles.statLbl}>Total XP</Text>
            </View>
          </View>

          {result.unlockedStageId !== null && (
            <Text style={styles.unlockedText}>
              🔓 Next stage unlocked!
            </Text>
          )}
        </LinearGradient>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.back()} style={styles.doneBtnWrap}>
          <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Back to Quest</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// =================================================================
// Helpers
// =================================================================
function isQuiz(kind: string): boolean {
  const k = String(kind).toUpperCase();
  return k === 'QUIZ' || k === 'TAP_SELECT' || k === 'MULTIPLE_CHOICE';
}

function stripHtml(html: string): string {
  return html
    ? html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function emojiForSubject(subject: string): string {
  const s = subject?.toLowerCase() ?? '';
  if (s.includes('math')) return '📐';
  if (s.includes('science')) return '🧪';
  if (s.includes('english') || s.includes('language')) return '📖';
  if (s.includes('kiswahili')) return '🗣️';
  if (s.includes('social')) return '🌍';
  if (s.includes('code') || s.includes('comp')) return '💻';
  return '🎓';
}

// =================================================================
// Styles
// =================================================================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafe' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { color: '#6f679c', marginTop: 14, fontWeight: '600' },

  emptyIcon: { fontSize: 60, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#2c2550' },
  emptyText: { fontSize: 13, color: '#6f679c', fontWeight: '600', marginTop: 6, textAlign: 'center' },
  backBtn: { marginTop: 18, backgroundColor: '#7c5cff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99 },
  backBtnText: { color: '#fff', fontWeight: '800' },

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 10 },
  dot: { flex: 1, height: 5, borderRadius: 99, backgroundColor: '#ece8fb' },
  dotVisited: { backgroundColor: '#a78bfa' },
  dotActive: { backgroundColor: '#7c5cff' },

  scroll: { padding: 16 },

  slideCard: {
    borderRadius: 24, padding: 28, alignItems: 'center',
    marginBottom: 16, minHeight: 280,
    justifyContent: 'center',
  },
  bigEmoji: { fontSize: 80, marginBottom: 16, textAlign: 'center' },
  slideTitle: { fontSize: 22, fontWeight: '800', color: '#2c2550', textAlign: 'center', marginBottom: 6 },
  slideMeta: { fontSize: 12, color: '#7c5cff', fontWeight: '700', marginBottom: 14, letterSpacing: 0.4 },
  slideBody: { fontSize: 15, color: '#2c2550', textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  mediaHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 99, marginTop: 10,
  },
  mediaHintText: { fontSize: 11, color: '#7c5cff', fontWeight: '700' },

  listenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#efeaff', paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 999, alignSelf: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#a78bfa',
  },
  listenBtnText: { color: '#7c5cff', fontWeight: '800', fontSize: 13 },

  activityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f4a716', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginBottom: 14,
  },
  activityBannerText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  activityPrompt: { fontSize: 19, fontWeight: '800', color: '#2c2550', marginBottom: 18, lineHeight: 26 },

  options: { gap: 10 },
  optBase: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, borderWidth: 2,
  },
  optDefault: { backgroundColor: '#fff', borderColor: '#ece8fb' },
  optSelected: { backgroundColor: '#efeaff', borderColor: '#7c5cff' },
  optCorrect: { backgroundColor: '#eafef3', borderColor: '#15c98c' },
  optWrong: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  optText: { fontSize: 15, fontWeight: '700' },

  placeholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff7e6', borderRadius: 14, padding: 16,
  },
  placeholderText: { flex: 1, color: '#92400e', fontSize: 13, fontWeight: '600' },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#ece8fb',
  },
  prevBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#f4f1ff',
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999,
  },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },

  // Result
  resultScroll: { padding: 16, paddingTop: 30 },
  resultCard: {
    borderRadius: 28, padding: 28, alignItems: 'center',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  resultEmoji: { fontSize: 70 },
  resultLessonName: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  resultMessage: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 4, opacity: 0.95 },
  starsRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  starBig: { fontSize: 50 },
  starDim: { opacity: 0.25 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16, padding: 14, marginTop: 22, gap: 16,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statBig: { color: '#fff', fontSize: 26, fontWeight: '800' },
  statLbl: { color: '#fff', fontSize: 11, fontWeight: '700', opacity: 0.9, marginTop: 2 },
  unlockedText: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 16, opacity: 0.95 },
  doneBtnWrap: { marginTop: 28 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8,
  },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
