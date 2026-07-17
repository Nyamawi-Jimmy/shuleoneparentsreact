import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { LearningHeader } from '../components/LearningHeader';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useStudentLiveClasses } from '../../../hooks/useStudentLiveClasses';
import { StudentLiveClass } from '../../../api/student.types';

// Deterministic playful cover (emoji + gradient) from the subject, so the same
// class always looks the same without a backend thumbnail.
const COVERS: { re: RegExp; thumb: string; color: [string, string] }[] = [
  { re: /math|hisabati/i, thumb: '🔢', color: ['#7c5cff', '#5b3df5'] },
  { re: /scien|sayansi/i, thumb: '🔬', color: ['#22c55e', '#16a34a'] },
  { re: /english|lugha|kiswahili|swahili/i, thumb: '📖', color: ['#f59e0b', '#d97706'] },
  { re: /cod|robot|comput/i, thumb: '💻', color: ['#06b6d4', '#0891b2'] },
  { re: /art|music|creat/i, thumb: '🎨', color: ['#ec4899', '#db2777'] },
  { re: /sport|p\.?e\.?|physical/i, thumb: '⚽', color: ['#ef4444', '#dc2626'] },
];
const coverFor = (subject?: string | null): { thumb: string; color: [string, string] } => {
  const c = COVERS.find((x) => x.re.test(String(subject || '')));
  return c ? { thumb: c.thumb, color: c.color } : { thumb: '🎪', color: ['#8b5cf6', '#6d28d9'] };
};
const statusOf = (s?: string | null) => String(s || '').toLowerCase();
const timeLabel = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
};
const durationLabel = (a?: string | null, b?: string | null) => {
  if (!a || !b) return '';
  const min = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  if (!Number.isFinite(min) || min <= 0) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

export const LiveClassesView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  const { classes, loading, refreshing, error, refresh, join, joiningId } = useStudentLiveClasses();

  const title = pickByTier(tier, {
    base: '🎪 Live Classes', sprout: '🎪 Live Magic', explorer: '🎪 Live Magic',
  });

  const live = classes.filter((c) => statusOf(c.status) === 'live');
  const upcoming = classes.filter((c) => statusOf(c.status) === 'upcoming' || statusOf(c.status) === 'scheduled');
  const ended = classes.filter((c) => statusOf(c.status) === 'ended');

  const onJoin = async (c: StudentLiveClass) => {
    const err = await join(c.id);
    if (err) Alert.alert('Live class', err);
  };

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <LearningHeader title={title} subtitle={`${live.length} live now • ${upcoming.length} upcoming`} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.accent1} />}
      >
        {loading && classes.length === 0 ? (
          <View style={styles.center}><ActivityIndicator size="large" color={tokens.accent1} /></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={30} color="#9b93c4" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎪</Text>
            <Text style={styles.emptyTitle}>No live classes yet</Text>
            <Text style={styles.emptyText}>When your teacher schedules a live class, it’ll appear here.</Text>
          </View>
        ) : (
          <>
            {live.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.sectionTitle}>Live now</Text>
                </View>
                {live.map((c) => <ClassCard key={c.id} cls={c} radius={tokens.radius} joining={joiningId === c.id} onJoin={() => onJoin(c)} />)}
              </>
            )}
            {upcoming.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Coming up</Text>
                {upcoming.map((c) => <ClassCard key={c.id} cls={c} radius={tokens.radius} joining={joiningId === c.id} onJoin={() => onJoin(c)} />)}
              </>
            )}
            {ended.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Past classes</Text>
                {ended.map((c) => <ClassCard key={c.id} cls={c} radius={tokens.radius} joining={false} onJoin={() => onJoin(c)} />)}
              </>
            )}
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

const ClassCard: React.FC<{ cls: StudentLiveClass; radius: number; joining: boolean; onJoin: () => void }> = ({ cls, radius, joining, onJoin }) => {
  const isLive = statusOf(cls.status) === 'live';
  const isEnded = statusOf(cls.status) === 'ended';
  const cover = coverFor(cls.subject);
  const dur = durationLabel(cls.startsAt, cls.endsAt);
  const meta = [cls.subject, cls.teacher].filter(Boolean).join(' • ');

  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.card, { borderRadius: radius }]} onPress={onJoin} disabled={isEnded && !cls.startsAt}>
      <LinearGradient colors={cover.color} style={styles.thumb}>
        <Text style={styles.thumbIcon}>{cover.thumb}</Text>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveBadgeDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{cls.title || 'Live class'}</Text>
        {!!meta && <Text style={styles.cardMeta} numberOfLines={1}>{meta}</Text>}
        {!!cls.startsAt && (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color="#6f679c" />
            <Text style={styles.metaText}>{timeLabel(cls.startsAt)}{dur ? ` • ${dur}` : ''}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionCol}>
        {isLive ? (
          <TouchableOpacity activeOpacity={0.85} onPress={onJoin} disabled={joining}>
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.joinBtn}>
              {joining ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.joinBtnText}>Join</Text>}
            </LinearGradient>
          </TouchableOpacity>
        ) : isEnded ? (
          <View style={styles.recordingBtn}>
            <Ionicons name="checkmark-done" size={14} color="#6f679c" />
            <Text style={styles.recordingText}>Ended</Text>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={onJoin} disabled={joining} style={styles.remindBtn}>
            {joining ? <ActivityIndicator size="small" color="#7c5cff" /> : <><Ionicons name="open-outline" size={14} color="#7c5cff" /><Text style={styles.remindText}>Open</Text></>}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  center: { paddingVertical: 60, alignItems: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  errorText: { fontSize: 13, color: '#6f679c', fontWeight: '600', textAlign: 'center' },
  retry: { color: '#7c5cff', fontWeight: '800', fontSize: 13, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 54, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#2c2550' },
  emptyText: { fontSize: 13, color: '#6f679c', fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2c2550', marginBottom: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 12, marginBottom: 10, gap: 12,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 2,
  },
  thumb: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  thumbIcon: { fontSize: 26 },
  liveBadge: {
    position: 'absolute', top: -6, right: -6, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ef4444', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, gap: 3,
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
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, minWidth: 62, alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3,
  },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  remindBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#efeaff', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  remindText: { color: '#7c5cff', fontWeight: '800', fontSize: 11 },
  recordingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f4f1ff', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  recordingText: { color: '#6f679c', fontWeight: '800', fontSize: 11 },
});
