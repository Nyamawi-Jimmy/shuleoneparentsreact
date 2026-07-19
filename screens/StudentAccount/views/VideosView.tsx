import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { mockVideos, filterByTier } from '../learningData';

export const VideosView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const videos = filterByTier(mockVideos, tier);

  const title = pickByTier(tier, {
    base: '📺 Video Lessons',
    sprout: '📺 Watch & Wow',
    explorer: '📺 Watch & Wow',
  });

  const watched = videos.filter((v) => v.watched).length;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader title={title} subtitle={`${watched} of ${videos.length} watched`} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Continue watching - first non-completed video */}
        {videos.find((v) => v.progress > 0 && v.progress < 1) && (
          <ContinueCard
            video={videos.find((v) => v.progress > 0 && v.progress < 1)!}
            radius={tokens.radius}
          />
        )}

        <Text style={styles.sectionTitle}>All videos</Text>

        {videos.map((v) => (
          <TouchableOpacity key={v.id} activeOpacity={0.85} style={styles.card}>
            <LinearGradient colors={v.thumbColor} style={styles.thumb}>
              <Text style={styles.thumbIcon}>{v.thumbnail}</Text>
              <View style={styles.playOverlay}>
                <Ionicons name="play" size={20} color="#fff" />
              </View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{v.duration}</Text>
              </View>
              {v.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>NEW</Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={2}>{v.title}</Text>
              <Text style={styles.cardMeta}>
                {v.subject}  •  {v.teacher}
              </Text>
              {v.progress > 0 && v.progress < 1 && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${v.progress * 100}%` }]} />
                </View>
              )}
              {v.watched && (
                <View style={styles.watchedPill}>
                  <Ionicons name="checkmark-circle" size={12} color="#15c98c" />
                  <Text style={styles.watchedText}>Watched</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const ContinueCard: React.FC<{ video: typeof mockVideos[0]; radius: number }> = ({ video, radius }) => (
  <View style={[styles.continueCard, { borderRadius: radius }]}>
    <LinearGradient colors={video.thumbColor} style={styles.continueThumb}>
      <Text style={{ fontSize: 28 }}>{video.thumbnail}</Text>
    </LinearGradient>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.continueLabel}>CONTINUE WATCHING</Text>
      <Text style={styles.continueTitle} numberOfLines={1}>{video.title}</Text>
      <View style={styles.continuePg}>
        <View style={[styles.continuePgFill, { width: `${video.progress * 100}%` }]} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 18,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  },
  continueThumb: {
    width: 64, height: 64, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  continueLabel: { fontSize: 9.5, color: '#7c5cff', fontWeight: '800', letterSpacing: 0.6 },
  continueTitle: { fontSize: 14.5, fontWeight: '800', color: '#2c2550', marginTop: 3 },
  continuePg: {
    height: 6, borderRadius: 99, backgroundColor: '#efeaff',
    marginTop: 8, overflow: 'hidden',
  },
  continuePgFill: { height: '100%', backgroundColor: '#7c5cff' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550', marginBottom: 12 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 110, height: 80, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  thumbIcon: { fontSize: 32 },
  playOverlay: {
    position: 'absolute',
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute', bottom: 5, right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
  newBadge: {
    position: 'absolute', top: 5, left: 5,
    backgroundColor: '#ff5e9c',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6,
  },
  newText: { color: '#fff', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5 },

  cardBody: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  cardMeta: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 4 },
  progressTrack: {
    height: 5, borderRadius: 99, backgroundColor: '#efeaff',
    marginTop: 8, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#7c5cff', borderRadius: 99 },
  watchedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#eafef3',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99,
  },
  watchedText: { fontSize: 10, fontWeight: '700', color: '#15c98c' },
});
