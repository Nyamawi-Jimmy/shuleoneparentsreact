import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Mascot } from '../components/Mascot';
import { RecommendationsWidget } from '../components/RecommendationsWidget';
import { useTier, pickByTier } from '../TierContext';
import { useTokens, SHARED, SHADOWS } from '../tokens';
import {mockPlayHome, mockStudentName, mockWorlds} from '../mockData';

// ── REAL DATA ─────────────────────────────────────────────────
// Hook + gamification helpers from the wired student-home delivery.
// Adjust these paths to match your project structure.
import { useStudentHome } from '../../../hooks/useStudentHome';
import { xpInCurrentLevel, XP_PER_LEVEL } from '../../../api/gamification.types';

const WORLD_GRADIENT: Record<string, [string, string]> = {
  purple: [SHARED.purple1, SHARED.purple2],
  indigo: [SHARED.indigo1, SHARED.indigo2],
  blue: [SHARED.blue1, SHARED.blue2],
  pink: [SHARED.pink1, SHARED.pink2],
  green: [SHARED.green1, SHARED.green2],
  orange: [SHARED.orange1, SHARED.orange2],
  teal: [SHARED.teal1, SHARED.teal2],
  amber: [SHARED.amber1, SHARED.amber2],
};

const WORLD_ROUTES: Record<string, string> = {
  w1: '/(student-tabs)/quest',
  w2: '/(student-tabs)/quest',
  w3: '/student/videos',
  w4: '/student/live-classes',
  w5: '/(student-tabs)/code',
  w6: '/(student-tabs)/games',
  w7: '/student/library',
  w8: '/student/stars',
};

