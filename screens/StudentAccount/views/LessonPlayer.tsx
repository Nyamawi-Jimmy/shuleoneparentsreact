import React, { useEffect, useRef, useState } from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C, useSchemeTick } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
  TextInput, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LearningHeader } from '../components/LearningHeader';
import { useAuth } from '../../../context/AuthContext';
import { getStageLesson, completeStage, StageAnswer } from '../../../api/quests';
import { Lesson, LessonActivity, StageCompletionResult } from '../../../api/quest.types';
import { ApiError, API_BASE_URL } from '../../../config/api';

// Activity media often arrives as a server-relative path ("/uploads/x.png").
// React Native's <Image> needs an absolute URL, so resolve it against the API
// origin — otherwise the image silently fails to load and the tile looks blank.
const mediaUrl = (u?: string | null): string | undefined => {
  const s = String(u ?? '').trim();
  if (!s) return undefined;
  if (/^(https?:|data:|file:)/i.test(s)) return s;
  return `${API_BASE_URL}${s.startsWith('/') ? '' : '/'}${s}`;
};

// ── Text-to-speech language ───────────────────────────────────────────────
// Kiswahili quests were read with an English voice, so the words came out
// mispronounced. The lesson's subject decides the TTS language; a module-level
// value keeps every player's Speech.speak() in sync (only one lesson is open at
// a time). `L(en, sw)` returns the right spoken feedback for that language, so a
// Kiswahili lesson gets Kiswahili encouragement too.
let activeTtsLang = 'en-US';
function ttsLangForSubject(subject?: string | null): string {
  const s = String(subject || '').toLowerCase();
  return /kiswahili|lugha|fasihi|insha/.test(s) ? 'sw-KE' : 'en-US';
}
const L = (en: string, sw: string): string => (activeTtsLang.startsWith('sw') ? sw : en);

