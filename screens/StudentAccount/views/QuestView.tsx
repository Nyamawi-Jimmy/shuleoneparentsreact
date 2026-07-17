import React, { useCallback, useState } from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C, useSchemeTick } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  Image,
} from 'react-native';

import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { AgeSwitcher } from '../components/AgeSwitcher';
import { useAuth } from '../../../context/AuthContext';
import { tierToAgeTier } from '../../../config/tier';
import { listQuests, getQuest } from '../../../api/quests';
import { QuestDetail, QuestSummary, Stage } from '../../../api/quest.types';
import { ApiError } from '../../../config/api';

// Default node positions for the 0..100 SVG coordinate space (kid-design.html)
const DEFAULT_POSITIONS = [
  { x: 18, y: 88 },
  { x: 42, y: 80 },
  { x: 64, y: 70 },
  { x: 80, y: 56 },
  { x: 58, y: 45 },
  { x: 34, y: 36 },
  { x: 56, y: 24 },
  { x: 76, y: 11 },
];

export const QuestView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)
  const { accessToken } = useAuth();

  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
  const [questDetail, setQuestDetail] = useState<QuestDetail | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch quest list ──────────────────────────────────
  const loadList = useCallback(async () => {
    if (!accessToken) {
      setError('Please sign in again.');
      setLoadingList(false);
      return;
    }
    setError(null);
    setLoadingList(true);
    try {
      const list = await listQuests(accessToken, tierToAgeTier(tier));
      setQuests(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load quests.');
    } finally {
      setLoadingList(false);
    }
  }, [accessToken, tier]);

  // ── Fetch detail of selected quest ─────────────────────
  const loadDetail = useCallback(async (questId: number) => {
    if (!accessToken) return;
    setLoadingDetail(true);
    setError(null);
    try {
      const detail = await getQuest(accessToken, questId);
      setQuestDetail(detail);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load quest.');
    } finally {
      setLoadingDetail(false);
    }
  }, [accessToken]);

  // Reload list when tier changes, OR detail when returning to the screen
  useFocusEffect(useCallback(() => {
    loadList();
    if (selectedQuestId) loadDetail(selectedQuestId);
  }, [loadList, loadDetail, selectedQuestId]));

  const handleSelectQuest = (q: QuestSummary) => {
    setSelectedQuestId(q.id);
    loadDetail(q.id);
  };

  const handleBackToList = () => {
    setSelectedQuestId(null);
    setQuestDetail(null);
  };

  const handleStageTap = (stage: Stage) => {
    if (stage.status === 'LOCKED') {
      Alert.alert('🔒 Locked', 'Finish the step before this one!');
      return;
    }
    router.push(
      `/student/lesson?lessonId=${stage.lessonId}&questId=${questDetail?.quest.id}&stageId=${stage.id}` as any,
    );
  };

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────
  if (loadingList && quests.length === 0) {
    return (
      <View style={[styles.safe, styles.center, { backgroundColor: tokens.bgColor }]}>
        <ActivityIndicator size="large" color={tokens.accent1} />
        <Text style={styles.loadingText}>Loading quests...</Text>
      </View>
    );
  }

  // ── Quest detail view (the map) ───────────────────────
  if (selectedQuestId && questDetail) {
    return (
      <QuestMapView
        questDetail={questDetail}
        tier={tier}
        tokens={tokens}
        loadingDetail={loadingDetail}
        onBack={handleBackToList}
        onStageTap={handleStageTap}
      />
    );
  }

  // ── Quest LIST view (default) ─────────────────────────
  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>
            {pickByTier(tier, {
              base: '🗺️ Choose a Quest',
              sprout: '🗺️ Pick a Quest!',
              scholar: '📚 Choose a Path',
              campus: '📚 Choose a Module',
            })}
          </Text>
          <View style={styles.secHLine} />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color="#dc2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={loadList} hitSlop={6}>
              <Text style={styles.retryInline}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {quests.length === 0 && !error && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>No quests yet</Text>
            <Text style={styles.emptyText}>Your teacher will publish some soon!</Text>
          </View>
        )}

        {quests.map((q) => (
          <QuestCard key={q.id} quest={q} onPress={() => handleSelectQuest(q)} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// =================================================================
// Quest card - shown in the list
// =================================================================
const QuestCard: React.FC<{ quest: QuestSummary; onPress: () => void }> = ({ quest, onPress }) => {
  const accent = quest.accentColor || '#7c5cff';
  const progressPct = quest.totalXp > 0 ? (quest.earnedXp / quest.totalXp) * 100 : 0;
  const isLocked = quest.status === 'LOCKED';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={isLocked}>
      <View style={[styles.questCard, { borderColor: accent + '40' }]}>
        {/* Cover image / accent gradient header */}
        <View style={styles.questCover}>
          {quest.coverImageUrl ? (
            <Image
              source={{ uri: quest.coverImageUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
          <LinearGradient
            colors={[accent + 'CC', accent + '88']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.questCoverInner}>
            <View style={styles.themePill}>
              <Text style={styles.themePillText}>{quest.subject}</Text>
            </View>
            <StatusBadge status={quest.status} />
          </View>
        </View>

        {/* Body — compact: title, one-line description, stats, then
            progress + action on a single row. */}
        <View style={styles.questBody}>
          <Text style={styles.questTitle} numberOfLines={1}>{quest.title}</Text>
          <Text style={styles.questDesc} numberOfLines={1}>{quest.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="flag" size={11} color={accent} />
              <Text style={[styles.statChipText, { color: accent }]}>
                {quest.completedStages}/{quest.totalStages} stages
              </Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="flash" size={11} color="#f4a716" />
              <Text style={[styles.statChipText, { color: '#f4a716' }]}>
                {quest.earnedXp}/{quest.totalXp} XP
              </Text>
            </View>
          </View>

          <View style={styles.progressActionRow}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[accent, accent + 'AA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
            <Text style={[styles.actionLabel, { color: accent }]}>
              {isLocked ? '🔒 Locked' :
                quest.status === 'COMPLETED' ? '✓ Completed' :
                quest.status === 'IN_PROGRESS' ? 'Continue →' :
                'Start →'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const StatusBadge: React.FC<{ status: QuestSummary['status'] }> = ({ status }) => {
  const meta = {
    LOCKED:      { bg: 'rgba(0,0,0,0.4)',    text: '🔒 Locked' },
    AVAILABLE:   { bg: 'rgba(255,255,255,0.95)', text: 'New' },
    IN_PROGRESS: { bg: 'rgba(255,255,255,0.95)', text: 'In progress' },
    COMPLETED:   { bg: 'rgba(21, 201, 140, 0.95)', text: '✓ Done' },
  }[status];
  const color = status === 'COMPLETED' || status === 'LOCKED' ? '#fff' : '#2c2550';
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{meta.text}</Text>
    </View>
  );
};

// =================================================================
// Quest map view - the actual map of stages once a quest is selected
// =================================================================
const QuestMapView: React.FC<{
  questDetail: QuestDetail;
  tier: any;
  tokens: any;
  loadingDetail: boolean;
  onBack: () => void;
  onStageTap: (s: Stage) => void;
}> = ({ questDetail, tier, tokens, loadingDetail, onBack, onStageTap }) => {
  useSchemeTick(); // re-render on scheme flips (styles/C are scheme proxies)
  const q = questDetail.quest;
  const stages = [...questDetail.stages].sort((a, b) => a.position - b.position);
  const accent = q.accentColor || tokens.accent1;

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* "← Back to quests" + title */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backBtnSm} hitSlop={10}>
            <Ionicons name="chevron-back" size={18} color={C.ink} />
            <Text style={styles.backBtnSmText}>Quests</Text>
          </TouchableOpacity>
          <View style={styles.secHLine} />
        </View>

        {/* Quest meta card */}
        <View style={[styles.metaCard, { borderRadius: tokens.radius, borderColor: accent + '30' }]}>
          <Text style={[styles.metaSubject, { color: accent }]}>{q.subject}</Text>
          <Text style={styles.metaTitle}>{q.title}</Text>
          <Text style={styles.metaDesc} numberOfLines={2}>{q.description}</Text>
          <View style={styles.xpRow}>
            <View style={styles.xpBar}>
              <LinearGradient
                colors={[accent, accent + 'AA']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.xpFill, { width: `${(q.earnedXp / Math.max(q.totalXp, 1)) * 100}%` }]}
              />
            </View>
            <Text style={styles.xpText}>{q.earnedXp} / {q.totalXp} XP</Text>
          </View>
          <Text style={styles.metaStages}>{q.completedStages}/{q.totalStages} stages complete</Text>
        </View>

        {/* Path — every stage as a compact, scrollable row */}
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>
            {pickByTier(tier, { base: '🧭 Your path', sprout: '🧭 Your path!', scholar: 'Your path', campus: 'Module stages' })}
          </Text>
          <View style={styles.secHLine} />
        </View>

        <View style={{ position: 'relative' }}>
          {loadingDetail && (
            <View style={styles.inlineLoading}><ActivityIndicator color={accent} /></View>
          )}
          {stages.map((stage, i) => (
            <StageRow
              key={stage.id}
              stage={stage}
              accent={accent}
              isLast={i === stages.length - 1}
              onPress={() => onStageTap(stage)}
            />
          ))}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
      <AgeSwitcher />
    </View>
  );
};

// One stage as a compact row: a status node on a connecting rail + an info card.
const StageRow: React.FC<{ stage: Stage; accent: string; isLast: boolean; onPress: () => void }> = ({ stage, accent, isLast, onPress }) => {
  const isBoss = String(stage.type).toUpperCase().includes('BOSS');
  const locked = stage.status === 'LOCKED';
  const done = stage.status === 'COMPLETED';
  const action = locked ? 'Locked' : done ? 'Replay' : stage.status === 'IN_PROGRESS' ? 'Continue' : 'Play';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={locked} style={styles.stageRow}>
      <View style={styles.rail}>
        <NodeBubble stage={stage} size={isBoss ? 60 : 52} />
        {!isLast && <View style={[styles.railLine, { backgroundColor: done ? '#15c98c' : C.line }]} />}
      </View>
      <View style={[styles.stageCard, locked && { opacity: 0.65 }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.stageNum, { color: accent }]}>STAGE {stage.position}{isBoss ? ' · BOSS' : ''}</Text>
          <Text style={styles.stageTitle} numberOfLines={2}>{stage.title}</Text>
          <View style={styles.stageMetaRow}>
            <View style={styles.stageChip}>
              <Ionicons name="flash" size={11} color="#f4a716" />
              <Text style={styles.stageChipText}>{stage.xpReward} XP</Text>
            </View>
            {done && stage.stars > 0 && <Text style={styles.stageStars}>{'★'.repeat(Math.min(3, stage.stars))}</Text>}
          </View>
        </View>
        <View style={[styles.stageAction, { backgroundColor: locked ? C.soft : accent + '18' }]}>
          <Text style={[styles.stageActionText, { color: locked ? C.inkSoft : accent }]}>{action}</Text>
          {!locked && <Ionicons name="chevron-forward" size={13} color={accent} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// =================================================================
// Helpers
// =================================================================
function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const c1x = prev.x + (curr.x - prev.x) * 0.5 + (i % 2 === 0 ? -8 : 8);
    const c1y = prev.y + (curr.y - prev.y) * 0.2;
    const c2x = prev.x + (curr.x - prev.x) * 0.5 + (i % 2 === 0 ? 8 : -8);
    const c2y = prev.y + (curr.y - prev.y) * 0.8;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

const NodeBubble: React.FC<{ stage: Stage; size?: number }> = ({ stage, size = 56 }) => {
  const isBoss = String(stage.type).toUpperCase().includes('BOSS');
  const status = stage.status;

  const colors: [string, string] =
    isBoss && status !== 'LOCKED' ? ['#f4a716', '#ff9d2e']
    : status === 'COMPLETED' ? ['#15c98c', '#0fae78']
    : status === 'AVAILABLE' || status === 'IN_PROGRESS' ? ['#ff9d2e', '#ff5e9c']
    :                           ['#b9b2d8', '#9b93c4'];

  const bub =
    isBoss ? '🏆'
    : status === 'COMPLETED' ? '⭐'
    : status === 'LOCKED' ? '🔒'
    : '▶';

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{
        width: size, height: size, borderRadius: size / 2,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: size >= 64 ? 5 : 4, borderColor: '#fff',
        shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
      }}
    >
      <Text style={{ fontSize: Math.round(size * 0.42), color: '#fff' }}>{bub}</Text>
    </LinearGradient>
  );
};

const LegendItem: React.FC<{ colors?: [string, string]; solid?: string; label: string }> = ({ colors, solid, label }) => (
  <View style={styles.legendItem}>
    {colors ? (
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.legendDot} />
    ) : (
      <View style={[styles.legendDot, { backgroundColor: solid }]} />
    )}
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

// =================================================================
// Styles
// =================================================================
const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { color: S.inkSoft, marginTop: 14, fontWeight: '600' },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: S.ink },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: S.line },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: S.badSoft, borderRadius: 10,
    padding: 12, marginBottom: 14,
  },
  errorBannerText: { flex: 1, color: '#dc2626', fontSize: 12.5, fontWeight: '700' },
  retryInline: { color: '#dc2626', fontWeight: '800', fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: S.ink },
  emptyText: { fontSize: 13, color: S.inkSoft, fontWeight: '600', marginTop: 6, textAlign: 'center' },

  // Quest card
  questCard: {
    backgroundColor: S.card,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 2,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  questCover: {
    height: 64,
    position: 'relative',
  },
  questCoverInner: {
    flex: 1, padding: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  themePill: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99,
  },
  themePillText: { fontSize: 10.5, fontWeight: '800', color: S.ink, letterSpacing: 0.3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusBadgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },

  questBody: { padding: 12 },
  questTitle: { fontSize: 15.5, fontWeight: '800', color: S.ink },
  questDesc: { fontSize: 12, color: S.inkSoft, fontWeight: '500', marginTop: 3 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: S.soft,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 99,
  },
  statChipText: { fontSize: 11, fontWeight: '800' },

  progressActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  progressBar: {
    flex: 1,
    height: 8, borderRadius: 99,
    backgroundColor: S.line, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  actionLabel: { fontSize: 12.5, fontWeight: '800' },

  // Detail/map view
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  backBtnSm: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: S.card,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  backBtnSmText: { fontSize: 13, fontWeight: '800', color: S.ink },

  metaCard: {
    backgroundColor: S.card, padding: 14, marginBottom: 14,
    borderWidth: 2,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  metaSubject: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  metaTitle: { fontSize: 17, fontWeight: '800', color: S.ink, marginTop: 2 },
  metaDesc: { fontSize: 12, color: S.inkSoft, fontWeight: '500', marginTop: 4, lineHeight: 16 },
  metaStages: { fontSize: 11, fontWeight: '700', color: S.inkSoft, marginTop: 8 },

  // Compact vertical path (replaces the winding map)
  inlineLoading: { paddingVertical: 24, alignItems: 'center' },
  stageRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  rail: { alignItems: 'center', width: 60 },
  railLine: { width: 3, flex: 1, borderRadius: 3, marginVertical: 4, minHeight: 18 },
  stageCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: S.card, borderRadius: 16, borderWidth: 1, borderColor: S.line,
    padding: 12, marginBottom: 12,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  stageNum: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },
  stageTitle: { fontSize: 14, fontWeight: '800', color: S.ink, marginTop: 2, lineHeight: 18 },
  stageMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 },
  stageChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: S.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  stageChipText: { fontSize: 10.5, fontWeight: '800', color: '#f4a716' },
  stageStars: { fontSize: 12, color: '#f4a716' },
  stageAction: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  stageActionText: { fontSize: 12, fontWeight: '800' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  xpBar: { flex: 1, height: 9, borderRadius: 99, backgroundColor: S.line, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 99 },
  xpText: { fontSize: 11.5, color: S.ink, fontWeight: '800' },

  // Map
  mapWrap: {
    padding: 8,
    overflow: 'hidden',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
    marginBottom: 14,
  },
  map: { position: 'relative', width: '100%', height: 720 },
  overlayLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  node: {
    position: 'absolute',
    width: 150,
    alignItems: 'center',
    transform: [{ translateX: -75 }, { translateY: -37 }],
  },
  bub: {
    width: 74, height: 74, borderRadius: 37,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 5, borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
  },
  bubBoss: { width: 92, height: 92, borderRadius: 46 },
  bubText: { fontSize: 30, color: '#fff' },
  bubTextBoss: { fontSize: 42 },
  lbl: {
    backgroundColor: S.card,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, marginTop: 6,
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    maxWidth: 150,
  },
  lblCur: { backgroundColor: '#ff9d2e' },
  lblText: { fontWeight: '700', fontSize: 11.5, lineHeight: 15, color: S.ink, textAlign: 'center' },
  lblTextCur: { color: '#fff' },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 4, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#5038A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  legendText: { fontWeight: '600', color: S.inkSoft, fontSize: 13.5 },
});

// Scheme-proxied sheets: each style key resolves against the ACTIVE scheme
// (see studentTheme.themedSheets) — no render-time mutation needed.
const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));

