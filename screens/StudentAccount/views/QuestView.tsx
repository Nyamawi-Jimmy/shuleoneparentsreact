import React, { useCallback, useState } from 'react';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, C, useSchemeTick } from '../studentTheme';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  Image,
} from 'react-native';

import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTier, pickByTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../../../context/AuthContext';
import { tierToAgeTier } from '../../../config/tier';
import { listQuests, getQuest, getQuestCatalog } from '../../../api/quests';
import { QuestDetail, QuestSummary, Stage } from '../../../api/quest.types';

// Friendly label for a canonical class code (PLAYGROUP/PP1/GRADE1../FORM1..).
function gradeLabel(code?: string | null): string {
  if (!code) return '';
  if (code === 'PLAYGROUP') return 'Play Group';
  const m = /^(GRADE|FORM)(\d+)$/.exec(code);
  if (m) return `${m[1] === 'GRADE' ? 'Grade' : 'Form'} ${m[2]}`;
  return code; // PP1 / PP2
}
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
  const [grades, setGrades] = useState<string[]>([]);
  const [myGrade, setMyGrade] = useState<string | null>(null);
  const [gradeSel, setGradeSel] = useState<string>('ALL'); // 'ALL' | class code
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null);
  const [questDetail, setQuestDetail] = useState<QuestDetail | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch quest list ──────────────────────────────────
  // Prefer the class-organised catalog (quests tagged by grade + the student's own
  // class); fall back to the flat tier list on older backends.
  const loadList = useCallback(async () => {
    if (!accessToken) {
      setError('Please sign in again.');
      setLoadingList(false);
      return;
    }
    setError(null);
    setLoadingList(true);
    try {
      const cat = await getQuestCatalog(accessToken);
      setQuests(cat?.quests ?? []);
      setGrades(cat?.grades ?? []);
      setMyGrade(cat?.myGrade ?? null);
      setGradeSel((prev) => (prev !== 'ALL' ? prev
        : (cat?.myGrade && (cat.grades ?? []).includes(cat.myGrade) ? cat.myGrade : 'ALL')));
    } catch {
      try {
        const list = await listQuests(accessToken, tierToAgeTier(tier));
        setQuests(list);
        setGrades([]);
        setMyGrade(null);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load quests.');
      }
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
  // Class filter: default to the student's own class, but every grade stays open.
  const shown = gradeSel === 'ALL' ? quests : quests.filter((q) => (q.grade ?? null) === gradeSel);
  // Spotlight the quest to continue: the one in progress, else the next available.
  const resumeQuest = shown.find((q) => q.status === 'IN_PROGRESS') || shown.find((q) => q.status === 'AVAILABLE');

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

        {/* Class picker — default is the student's own class; every grade stays open
            so they can revise earlier classes or read ahead. */}
        {grades.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classStrip}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setGradeSel('ALL')}
              style={[styles.classChip, gradeSel === 'ALL' && { backgroundColor: tokens.accent1, borderColor: tokens.accent1 }]}>
              <Text style={[styles.classChipText, gradeSel === 'ALL' && { color: '#fff' }]}>All classes</Text>
            </TouchableOpacity>
            {grades.map((g) => {
              const active = gradeSel === g;
              return (
                <TouchableOpacity key={g} activeOpacity={0.85} onPress={() => setGradeSel(g)}
                  style={[styles.classChip, active && { backgroundColor: tokens.accent1, borderColor: tokens.accent1 }]}>
                  <Text style={[styles.classChipText, active && { color: '#fff' }]}>{gradeLabel(g)}</Text>
                  {g === myGrade && <View style={[styles.mineDot, active && { backgroundColor: '#fff' }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Continue spotlight */}
        {resumeQuest && (
          <ContinueCard quest={resumeQuest} tokens={tokens} onPress={() => handleSelectQuest(resumeQuest)} />
        )}

        {quests.length === 0 && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>No quests yet</Text>
            <Text style={styles.emptyText}>Your teacher will publish some soon!</Text>
          </View>
        ) : shown.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>Nothing in {gradeLabel(gradeSel)} yet</Text>
            <Text style={styles.emptyText}>Try another class!</Text>
          </View>
        ) : (
          <>
            {resumeQuest && (
              <View style={[styles.secH, { marginTop: 4 }]}>
                <Text style={styles.allQuestsTitle}>All quests</Text>
                <View style={styles.secHLine} />
              </View>
            )}
            {shown.map((q) => (
              <QuestCard key={q.id} quest={q} onPress={() => handleSelectQuest(q)} />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Darken a hex colour for the continue-card gradient end.
function darken(hex: string, amt = 0.22): string {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// "Continue where you left off" — a bold accent-gradient spotlight with a white
// progress ring. Distinct from the flat quest cards below it.
const ContinueCard: React.FC<{ quest: QuestSummary; tokens: any; onPress: () => void }> = ({ quest, tokens, onPress }) => {
  const accent = quest.accentColor || tokens.accent1;
  const pct = quest.totalStages ? Math.round((quest.completedStages / quest.totalStages) * 100) : 0;
  const stage = Math.min((quest.completedStages || 0) + 1, quest.totalStages || 1);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.continueWrap}>
      <LinearGradient colors={[accent, darken(accent)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.continueCard, { borderRadius: tokens.radius }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.continueKick}>▶  CONTINUE WHERE YOU LEFT OFF</Text>
          <Text style={styles.continueTitle} numberOfLines={2}>{quest.title}</Text>
          <Text style={styles.continueMeta} numberOfLines={1}>{quest.subject || 'Quest'} · Stage {stage} of {quest.totalStages || 1}</Text>
          <View style={styles.continueBar}><View style={[styles.continueFill, { width: `${pct}%` }]} /></View>
        </View>
        <RingProgress pct={pct} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const RingProgress: React.FC<{ pct: number }> = ({ pct }) => {
  const size = 66, stroke = 6, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.3)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#fff" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{p}%</Text>
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
  const mapScheme = useSchemeTick(); // dark map surface + fresh proxy styles
  const q = questDetail.quest;
  const stages = [...questDetail.stages].sort((a, b) => a.position - b.position);
  const accent = q.accentColor || tokens.accent1;

  // Winding path positions. The canvas GROWS with the stage count, and every
  // node's y is normalised into a safe band [TOP..BOT]% so the extreme nodes
  // (and their labels below the bubble) always have margin and never clip — the
  // fix for the old fixed-720 canvas that cut the last node past ~8 stages.
  const hasCoords = stages.length > 0 && stages.every((s) => s.mapX != null && s.mapY != null);
  const cols = [20, 44, 68, 80, 56, 32];
  // Raw y: backend coords when present, else a serpentine climbing bottom→top.
  const rawY = stages.map((s, i) => hasCoords ? (s.mapY as number) : 92 - (i / Math.max(1, stages.length - 1)) * 84);
  const minY = Math.min(...rawY), maxY = Math.max(...rawY);
  const spanY = Math.max(1, maxY - minY);
  // BOT is where the LAST node's CENTRE sits. Below it must fit the bubble's
  // lower half (46px for a 92px boss) plus a two-line label — at 86% of a
  // 640px canvas that was ~90px, i.e. exactly flush with the edge.
  const TOP = 13, BOT = 80;
  // Nodes are centred on x, so an authored mapX near 0 or 100 pushes the bubble
  // and its label past the map edge (which clips them). Keep them in a band.
  const clampX = (v: number) => Math.max(20, Math.min(80, v));
  const positions = stages.map((s, i) => ({
    x: clampX(hasCoords ? (s.mapX as number) : cols[i % cols.length]),
    y: stages.length <= 1 ? 50 : TOP + ((rawY[i] - minY) / spanY) * (BOT - TOP),
  }));
  const pathD = buildPath(positions);
  const mapHeight = Math.max(720, stages.length * 98);

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

        {/* Legend — the map key sits ABOVE the map */}
        <View style={styles.legend}>
          <LegendItem colors={['#15c98c', '#0fae78']} label={pickByTier(tier, { base: 'Completed', sprout: 'Done' })} />
          <LegendItem colors={['#ff9d2e', '#ff5e9c']} label={pickByTier(tier, { base: 'Available', sprout: 'Play now' })} />
          <LegendItem solid="#9b93c4" label="Locked" />
          <LegendItem colors={['#f4a716', '#ff9d2e']} label={pickByTier(tier, { base: 'Boss', sprout: 'Big challenge' })} />
        </View>

        {/* Map */}
        <LinearGradient
          colors={mapScheme === 'dark' ? ['#182a26', '#182238'] : ['#eafef3', '#e7f7ff']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={[styles.mapWrap, { borderRadius: tokens.radius }]}
        >
          <View style={[styles.map, { height: mapHeight }]}>
            <Svg
              width="100%" height="100%"
              viewBox="0 0 100 100" preserveAspectRatio="none"
              style={StyleSheet.absoluteFill}
            >
              <Path d={pathD} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
              <Path d={pathD} fill="none" stroke="#c9b8ff" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="0.1 3" />
            </Svg>

            {stages.map((stage, i) => {
              const pos = positions[i];
              const isBoss = String(stage.type).toUpperCase().includes('BOSS');
              return (
                <View key={stage.id} style={[styles.node, { left: `${pos.x}%`, top: `${pos.y}%` }]}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => onStageTap(stage)}>
                    <NodeBubble stage={stage} size={isBoss ? 92 : 74} />
                  </TouchableOpacity>
                  <View style={[styles.lbl, stage.status === 'AVAILABLE' && styles.lblCur]}>
                    <Text style={[styles.lblText, stage.status === 'AVAILABLE' && styles.lblTextCur]} numberOfLines={2}>
                      {stage.title}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {loadingDetail && (
            <View style={styles.overlayLoading}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </LinearGradient>

        <View style={{ height: 90 }} />
      </ScrollView>
    </View>
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
  allQuestsTitle: { fontSize: 14, fontWeight: '800', color: S.inkSoft },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: S.line },

  // Class picker
  classStrip: { gap: 8, paddingBottom: 4, marginBottom: 16 },
  classChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: S.line, backgroundColor: S.card,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  classChipText: { fontSize: 12.5, fontWeight: '800', color: S.inkSoft },
  mineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f4a716' },

  // Continue spotlight
  continueWrap: {
    marginBottom: 18,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
  },
  continueCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  continueKick: { color: 'rgba(255,255,255,0.9)', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },
  continueTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 4, lineHeight: 20 },
  continueMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  continueBar: { height: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden', marginTop: 10 },
  continueFill: { height: '100%', borderRadius: 99, backgroundColor: '#fff' },

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
    // Extra bottom padding so the last node's label never touches the edge.
    paddingTop: 18, paddingHorizontal: 14, paddingBottom: 22,
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

