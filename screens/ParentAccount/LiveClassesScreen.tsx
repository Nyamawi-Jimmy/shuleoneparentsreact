import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useLiveClasses } from '../../hooks/useLiveClasses';
import { LiveClass } from '../../api/communication.types';

export const LiveClassesScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild } = useSelectedChild();
  const { liveClasses, loading, refreshing, error, refresh, join, joiningId } = useLiveClasses();

  const onJoin = async (lc: LiveClass) => {
    if (lc.id == null) return;
    const err = await join(lc.id);
    if (err) Alert.alert('Cannot join', err);
  };

  if (!selectedChild) {
    return (
      <View style={styles.safe}>
        <GradientAppBar title="Live Classes" showBack />
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="person-add-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>Pick a child from Home to see their live classes.</Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.primaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <GradientAppBar overlap title="Live Classes" subtitle={`${selectedChild.firstName || selectedChild.fullName}’s online lessons`} showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.childCard}>
          <View style={styles.childAvatar}><Text style={styles.childInitials}>{selectedChild.initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>{selectedChild.fullName}</Text>
            <Text style={styles.childMeta}>{selectedChild.classLabel || 'Upcoming online lessons'}</Text>
          </View>
          <MaterialCommunityIcons name="video-outline" size={20} color={colors.primary} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading live classes…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh} hitSlop={6}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {!loading && !error && liveClasses.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="video-off-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No live classes scheduled</Text>
            <Text style={styles.emptyText}>When teachers schedule online lessons, they’ll appear here.</Text>
          </View>
        )}

        {!loading && liveClasses.map((lc, i) => (
          <ClassCard
            key={lc.id ?? i}
            lc={lc}
            colors={colors}
            styles={styles}
            joining={joiningId === lc.id}
            onJoin={() => onJoin(lc)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const ClassCard: React.FC<{
  lc: LiveClass; colors: ColorPalette; styles: any; joining: boolean; onJoin: () => void;
}> = ({ lc, colors, styles, joining, onJoin }) => {
  const status = (lc.status ?? '').toLowerCase();
  const isLive = status.includes('live');
  const isFinished = status.includes('finish') || status.includes('end');
  const canJoin = !isFinished;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.statusPill, isLive ? styles.pillLive : isFinished ? styles.pillDone : styles.pillSoon]}>
          {isLive && <View style={styles.liveDot} />}
          <Text style={[styles.statusText, isLive ? styles.statusLive : isFinished ? styles.statusDone : styles.statusSoon]}>
            {isLive ? 'LIVE NOW' : isFinished ? 'Finished' : 'Upcoming'}
          </Text>
        </View>
        {lc.className ? <Text style={styles.classTag}>{lc.className}</Text> : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>{lc.title || 'Live class'}</Text>
      {lc.description ? <Text style={styles.desc} numberOfLines={2}>{lc.description}</Text> : null}

      <View style={styles.timeRow}>
        <Feather name="clock" size={13} color={colors.textSecondary} />
        <Text style={styles.timeText}>{formatWhen(lc.startsOn, lc.endsOn)}</Text>
      </View>

      {canJoin && (
        <TouchableOpacity activeOpacity={0.85} onPress={onJoin} disabled={joining}>
          {isLive ? (
            <View style={[styles.joinBtn, styles.joinBtnLive]}>
              {joining
                ? <ActivityIndicator color="#fff" size="small" />
                : (<><Ionicons name="videocam" size={16} color="#fff" /><Text style={styles.joinText}>Join now</Text></>)}
            </View>
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.joinBtn}>
              {joining
                ? <ActivityIndicator color="#fff" size="small" />
                : (<><Ionicons name="videocam" size={16} color="#fff" /><Text style={styles.joinText}>Open class</Text></>)}
            </LinearGradient>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

function formatWhen(startsOn: string | null, endsOn: string | null): string {
  if (!startsOn) return 'Time to be announced';
  const s = new Date(startsOn);
  if (isNaN(s.getTime())) return startsOn;
  const day = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const start = s.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const e = endsOn ? new Date(endsOn) : null;
  const end = e && !isNaN(e.getTime()) ? e.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
  return end ? `${day} · ${start}–${end}` : `${day} · ${start}`;
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
    loadingText: { fontSize: 11.5, color: c.textSecondary, marginTop: 8, fontWeight: '500' },
    emptyIconCircle: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 11.5, color: c.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
    primaryBtn: { marginTop: 16, backgroundColor: c.primary, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },
    childCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 13, borderRadius: 18,
      borderWidth: 1, borderColor: c.border, marginTop: -20, marginBottom: 16,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12, shadowRadius: 14, elevation: 5,
    },
    childAvatar: {
      width: 42, height: 42, borderRadius: 21, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    childInitials: { color: c.primary, fontSize: 14, fontWeight: '800' },
    childName: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    childMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },
    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 12,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
    pillLive: { backgroundColor: c.dangerSoft },
    pillSoon: { backgroundColor: c.primarySoft },
    pillDone: { backgroundColor: c.backgroundAlt },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
    statusLive: { color: c.danger },
    statusSoon: { color: c.primary },
    statusDone: { color: c.textSecondary },
    classTag: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
    title: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.2 },
    desc: { fontSize: 12.5, color: c.textSecondary, marginTop: 4, lineHeight: 18 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    timeText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
    joinBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 12, height: 44, marginTop: 12,
    },
    joinBtnLive: { backgroundColor: c.danger },
    joinText: { color: '#fff', fontFamily: fonts.extrabold, fontSize: 14 },
  });
}
