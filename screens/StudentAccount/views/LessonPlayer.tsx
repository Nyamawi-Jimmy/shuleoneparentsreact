import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { LearningHeader } from '../components/LearningHeader';
import { useAuth } from '../../../context/AuthContext';
import { getStageLesson, completeStage, StageAnswer } from '../../../api/quests';
import { Lesson, LessonActivity, StageCompletionResult } from '../../../api/quest.types';
import { ApiError } from '../../../config/api';

// =================================================================
// Lesson screen. Opened as /student/lesson?questId=X&stageId=Y — the
// lesson is fetched THROUGH its stage (the backend authorises stage
// access; the old /api/lessons/{id} endpoint is gone).
//
// Activities are config-driven (the same shapes the web players read):
//   TAP_SELECT   { promptText, choices: [{ emoji|color|image|text, label, correct }] }
//   MULTI_SELECT { promptText, choices: [...] }        → find ALL correct
//   COUNT        { promptText, emoji, count, choices } → how many?
//   AUDIO_MATCH  { promptText, soundText, choices }    → listen then tap
//   SORT_BUCKET  { promptText, buckets, items }        → tap item, tap basket
//   STORY_SCENE  { bg, emoji, lines }                  → read & continue
//   CELEBRATE    { emoji, lines }                      → hooray & continue
// =================================================================

/** Answer object per activity index — same shapes the web posts. */
type AnswerMap = Record<number, Record<string, unknown>>;

const SCENE_KINDS = ['STORY_SCENE', 'CELEBRATE', 'VIDEO'];
const isScene = (kind: string) => SCENE_KINDS.includes(String(kind).toUpperCase());

