import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { mockTeenHome, mockStudentName, mockAvatarEmoji } from '../mockData';

// ── REAL DATA ─────────────────────────────────────────────────
import { useStudentHome } from '../../../hooks/useStudentHome';

export const TeenHome: React.FC = () => {
  const { profile, gamification, progress } = useStudentHome();

  // Real values, falling back to mock for unsupported fields
  const realFirstName = profile?.firstName ?? mockStudentName;
  const realStreak = gamification.streak?.current ?? mockTeenHome.streak;
  const realRecent = progress.recent?.[0] ?? null;

  const className = profile?.className ?? 'Grade 8';
  const streamLabel = profile?.streamName ?? 'Falcons';
  const heroMeta = `${className} · ${streamLabel} · Term 2`;

  const realXpWeek = gamification.totalXp ?? mockTeenHome.xpWeek;

  // Continue lesson uses real recent data when available
  const continueLessonTitle = realRecent?.title ?? mockTeenHome.continueLesson;
  const continueLessonProgress = realRecent?.scorePct != null
    ? Math.max(0, Math.min(100, realRecent.scorePct)) / 100
    : mockTeenHome.continueProgress;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Teen hero - dark gradient */}
      <LinearGradient
        colors={['#1e1b4b', '#4c1d95', '#0e7490']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        locations={[0, 0.55, 1]}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <LinearGradient
            colors={['#a78bfa', '#22d3ee']}
            style={styles.tav}
          >
            <Text style={{ fontSize: 30 }}>{mockAvatarEmoji}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Yo, {realFirstName} ⚡</Text>
            <Text style={styles.heroSub}>{heroMeta}</Text>
            <View style={styles.leagueBadge}>
              <Text style={styles.leagueText}>
                🛡️ {mockTeenHome.league} · #{mockTeenHome.leagueRank} of {mockTeenHome.leagueTotal}
              </Text>
            </View>
          </View>
          <View style={styles.streakBig}>
            <Text style={styles.streakNum}>🔥{realStreak}</Text>
            <Text style={styles.streakLbl}>day streak</Text>
          </View>
        </View>
        <View style={styles.xpw}>
          <LinearGradient
            colors={['#22d3ee', '#a78bfa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.xpwFill, { width: '62%' }]}
          />
        </View>
        <Text style={styles.xpwLabel}>
          {realXpWeek} XP this week · {mockTeenHome.xpToPromotion} XP to hold your promotion spot
        </Text>
      </LinearGradient>

      {/* Teen stats grid - league/goals/achievements stay mock (no backend endpoint) */}
      <View style={styles.statsGrid}>
        {[
          { k: '🛡️', v: `#${mockTeenHome.leagueRank}`, s: 'League rank' },
          { k: '⚡', v: `${realXpWeek}`, s: 'XP this week' },
          { k: '🎯', v: '3 / 5', s: 'weekly goals' },
          { k: '🏅', v: `${gamification.badges?.length ?? 17}`, s: 'achievements' },
        ].map((stat) => (
          <View key={stat.s} style={styles.tstat}>
            <Text style={styles.tstatK}>{stat.k}</Text>
            <Text style={styles.tstatV}>{stat.v}</Text>
            <Text style={styles.tstatS}>{stat.s}</Text>
          </View>
        ))}
      </View>

      {/* Goals panel - keep mock (no weekly-goals endpoint yet) */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>🎯 This week's goals</Text>
          <TouchableOpacity onPress={() => router.push('/(student-tabs)/games' as any)}>
            <Text style={styles.panelMore}>View all</Text>
          </TouchableOpacity>
        </View>
        {mockTeenHome.goals.map((g, idx) => (
          <View key={g.id} style={[styles.goalRow, idx < mockTeenHome.goals.length - 1 && styles.goalDivider]}>
            <View style={[styles.ck, g.done && styles.ckDone]}>
              {g.done && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
            </View>
            <Text style={[styles.goalText, g.done && styles.goalDone]}>{g.title}</Text>
            <Text style={styles.goalXp}>+{g.xp} XP</Text>
          </View>
        ))}
      </View>

      {/* Continue lesson — real */}
      <View style={styles.continueCard}>
        <LinearGradient colors={['#7c3aed', '#22d3ee']} style={styles.continueThumb}>
          <Text style={{ fontSize: 28 }}>📐</Text>
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.continueTitle}>{continueLessonTitle}</Text>
          <View style={styles.continuePg}>
            <View style={[styles.continuePgFill, { width: `${continueLessonProgress * 100}%` }]} />
          </View>
        </View>
        <LinearGradient colors={['#15c98c', '#0fae78']} style={styles.playBtn}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/student/lesson' as any)}
            style={styles.playBtnTouch}
          >
            <Text style={styles.playBtnText}>▶ Resume</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* League board - mock (no leaderboard endpoint) */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>🛡️ Sapphire League</Text>
          <TouchableOpacity onPress={() => router.push('/student/stars' as any)}>
            <Text style={styles.panelMore}>Full board</Text>
          </TouchableOpacity>
        </View>
        {mockTeenHome.leagueBoard.map((r, idx) => (
          <View
            key={r.rank}
            style={[
              styles.boardRow,
              r.me && styles.boardRowMe,
              idx < mockTeenHome.leagueBoard.length - 1 && !r.me && styles.boardDivider,
            ]}
          >
            <View style={styles.boardRank}>
              <Text style={styles.boardRankText}>{r.rank}</Text>
            </View>
            <LinearGradient colors={r.color} style={styles.boardAv}>
              <Text style={{ fontSize: 16 }}>{r.avatar}</Text>
            </LinearGradient>
            <Text style={[styles.boardName, r.me && { fontWeight: '800' }]}>{r.name}</Text>
            <Text style={styles.boardPts}>{r.points}</Text>
          </View>
        ))}
      </View>

      {/* Due soon - mock (no assignment-deadlines endpoint yet) */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>📌 Due soon</Text>
        {mockTeenHome.dueSoon.map((d, idx) => (
          <View key={d.title} style={[styles.dlRow, idx < mockTeenHome.dueSoon.length - 1 && styles.dlDivider]}>
            <View style={styles.dlDot} />
            <Text style={styles.dlText}>{d.title}</Text>
            <View style={[styles.dlDue, !d.urgent && styles.dlDueSoft]}>
              <Text style={[styles.dlDueText, !d.urgent && styles.dlDueTextSoft]}>{d.due}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 24 },

  hero: {
    borderRadius: 18, padding: 18, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 6,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tav: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontWeight: '600', fontSize: 12, marginTop: 2 },
  leagueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, marginTop: 8,
  },
  leagueText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  streakBig: { alignItems: 'center' },
  streakNum: { color: '#fff', fontWeight: '800', fontSize: 28 },
  streakLbl: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 10 },
  xpw: {
    marginTop: 14, height: 8, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden',
  },
  xpwFill: { height: '100%' },
  xpwLabel: { color: '#fff', fontSize: 10.5, opacity: 0.85, fontWeight: '600', marginTop: 6 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tstat: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece8fb',
    borderRadius: 16, padding: 12,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  tstatK: { fontSize: 14 },
  tstatV: { fontSize: 19, fontWeight: '800', color: '#2c2550', marginTop: 4 },
  tstatS: { color: '#6f679c', fontWeight: '600', fontSize: 10.5, marginTop: 2 },

  panel: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ece8fb',
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550' },
  panelMore: { color: '#7c3aed', fontWeight: '700', fontSize: 11.5 },

  goalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  goalDivider: { borderBottomWidth: 1, borderBottomColor: '#ece8fb' },
  ck: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 2, borderColor: '#ece8fb',
    alignItems: 'center', justifyContent: 'center',
  },
  ckDone: { backgroundColor: '#7c3aed', borderColor: 'transparent' },
  goalText: { flex: 1, fontSize: 12.5, color: '#2c2550', fontWeight: '600' },
  goalDone: { textDecorationLine: 'line-through', color: '#6f679c' },
  goalXp: { color: '#7c3aed', fontWeight: '800', fontSize: 11.5 },

  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#ece8fb', marginBottom: 12,
  },
  continueThumb: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  continueTitle: { fontSize: 13, fontWeight: '800', color: '#2c2550' },
  continuePg: { height: 8, borderRadius: 99, backgroundColor: '#efeaff', marginTop: 6, overflow: 'hidden' },
  continuePgFill: { height: '100%', borderRadius: 99, backgroundColor: '#7c3aed' },
  playBtn: { borderRadius: 999, marginLeft: 8 },
  playBtnTouch: { paddingVertical: 8, paddingHorizontal: 12 },
  playBtnText: { color: '#fff', fontWeight: '800', fontSize: 11.5 },

  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  boardDivider: { borderBottomWidth: 1, borderBottomColor: '#ece8fb' },
  boardRowMe: { backgroundColor: '#fff3d6', borderRadius: 12, paddingHorizontal: 10 },
  boardRank: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#efeaff',
    alignItems: 'center', justifyContent: 'center',
  },
  boardRankText: { color: '#6f679c', fontWeight: '800', fontSize: 11 },
  boardAv: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  boardName: { flex: 1, fontWeight: '700', fontSize: 12.5, color: '#2c2550' },
  boardPts: { color: '#f59e0b', fontWeight: '800', fontSize: 12 },

  dlRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  dlDivider: { borderBottomWidth: 1, borderBottomColor: '#ece8fb' },
  dlDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22d3ee' },
  dlText: { flex: 1, fontWeight: '600', fontSize: 12.5, color: '#2c2550' },
  dlDue: { backgroundColor: '#ffeef1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dlDueSoft: { backgroundColor: '#efeaff' },
  dlDueText: { color: '#e2566f', fontWeight: '800', fontSize: 10.5 },
  dlDueTextSoft: { color: '#6f679c' },
});