export const PlayHome: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);

  // ── Pull real data ─────────────────────────────────
  const { profile, gamification, progress } = useStudentHome();

  // Real values (fall back to mock for graceful first paint)
  const realFirstName = profile?.firstName ?? mockStudentName;
  const realLevel = gamification.level ?? mockPlayHome.level;
  const realXp = xpInCurrentLevel(gamification);
  const realXpToNext = XP_PER_LEVEL;
  const realStreak = gamification.streak?.current ?? 5;
  const realRecent = progress.recent?.[0] ?? null;

  const greetTitle = pickByTier(tier, {
    base: `Hey ${realFirstName} 👋`,
    sprout: `Hi ${realFirstName}! 👋`,
  });
  const greetSub = pickByTier(tier, {
    base: `Ready to level up today? You're on a ${realStreak}-day streak — keep it going! 🔥`,
    sprout: `Ready for today's adventure? You're on a ${realStreak}-day streak — let's keep the flame alive! 🔥`,
  });
  const missionTitle = pickByTier(tier, {
    base: mockPlayHome.todayMission.titleBase,
    sprout: mockPlayHome.todayMission.title,
  });
  const missionBody = pickByTier(tier, {
    base: mockPlayHome.todayMission.bodyBase,
    sprout: mockPlayHome.todayMission.body,
  });
  // Continue lesson uses real recent lesson title when available
  const continueTitle = realRecent?.title
    ? realRecent.title
    : pickByTier(tier, {
        base: mockPlayHome.continueLesson.titleBase,
        sprout: mockPlayHome.continueLesson.title,
      });
  const continueProgress = realRecent?.scorePct != null
    ? Math.max(0, Math.min(100, realRecent.scorePct)) / 100
    : mockPlayHome.continueLesson.progress;
  const startLabel = pickByTier(tier, { base: 'Start', sprout: "Let's Go!" });
  const worldsHeader = pickByTier(tier, { base: '🧭 Choose your path', sprout: '🌈 Pick a World' });

  const xpPct = (realXp / realXpToNext) * 100;
  const xpToRankUp = realXpToNext - realXp;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* HERO */}
      <View style={styles.hero}>
        <View style={[styles.greetCard, { borderRadius: tokens.radius }]}>
          {tokens.mascotSize > 0 && (
            <View style={{ marginRight: 12 }}>
              <Mascot size={tokens.mascotSize} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.greetTitle}>{greetTitle}</Text>
            <Text style={styles.greetSub}>{greetSub}</Text>
          </View>
        </View>

        <LinearGradient
          colors={[tokens.accent1, tokens.accent2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statPane, { borderRadius: tokens.radius }]}
        >
          <View style={styles.ring}>
            <View style={[styles.ringInner, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
              <Text style={styles.ringNum}>{realLevel}</Text>
              <Text style={styles.ringLbl}>LEVEL</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.rankTitle}>
              {pickByTier(tier, {
                base: profile?.tier ? `Rank: ${profile.tier}` : 'Rank: Gold III',
                sprout: 'Super Learner',
              })}
            </Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
            </View>
            <Text style={styles.xpText}>
              {pickByTier(tier, {
                base: `${realXp} / ${realXpToNext} XP — ${xpToRankUp} XP to rank up 🚀`,
                sprout: `${realXp} / ${realXpToNext} XP — ${xpToRankUp} more to Level ${realLevel + 1}! 🚀`,
              })}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Today quest banner — backend has no missions endpoint yet, keep mock */}
      <LinearGradient
        colors={['#fff3d6', '#ffe9f3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.questBanner, { borderRadius: tokens.radius }]}
      >
        <Text style={styles.questBannerBig}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.questBannerTitle}>{missionTitle}</Text>
          <Text style={styles.questBannerBody}>{missionBody}</Text>
          <View style={styles.dots}>
            {Array.from({ length: mockPlayHome.todayMission.total }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < mockPlayHome.todayMission.progress && styles.dotOn]}
              />
            ))}
          </View>
        </View>
        <LinearGradient colors={[SHARED.orange1, SHARED.pink1]} style={styles.goBtn}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(student-tabs)/quest' as any)}
            style={styles.goBtnTouch}
          >
            <Text style={styles.goBtnText}>{startLabel}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </LinearGradient>

      {/* Continue learning — real recent lesson */}
      <View style={[styles.continueCard, { borderRadius: tokens.radius }]}>
        <LinearGradient colors={[SHARED.blue2, SHARED.purple2]} style={styles.continueThumb}>
          <Text style={{ fontSize: 30 }}>{mockPlayHome.continueLesson.icon}</Text>
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.continueTitle}>{continueTitle}</Text>
          <View style={styles.continuePg}>
            <LinearGradient
              colors={[tokens.accent1, tokens.accent2]}
              style={[styles.continuePgFill, { width: `${continueProgress * 100}%` }]}
            />
          </View>
        </View>
        <LinearGradient colors={[SHARED.green1, '#0fae78']} style={styles.playBtn}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/student/lesson' as any)}
            style={styles.playBtnTouch}
          >
            <Text style={styles.playBtnText}>▶ Resume</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <RecommendationsWidget />

      <View style={styles.secH}>
        <Text style={styles.secHTitle}>{worldsHeader}</Text>
        <View style={styles.secHLine} />
      </View>

      <View style={styles.worldsGrid}>
        {mockWorlds.map((w) => {
          const colors = WORLD_GRADIENT[w.color] || WORLD_GRADIENT.purple;
          const title = pickByTier(tier, { base: w.titleBase, sprout: w.title });
          const sub = pickByTier(tier, { base: w.subBase, sprout: w.sub });
          const route = WORLD_ROUTES[w.id];
          return (
            <TouchableOpacity
              key={w.id}
              activeOpacity={0.85}
              style={styles.worldCard}
              onPress={() => route && router.push(route as any)}
            >
              <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.worldGrad, { borderRadius: tokens.radius }]}
              >
                <Text style={styles.worldIcon}>{w.icon}</Text>
                <Text style={styles.worldTitle}>{title}</Text>
                <Text style={styles.worldSub}>{sub}</Text>
                <View style={styles.worldPg}>
                  <View style={[styles.worldPgFill, { width: `${w.progress}%` }]} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.secH, { marginTop: 8 }]}>
        <Text style={styles.secHTitle}>
          {pickByTier(tier, { base: '✨ More for you', sprout: '✨ More to Explore' })}
        </Text>
        <View style={styles.secHLine} />
      </View>

      <View style={styles.extraGrid}>
        <ExtraTile
          icon="📋"
          title={pickByTier(tier, { base: 'Tests', sprout: 'Try a Test' })}
          sub={pickByTier(tier, { base: 'Mocks & CATs', sprout: 'Practice tests' })}
          colors={[SHARED.purple1, SHARED.purple2]}
          onPress={() => router.push('/student/tests' as any)}
        />
        <ExtraTile
          icon="📝"
          title={pickByTier(tier, { base: 'Homework', sprout: 'My Homework' })}
          sub="Assignments due"
          colors={[SHARED.orange1, SHARED.pink1]}
          onPress={() => router.push('/student/assignments' as any)}
        />
        <ExtraTile
          icon="🌟"
          title={pickByTier(tier, { base: 'Portfolio', sprout: 'My Treasures' })}
          sub="What you've earned"
          colors={[SHARED.amber1, SHARED.orange1]}
          onPress={() => router.push('/student/portfolio' as any)}
        />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const ExtraTile: React.FC<{
  icon: string;
  title: string;
  sub: string;
  colors: [string, string];
  onPress: () => void;
}> = ({ icon, title, sub, colors, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.extraTile}>
    <LinearGradient colors={colors} style={styles.extraIcon}>
      <Text style={{ fontSize: 26 }}>{icon}</Text>
    </LinearGradient>
    <Text style={styles.extraTitle}>{title}</Text>
    <Text style={styles.extraSub}>{sub}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 24 },

  hero: { gap: 12, marginBottom: 14 },
  greetCard: {
    backgroundColor: '#fff', padding: 18,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden', ...SHADOWS.card,
  },
  greetTitle: { fontSize: 22, fontWeight: '800', color: '#2c2550', letterSpacing: -0.3 },
  greetSub: { color: '#6f679c', fontWeight: '500', marginTop: 6, fontSize: 13 },
  statPane: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
    overflow: 'hidden', ...SHADOWS.card,
  },
  ring: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  ringNum: { color: '#fff', fontWeight: '800', fontSize: 22 },
  ringLbl: { color: '#fff', fontSize: 9, opacity: 0.85, fontWeight: '700', marginTop: -2 },
  rankTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  xpBar: {
    height: 10, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 8, overflow: 'hidden',
  },
  xpFill: { height: '100%', borderRadius: 99, backgroundColor: '#ffd766' },
  xpText: { color: '#fff', fontWeight: '600', fontSize: 11, marginTop: 6, opacity: 0.95 },

  questBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    gap: 12, marginBottom: 14,
    borderWidth: 2, borderColor: '#fff', ...SHADOWS.card,
  },
  questBannerBig: { fontSize: 36 },
  questBannerTitle: { fontSize: 16, fontWeight: '800', color: '#2c2550' },
  questBannerBody: { fontSize: 12, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 24, height: 8, borderRadius: 99, borderWidth: 2, borderColor: '#ffd0a3' },
  dotOn: { borderColor: 'transparent', backgroundColor: '#ff9d2e' },
  goBtn: { borderRadius: 999 },
  goBtnTouch: { paddingVertical: 10, paddingHorizontal: 16 },
  goBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, marginBottom: 18,
    borderWidth: 2, borderColor: '#fff', ...SHADOWS.card,
  },
  continueThumb: {
    width: 56, height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  continueTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550' },
  continuePg: {
    height: 9, borderRadius: 99, backgroundColor: '#efeaff',
    marginTop: 6, overflow: 'hidden',
  },
  continuePgFill: { height: '100%', borderRadius: 99 },
  playBtn: { borderRadius: 999, marginLeft: 8 },
  playBtnTouch: { paddingVertical: 8, paddingHorizontal: 14 },
  playBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  worldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  worldCard: { flexBasis: '47%', flexGrow: 1 },
  worldGrad: {
    padding: 14, minHeight: 134, overflow: 'hidden',
    position: 'relative', ...SHADOWS.card,
  },
  worldIcon: { fontSize: 32, marginBottom: 8 },
  worldTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 6 },
  worldSub: { color: '#fff', fontSize: 10.5, fontWeight: '600', opacity: 0.92, marginTop: 2 },
  worldPg: {
    height: 7, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: 10, overflow: 'hidden',
  },
  worldPgFill: { height: '100%', borderRadius: 99, backgroundColor: '#fff' },

  extraGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  extraTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  extraIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  extraTitle: { fontSize: 12.5, fontWeight: '800', color: '#2c2550', textAlign: 'center' },
  extraSub: { fontSize: 10, color: '#6f679c', fontWeight: '600', marginTop: 2, textAlign: 'center' },
});
