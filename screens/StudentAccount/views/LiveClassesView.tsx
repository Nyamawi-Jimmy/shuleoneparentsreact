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
import { AgeSwitcher } from '../components/AgeSwitcher';
import { mockLiveClasses, filterByTier, LiveClass } from '../learningData';

export const LiveClassesView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const classes = filterByTier(mockLiveClasses, tier);

  const title = pickByTier(tier, {
    base: '🎪 Live Classes',
    sprout: '🎪 Live Magic',
    explorer: '🎪 Live Magic',
  });

  const live = classes.filter((c) => c.status === 'live');
  const upcoming = classes.filter((c) => c.status === 'upcoming');
  const ended = classes.filter((c) => c.status === 'ended');

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader
        title={title}
        subtitle={`${live.length} live now • ${upcoming.length} upcoming`}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {live.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <View style={styles.liveDot} />
              <Text style={styles.sectionTitle}>Live now</Text>
            </View>
            {live.map((c) => <ClassCard key={c.id} cls={c} radius={tokens.radius} />)}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Coming up</Text>
            {upcoming.map((c) => <ClassCard key={c.id} cls={c} radius={tokens.radius} />)}
          </>
        )}

        {ended.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recordings</Text>
            {ended.map((c) => <ClassCard key={c.id} cls={c} radius={tokens.radius} />)}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const ClassCard: React.FC<{ cls: LiveClass; radius: number }> = ({ cls, radius }) => {
  const isLive = cls.status === 'live';
  const isEnded = cls.status === 'ended';

  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.card, { borderRadius: radius }]}>
      <LinearGradient colors={cls.color} style={styles.thumb}>
        <Text style={styles.thumbIcon}>{cls.thumb}</Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{cls.title}</Text>
        <Text style={styles.cardMeta}>{cls.subject} • {cls.teacher}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={11} color="#6f679c" />
          <Text style={styles.metaText}>{cls.startTime} • {cls.duration}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={11} color="#6f679c" />
          <Text style={styles.metaText}>{cls.attendees} / {cls.capacity} joined</Text>
        </View>
      </View>

      <View style={styles.actionCol}>
        {isLive ? (
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.joinBtn}>
            <Text style={styles.joinBtnText}>Join</Text>
          </LinearGradient>
        ) : isEnded ? (
          <View style={styles.recordingBtn}>
            <Ionicons name="play" size={14} color="#6f679c" />
            <Text style={styles.recordingText}>Watch</Text>
          </View>
        ) : (
          <View style={styles.remindBtn}>
            <Ionicons name="notifications-outline" size={14} color="#7c5cff" />
            <Text style={styles.remindText}>Remind</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550', marginBottom: 12 },
  liveDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ef4444',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  thumb: {
    width: 64, height: 64, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  thumbIcon: { fontSize: 26 },
  liveBadge: {
    position: 'absolute', top: -6, right: -6,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 99, gap: 3,
    borderWidth: 2, borderColor: '#fff',
  },
  liveBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveBadgeText: { color: '#fff', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 },

  cardBody: { flex: 1 },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: '#2c2550' },
  cardMeta: { fontSize: 11, color: '#6f679c', fontWeight: '600', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 10.5, color: '#6f679c', fontWeight: '600' },

  actionCol: { alignItems: 'center' },
  joinBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 999,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  remindBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#efeaff',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999,
  },
  remindText: { color: '#7c5cff', fontWeight: '800', fontSize: 11 },
  recordingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f4f1ff',
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 999,
  },
  recordingText: { color: '#6f679c', fontWeight: '800', fontSize: 11 },
});
