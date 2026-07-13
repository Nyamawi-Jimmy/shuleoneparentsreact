// Brain Games — web-parity hub + playable games in the app's gamified skin.
// Same catalogue and round generators as the web (gamesData.ts), the same
// star-gating (/gamification/games-gate: game i unlocks at base + i*step XP,
// failing OPEN so kids are never locked out by an error), and the same two
// engines: QuizGame (all round-based games) and MemoryGame (flip the pairs).

import React, { useCallback, useRef, useState } from 'react';
import { useTheme } from '../../../theme/ThemeContext';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useTier, pickByTier } from '../TierContext';
import { useTokens, SHARED } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import { getGamificationState, getGamesGate, GamesGate } from '../../../api/gamification';
import {
  GAMES, GameDef, Round, randomPraise, buildMemoryDeck,
} from '../gamesData';

const TONES: Record<string, [string, string]> = {
  purple: [SHARED.purple1, SHARED.purple2],
  green: [SHARED.green1, SHARED.green2],
  orange: [SHARED.orange1, SHARED.orange2],
  blue: [SHARED.blue1, SHARED.blue2],
  pink: [SHARED.pink1, SHARED.pink2],
  amber: [SHARED.amber1, SHARED.amber2],
  teal: [SHARED.teal1, SHARED.teal2],
};

const say = (text: string) => {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', pitch: 1.1, rate: 0.95 });
};