export const LessonPlayer: React.FC = () => {
  const { questId, stageId } = useLocalSearchParams<{
    lessonId?: string; questId?: string; stageId?: string;
  }>();
  const { accessToken } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Slide state - 0 = intro, 1..N = activities
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [completionResult, setCompletionResult] = useState<StageCompletionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Time-on-lesson for the completion payload (stamped once on mount).
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => { startedAtRef.current = Date.now(); }, []);

  // Auto-advance shortly after a correct answer, like the web player.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  // ── Fetch lesson (stage-scoped) ───────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!questId || !stageId) {
        if (!cancelled) { setError('No lesson selected.'); setLoading(false); }
        return;
      }
      if (!accessToken) {
        if (!cancelled) { setError('Please sign in again.'); setLoading(false); }
        return;
      }
      try {
        const data = await getStageLesson(accessToken, Number(questId), Number(stageId));
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
  }, [questId, stageId, accessToken]);

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

  const totalSlides = 1 + lesson.activities.length;   // 1 intro + N activities
  const isIntro = step === 0;
  const activityIndex = step - 1;
  const currentActivity: LessonActivity | undefined =
    !isIntro ? lesson.activities[activityIndex] : undefined;
  const isLast = step === totalSlides - 1;

  const needsAnswer = (a: LessonActivity | undefined) => !!a && !isScene(a.kind);
  const currentBlocked = needsAnswer(currentActivity) && answers[activityIndex] === undefined;
  const allAnswered = lesson.activities.every((a, i) => !needsAnswer(a) || answers[i] !== undefined);

  // ── Listen (TTS) ──────────────────────────────────────
  const speakCurrent = () => {
    Speech.stop();
    const cfg = (currentActivity?.config ?? {}) as Record<string, unknown>;
    const text = isIntro
      ? lesson.intro || stripHtml(lesson.contentHtml)
      : (currentActivity?.narration
        ?? (typeof cfg.promptText === 'string' ? cfg.promptText : undefined)
        ?? currentActivity?.prompt ?? '');
    if (!text) return;
    Speech.speak(text, {
      language: 'en-US', pitch: 1.05, rate: 0.92,
      onError: () => Alert.alert('Sorry', 'Audio is not available on this device.'),
    });
  };

  // ── Solve → record answer, small pause, advance ──────
  const handleSolved = (answer: Record<string, unknown>) => {
    setAnswers((prev) => ({ ...prev, [activityIndex]: answer }));
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (step < totalSlides - 1) {
      advanceTimer.current = setTimeout(() => setStep((s) => Math.min(s + 1, totalSlides - 1)), 950);
    }
  };

  // ── Navigation ────────────────────────────────────────
  const goNext = async () => {
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    if (step < totalSlides - 1) {
      setStep(step + 1);
      return;
    }
    if (!questId || !stageId || !accessToken) {
      Alert.alert('All done!', 'Great work!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      // Same payload as the web player: time spent + one recorded answer per
      // activity; the server re-scores from the activity config. Scenes the
      // learner passed through count as completed.
      const secondsSpent = startedAtRef.current != null
        ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
        : 0;
      const recorded = lesson.activities
        .map((a, i): StageAnswer | null => {
          if (answers[i] !== undefined) return { activityId: a.id, kind: a.kind, answer: answers[i] };
          if (isScene(a.kind)) return { activityId: a.id, kind: a.kind, answer: { completed: true } };
          return null;
        })
        .filter((x): x is StageAnswer => x !== null);
      const result = await completeStage(accessToken, Number(questId), Number(stageId), {
        secondsSpent,
        answers: recorded,
      });
      setCompletionResult(result);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not submit completion.';
      Alert.alert('Submission failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const goPrev = () => { if (step > 0) setStep(step - 1); };

  if (completionResult) {
    return <ResultScreen lesson={lesson} result={completionResult} />;
  }

  // ── Render ────────────────────────────────────────────
  const cfg = (currentActivity?.config ?? {}) as Record<string, any>;
  const promptText: string = isIntro
    ? ''
    : String(cfg.promptText ?? currentActivity?.prompt ?? '');

  return (
    <View style={styles.safe}>
      <LearningHeader
        title={lesson.title}
        subtitle={[
          lesson.subject,
          lesson.difficulty,
          lesson.estimatedMinutes ? `⏱ ${lesson.estimatedMinutes}m` : null,
        ].filter(Boolean).join(' · ')}
        right={
          <View style={styles.stepChip}>
            <Text style={styles.stepChipText}>{step + 1}/{totalSlides}</Text>
          </View>
        }
      />

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotVisited]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isIntro ? (
          <LinearGradient colors={['#efeaff', '#fce7f3']} style={styles.introCard}>
            <Text style={styles.introEmoji}>{emojiForSubject(lesson.subject)}</Text>
            <Text style={styles.introTitle}>{lesson.title}</Text>
            <Text style={styles.introBody}>
              {lesson.intro ? lesson.intro : stripHtml(lesson.contentHtml)}
            </Text>
            <TouchableOpacity activeOpacity={0.8} onPress={speakCurrent} style={styles.listenChip}>
              <Ionicons name="volume-high" size={14} color="#7c5cff" />
              <Text style={styles.listenChipText}>Listen</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : currentActivity ? (
          <View>
            {/* Prompt row — question + small listen button, no banner */}
            {!!promptText && (
              <View style={styles.promptRow}>
                <Text style={styles.promptText}>{promptText}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={speakCurrent} style={styles.listenRound} hitSlop={6}>
                  <Ionicons name="volume-high" size={16} color="#7c5cff" />
                </TouchableOpacity>
              </View>
            )}
            <ActivityPlayer
              key={currentActivity.id}
              activity={currentActivity}
              answered={answers[activityIndex] !== undefined}
              onSolved={handleSolved}
              onSpeak={speakCurrent}
            />
          </View>
        ) : null}

        <View style={{ height: 24 }} />
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
          disabled={submitting || currentBlocked}
        >
          <LinearGradient
            colors={currentBlocked ? ['#cbc6e2', '#a8a3c4'] : ['#7c5cff', '#a78bfa']}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>
              {submitting ? 'Saving...' :
                isLast ? (allAnswered ? 'Finish' : 'Answer first') :
                currentBlocked ? 'Answer first' : 'Next'}
            </Text>
            {!submitting && !isLast && !currentBlocked && <Ionicons name="arrow-forward" size={16} color="#fff" />}
            {!submitting && isLast && allAnswered && <Ionicons name="checkmark" size={16} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =================================================================
// Activity players — config-driven, mirroring the web players'
// behaviour and answer shapes.
// =================================================================
interface PlayerProps {
  activity: LessonActivity;
  answered: boolean;
  onSolved: (answer: Record<string, unknown>) => void;
  onSpeak: () => void;
}

const ActivityPlayer: React.FC<PlayerProps> = (props) => {
  const kind = String(props.activity.kind).toUpperCase();
  switch (kind) {
    case 'TAP_SELECT':
    case 'QUIZ':
    case 'MULTIPLE_CHOICE':
      return <TapSelectPlayer {...props} />;
    case 'MULTI_SELECT':
      return <MultiSelectPlayer {...props} />;
    case 'COUNT':
      return <CountPlayer {...props} />;
    case 'AUDIO_MATCH':
      return <AudioMatchPlayer {...props} />;
    case 'SORT_BUCKET':
      return <SortBucketPlayer {...props} />;
    case 'STORY_SCENE':
    case 'CELEBRATE':
      return <ScenePlayer {...props} />;
    default:
      return <UnknownPlayer {...props} />;
  }
};

interface Choice {
  emoji?: string; color?: string; image?: string; text?: string;
  label?: string; correct?: boolean;
}

function readChoices(activity: LessonActivity): Choice[] {
  const cfg = (activity.config ?? {}) as Record<string, any>;
  if (Array.isArray(cfg.choices)) return cfg.choices as Choice[];
  // Legacy quizzes: plain string options on the DTO.
  if (Array.isArray(activity.options)) {
    const correctIndex = typeof cfg.correctIndex === 'number' ? cfg.correctIndex : -1;
    return activity.options.map((t, i) => ({ text: t, correct: i === correctIndex }));
  }
  return [];
}

/** Big friendly tile for an emoji/colour/text choice. */
const ChoiceTile: React.FC<{
  choice: Choice; state: 'idle' | 'right' | 'wrong' | 'dim';
  textMode: boolean; onPress: () => void; disabled?: boolean;
}> = ({ choice, state, textMode, onPress, disabled }) => {
  const border =
    state === 'right' ? '#15c98c' : state === 'wrong' ? '#ef4444' : '#ece8fb';
  const bg =
    state === 'right' ? '#eafef3' : state === 'wrong' ? '#fee2e2' : '#fff';
  if (textMode) {
    return (
      <TouchableOpacity
        activeOpacity={0.85} onPress={onPress} disabled={disabled}
        style={[styles.textChoice, { borderColor: border, backgroundColor: bg }, state === 'dim' && styles.dim]}
      >
        <Text style={styles.textChoiceLabel}>{choice.text ?? choice.label}</Text>
        {state === 'right' && <Ionicons name="checkmark-circle" size={20} color="#15c98c" />}
        {state === 'wrong' && <Ionicons name="close-circle" size={20} color="#ef4444" />}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.85} onPress={onPress} disabled={disabled}
      style={[styles.tile, { borderColor: border, backgroundColor: bg }, state === 'dim' && styles.dim]}
    >
      {choice.emoji ? (
        <Text style={styles.tileEmoji}>{choice.emoji}</Text>
      ) : choice.color ? (
        <View style={[styles.tileSwatch, { backgroundColor: choice.color }]} />
      ) : (
        <Text style={styles.tileEmoji}>❓</Text>
      )}
      {!!choice.label && <Text style={styles.tileLabel} numberOfLines={1}>{choice.label}</Text>}
    </TouchableOpacity>
  );
};

/** Tap the ONE correct choice. Wrong → brief red flash; right → green + solve. */
const TapSelectPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const choices = readChoices(activity);
  const textMode = choices.some((c) => c.text && !c.emoji && !c.color && !c.image);
  const [rightIdx, setRightIdx] = useState<number | null>(null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  const tap = (i: number) => {
    if (answered || rightIdx != null) return;
    const c = choices[i];
    if (c.correct) {
      setRightIdx(i);
      Speech.stop();
      Speech.speak(`Yes! ${c.label ?? 'Correct'}!`, { language: 'en-US', pitch: 1.1 });
      onSolved({ choiceIndex: i });
    } else {
      setWrongIdx(i);
      Speech.stop();
      Speech.speak('Not that one — try again!', { language: 'en-US', pitch: 1.05 });
      setTimeout(() => setWrongIdx(null), 500);
    }
  };

  return (
    <View style={textMode ? styles.textGrid : styles.tileGrid}>
      {choices.map((c, i) => (
        <ChoiceTile
          key={i} choice={c} textMode={textMode}
          state={rightIdx === i ? 'right' : wrongIdx === i ? 'wrong' : rightIdx != null ? 'dim' : 'idle'}
          onPress={() => tap(i)} disabled={answered || rightIdx != null}
        />
      ))}
    </View>
  );
};

/** Find ALL the correct choices. */
const MultiSelectPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const choices = readChoices(activity);
  const textMode = choices.some((c) => c.text && !c.emoji && !c.color && !c.image);
  const totalCorrect = choices.filter((c) => c.correct).length;
  const [picked, setPicked] = useState<number[]>([]);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const done = answered || (totalCorrect > 0 && picked.length >= totalCorrect);

  const tap = (i: number) => {
    if (done || picked.includes(i)) return;
    const c = choices[i];
    if (c.correct) {
      const next = [...picked, i];
      setPicked(next);
      Speech.stop();
      if (next.length >= totalCorrect) {
        Speech.speak('Great job! You found them all!', { language: 'en-US', pitch: 1.1 });
        onSolved({ selected: next });
      } else {
        Speech.speak('Yes!', { language: 'en-US', pitch: 1.1 });
      }
    } else {
      setWrongIdx(i);
      Speech.stop();
      Speech.speak('Not that one!', { language: 'en-US', pitch: 1.05 });
      setTimeout(() => setWrongIdx(null), 500);
    }
  };

  return (
    <View>
      <Text style={styles.hint}>Find all {totalCorrect} — {picked.length} so far</Text>
      <View style={textMode ? styles.textGrid : styles.tileGrid}>
        {choices.map((c, i) => (
          <ChoiceTile
            key={i} choice={c} textMode={textMode}
            state={picked.includes(i) ? 'right' : wrongIdx === i ? 'wrong' : done ? 'dim' : 'idle'}
            onPress={() => tap(i)} disabled={done}
          />
        ))}
      </View>
    </View>
  );
};

/** How many? Emoji group + numeric chips. */
const CountPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = (activity.config ?? {}) as Record<string, any>;
  const emoji: string = String(cfg.emoji ?? '⭐');
  const count: number = Number(cfg.count ?? 0);
  const options: number[] = Array.isArray(cfg.choices) ? cfg.choices.map(Number) : [];
  const [rightPick, setRightPick] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);

  const tap = (n: number) => {
    if (answered || rightPick != null) return;
    if (n === count) {
      setRightPick(n);
      Speech.stop();
      Speech.speak(`Yes! ${n}!`, { language: 'en-US', pitch: 1.1 });
      onSolved({ value: n });
    } else {
      setWrongPick(n);
      Speech.stop();
      Speech.speak('Count again!', { language: 'en-US', pitch: 1.05 });
      setTimeout(() => setWrongPick(null), 500);
    }
  };

  return (
    <View>
      <View style={styles.countStage}>
        {Array.from({ length: count }).map((_, i) => (
          <Text key={i} style={styles.countEmoji}>{emoji}</Text>
        ))}
      </View>
      <View style={styles.numRow}>
        {options.map((n) => (
          <TouchableOpacity
            key={n} activeOpacity={0.85} onPress={() => tap(n)} disabled={answered || rightPick != null}
            style={[
              styles.numChip,
              rightPick === n && { backgroundColor: '#eafef3', borderColor: '#15c98c' },
              wrongPick === n && { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
            ]}
          >
            <Text style={[
              styles.numChipText,
              rightPick === n && { color: '#15c98c' },
              wrongPick === n && { color: '#ef4444' },
            ]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/** Listen, then tap what you hear. */
const AudioMatchPlayer: React.FC<PlayerProps> = (props) => {
  const cfg = (props.activity.config ?? {}) as Record<string, any>;
  const soundText: string = String(cfg.soundText ?? '');

  const playSound = () => {
    Speech.stop();
    if (soundText) Speech.speak(soundText, { language: 'en-US', pitch: 1.05, rate: 0.85 });
  };

  return (
    <View>
      <TouchableOpacity activeOpacity={0.85} onPress={playSound}>
        <LinearGradient colors={['#3aa0ff', '#7c5cff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bigListen}>
          <Ionicons name="volume-high" size={22} color="#fff" />
          <Text style={styles.bigListenText}>Play sound</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TapSelectPlayer {...props} />
    </View>
  );
};

/** Tap an item, then tap its basket. */
const SortBucketPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = (activity.config ?? {}) as Record<string, any>;
  const buckets: { id: string; label: string; color?: string }[] = Array.isArray(cfg.buckets) ? cfg.buckets : [];
  const items: { emoji?: string; color?: string; label?: string; bucket: string }[] = Array.isArray(cfg.items) ? cfg.items : [];
  const [placed, setPlaced] = useState<Record<number, string>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [wrongBucket, setWrongBucket] = useState<string | null>(null);
  const done = answered || Object.keys(placed).length >= items.length;

  const tapItem = (i: number) => {
    if (done || placed[i] != null) return;
    setSel(i);
  };

  const tapBucket = (bucketId: string) => {
    if (done || sel == null) return;
    if (items[sel].bucket === bucketId) {
      const next = { ...placed, [sel]: bucketId };
      setPlaced(next);
      setSel(null);
      Speech.stop();
      if (Object.keys(next).length >= items.length) {
        Speech.speak('You sorted them all! Amazing!', { language: 'en-US', pitch: 1.1 });
        onSolved({ placements: next });
      } else {
        Speech.speak('Yes!', { language: 'en-US', pitch: 1.1 });
      }
    } else {
      setWrongBucket(bucketId);
      Speech.stop();
      Speech.speak('Try another basket!', { language: 'en-US', pitch: 1.05 });
      setTimeout(() => setWrongBucket(null), 500);
    }
  };

  return (
    <View>
      <Text style={styles.hint}>
        {sel != null ? 'Now tap the right basket!' : 'Tap a thing to pick it up'}
      </Text>

      {/* Loose items */}
      <View style={styles.tileGrid}>
        {items.map((it, i) => placed[i] == null && (
          <TouchableOpacity
            key={i} activeOpacity={0.85} onPress={() => tapItem(i)} disabled={done}
            style={[styles.tile, sel === i && { borderColor: '#7c5cff', backgroundColor: '#efeaff' }]}
          >
            <Text style={styles.tileEmoji}>{it.emoji ?? '❓'}</Text>
            {!!it.label && <Text style={styles.tileLabel} numberOfLines={1}>{it.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Buckets with what's inside */}
      <View style={styles.bucketRow}>
        {buckets.map((b) => {
          const inside = items.map((it, i) => ({ it, i })).filter(({ i }) => placed[i] === b.id);
          return (
            <TouchableOpacity
              key={b.id} activeOpacity={0.85} onPress={() => tapBucket(b.id)} disabled={done}
              style={[
                styles.bucket,
                { borderColor: b.color ?? '#ece8fb' },
                wrongBucket === b.id && { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
              ]}
            >
              <Text style={styles.bucketLabel}>{b.label}</Text>
              <View style={styles.bucketItems}>
                {inside.map(({ it, i }) => (
                  <Text key={i} style={styles.bucketEmoji}>{it.emoji ?? '✓'}</Text>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/** STORY_SCENE / CELEBRATE — read the lines, then Next. */
const ScenePlayer: React.FC<PlayerProps> = ({ activity }) => {
  const cfg = (activity.config ?? {}) as Record<string, any>;
  const lines: string[] = Array.isArray(cfg.lines) ? cfg.lines.map(String) : [];
  const bg: string = typeof cfg.bg === 'string' ? cfg.bg : '#efeaff';
  return (
    <View style={[styles.sceneCard, { backgroundColor: bg }]}>
      <Text style={styles.sceneEmoji}>{String(cfg.emoji ?? '✨')}</Text>
      {lines.map((l, i) => (
        <Text key={i} style={styles.sceneLine}>{l}</Text>
      ))}
    </View>
  );
};

const UnknownPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => (
  <View style={styles.placeholder}>
    <Ionicons name="construct-outline" size={20} color="#f4a716" />
    <Text style={styles.placeholderText}>
      This activity type isn’t on mobile yet.
    </Text>
    {!answered && (
      <TouchableOpacity onPress={() => onSolved({ completed: true })} hitSlop={6}>
        <Text style={styles.placeholderSkip}>Skip</Text>
      </TouchableOpacity>
    )}
  </View>
);

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
          {result.score != null && result.maxScore != null && result.maxScore > 0 && (
            <Text style={styles.resultScore}>
              You scored {result.score}/{result.maxScore} ({Math.round((result.score / result.maxScore) * 100)}%)
            </Text>
          )}

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

  stepChip: {
    minWidth: 40, alignItems: 'center',
    backgroundColor: '#efeaff', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  stepChipText: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 8 },
  dot: { flex: 1, height: 5, borderRadius: 99, backgroundColor: '#ece8fb' },
  dotVisited: { backgroundColor: '#a78bfa' },
  dotActive: { backgroundColor: '#7c5cff' },

  scroll: { padding: 14 },

  // Intro
  introCard: { borderRadius: 20, padding: 18, alignItems: 'center' },
  introEmoji: { fontSize: 54, marginBottom: 8 },
  introTitle: { fontSize: 19, fontWeight: '800', color: '#2c2550', textAlign: 'center' },
  introBody: { fontSize: 14.5, color: '#2c2550', textAlign: 'center', lineHeight: 21, fontWeight: '500', marginTop: 8 },
  listenChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99, marginTop: 12,
    borderWidth: 1.5, borderColor: '#a78bfa',
  },
  listenChipText: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },

  // Prompt row
  promptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  promptText: { flex: 1, fontSize: 17, fontWeight: '800', color: '#2c2550', lineHeight: 23 },
  listenRound: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#efeaff', borderWidth: 1.5, borderColor: '#a78bfa',
    alignItems: 'center', justifyContent: 'center',
  },
  hint: { fontSize: 12, color: '#6f679c', fontWeight: '700', marginBottom: 10 },

  // Choice tiles (emoji/colour grid)
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '30%', flexGrow: 1, maxWidth: '48%',
    aspectRatio: 1.15,
    borderRadius: 18, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#fff', borderColor: '#ece8fb',
  },
  tileEmoji: { fontSize: 44 },
  tileSwatch: { width: 44, height: 44, borderRadius: 22 },
  tileLabel: { fontSize: 11.5, fontWeight: '700', color: '#6f679c' },
  dim: { opacity: 0.45 },

  // Text-mode choices
  textGrid: { gap: 9 },
  textChoice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, borderWidth: 2,
  },
  textChoiceLabel: { flex: 1, fontSize: 14.5, fontWeight: '700', color: '#2c2550' },

  // Count
  countStage: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 2, borderColor: '#ece8fb',
    padding: 18, marginBottom: 12,
  },
  countEmoji: { fontSize: 42 },
  numRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  numChip: {
    minWidth: 62, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#ece8fb',
    borderRadius: 16, paddingVertical: 12,
  },
  numChipText: { fontSize: 20, fontWeight: '800', color: '#2c2550' },

  // Audio match
  bigListen: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 13, marginBottom: 12,
  },
  bigListenText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Sort bucket
  bucketRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  bucket: {
    flex: 1, minHeight: 84,
    backgroundColor: '#fff', borderWidth: 2.5, borderRadius: 18,
    padding: 10, alignItems: 'center',
  },
  bucketLabel: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  bucketItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, justifyContent: 'center' },
  bucketEmoji: { fontSize: 22 },

  // Scene
  sceneCard: { borderRadius: 20, padding: 22, alignItems: 'center' },
  sceneEmoji: { fontSize: 56, marginBottom: 10 },
  sceneLine: { fontSize: 16, fontWeight: '700', color: '#2c2550', textAlign: 'center', lineHeight: 24 },

  placeholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff7e6', borderRadius: 14, padding: 16,
  },
  placeholderText: { flex: 1, color: '#92400e', fontSize: 13, fontWeight: '600' },
  placeholderSkip: { color: '#b45309', fontWeight: '800', fontSize: 13 },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 22,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#ece8fb',
  },
  prevBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#f4f1ff',
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 999,
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
  resultScore: {
    color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 6, overflow: 'hidden',
  },
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
