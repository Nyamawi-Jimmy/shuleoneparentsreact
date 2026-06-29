import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens, SHARED } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import {
  mockCodingTracks, mockProjects, mockCodingCerts,
} from '../codeLabData';

export const CodeView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);

  // Show only tracks appropriate for the current tier
  const tracks = mockCodingTracks.filter((t) => t.tier.includes(tier));

  const title = pickByTier(tier, {
    base: '💻 Code Studio',
    sprout: '🤖 Code Lab — Build, Play, Create!',
    explorer: '🤖 Code Lab — Build, Play, Create!',
    scholar: '💻 Coding & Robotics',
    campus: '💻 Coding Labs',
  });

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>{title}</Text>
          <View style={styles.secHLine} />
        </View>

        {/* Featured project row - last 1 in-progress project */}
        {mockProjects.find((p) => p.status === 'in-progress') && (
          <ContinueProjectCard
            project={mockProjects.find((p) => p.status === 'in-progress')!}
            radius={tokens.radius}
          />
        )}

        {/* Coding tracks header */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>
            {pickByTier(tier, { base: '🚀 Choose a track', sprout: '🚀 Pick what to learn' })}
          </Text>
          <View style={styles.secHLine} />
        </View>

        <View style={styles.tracksGrid}>
          {tracks.map((track) => (
            <TouchableOpacity
              key={track.id}
              activeOpacity={0.85}
              style={styles.trackCard}
              onPress={() => router.push(track.route as any)}
            >
              <LinearGradient
                colors={track.color}
                style={[styles.trackGrad, { borderRadius: tokens.radius }]}
              >
                <View style={styles.trackHeader}>
                  <Text style={styles.trackEmoji}>{track.emoji}</Text>
                  <View style={styles.diffPill}>
                    <Text style={styles.diffText}>{track.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.trackName}>{track.name}</Text>
                <Text style={styles.trackDesc} numberOfLines={2}>
                  {track.description}
                </Text>
                <View style={styles.trackStatsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="book-outline" size={11} color="#fff" />
                    <Text style={styles.statText}>
                      {track.lessonsDone}/{track.lessonsTotal} lessons
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="construct-outline" size={11} color="#fff" />
                    <Text style={styles.statText}>{track.projects} projects</Text>
                  </View>
                </View>
                <View style={styles.trackPg}>
                  <View
                    style={[
                      styles.trackPgFill,
                      { width: `${(track.lessonsDone / track.lessonsTotal) * 100}%` },
                    ]}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* My Projects */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>
            {pickByTier(tier, { base: '🛠️ My projects', sprout: '🎮 My Creations' })}
          </Text>
          <View style={styles.secHLine} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16, gap: 12 }}
        >
          {mockProjects.map((p) => (
            <TouchableOpacity key={p.id} activeOpacity={0.85} style={styles.projectCard}>
              <LinearGradient colors={p.color} style={styles.projectThumb}>
                <Text style={styles.projectEmoji}>{p.thumb}</Text>
                {p.status === 'reviewed' && p.score !== undefined && (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{p.score}/30</Text>
                  </View>
                )}
                {p.status === 'submitted' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>SUBMITTED</Text>
                  </View>
                )}
              </LinearGradient>
              <Text style={styles.projectTitle} numberOfLines={1}>{p.title}</Text>
              <Text style={styles.projectMeta}>{p.lastEdited}</Text>
              {p.versions && (
                <Text style={styles.versionsText}>{p.versions} versions</Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={0.85} style={[styles.projectCard, styles.newProjectCard]}>
            <View style={styles.newProjectThumb}>
              <Ionicons name="add" size={32} color="#7c5cff" />
            </View>
            <Text style={styles.newProjectText}>New project</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Certificates */}
        <View style={[styles.secH, { marginTop: 18 }]}>
          <Text style={styles.secHTitle}>🏆 Earned</Text>
          <View style={styles.secHLine} />
        </View>

        <View style={styles.certsRow}>
          {mockCodingCerts.map((c) => (
            <View key={c.id} style={styles.certCard}>
              <Text style={styles.certEmoji}>{c.emoji}</Text>
              <Text style={styles.certTrack}>{c.track}</Text>
              <Text style={styles.certLevel}>{c.level}</Text>
              <Text style={styles.certDate}>{c.earned}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const ContinueProjectCard: React.FC<{
  project: typeof mockProjects[0];
  radius: number;
}> = ({ project, radius }) => (
  <View style={[styles.continueCard, { borderRadius: radius }]}>
    <LinearGradient colors={project.color} style={styles.continueThumb}>
      <Text style={{ fontSize: 28 }}>{project.thumb}</Text>
    </LinearGradient>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.continueLabel}>CONTINUE BUILDING</Text>
      <Text style={styles.continueTitle} numberOfLines={1}>{project.title}</Text>
      <Text style={styles.continueMeta}>{project.lastEdited} • {project.versions} saves</Text>
    </View>
    <LinearGradient colors={['#15c98c', '#0fae78']} style={styles.openBtn}>
      <TouchableOpacity activeOpacity={0.85} style={styles.openBtnTouch}>
        <Text style={styles.openBtnText}>▶ Open</Text>
      </TouchableOpacity>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#ece8fb' },

  // Continue card
  continueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12,
    marginBottom: 8,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12, elevation: 3,
  },
  continueThumb: {
    width: 54, height: 54, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  continueLabel: { fontSize: 9.5, color: '#7c5cff', fontWeight: '800', letterSpacing: 0.6 },
  continueTitle: { fontSize: 14, fontWeight: '800', color: '#2c2550', marginTop: 3 },
  continueMeta: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 3 },
  openBtn: { borderRadius: 999, marginLeft: 8 },
  openBtnTouch: { paddingVertical: 8, paddingHorizontal: 12 },
  openBtnText: { color: '#fff', fontWeight: '800', fontSize: 11.5 },

  // Tracks grid
  tracksGrid: { gap: 12 },
  trackCard: {},
  trackGrad: {
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  trackHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  trackEmoji: { fontSize: 38 },
  diffPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999,
  },
  diffText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  trackName: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 10 },
  trackDesc: { color: '#fff', fontSize: 12, fontWeight: '500', opacity: 0.92, marginTop: 4, lineHeight: 16 },
  trackStatsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  trackPg: {
    height: 6, borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 10, overflow: 'hidden',
  },
  trackPgFill: { height: '100%', backgroundColor: '#fff', borderRadius: 99 },

  // Projects horizontal
  projectCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  projectThumb: {
    height: 84, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', marginBottom: 8,
  },
  projectEmoji: { fontSize: 34 },
  scoreBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#15c98c',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99,
  },
  scoreText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  statusBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 5,
  },
  statusText: { color: '#7c5cff', fontSize: 7.5, fontWeight: '800', letterSpacing: 0.5 },
  projectTitle: { fontSize: 12.5, fontWeight: '800', color: '#2c2550' },
  projectMeta: { fontSize: 10.5, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  versionsText: { fontSize: 10, color: '#9b94c4', fontWeight: '600', marginTop: 2 },

  newProjectCard: {
    backgroundColor: '#f4f1ff',
    borderWidth: 2, borderColor: '#ece8fb', borderStyle: 'dashed',
  },
  newProjectThumb: {
    height: 84, borderRadius: 11,
    backgroundColor: 'rgba(124,92,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  newProjectText: { fontSize: 12, color: '#7c5cff', fontWeight: '800', textAlign: 'center' },

  // Certs
  certsRow: { flexDirection: 'row', gap: 10 },
  certCard: {
    flex: 1,
    backgroundColor: '#fff', padding: 12, borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  certEmoji: { fontSize: 32 },
  certTrack: { fontSize: 12, fontWeight: '800', color: '#2c2550', marginTop: 4 },
  certLevel: { fontSize: 10, color: '#7c5cff', fontWeight: '700', marginTop: 2 },
  certDate: { fontSize: 9.5, color: '#9b94c4', fontWeight: '600', marginTop: 2 },
});