export const GamesView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  useTheme(); // subscribe — styles/C proxies resolve the active scheme
  const { accessToken } = useAuth();
  const playful = tier === 'sprout' || tier === 'explorer';

  const [gate, setGate] = useState<GamesGate | null>(null);
  const [stars, setStars] = useState<number | null>(null);
  // Rounds/deck are random — built ONCE at launch (in the tap handler),
  // then owned by the game component; replay rebuilds in its own handler.
  const [active, setActive] = useState<LaunchedGame | null>(null);

  useFocusEffect(useCallback(() => {
    if (!accessToken) return;
    let off = false;
    // Fails open: if the gate can't be read, every game stays playable.
    getGamesGate(accessToken)
      .then((g) => { if (!off) setGate(g && typeof g.enabled === 'boolean' ? g : { enabled: false }); })
      .catch(() => { if (!off) setGate({ enabled: false }); });
    getGamificationState(accessToken)
      .then((g) => { if (!off) setStars(g.totalXp ?? 0); })
      .catch(() => {});
    return () => { off = true; };
  }, [accessToken]));

  const gateOn = !!gate?.enabled;
  const base = Number.isFinite(gate?.base) ? Number(gate!.base) : 25;
  const step = Number.isFinite(gate?.step) ? Number(gate!.step) : 40;
  const reqFor = (i: number) => (gateOn ? base + i * step : 0);
  // While XP is still loading (null), don't lock — avoids a flash of locks.
  const isLocked = (i: number) => gateOn && stars != null && stars < reqFor(i);
  const anyLocked = GAMES.some((_, i) => isLocked(i));

  const launch = (g: GameDef) => {
    setActive({
      game: g,
      rounds: g.build ? g.build() : [],
      deck: g.faces ? buildMemoryDeck(g.faces) : [],
    });
  };

  // ── Playing a game ────────────────────────────────────
  if (active) {
    const exit = () => setActive(null);
    return (
      <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
        <TopBar />
        {active.game.kind === 'memory'
          ? <MemoryGame launched={active} playful={playful} tier={tier} onExit={exit} />
          : <QuizGame launched={active} playful={playful} tier={tier} onExit={exit} />}
      </View>
    );
  }

  // ── Hub ───────────────────────────────────────────────
  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{playful ? '🧠 Brain Games' : '🧠 Games & Quizzes'}</Text>
          <View style={styles.secHLine} />
        </View>
        <Text style={styles.subline}>
          {gateOn && anyLocked
            ? (playful ? 'Read lessons to earn ⭐ and unlock more games!' : 'Earn stars by finishing lessons to unlock more games.')
            : (playful ? 'Pick a game and play to earn ⭐ and XP!' : 'Quick games to practise what you’ve learned.')}
        </Text>

        <View style={styles.tiles}>
          {GAMES.map((g, i) => {
            const colors = TONES[g.tone] || TONES.purple;
            const title = pickByTier(tier, { base: g.title.base, sprout: g.title.sprout ?? g.title.base, explorer: g.title.sprout ?? g.title.base });
            const blurb = pickByTier(tier, { base: g.blurb.base, sprout: g.blurb.sprout ?? g.blurb.base, explorer: g.blurb.sprout ?? g.blurb.base });
            const locked = isLocked(i);
            return (
              <TouchableOpacity
                key={g.id}
                activeOpacity={0.85}
                style={styles.tile}
                disabled={locked}
                onPress={() => launch(g)}
              >
                <LinearGradient
                  colors={locked ? ['#c8c2e2', '#b3abd6'] : colors}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.tileGrad, { borderRadius: tokens.radius }]}
                >
                  <Text style={styles.tileIcon}>{g.icon}</Text>
                  <Text style={styles.tileTitle}>{title}</Text>
                  <Text style={styles.tileSub}>{blurb}</Text>
                  <View style={styles.tileFoot}>
                    {locked ? (
                      <Text style={styles.tileLock}>🔒 {stars ?? 0}/{reqFor(i)} ⭐</Text>
                    ) : (
                      <Text style={styles.tileGo}>Play ▶</Text>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// =================================================================
// Quiz engine — renders any round-based game (count/letters/shapes/
// colours/mix). Correct → confetti-praise + advance; wrong → try again.
// =================================================================
interface LaunchedGame {
  game: GameDef;
  rounds: Round[];
  deck: { id: number; face: string }[];
}

interface GameProps {
  launched: LaunchedGame;
  playful: boolean;
  tier: string;
  onExit: () => void;
}

const QuizGame: React.FC<GameProps> = ({ launched, playful, tier, onExit }) => {
  const { game } = launched;
  const [rounds, setRounds] = useState<Round[]>(launched.rounds);
  const [idx, setIdx] = useState(0);
  const [flash, setFlash] = useState<{ key: string; correct: boolean } | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [done, setDone] = useState(false);
  const mistakes = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const title = pickByTier(tier as any, { base: game.title.base, sprout: game.title.sprout ?? game.title.base, explorer: game.title.sprout ?? game.title.base });

  const total = rounds.length;
  const round = rounds[idx];

  const handlePick = (key: string) => {
    if (locked || done || !round) return;
    if (key === round.answer) {
      setFlash({ key, correct: true });
      setLocked(true);
      say(round.praise || randomPraise());
      setScore((s) => s + 1);
      if (mistakes.current === 0) setPerfect((p) => p + 1);
      after(950, () => {
        mistakes.current = 0;
        setFlash(null);
        setLocked(false);
        if (idx + 1 >= total) setDone(true);
        else setIdx((i) => i + 1);
      });
    } else {
      mistakes.current += 1;
      setFlash({ key, correct: false });
      say('Try again!');
      after(650, () => setFlash((f) => (f && !f.correct ? null : f)));
    }
  };

  const replay = () => {
    setRounds(game.build ? game.build() : []);
    setIdx(0); setScore(0); setPerfect(0); setDone(false);
    setFlash(null); setLocked(false); mistakes.current = 0;
  };

  if (done) {
    const gStars = perfect === total ? 3 : perfect >= Math.ceil(total / 2) ? 2 : 1;
    return (
      <GameReward
        title={title} stars={gStars} xp={score * 10}
        score={score} total={total} playful={playful}
        onReplay={replay} onExit={onExit}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.stage} showsVerticalScrollIndicator={false}>
      <GameHead icon={game.icon} title={title} onExit={onExit}>
        <Text style={styles.headChip}>{idx + 1}/{total}</Text>
        <Text style={styles.headChip}>⭐ {score}</Text>
      </GameHead>

      <View style={styles.promptRow}>
        <Text style={styles.prompt}>{round.prompt}</Text>
        <TouchableOpacity style={styles.hear} hitSlop={6} onPress={() => say(round.say || round.prompt)}>
          <Ionicons name="volume-high" size={16} color="#7c5cff" />
        </TouchableOpacity>
      </View>

      {/* Visual — tappable icons count aloud (the counting game's learn loop) */}
      {round.visual?.kind === 'icons' && (
        <View style={styles.iconsWrap}>
          {Array.from({ length: round.visual.count }).map((_, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={round.visual!.tappable ? 0.7 : 1}
              disabled={!round.visual!.tappable}
              onPress={() => say(String(i + 1))}
            >
              <Text style={[styles.iconGlyph, round.visual!.big && styles.iconGlyphBig]}>
                {round.visual!.icon}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={round.optionKind === 'glyph' || round.optionKind === 'swatch' ? styles.optGrid : styles.optRow}>
        {round.options.map((opt) => {
          const state = flash && flash.key === opt.key ? (flash.correct ? 'right' : 'wrong') : null;
          const border = state === 'right' ? '#15c98c' : state === 'wrong' ? '#ef4444' : '#ece8fb';
          const bg = state === 'right' ? '#eafef3' : state === 'wrong' ? '#fee2e2' : '#fff';
          if (round.optionKind === 'swatch') {
            return (
              <TouchableOpacity key={opt.key} activeOpacity={0.85} disabled={locked}
                onPress={() => handlePick(opt.key)}
                style={[styles.swatchOpt, { borderColor: border, backgroundColor: bg }]}>
                <View style={[styles.swatch, { backgroundColor: opt.hex }]} />
                <Text style={styles.swatchLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          }
          if (round.optionKind === 'glyph') {
            return (
              <TouchableOpacity key={opt.key} activeOpacity={0.85} disabled={locked}
                onPress={() => handlePick(opt.key)}
                style={[styles.glyphOpt, { borderColor: border, backgroundColor: bg }]}>
                <Text style={styles.glyphText}>{opt.glyph}</Text>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity key={opt.key} activeOpacity={0.85} disabled={locked}
              onPress={() => handlePick(opt.key)}
              style={[styles.bigOpt, { borderColor: border, backgroundColor: bg }]}>
              <Text style={styles.bigOptText}>{String(opt.value ?? opt.label)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// =================================================================
// Memory — flip and match the pairs in as few moves as possible.
// =================================================================
const MemoryGame: React.FC<GameProps> = ({ launched, playful, tier, onExit }) => {
  const { game } = launched;
  const faces = game.faces ?? [];
  const pairs = faces.length;
  const [deck, setDeck] = useState<{ id: number; face: string }[]>(launched.deck);
  const [up, setUp] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const title = pickByTier(tier as any, { base: game.title.base, sprout: game.title.sprout ?? game.title.base, explorer: game.title.sprout ?? game.title.base });

  const done = matched.size === deck.length && deck.length > 0;

  const flip = (i: number) => {
    if (locked || up.includes(i) || matched.has(i)) return;
    const next = [...up, i];
    setUp(next);
    if (next.length < 2) return;
    setLocked(true);
    setMoves((m) => m + 1);
    const [a, b] = next;
    if (deck[a].face === deck[b].face) {
      say('Match!');
      after(450, () => {
        setMatched((prev) => new Set(prev).add(a).add(b));
        setUp([]);
        setLocked(false);
      });
    } else {
      after(850, () => { setUp([]); setLocked(false); });
    }
  };

  const replay = () => {
    setDeck(buildMemoryDeck(faces));
    setUp([]); setMatched(new Set()); setMoves(0); setLocked(false);
  };

  if (done) {
    const gStars = moves <= pairs + 1 ? 3 : moves <= pairs + 4 ? 2 : 1;
    return (
      <GameReward
        title={title} stars={gStars} xp={pairs * 10}
        playful={playful} onReplay={replay} onExit={onExit}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.stage} showsVerticalScrollIndicator={false}>
      <GameHead icon={game.icon} title={title} onExit={onExit}>
        <Text style={styles.headChip}>🃏 {matched.size / 2}/{pairs}</Text>
        <Text style={styles.headChip}>{moves} moves</Text>
      </GameHead>

      <Text style={[styles.prompt, { textAlign: 'center', marginBottom: 12 }]}>
        {playful ? 'Find the matching pairs! 🃏' : 'Match the pairs'}
      </Text>

      <View style={styles.memGrid}>
        {deck.map((card, i) => {
          const faceUp = up.includes(i) || matched.has(i);
          const isMatched = matched.has(i);
          return (
            <TouchableOpacity
              key={card.id} activeOpacity={0.85} onPress={() => flip(i)}
              style={[
                styles.memCard,
                faceUp && styles.memCardUp,
                isMatched && styles.memCardMatched,
              ]}
            >
              <Text style={styles.memFace}>{faceUp ? card.face : '❓'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// =================================================================
// Shared chrome — in-game header + reward screen
// =================================================================
const GameHead: React.FC<{ icon: string; title: string; onExit: () => void; children?: React.ReactNode }> =
  ({ icon, title, onExit, children }) => (
    <View style={styles.gameHead}>
      <TouchableOpacity style={styles.exitBtn} hitSlop={8} onPress={onExit}>
        <Ionicons name="chevron-back" size={18} color={C.ink} />
      </TouchableOpacity>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.gameHeadEyebrow}>BRAIN GAMES</Text>
        <View style={styles.gameHeadTitleRow}>
          <Text style={styles.gameHeadIcon}>{icon}</Text>
          <Text style={styles.gameHeadTitle} numberOfLines={1}>{title}</Text>
        </View>
      </View>
      <View style={styles.gameHeadRight}>{children}</View>
    </View>
  );

const GameReward: React.FC<{
  title: string; stars: number; xp: number; score?: number; total?: number;
  playful: boolean; onReplay: () => void; onExit: () => void;
}> = ({ title, stars, xp, score, total, playful, onReplay, onExit }) => (
  <ScrollView contentContainerStyle={styles.rewardScroll} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.rewardCard}>
      <Text style={{ fontSize: 60 }}>🎉</Text>
      <Text style={styles.rewardTitle}>{title}</Text>
      <Text style={styles.rewardMsg}>
        {stars === 3 ? (playful ? 'AMAZING! Perfect game!' : 'Perfect run!')
          : stars === 2 ? 'Great job — nearly perfect!'
          : 'Nice try! Play again to improve.'}
      </Text>
      {score != null && total != null && (
        <Text style={styles.rewardScore}>You got {score}/{total} right</Text>
      )}
      <View style={styles.rewardStars}>
        {[1, 2, 3].map((s) => (
          <Text key={s} style={[styles.rewardStar, s > stars && { opacity: 0.25 }]}>⭐</Text>
        ))}
      </View>
      <Text style={styles.rewardXp}>+{xp} XP</Text>
    </LinearGradient>

    <View style={styles.rewardBtns}>
      <TouchableOpacity activeOpacity={0.85} onPress={onReplay} style={styles.replayBtn}>
        <Ionicons name="refresh" size={16} color="#7c5cff" />
        <Text style={styles.replayText}>Play again</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.85} onPress={onExit}>
        <LinearGradient colors={['#7c5cff', '#a78bfa']} style={styles.exitGrad}>
          <Text style={styles.exitGradText}>All games</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

// =================================================================
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: S.ink },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: S.line },
  subline: { fontSize: 12.5, color: S.inkSoft, fontWeight: '600', marginBottom: 14 },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1 },
  tileGrad: {
    padding: 14, minHeight: 128,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 3,
  },
  tileIcon: { fontSize: 30 },
  tileTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 8 },
  tileSub: { color: '#fff', fontSize: 11, fontWeight: '600', opacity: 0.92, marginTop: 2 },
  tileFoot: { marginTop: 10, alignItems: 'flex-start' },
  tileGo: {
    color: '#fff', fontWeight: '800', fontSize: 11.5,
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden',
  },
  tileLock: {
    color: '#fff', fontWeight: '800', fontSize: 11.5,
    backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden',
  },

  // In-game
  stage: { padding: 16 },
  gameHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  exitBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    alignItems: 'center', justifyContent: 'center',
  },
  gameHeadEyebrow: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.7, color: S.faint },
  gameHeadTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameHeadIcon: { fontSize: 15 },
  gameHeadTitle: { fontSize: 16, fontWeight: '800', color: S.ink, flexShrink: 1 },
  gameHeadRight: { flexDirection: 'row', gap: 6 },
  headChip: {
    backgroundColor: S.card, borderWidth: 1.5, borderColor: S.line,
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4,
    fontSize: 11.5, fontWeight: '800', color: S.ink, overflow: 'hidden',
  },

  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  prompt: { flex: 1, fontSize: 18, fontWeight: '800', color: S.ink },
  hear: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: S.ring, borderWidth: 1.5, borderColor: '#a78bfa',
    alignItems: 'center', justifyContent: 'center',
  },

  iconsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
    backgroundColor: S.card, borderRadius: 18, borderWidth: 2, borderColor: S.line,
    padding: 16, marginBottom: 14,
  },
  iconGlyph: { fontSize: 38, padding: 2 },
  iconGlyphBig: { fontSize: 64 },

  optRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bigOpt: {
    minWidth: 76, alignItems: 'center',
    borderWidth: 2.5, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18,
  },
  bigOptText: { fontSize: 26, fontWeight: '800', color: S.ink },
  glyphOpt: {
    flexBasis: '47%', flexGrow: 1, alignItems: 'center',
    borderWidth: 2.5, borderRadius: 18, paddingVertical: 18,
  },
  glyphText: { fontSize: 44 },
  swatchOpt: {
    flexBasis: '47%', flexGrow: 1, alignItems: 'center', gap: 6,
    borderWidth: 2.5, borderRadius: 18, paddingVertical: 14,
  },
  swatch: { width: 46, height: 46, borderRadius: 23 },
  swatchLabel: { fontSize: 12.5, fontWeight: '800', color: S.ink },

  // Memory
  memGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  memCard: {
    width: '22%', aspectRatio: 0.9,
    backgroundColor: '#7c5cff', borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  memCardUp: { backgroundColor: S.card, borderColor: S.line },
  memCardMatched: { backgroundColor: S.okSoft, borderColor: '#15c98c' },
  memFace: { fontSize: 30, color: '#fff' },

  // Reward
  rewardScroll: { padding: 16, paddingTop: 28 },
  rewardCard: {
    borderRadius: 26, padding: 26, alignItems: 'center',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28, shadowRadius: 18, elevation: 8,
  },
  rewardTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 },
  rewardMsg: { color: '#fff', fontSize: 13.5, fontWeight: '600', marginTop: 4, opacity: 0.95, textAlign: 'center' },
  rewardScore: {
    color: '#fff', fontSize: 12.5, fontWeight: '800', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 99,
    paddingHorizontal: 13, paddingVertical: 5, overflow: 'hidden',
  },
  rewardStars: { flexDirection: 'row', gap: 10, marginTop: 18 },
  rewardStar: { fontSize: 44 },
  rewardXp: { color: '#ffd766', fontSize: 17, fontWeight: '800', marginTop: 14 },
  rewardBtns: { flexDirection: 'row', gap: 12, marginTop: 22, justifyContent: 'center' },
  replayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: S.card, borderWidth: 2, borderColor: '#a78bfa',
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12,
  },
  replayText: { color: '#7c5cff', fontWeight: '800', fontSize: 13.5 },
  exitGrad: { borderRadius: 999, paddingHorizontal: 22, paddingVertical: 13 },
  exitGradText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