// Recorded / AI narration playback — mirrors the web's voice.js `say()`:
// prefer the real audio clip that ships with the activity (audioUrl /
// audioIntroUrl), fall back to device TTS only when there's no clip. One clip
// plays at a time; starting a new one (or TTS) stops the previous.
let _clip: AudioPlayer | null = null;
let _audioModeSet = false;
function stopClip() {
  try { _clip?.remove(); } catch { /* ignore */ }
  _clip = null;
}
export function stopNarration() {
  stopClip();
  try { Speech.stop(); } catch { /* ignore */ }
}
function playClip(url: string, speed = 1) {
  try {
    stopNarration();
    if (!_audioModeSet) {
      _audioModeSet = true;
      // Play even when the phone's silent switch is on — narration must be heard.
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    _clip = createAudioPlayer({ uri: url });
    if (speed && speed !== 1) {
      try { _clip.shouldCorrectPitch = true; _clip.playbackRate = speed; } catch { /* rate unsupported */ }
    }
    _clip.play();
  } catch { /* audio is a nice-to-have; never break the lesson */ }
}
// Tap feedback ("Vizuri!", "Correct!", "Try again!") used to be spoken by the
// device TTS, which clashed with the natural recorded narration — the "two
// voices". Muted: the visual feedback (colours, ticks, shakes) carries it, and
// the recorded/AI narration stays the single voice. Kept as a named no-op so
// the intent is clear and it's a one-line switch to bring cheers back.
function cheer(_text: string, _opts?: any) { /* tap-feedback speech intentionally muted */ }

/** Prefer the recorded clip; otherwise speak the text in the lesson's language.
 *  `speed` is a 1.0-relative multiplier (0.75 slow · 1 normal · 1.25 fast). */
function say(audioUrl: string | null | undefined, text: string, opts?: { pitch?: number; speed?: number }) {
  const speed = opts?.speed ?? 1;
  if (audioUrl) { playClip(audioUrl, speed); return; }
  if (!text) return;
  try {
    Speech.stop();
    // Base kid-friendly rate is 0.92; the speed control scales it.
    const rate = Math.max(0.5, Math.min(1.4, 0.92 * speed));
    Speech.speak(text, { language: activeTtsLang, pitch: opts?.pitch ?? 1.05, rate });
  } catch { /* ignore */ }
}

// Activity config may arrive as a parsed JSON OBJECT (backend Map) OR a JSON
// STRING (content-admin stores raw JSON text). This mirrors the web's
// readConfig contract — always parse defensively. Reading it as an object only
// (the old bug) meant string-configured activities lost their choices/items and
// rendered just one legacy option.
function readConfig(activity?: LessonActivity | null): Record<string, any> {
  const c = activity?.config as unknown;
  if (c == null) return {};
  if (typeof c === 'string') {
    const s = c.trim();
    if (!s) return {};
    try { const p = JSON.parse(s); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
  }
  return typeof c === 'object' ? (c as Record<string, any>) : {};
}

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

// "Scene"/content kinds need no answer — they auto-complete so the learner is
// never blocked. Interactive kinds (below) each have a real player.
const SCENE_KINDS = [
  'STORY_SCENE', 'CELEBRATE', 'VIDEO', 'WATCH', 'READ', 'PRACTICAL',
  'INTERACTIVE_VIDEO', 'SPEAK', 'DRAW', 'TRACE', 'TRACE_GUIDED', 'COLOUR_IN', 'LABEL_DIAGRAM',
];
const isScene = (kind: string) => SCENE_KINDS.includes(String(kind).toUpperCase());

// Only these kinds require an answer before Next. Everything else — content,
// scenes AND any unrecognised kind — is non-blocking and auto-completes, so a
// quest never dead-ends on an activity type (the web behaves the same: its
// default renderer just shows the content).
const INTERACTIVE_KINDS = new Set([
  'TAP_SELECT', 'QUIZ', 'MULTIPLE_CHOICE', 'MULTI_SELECT', 'COUNT', 'AUDIO_MATCH',
  'SORT_BUCKET', 'TRUE_FALSE', 'FILL_BLANK', 'LISTEN_TYPE', 'DRAG_MATCH',
  'SEQUENCE_ORDER', 'COMPARE', 'MEMORY_PAIRS', 'HOTSPOT', 'NUMBER_LINE',
]);
const needsAnswerKind = (kind: string) => INTERACTIVE_KINDS.has(String(kind).toUpperCase());

// Kinds whose player draws the question/statement itself — the lesson's own
// prompt row is hidden for these so the text never shows twice.
const SELF_PROMPT_KINDS = new Set([
  'FILL_BLANK', 'READ', 'WATCH', 'VIDEO', 'PRACTICAL', 'INTERACTIVE_VIDEO', 'SPEAK',
  'DRAW', 'TRACE', 'TRACE_GUIDED', 'COLOUR_IN', 'LABEL_DIAGRAM', 'STORY_SCENE', 'CELEBRATE',
]);

export const LessonPlayer: React.FC = () => {
  const { questId, stageId } = useLocalSearchParams<{
    lessonId?: string; questId?: string; stageId?: string;
  }>();
  const { accessToken } = useAuth();
  // Back/Next live in a fixed footer — pad it above Android's nav keys.
  const insets = useSafeAreaInsets();
  const uiScheme = useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Slide state - 0 = intro, 1..N = activities
  const [step, setStep] = useState(0);
  // Narration speed (0.75 slow · 1 normal · 1.25 fast). A ref mirrors it so the
  // auto-play effect reads the latest without re-firing when speed changes.
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const cycleSpeed = () => setSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 0.75 : 1));
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
        if (!cancelled) {
          activeTtsLang = ttsLangForSubject(data?.subject); // Kiswahili lessons read in Swahili
          setLesson(data);
        }
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

  // Stop any narration (recorded clip or TTS) on step change / unmount.
  useEffect(() => {
    return () => { stopNarration(); };
  }, [step]);

  // Auto-play the slide's narration when it appears — the same "the audio comes
  // with it" behaviour as the web: play the recorded/AI clip (audioUrl /
  // audioIntroUrl) if present, else speak the narration in the lesson language.
  useEffect(() => {
    if (!lesson) return undefined;
    const introSlide = step === 0;
    const act = introSlide ? undefined : lesson.activities[step - 1];
    const cfg = readConfig(act);
    const audioUrl = introSlide ? lesson.audioIntroUrl : act?.audioUrl;
    const text = introSlide
      ? (lesson.intro || stripHtml(lesson.contentHtml))
      : (act?.narration ?? (typeof cfg.promptText === 'string' ? cfg.promptText : undefined) ?? act?.prompt ?? '');
    if (!audioUrl && !text) return undefined;
    const t = setTimeout(() => say(audioUrl, text, { speed: speedRef.current }), 350); // let the slide settle first
    return () => clearTimeout(t);
  }, [lesson, step]);

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

  const needsAnswer = (a: LessonActivity | undefined) => !!a && needsAnswerKind(a.kind);
  const currentBlocked = needsAnswer(currentActivity) && answers[activityIndex] === undefined;
  const allAnswered = lesson.activities.every((a, i) => !needsAnswer(a) || answers[i] !== undefined);

  // ── Listen — play the recorded/AI clip that ships with this slide, else TTS ──
  const speakCurrent = () => {
    const cfg = readConfig(currentActivity);
    const audioUrl = isIntro ? lesson.audioIntroUrl : currentActivity?.audioUrl;
    const text = isIntro
      ? lesson.intro || stripHtml(lesson.contentHtml)
      : (currentActivity?.narration
        ?? (typeof cfg.promptText === 'string' ? cfg.promptText : undefined)
        ?? currentActivity?.prompt ?? '');
    say(audioUrl, text, { speed });
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
          // Non-interactive (content/scene/unknown) — count as passed-through.
          if (!needsAnswerKind(a.kind)) return { activityId: a.id, kind: a.kind, answer: { completed: true } };
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
  const cfg = readConfig(currentActivity);
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
          <LinearGradient colors={uiScheme === 'dark' ? ['#2c2554', '#3a2544'] : ['#efeaff', '#fce7f3']} style={styles.introCard}>
            <Text style={styles.introEmoji}>{emojiForSubject(lesson.subject)}</Text>
            <Text style={styles.introTitle}>{lesson.title}</Text>
            <Text style={styles.introBody}>
              {lesson.intro ? lesson.intro : stripHtml(lesson.contentHtml)}
            </Text>
            <View style={styles.audioRow}>
              <TouchableOpacity activeOpacity={0.8} onPress={speakCurrent} style={styles.listenChip}>
                <Ionicons name="volume-high" size={14} color="#7c5cff" />
                <Text style={styles.listenChipText}>Listen</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={cycleSpeed} style={styles.speedChip}>
                <Ionicons name="speedometer-outline" size={13} color="#7c5cff" />
                <Text style={styles.speedChipText}>{speed}x</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ) : currentActivity ? (
          <View>
            {/* Prompt row — question + small listen button, no banner. Hidden for
                kinds whose own player already draws the prompt (FILL_BLANK, READ,
                video, etc.) so the question never appears twice. */}
            {!!promptText && !SELF_PROMPT_KINDS.has(String(currentActivity.kind).toUpperCase()) && (
              <View style={styles.promptRow}>
                <Text style={styles.promptText}>{promptText}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={speakCurrent} style={styles.listenRound} hitSlop={6}>
                  <Ionicons name="volume-high" size={16} color="#7c5cff" />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={cycleSpeed} style={styles.speedRound} hitSlop={6}>
                  <Text style={styles.speedRoundText}>{speed}x</Text>
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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
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
    case 'TRUE_FALSE':
      return <TrueFalsePlayer {...props} />;
    case 'FILL_BLANK':
      return <FillBlankPlayer {...props} />;
    case 'LISTEN_TYPE':
      return <ListenTypePlayer {...props} />;
    case 'DRAG_MATCH':
      return <DragMatchPlayer {...props} />;
    case 'SEQUENCE_ORDER':
      return <SequenceOrderPlayer {...props} />;
    case 'COMPARE':
      return <ComparePlayer {...props} />;
    case 'MEMORY_PAIRS':
      return <MemoryPairsPlayer {...props} />;
    case 'HOTSPOT':
      return <HotspotPlayer {...props} />;
    case 'NUMBER_LINE':
      return <NumberLinePlayer {...props} />;
    // Content / media / creative — shown as a readable card and non-blocking
    // (they're in SCENE_KINDS). DRAW/TRACE/COLOUR_IN aren't full canvases on
    // mobile yet, so they present the instruction rather than hard-blocking.
    case 'READ':
    case 'WATCH':
    case 'VIDEO':
    case 'PRACTICAL':
    case 'INTERACTIVE_VIDEO':
    case 'SPEAK':
    case 'DRAW':
    case 'TRACE':
    case 'TRACE_GUIDED':
    case 'COLOUR_IN':
    case 'LABEL_DIAGRAM':
      return <ContentPlayer {...props} />;
    // Any unrecognised kind renders as readable content (mirrors the web's
    // default renderer) instead of dead-ending on "not on mobile yet".
    default:
      return <ContentPlayer {...props} />;
  }
};

interface Choice {
  emoji?: string; color?: string; image?: string; text?: string;
  label?: string; correct?: boolean;
}

function readChoices(activity: LessonActivity): Choice[] {
  const cfg = readConfig(activity);
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
  // Fall back to the label if the image URL is broken, so the tile is never blank.
  const [imgFailed, setImgFailed] = useState(false);
  const src = mediaUrl(choice.image);
  const showImg = !!src && !imgFailed;
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
  const hasVisual = showImg || !!choice.emoji || !!choice.color;
  return (
    <TouchableOpacity
      activeOpacity={0.85} onPress={onPress} disabled={disabled}
      style={[styles.tile, { borderColor: border, backgroundColor: bg }, state === 'dim' && styles.dim]}
    >
      {showImg ? (
        <Image source={{ uri: src }} style={styles.tileImg} resizeMode="contain" onError={() => setImgFailed(true)} />
      ) : choice.emoji ? (
        <Text style={styles.tileEmoji}>{choice.emoji}</Text>
      ) : choice.color ? (
        <View style={[styles.tileSwatch, { backgroundColor: choice.color }]} />
      ) : (
        <Text style={styles.tileWord} numberOfLines={3}>{choice.label ?? choice.text ?? '❓'}</Text>
      )}
      {/* Show the label under a visual; when the tile IS the word, don't repeat it. */}
      {!!choice.label && hasVisual && (
        <Text style={styles.tileLabel} numberOfLines={2}>{choice.label}</Text>
      )}
    </TouchableOpacity>
  );
};

/** Image/emoji/colour/word visual with a broken-image fallback to the label —
 *  shared by the sort-bucket items. */
const ItemVisual: React.FC<{ item: { emoji?: string; color?: string; label?: string; image?: string } }> = ({ item }) => {
  const [failed, setFailed] = useState(false);
  const src = mediaUrl(item.image);
  const showImg = !!src && !failed;
  const hasVisual = showImg || !!item.emoji || !!item.color;
  return (
    <>
      {showImg ? (
        <Image source={{ uri: src }} style={styles.tileImg} resizeMode="contain" onError={() => setFailed(true)} />
      ) : item.emoji ? (
        <Text style={styles.tileEmoji}>{item.emoji}</Text>
      ) : item.color ? (
        <View style={[styles.tileSwatch, { backgroundColor: item.color }]} />
      ) : (
        <Text style={styles.tileWord} numberOfLines={3}>{item.label ?? '❓'}</Text>
      )}
      {!!item.label && hasVisual && <Text style={styles.tileLabel} numberOfLines={2}>{item.label}</Text>}
    </>
  );
};

/** Tap the ONE correct choice. Wrong → brief red flash; right → green + solve. */
const TapSelectPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const choices = readChoices(activity);
  const textMode = choices.length > 0 && choices.every((c) => !c.emoji && !c.color && !c.image);
  const [rightIdx, setRightIdx] = useState<number | null>(null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);

  const tap = (i: number) => {
    if (answered || rightIdx != null) return;
    const c = choices[i];
    if (c.correct) {
      setRightIdx(i);
      Speech.stop();
      cheer(`${L('Yes', 'Vizuri')}! ${c.label ?? L('Correct', 'Sahihi')}!`, { language: activeTtsLang, pitch: 1.1 });
      onSolved({ choiceIndex: i });
    } else {
      setWrongIdx(i);
      Speech.stop();
      cheer(L('Not that one — try again!', 'Si hiyo — jaribu tena!'), { language: activeTtsLang, pitch: 1.05 });
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
  const textMode = choices.length > 0 && choices.every((c) => !c.emoji && !c.color && !c.image);
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
        cheer(L('Great job! You found them all!', 'Hongera! Umezipata zote!'), { language: activeTtsLang, pitch: 1.1 });
        onSolved({ selected: next });
      } else {
        cheer(L('Yes!', 'Vizuri!'), { language: activeTtsLang, pitch: 1.1 });
      }
    } else {
      setWrongIdx(i);
      Speech.stop();
      cheer(L('Not that one!', 'Si hiyo!'), { language: activeTtsLang, pitch: 1.05 });
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
  const cfg = readConfig(activity);
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
      cheer(`${L('Yes', 'Vizuri')}! ${n}!`, { language: activeTtsLang, pitch: 1.1 });
      onSolved({ value: n });
    } else {
      setWrongPick(n);
      Speech.stop();
      cheer(L('Count again!', 'Hesabu tena!'), { language: activeTtsLang, pitch: 1.05 });
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
              rightPick === n && { backgroundColor: C.okSoft, borderColor: '#15c98c' },
              wrongPick === n && { backgroundColor: C.badSoft, borderColor: '#ef4444' },
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
  const cfg = readConfig(props.activity);
  const soundText: string = String(cfg.soundText ?? '');

  const playSound = () => {
    Speech.stop();
    if (soundText) Speech.speak(soundText, { language: activeTtsLang, pitch: 1.05, rate: 0.85 });
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
  const cfg = readConfig(activity);
  const buckets: { id: string; label: string; color?: string }[] = Array.isArray(cfg.buckets) ? cfg.buckets : [];
  const items: { emoji?: string; color?: string; label?: string; image?: string; bucket: string }[] = Array.isArray(cfg.items) ? cfg.items : [];
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
        cheer(L('You sorted them all! Amazing!', 'Umepanga zote! Vizuri sana!'), { language: activeTtsLang, pitch: 1.1 });
        onSolved({ placements: next });
      } else {
        cheer(L('Yes!', 'Vizuri!'), { language: activeTtsLang, pitch: 1.1 });
      }
    } else {
      setWrongBucket(bucketId);
      Speech.stop();
      cheer(L('Try another basket!', 'Jaribu kikapu kingine!'), { language: activeTtsLang, pitch: 1.05 });
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
            style={[styles.tile, sel === i && { borderColor: '#7c5cff', backgroundColor: C.ring }]}
          >
            <ItemVisual item={it} />
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
                wrongBucket === b.id && { borderColor: '#ef4444', backgroundColor: C.badSoft },
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
  const cfg = readConfig(activity);
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const cfgOf = (a: LessonActivity) => readConfig(a);
const glyph = (o: any): string => o?.emoji ?? o?.label ?? o?.text ?? '❓';

/** True / False. config { promptText, correct:Boolean }. Answer { value:Boolean }.
 *  The statement is shown by the lesson's prompt row above — not repeated here. */
const TrueFalsePlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = cfgOf(activity);
  const correct = cfg.correct === true || String(cfg.correct).toLowerCase() === 'true';
  const [picked, setPicked] = useState<boolean | null>(null);
  const tap = (v: boolean) => {
    if (answered || picked != null) return;
    setPicked(v);
    Speech.stop();
    cheer(v === correct ? L('Correct!', 'Sahihi!') : L('Not quite!', 'Sio sahihi!'), { language: activeTtsLang, pitch: 1.1 });
    onSolved({ value: v });
  };
  return (
    <View>
      <View style={styles.tfRow}>
        {[{ v: true, l: 'True', e: '✅' }, { v: false, l: 'False', e: '❌' }].map((o) => {
          const state = picked === o.v ? (o.v === correct ? 'right' : 'wrong')
            : (picked != null && o.v === correct ? 'right' : 'idle');
          return (
            <TouchableOpacity key={o.l} activeOpacity={0.85} disabled={answered || picked != null} onPress={() => tap(o.v)}
              style={[styles.tfBtn, state === 'right' && styles.tfRight, state === 'wrong' && styles.tfWrong]}>
              <Text style={styles.tfEmoji}>{o.e}</Text>
              <Text style={styles.tfLabel}>{o.l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/** LISTEN_TYPE — the prompt is shown by the lesson above; here just a Play
 *  button + a text box + Check. Answer { text }. */
const ListenTypePlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = cfgOf(activity);
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const submit = () => { const t = value.trim(); if (!t || sent || answered) return; setSent(true); onSolved({ text: t }); };
  const listen = () => { Speech.stop(); if (cfg.text) Speech.speak(String(cfg.text), { language: activeTtsLang, rate: 0.85 }); };
  return (
    <View>
      <TouchableOpacity activeOpacity={0.85} onPress={listen}>
        <LinearGradient colors={['#3aa0ff', '#7c5cff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bigListen}>
          <Ionicons name="volume-high" size={22} color="#fff" />
          <Text style={styles.bigListenText}>Play</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TextInput
        style={styles.input} value={value} onChangeText={setValue}
        placeholder="Type what you hear" placeholderTextColor="#9b93c4"
        editable={!answered && !sent} onSubmitEditing={submit} returnKeyType="done"
      />
      {!answered && !sent && (
        <TouchableOpacity onPress={submit} disabled={!value.trim()} style={[styles.checkBtn, !value.trim() && styles.dim]}>
          <Text style={styles.checkBtnText}>Check</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** FILL_BLANK — the sentence is shown HERE with the answer typed inline in the
 *  blank (the lesson suppresses its own prompt row for this kind). config
 *  { promptText (with ___), answers[] }. Answer { text }. */
const FillBlankPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = cfgOf(activity);
  const prompt = String(cfg.promptText || activity.prompt || '');
  // A blank can be written as ___ (2+ underscores), [blank]/[…] or {…}.
  const segs = prompt.split(/_{2,}|\[[^\]]*\]|\{[^}]*\}/);
  const hasBlank = segs.length > 1;
  const before = segs[0] ?? '';
  const after = segs.slice(1).join(' ');
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const locked = answered || sent;
  const submit = () => { const t = value.trim(); if (!t || locked) return; setSent(true); onSolved({ text: t }); };
  return (
    <View>
      {hasBlank ? (
        <View style={styles.fbInlineWrap}>
          {!!before.trim() && <Text style={styles.fbInlineText}>{before.trim()} </Text>}
          <TextInput
            style={[styles.fbInlineInput, locked && styles.fbInlineInputDone]}
            value={value} onChangeText={setValue} editable={!locked}
            placeholder="?" placeholderTextColor="#b9b2d8"
            onSubmitEditing={submit} returnKeyType="done" autoCapitalize="none"
          />
          {!!after.trim() && <Text style={styles.fbInlineText}> {after.trim()}</Text>}
        </View>
      ) : (
        <>
          <Text style={styles.fbPrompt}>{prompt || 'Fill in the blank.'}</Text>
          <TextInput
            style={styles.input} value={value} onChangeText={setValue} editable={!locked}
            placeholder="Type your answer" placeholderTextColor="#9b93c4"
            onSubmitEditing={submit} returnKeyType="done"
          />
        </>
      )}
      {!locked && (
        <TouchableOpacity onPress={submit} disabled={!value.trim()} style={[styles.checkBtn, !value.trim() && styles.dim]}>
          <Text style={styles.checkBtnText}>Check</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/** Tap a left tile, then its match on the right. config { pairs:[{left,right}] }. */
const DragMatchPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const pairs: any[] = Array.isArray(cfgOf(activity).pairs) ? cfgOf(activity).pairs : [];
  const lefts = pairs.map((p, i) => ({ ...(p.left || {}), pi: i }));
  const [rights] = useState(() => shuffle(pairs.map((p, i) => ({ ...(p.right || {}), pi: i }))));
  const [sel, setSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const done = answered || matched.size >= pairs.length;

  const tapRight = (pi: number) => {
    if (done || sel == null || matched.has(pi)) return;
    if (pi === sel) {
      const next = new Set(matched); next.add(pi); setMatched(next); setSel(null);
      Speech.stop(); cheer(L('Match!', 'Yamelingana!'), { language: activeTtsLang, pitch: 1.1 });
      if (next.size >= pairs.length) onSolved({ matches: Object.fromEntries(pairs.map((_, i) => [i, i])) });
    } else { setWrong(pi); Speech.stop(); cheer(L('Try again!', 'Jaribu tena!'), { language: activeTtsLang, pitch: 1.05 }); setTimeout(() => setWrong(null), 500); }
  };

  return (
    <View>
      <Text style={styles.hint}>{sel != null ? 'Now tap its match →' : 'Tap one, then its pair'}</Text>
      <View style={styles.matchCols}>
        <View style={styles.matchCol}>
          {lefts.map((it) => (
            <TouchableOpacity key={it.pi} activeOpacity={0.85} disabled={done || matched.has(it.pi)}
              onPress={() => !matched.has(it.pi) && setSel(it.pi)}
              style={[styles.matchCard, sel === it.pi && styles.matchCardSel, matched.has(it.pi) && styles.matchCardDone]}>
              <Text style={styles.matchGlyph}>{glyph(it)}</Text>
              {!!it.label && !it.emoji && null}
              {matched.has(it.pi) && <Text style={styles.matchTick}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.matchCol}>
          {rights.map((it) => (
            <TouchableOpacity key={it.pi} activeOpacity={0.85} disabled={done || matched.has(it.pi)} onPress={() => tapRight(it.pi)}
              style={[styles.matchCard, wrong === it.pi && styles.matchCardWrong, matched.has(it.pi) && styles.matchCardDone]}>
              <Text style={styles.matchGlyph}>{glyph(it)}</Text>
              {matched.has(it.pi) && <Text style={styles.matchTick}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

/** Tap items in the correct order. config { items:[...] } (config order = correct). */
const SequenceOrderPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const items: any[] = Array.isArray(cfgOf(activity).items) ? cfgOf(activity).items : [];
  const [shuffled] = useState(() => shuffle(items.map((it, i) => ({ ...it, oi: i }))));
  const [next, setNext] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const done = answered || picked.size >= items.length;

  const tap = (oi: number) => {
    if (done || picked.has(oi)) return;
    if (oi === next) {
      const p = new Set(picked); p.add(oi); setPicked(p); setNext(next + 1);
      Speech.stop(); cheer(String(next + 1), { language: activeTtsLang, pitch: 1.1 });
      if (p.size >= items.length) onSolved({ order: items.map((_, i) => i) });
    } else { setWrong(oi); Speech.stop(); cheer(L('Start from the beginning!', 'Anza tena mwanzo!'), { language: activeTtsLang, pitch: 1.05 }); setTimeout(() => { setWrong(null); setPicked(new Set()); setNext(0); }, 700); }
  };

  return (
    <View>
      <Text style={styles.hint}>Tap them in order — {picked.size}/{items.length}</Text>
      <View style={styles.tileGrid}>
        {shuffled.map((it) => (
          <TouchableOpacity key={it.oi} activeOpacity={0.85} disabled={done} onPress={() => tap(it.oi)}
            style={[styles.tile, picked.has(it.oi) && { borderColor: '#15c98c', backgroundColor: '#eafef3' }, wrong === it.oi && { borderColor: '#ef4444', backgroundColor: '#fee2e2' }]}>
            <Text style={styles.tileEmoji}>{glyph(it)}</Text>
            {picked.has(it.oi) && <Text style={styles.seqNum}>{[...picked].indexOf(it.oi) + 1}</Text>}
            {!!it.label && <Text style={styles.tileLabel} numberOfLines={1}>{it.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/** Which group has more / fewer? config { groups:[{count,emoji}], mode }. */
const ComparePlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = cfgOf(activity);
  const groups: any[] = Array.isArray(cfg.groups) ? cfg.groups : [];
  const mode = cfg.mode === 'fewer' ? 'fewer' : 'more';
  const counts = groups.map((g) => Number(g.count) || 0);
  const target = mode === 'fewer' ? Math.min(...counts) : Math.max(...counts);
  const [pick, setPick] = useState<number | null>(null);
  const tap = (i: number) => {
    if (answered || pick != null) return;
    setPick(i);
    const ok = counts[i] === target;
    Speech.stop(); cheer(ok ? L('Yes!', 'Vizuri!') : L('Look again!', 'Angalia tena!'), { language: activeTtsLang, pitch: 1.1 });
    if (ok) onSolved({ groupIndex: i });
    else setTimeout(() => setPick(null), 600);
  };
  return (
    <View>
      <Text style={styles.hint}>Which has {mode === 'fewer' ? 'fewer' : 'more'}?</Text>
      <View style={styles.compareRow}>
        {groups.map((g, i) => (
          <TouchableOpacity key={i} activeOpacity={0.85} disabled={answered || pick != null} onPress={() => tap(i)}
            style={[styles.compareGroup, pick === i && (counts[i] === target ? styles.tfRight : styles.tfWrong)]}>
            <View style={styles.compareEmojis}>
              {Array.from({ length: Number(g.count) || 0 }).map((_, k) => (
                <Text key={k} style={styles.compareEmoji}>{g.emoji ?? '⭐'}</Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/** Flip two cards to find matching pairs. config { pairs:[{...}] }. */
const MemoryPairsPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const pairs: any[] = Array.isArray(cfgOf(activity).pairs) ? cfgOf(activity).pairs : [];
  const [cards] = useState(() => shuffle(pairs.flatMap((p, i) => [
    { pi: i, face: p.left || p.a || p, key: `${i}a` },
    { pi: i, face: p.right || p.b || p, key: `${i}b` },
  ])));
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [lock, setLock] = useState(false);
  const done = answered || matched.size >= pairs.length;

  const flip = (idx: number) => {
    if (lock || done || up.includes(idx) || matched.has(cards[idx].pi)) return;
    const next = [...up, idx];
    setUp(next);
    if (next.length === 2) {
      setLock(true);
      const [a, b] = next;
      if (cards[a].pi === cards[b].pi) {
        const m = new Set(matched); m.add(cards[a].pi); setMatched(m); setUp([]); setLock(false);
        Speech.stop(); cheer(L('Match!', 'Yamelingana!'), { language: activeTtsLang, pitch: 1.1 });
        if (m.size >= pairs.length) onSolved({ completed: true });
      } else {
        setTimeout(() => { setUp([]); setLock(false); }, 800);
      }
    }
  };
  return (
    <View style={styles.memGrid}>
      {cards.map((c, idx) => {
        const faceUp = up.includes(idx) || matched.has(c.pi) || done;
        return (
          <TouchableOpacity key={c.key} activeOpacity={0.9} disabled={done} onPress={() => flip(idx)}
            style={[styles.memCard, faceUp ? styles.memUp : styles.memDown, matched.has(c.pi) && styles.matchCardDone]}>
            <Text style={styles.memGlyph}>{faceUp ? glyph(c.face) : '❔'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/** Tap the target objects on a scene. config { bg, objects:[{x,y,emoji,target,label,size}] }. */
const HotspotPlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = readConfig(activity);
  const objects: any[] = Array.isArray(cfg.objects) ? cfg.objects
    : Array.isArray(cfg.choices) ? cfg.choices : [];
  const isTarget = (o: any) => o?.target === true || o?.correct === true;
  const targetCount = objects.filter(isTarget).length;
  // Only lay objects onto the scene when they actually carry coordinates. Most
  // content has none — those render as a tappable grid so they're all visible
  // (the old code defaulted every object to 0,0 and they stacked in one corner).
  const hasCoords = objects.length > 0 && objects.every((o) => o.x != null && o.y != null);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [miss, setMiss] = useState<number | null>(null);
  const done = answered || (targetCount > 0 && found.size >= targetCount);

  const tap = (i: number) => {
    if (done || found.has(i)) return;
    if (isTarget(objects[i])) {
      const n = new Set(found); n.add(i); setFound(n);
      Speech.stop(); cheer(L('Found it!', 'Umeipata!'), { language: activeTtsLang, pitch: 1.1 });
      if (n.size >= targetCount) onSolved({ selected: [...n] });
    } else {
      setMiss(i); Speech.stop(); cheer(L('Keep looking!', 'Endelea kutafuta!'), { language: activeTtsLang, pitch: 1.05 });
      setTimeout(() => setMiss(null), 400);
    }
  };

  return (
    <View>
      <Text style={styles.hint}>Find {targetCount} — {found.size} found</Text>
      {hasCoords ? (
        <View style={[styles.hotspotScene, { backgroundColor: cfg.bg || '#EAF6FF' }]}>
          {objects.map((o, i) => (
            <TouchableOpacity key={i} activeOpacity={0.85} disabled={done} onPress={() => tap(i)}
              style={[styles.hotspotObj, {
                left: `${Math.max(0, Math.min(90, Number(o.x)))}%`,
                top: `${Math.max(0, Math.min(85, Number(o.y)))}%`,
              }, found.has(i) && styles.hotspotFound, miss === i && styles.hotspotMiss]}>
              <Text style={styles.hotspotEmoji}>{o.emoji ?? '⭐'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.tileGrid}>
          {objects.map((o, i) => (
            <TouchableOpacity
              key={i} activeOpacity={0.85} disabled={done || found.has(i)} onPress={() => tap(i)}
              style={[
                styles.tile,
                {
                  borderColor: found.has(i) ? '#15c98c' : miss === i ? '#ef4444' : '#ece8fb',
                  backgroundColor: found.has(i) ? '#eafef3' : miss === i ? '#fee2e2' : '#fff',
                },
                done && !found.has(i) && styles.dim,
              ]}
            >
              <ItemVisual item={o} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

/** Pick the value on the number line. config { min,max,step,target,tolerance,label }. */
const NumberLinePlayer: React.FC<PlayerProps> = ({ activity, answered, onSolved }) => {
  const cfg = cfgOf(activity);
  const min = Number(cfg.min ?? 0), max = Number(cfg.max ?? 10);
  const step = Number(cfg.step) > 0 ? Number(cfg.step) : 1;
  const target = cfg.target != null ? Number(cfg.target) : null;
  const tol = cfg.tolerance != null ? Number(cfg.tolerance) : 0;
  const nums: number[] = [];
  for (let n = min; n <= max; n += step) nums.push(Math.round(n * 100) / 100);
  const [pick, setPick] = useState<number | null>(null);
  const chips = nums.length <= 12;
  const [value, setValue] = useState(nums[Math.floor(nums.length / 2)] ?? min);

  const commit = (n: number) => {
    if (answered || pick != null) return;
    const ok = target == null || Math.abs(n - target) <= tol;
    setPick(n);
    Speech.stop(); cheer(ok ? `${L('Yes', 'Vizuri')}! ${n}` : L('Try again!', 'Jaribu tena!'), { language: activeTtsLang, pitch: 1.1 });
    if (ok) onSolved({ value: n }); else setTimeout(() => setPick(null), 600);
  };

  if (chips) {
    return (
      <View>
        {!!cfg.label && <Text style={styles.hint}>{cfg.label}</Text>}
        <View style={styles.numRow}>
          {nums.map((n) => (
            <TouchableOpacity key={n} activeOpacity={0.85} disabled={answered || pick != null} onPress={() => commit(n)}
              style={[styles.numChip, pick === n && (target == null || Math.abs(n - target) <= tol ? { backgroundColor: C.okSoft, borderColor: '#15c98c' } : { backgroundColor: C.badSoft, borderColor: '#ef4444' })]}>
              <Text style={styles.numChipText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }
  return (
    <View>
      {!!cfg.label && <Text style={styles.hint}>{cfg.label}</Text>}
      <Text style={styles.nlValue}>{value}</Text>
      <View style={styles.nlStepper}>
        <TouchableOpacity style={styles.nlBtn} disabled={answered || pick != null} onPress={() => setValue((v) => Math.max(min, Math.round((v - step) * 100) / 100))}><Text style={styles.nlBtnText}>−</Text></TouchableOpacity>
        <View style={styles.nlTrack}><View style={[styles.nlFill, { width: `${((value - min) / Math.max(1, max - min)) * 100}%` }]} /></View>
        <TouchableOpacity style={styles.nlBtn} disabled={answered || pick != null} onPress={() => setValue((v) => Math.min(max, Math.round((v + step) * 100) / 100))}><Text style={styles.nlBtnText}>+</Text></TouchableOpacity>
      </View>
      {!answered && pick == null && (
        <TouchableOpacity onPress={() => commit(value)} style={styles.checkBtn}><Text style={styles.checkBtnText}>Check</Text></TouchableOpacity>
      )}
    </View>
  );
};

/** Content / media / creative — a readable card. Non-blocking (SCENE_KINDS). */
const ContentPlayer: React.FC<PlayerProps> = ({ activity }) => {
  const cfg = cfgOf(activity);
  const kind = String(activity.kind).toUpperCase();
  const lines: string[] = Array.isArray(cfg.lines) ? cfg.lines.map(String)
    : Array.isArray(cfg.instructions) ? cfg.instructions.map(String) : [];
  const body = cfg.promptText || cfg.text || activity.prompt || activity.narration || '';
  const media = (activity as any).mediaUrl || cfg.videoUrl || cfg.url || null;
  const isVideo = kind === 'WATCH' || kind === 'VIDEO' || kind === 'INTERACTIVE_VIDEO';
  const icon = isVideo ? '🎬' : kind === 'SPEAK' ? '🎤' : kind === 'READ' ? '📖'
    : kind === 'DRAW' || kind === 'COLOUR_IN' ? '🎨' : kind === 'TRACE' || kind === 'TRACE_GUIDED' ? '✏️'
    : kind === 'LABEL_DIAGRAM' ? '🏷️' : kind === 'PRACTICAL' ? '🧪' : '✨';
  const speak = () => { Speech.stop(); if (body) Speech.speak(String(body), { language: activeTtsLang, rate: 0.9 }); };
  return (
    <View style={styles.contentCard}>
      <Text style={styles.contentIcon}>{icon}</Text>
      {!!body && <Text style={styles.contentBody}>{body}</Text>}
      {lines.map((l, i) => <Text key={i} style={styles.contentLine}>• {l}</Text>)}
      {isVideo && media && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL(String(media)).catch(() => {})}>
          <LinearGradient colors={['#3aa0ff', '#7c5cff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.watchBtn}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.bigListenText}>Watch</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {(kind === 'READ' || kind === 'SPEAK') && !!body && (
        <TouchableOpacity activeOpacity={0.85} onPress={speak}>
          <LinearGradient colors={['#3aa0ff', '#7c5cff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.watchBtn}>
            <Ionicons name="volume-high" size={18} color="#fff" />
            <Text style={styles.bigListenText}>{kind === 'SPEAK' ? 'Hear it' : 'Read aloud'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      <Text style={styles.contentHint}>Tap Next to continue</Text>
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
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { color: S.inkSoft, marginTop: 14, fontWeight: '600' },

  emptyIcon: { fontSize: 60, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: S.ink },
  emptyText: { fontSize: 13, color: S.inkSoft, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  backBtn: { marginTop: 18, backgroundColor: '#7c5cff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99 },
  backBtnText: { color: '#fff', fontWeight: '800' },

  stepChip: {
    minWidth: 40, alignItems: 'center',
    backgroundColor: S.ring, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  stepChipText: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },

  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginBottom: 8 },
  dot: { flex: 1, height: 5, borderRadius: 99, backgroundColor: S.line },
  dotVisited: { backgroundColor: '#a78bfa' },
  dotActive: { backgroundColor: '#7c5cff' },

  scroll: { padding: 14 },

  // Intro
  introCard: { borderRadius: 20, padding: 18, alignItems: 'center' },
  introEmoji: { fontSize: 54, marginBottom: 8 },
  introTitle: { fontSize: 19, fontWeight: '800', color: S.ink, textAlign: 'center' },
  introBody: { fontSize: 14.5, color: S.ink, textAlign: 'center', lineHeight: 21, fontWeight: '500', marginTop: 8 },
  listenChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: S.card, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 99, marginTop: 12,
    borderWidth: 1.5, borderColor: '#a78bfa',
  },
  listenChipText: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: S.card, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 99, marginTop: 12, borderWidth: 1.5, borderColor: '#a78bfa',
  },
  speedChipText: { color: '#7c5cff', fontWeight: '800', fontSize: 12 },

  // Prompt row
  promptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  promptText: { flex: 1, fontSize: 17, fontWeight: '800', color: S.ink, lineHeight: 23 },
  listenRound: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: S.ring, borderWidth: 1.5, borderColor: '#a78bfa',
    alignItems: 'center', justifyContent: 'center',
  },
  speedRound: {
    minWidth: 34, height: 34, borderRadius: 17, paddingHorizontal: 8,
    backgroundColor: S.ring, borderWidth: 1.5, borderColor: '#a78bfa',
    alignItems: 'center', justifyContent: 'center',
  },
  speedRoundText: { color: '#7c5cff', fontWeight: '800', fontSize: 11 },
  hint: { fontSize: 12, color: S.inkSoft, fontWeight: '700', marginBottom: 10 },

  // Choice tiles (emoji/colour grid)
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '30%', flexGrow: 1, maxWidth: '48%',
    aspectRatio: 1.15,
    borderRadius: 18, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: S.card, borderColor: S.line,
  },
  tileEmoji: { fontSize: 44 },
  tileSwatch: { width: 44, height: 44, borderRadius: 22 },
  tileImg: { width: 60, height: 60, borderRadius: 10 },
  tileWord: { fontSize: 15, fontWeight: '800', color: S.ink, textAlign: 'center' },
  tileLabel: { fontSize: 11.5, fontWeight: '700', color: S.inkSoft, marginTop: 4, textAlign: 'center' },

  // FILL_BLANK — sentence with the answer typed inline in the blank
  fbInlineWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
  fbInlineText: { fontSize: 16, fontWeight: '700', color: S.ink, lineHeight: 34 },
  fbInlineInput: {
    minWidth: 90, borderBottomWidth: 2, borderBottomColor: '#7c5cff',
    fontSize: 16, fontWeight: '800', color: '#7c5cff', textAlign: 'center',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  fbInlineInputDone: { borderBottomColor: '#15c98c', color: '#15c98c' },
  dim: { opacity: 0.45 },

  // Text-mode choices
  textGrid: { gap: 9 },
  textChoice: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, borderWidth: 2,
  },
  textChoiceLabel: { flex: 1, fontSize: 14.5, fontWeight: '700', color: S.ink },

  // Count
  countStage: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
    backgroundColor: S.card, borderRadius: 18, borderWidth: 2, borderColor: S.line,
    padding: 18, marginBottom: 12,
  },
  countEmoji: { fontSize: 42 },
  numRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  numChip: {
    minWidth: 62, alignItems: 'center',
    backgroundColor: S.card, borderWidth: 2, borderColor: S.line,
    borderRadius: 16, paddingVertical: 12,
  },
  numChipText: { fontSize: 20, fontWeight: '800', color: S.ink },

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
    backgroundColor: S.card, borderWidth: 2.5, borderRadius: 18,
    padding: 10, alignItems: 'center',
  },
  bucketLabel: { fontSize: 13, fontWeight: '800', color: S.ink },
  bucketItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6, justifyContent: 'center' },
  bucketEmoji: { fontSize: 22 },

  // Scene
  sceneCard: { borderRadius: 20, padding: 22, alignItems: 'center' },
  sceneEmoji: { fontSize: 56, marginBottom: 10 },
  sceneLine: { fontSize: 16, fontWeight: '700', color: S.ink, textAlign: 'center', lineHeight: 24 },

  placeholder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: S.warnSoft, borderRadius: 14, padding: 16,
  },
  placeholderText: { flex: 1, color: S.warnInk, fontSize: 13, fontWeight: '600' },
  placeholderSkip: { color: S.warnInk, fontWeight: '800', fontSize: 13 },

  // True / False
  tfStmt: { fontSize: 16, fontWeight: '800', color: S.ink, textAlign: 'center', marginBottom: 16, lineHeight: 22 },
  tfRow: { flexDirection: 'row', gap: 12 },
  tfBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: S.card, borderWidth: 2, borderColor: '#ece8fb', borderRadius: 18, paddingVertical: 20 },
  tfRight: { borderColor: '#15c98c', backgroundColor: '#eafef3' },
  tfWrong: { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
  tfEmoji: { fontSize: 30 },
  tfLabel: { fontSize: 15, fontWeight: '800', color: S.ink },

  // Text answer (FILL_BLANK / LISTEN_TYPE)
  fbPrompt: { fontSize: 15.5, fontWeight: '700', color: S.ink, marginTop: 12, marginBottom: 10, lineHeight: 22 },
  input: { borderWidth: 2, borderColor: '#ece8fb', borderRadius: 14, backgroundColor: S.card, paddingHorizontal: 14, height: 50, fontSize: 15, fontWeight: '600', color: S.ink },
  checkBtn: { alignSelf: 'flex-start', backgroundColor: '#7c5cff', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11, marginTop: 12 },
  checkBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Match (DRAG_MATCH)
  matchCols: { flexDirection: 'row', gap: 14, justifyContent: 'space-between' },
  matchCol: { flex: 1, gap: 10 },
  matchCard: { minHeight: 60, borderRadius: 16, borderWidth: 2, borderColor: '#ece8fb', backgroundColor: S.card, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  matchCardSel: { borderColor: '#7c5cff', backgroundColor: C.ring },
  matchCardDone: { borderColor: '#15c98c', backgroundColor: '#eafef3' },
  matchCardWrong: { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
  matchGlyph: { fontSize: 26, fontWeight: '800', color: S.ink },
  matchTick: { position: 'absolute', top: 4, right: 6, color: '#15c98c', fontWeight: '900' },
  seqNum: { position: 'absolute', top: 3, right: 6, fontSize: 12, fontWeight: '900', color: '#15c98c' },

  // Compare
  compareRow: { flexDirection: 'row', gap: 12 },
  compareGroup: { flex: 1, borderWidth: 2, borderColor: '#ece8fb', borderRadius: 18, backgroundColor: S.card, padding: 12, minHeight: 90, justifyContent: 'center' },
  compareEmojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  compareEmoji: { fontSize: 22 },

  // Memory pairs
  memGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  memCard: { width: 68, height: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  memUp: { backgroundColor: S.card, borderColor: '#7c5cff' },
  memDown: { backgroundColor: '#7c5cff', borderColor: '#7c5cff' },
  memGlyph: { fontSize: 30 },

  // Hotspot
  hotspotScene: { height: 280, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  hotspotObj: { position: 'absolute', width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  hotspotFound: { backgroundColor: 'rgba(21,201,140,0.3)', borderWidth: 2, borderColor: '#15c98c' },
  hotspotMiss: { backgroundColor: 'rgba(239,68,68,0.25)' },
  hotspotEmoji: { fontSize: 30 },

  // Number line
  nlValue: { fontSize: 32, fontWeight: '900', color: S.ink, textAlign: 'center', marginVertical: 10 },
  nlStepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nlBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#7c5cff', alignItems: 'center', justifyContent: 'center' },
  nlBtnText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  nlTrack: { flex: 1, height: 10, borderRadius: 99, backgroundColor: S.line, overflow: 'hidden' },
  nlFill: { height: '100%', borderRadius: 99, backgroundColor: '#7c5cff' },

  // Content / media
  contentCard: { backgroundColor: S.card, borderRadius: 18, borderWidth: 1, borderColor: S.line, padding: 18, alignItems: 'center' },
  contentIcon: { fontSize: 40, marginBottom: 8 },
  contentBody: { fontSize: 15, fontWeight: '600', color: S.ink, textAlign: 'center', lineHeight: 22 },
  contentLine: { alignSelf: 'stretch', fontSize: 14, fontWeight: '600', color: S.inkSoft, marginTop: 8, lineHeight: 20 },
  contentHint: { fontSize: 12, fontWeight: '700', color: S.inkSoft, marginTop: 14 },
  watchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 14 },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    // paddingBottom comes from the safe-area inset inline — a fixed 22 sat
    // under Android's ~48dp nav keys, hiding Back/Next entirely.
    backgroundColor: S.card,
    borderTopWidth: 1, borderTopColor: S.divider,
  },
  prevBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: S.soft,
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

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

