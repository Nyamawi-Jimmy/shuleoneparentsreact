// "Learn on this device" — the parent hands the phone to the child and the REAL
// quest engine runs right here, same endpoints the student app uses. While this
// screen is mounted, every API request carries the X-Learn-As-Child header
// (config/api setLearnAsChild), so the backend verifies the parent_child link and
// records all progress against the CHILD's own rows. Leaving the screen clears
// the header. Mirrors the web Learning page's KidLearnMode.
//
// Deep link: /kid-learn?questId=123 drops straight into that quest's stage map
// (the "Continue where you left off" banner and per-quest Play buttons use this).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { fonts } from '../../constants/theme';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { setLearnAsChild } from '../../config/api';
import { listQuests, getQuest } from '../../api/quests';
import { QuestSummary, QuestDetail, Stage, AgeTier } from '../../api/quest.types';
import { Child } from '../../api/parent.types';

// Child's backend AgeTier from their real class label — same bands the web parent app
// uses (childTierOf), collapsed to the backend's 4 tiers. Falls back to TEEN, never
// CAMPUS: the professional catalogue is for tertiary + senior students only.
export function childAgeTierOf(child?: Child | null): AgeTier {
  const label = String(child?.classLabel || child?.className || '').toLowerCase();
  const flat = label.replace(/\s+/g, '');
  if (/(playgroup|pre-|preprimary|preunit|preschool|nursery|baby|reception|kg|pp1|pp2|ecde|kindergarten|daycare)/.test(flat)) return 'PLAY';
  if (/college|tertiary|campus/.test(flat)) return 'CAMPUS';
  const m = label.match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : null;
  if (/form/.test(flat) && n != null) return 'SENIOR'; // 8-4-4 remnants
  if (n != null) return n <= 3 ? 'PLAY' : n <= 9 ? 'TEEN' : 'SENIOR';
  return 'TEEN';
}

export const KidLearnScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { questId } = useLocalSearchParams<{ questId?: string }>();
  const { selectedChild: child } = useSelectedChild();
  const { accessToken } = useAuth();

  const studentId = child?.studentId ?? null;
  const childName = child?.firstName || 'Your child';

  // Arm the learn-as-child header for the whole session; disarm on ANY exit path.
  // Lessons pushed on top (/student/lesson) keep this screen mounted, so the header
  // stays armed while the child plays and clears when the parent pops back out.
  useEffect(() => {
    if (studentId == null) return undefined;
    setLearnAsChild(studentId);
    return () => setLearnAsChild(null);
  }, [studentId]);

  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [detail, setDetail] = useState<QuestDetail | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(questId ? Number(questId) : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    try {
      setQuests(await listQuests(accessToken, childAgeTierOf(child)));
      setError(null);
    } catch {
      setError('Could not load quests. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, studentId, child]);

  const loadDetail = useCallback(async (qid: number) => {
    if (!accessToken) return;
    try {
      setDetail(await getQuest(accessToken, qid));
      setError(null);
    } catch {
      setError('Could not load this quest.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Refresh whenever the screen regains focus (e.g. returning from a lesson) so
  // stage statuses and XP reflect what the child just did.
  useFocusEffect(useCallback(() => {
    if (selectedQuestId != null) loadDetail(selectedQuestId);
    else loadList();
  }, [selectedQuestId, loadDetail, loadList]));

  const openQuest = (qid: number) => { setLoading(true); setSelectedQuestId(qid); loadDetail(qid); };
  const backToList = () => { setDetail(null); setSelectedQuestId(null); setLoading(true); loadList(); };

  const onStageTap = (stage: Stage) => {
    if (stage.status === 'LOCKED') {
      Alert.alert('🔒 Locked', 'Finish the step before this one!');
      return;
    }
    router.push(`/student/lesson?lessonId=${stage.lessonId}&questId=${detail?.quest.id}&stageId=${stage.id}` as any);
  };

  if (studentId == null) {
    return (
      <View style={[styles.root, styles.center]}>
        <Ionicons name="person-add-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>Select a child first.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Professional kid-learn app bar */}
      <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topBar}>
        <View style={styles.kidBadge}><Text style={{ fontSize: 16 }}>🎓</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.topTitle} numberOfLines={1}>{childName} is learning</Text>
          <Text style={styles.topSub} numberOfLines={1}>Progress saves to their account</Text>
        </View>
        <TouchableOpacity style={styles.doneBtnBar} activeOpacity={0.85} onPress={() => router.back()}>
          <Ionicons name="close" size={14} color="#FFF" />
          <Text style={styles.doneBtnBarText}>Done</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => (selectedQuestId != null ? loadDetail(selectedQuestId) : loadList())}>
            <Text style={styles.doneBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : detail ? (
        // ── Winding-path stage map — the SAME "tree" design as the student side ──
        <QuestStageMap detail={detail} styles={styles} colors={colors}
          onBack={backToList} onStageTap={onStageTap} />
      ) : (
        // ── Quest list ──────────────────────────────────────────────
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.listHead}>🗺️ Pick a quest, {childName}!</Text>
          {quests.length === 0 && (
            <View style={styles.center}>
              <Text style={{ fontSize: 44 }}>🌱</Text>
              <Text style={styles.emptyText}>No quests yet — your teacher will publish some soon!</Text>
            </View>
          )}
          {quests.map((q) => {
            const accent = q.accentColor || colors.primary;
            const pct = q.totalXp > 0 ? (q.earnedXp / q.totalXp) * 100 : 0;
            const locked = q.status === 'LOCKED';
            return (
              <TouchableOpacity key={q.id} style={[styles.questCard, { borderColor: accent + '40' }]}
                activeOpacity={0.85} disabled={locked} onPress={() => openQuest(q.id)}>
                <View style={styles.questHead}>
                  <View style={[styles.subjectPill, { backgroundColor: accent + '1F' }]}>
                    <Text style={[styles.subjectPillText, { color: accent }]}>{q.subject}</Text>
                  </View>
                  <Text style={[styles.questAction, { color: accent }]}>
                    {locked ? '🔒 Locked'
                      : q.status === 'COMPLETED' ? '✓ Completed'
                      : q.status === 'IN_PROGRESS' ? 'Continue →' : 'Start →'}
                  </Text>
                </View>
                <Text style={styles.questTitle} numberOfLines={1}>{q.title}</Text>
                {!!q.description && <Text style={styles.questDesc} numberOfLines={2}>{q.description}</Text>}
                <View style={[styles.track, { marginTop: 10 }]}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
                </View>
                <Text style={styles.questStats}>{q.completedStages}/{q.totalStages} stages · {q.earnedXp}/{q.totalXp} XP</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

// Curvy connector through the stage nodes — the winding "tree" path.
function buildPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]; const curr = points[i];
    const c1x = prev.x + (curr.x - prev.x) * 0.5 + (i % 2 === 0 ? -8 : 8);
    const c1y = prev.y + (curr.y - prev.y) * 0.2;
    const c2x = prev.x + (curr.x - prev.x) * 0.5 + (i % 2 === 0 ? 8 : -8);
    const c2y = prev.y + (curr.y - prev.y) * 0.8;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

// The winding-path quest map — a 1:1 port of the student QuestMapView "tree":
// a mint-blue map surface with the curvy dashed path and stage node bubbles.
const QuestStageMap: React.FC<{
  detail: QuestDetail; styles: any; colors: ColorPalette;
  onBack: () => void; onStageTap: (s: Stage) => void;
}> = ({ detail, styles, colors, onBack, onStageTap }) => {
  const dark = colors.scheme === 'dark';
  const stages = detail.stages;
  const accent = detail.quest.accentColor || colors.primary;
  const n = stages.length;
  // Lay every stage out with a FIXED vertical gap, bottom → top, in a zig-zag.
  // Deriving the map height from the count (not from authored % coords) means
  // all stages always get their own slot — none overlap or run off the map,
  // however many there are.
  const ZIG = [20, 44, 66, 80, 60, 36];
  const SPACING = 118;          // px between stage centres
  const PAD_TOP = 56;
  const PAD_BOTTOM = 92;        // room for the lowest bubble + its label
  const mapHeight = PAD_TOP + PAD_BOTTOM + Math.max(1, n - 1) * SPACING;
  const positions = stages.map((s, i) => {
    // Level 1 (stage 0) sits at the TOP, later stages descend downward.
    const yPx = PAD_TOP + i * SPACING;
    return { x: ZIG[i % ZIG.length], y: (yPx / mapHeight) * 100 };
  });
  const pathD = buildPath(positions);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backRow} activeOpacity={0.7} onPress={onBack}>
        <Ionicons name="chevron-back" size={16} color={colors.primary} />
        <Text style={styles.backRowText}>All quests</Text>
      </TouchableOpacity>

      <View style={styles.metaCard}>
        <Text style={[styles.metaSubject, { color: accent }]}>{detail.quest.subject}</Text>
        <Text style={styles.metaTitle}>{detail.quest.title}</Text>
        {!!detail.quest.description && <Text style={styles.metaDesc} numberOfLines={2}>{detail.quest.description}</Text>}
        <View style={styles.xpRow}>
          <View style={styles.track}>
            <View style={[styles.fill, {
              width: `${(detail.quest.earnedXp / Math.max(detail.quest.totalXp, 1)) * 100}%`,
              backgroundColor: accent,
            }]} />
          </View>
          <Text style={styles.xpText}>{detail.quest.earnedXp}/{detail.quest.totalXp} XP</Text>
        </View>
      </View>

      {/* Legend above the map */}
      <View style={styles.legend}>
        <LegendItem styles={styles} colors={['#15c98c', '#0fae78']} label="Done" />
        <LegendItem styles={styles} colors={['#ff9d2e', '#ff5e9c']} label="Play now" />
        <LegendItem styles={styles} solid="#9b93c4" label="Locked" />
        <LegendItem styles={styles} colors={['#f4a716', '#ff9d2e']} label="Boss" />
      </View>

      {/* Map */}
      <LinearGradient
        colors={dark ? ['#182a26', '#182238'] : ['#eafef3', '#e7f7ff']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={styles.mapWrap}
      >
        <View style={[styles.map, { height: mapHeight }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Path d={pathD} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
            <Path d={pathD} fill="none" stroke="#c9b8ff" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="0.1 3" />
          </Svg>
          {stages.map((stage, i) => {
            const pos = positions[i];
            const current = stage.status === 'AVAILABLE' || stage.status === 'IN_PROGRESS';
            return (
              <View key={stage.id} style={[styles.node, { left: `${pos.x}%`, top: `${pos.y}%` }]}>
                <StageBubble stage={stage} onPress={() => onStageTap(stage)} styles={styles} />
                <View style={[styles.lbl, current && styles.lblCur]}>
                  <Text style={[styles.lblText, current && styles.lblTextCur]} numberOfLines={2}>{stage.title}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </LinearGradient>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const StageBubble: React.FC<{ stage: Stage; onPress: () => void; styles: any }> = ({ stage, onPress, styles }) => {
  const isBoss = String(stage.type).toUpperCase().includes('BOSS');
  const s = stage.status;
  const grad: [string, string] =
    isBoss && s !== 'LOCKED' ? ['#f4a716', '#ff9d2e']
    : s === 'COMPLETED' ? ['#15c98c', '#0fae78']
    : s === 'AVAILABLE' || s === 'IN_PROGRESS' ? ['#ff9d2e', '#ff5e9c']
    : ['#b9b2d8', '#9b93c4'];
  const glyph = isBoss ? '🏆' : s === 'COMPLETED' ? '⭐' : s === 'LOCKED' ? '🔒' : '▶';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bub, isBoss && styles.bubBoss]}>
        <Text style={[styles.bubText, isBoss && styles.bubTextBoss]}>{glyph}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const LegendItem: React.FC<{ styles: any; colors?: [string, string]; solid?: string; label: string }> = ({ styles, colors, solid, label }) => (
  <View style={styles.legendItem}>
    {colors ? (
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.legendDot} />
    ) : (
      <View style={[styles.legendDot, { backgroundColor: solid }]} />
    )}
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    scroll: { paddingHorizontal: 16, paddingTop: 8 },

    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: 11,
      paddingHorizontal: 14, paddingTop: Platform.OS === 'ios' ? 56 : 38, paddingBottom: 14,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
    },
    kidBadge: {
      width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    topTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: -0.3 },
    topSub: { fontSize: 11.5, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
    topBarText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.textTertiary },
    doneBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
      borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
    },
    doneBtnText: { fontSize: 12, fontFamily: fonts.bold, color: c.textSecondary },
    doneBtnBar: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7,
    },
    doneBtnBarText: { fontSize: 12.5, fontFamily: fonts.bold, color: '#FFF' },

    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 12 },
    backRowText: { fontSize: 13, fontFamily: fonts.bold, color: c.primary },

    metaCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 14, marginBottom: 18,
    },
    metaSubject: { fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
    metaTitle: { fontSize: 17, fontFamily: fonts.extrabold, color: c.text, marginTop: 2, letterSpacing: -0.3 },
    metaDesc: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 17 },
    xpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    track: { flex: 1, height: 8, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },
    xpText: { fontSize: 11.5, fontFamily: fonts.extrabold, color: c.text },

    // ── Winding-path stage map (ported from the student QuestMapView) ──
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 4, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: '#fff',
      shadowColor: '#5038A0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    legendText: { fontFamily: fonts.semibold, color: c.textSecondary, fontSize: 13.5 },
    mapWrap: {
      padding: 8, borderRadius: 22, overflow: 'hidden', marginBottom: 14,
      shadowColor: '#5038A0', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
    },
    map: { position: 'relative', width: '100%', height: 720 },
    node: { position: 'absolute', width: 150, alignItems: 'center', transform: [{ translateX: -75 }, { translateY: -37 }] },
    bub: {
      width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center',
      borderWidth: 5, borderColor: '#fff',
      shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
    },
    bubBoss: { width: 92, height: 92, borderRadius: 46 },
    bubText: { fontSize: 30, color: '#fff' },
    bubTextBoss: { fontSize: 42 },
    lbl: {
      backgroundColor: c.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginTop: 6, maxWidth: 150,
      shadowColor: '#5038A0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    lblCur: { backgroundColor: '#ff9d2e' },
    lblText: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15, color: c.text, textAlign: 'center' },
    lblTextCur: { color: '#fff' },

    stageRow: { alignItems: 'stretch' },
    connector: { width: 3, height: 14, borderRadius: 2, backgroundColor: c.border, marginLeft: 40 },
    stageCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 12,
    },
    stageBubble: {
      width: 54, height: 54, borderRadius: 27,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 4, borderColor: c.card,
      shadowColor: '#5038A0', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18, shadowRadius: 6, elevation: 4,
    },
    stageBubbleText: { fontSize: 22, color: '#FFF' },
    stageTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    stageMeta: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 2 },
    playPill: { backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
    playPillText: { color: '#FFF', fontSize: 12, fontFamily: fonts.bold },

    listHead: { fontSize: 17, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    questCard: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 2,
      padding: 14, marginBottom: 12,
    },
    questHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    subjectPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    subjectPillText: { fontSize: 10.5, fontFamily: fonts.extrabold, letterSpacing: 0.3 },
    questAction: { fontSize: 12.5, fontFamily: fonts.extrabold },
    questTitle: { fontSize: 16, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    questDesc: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3, lineHeight: 17 },
    questStats: { fontSize: 11, fontFamily: fonts.semibold, color: c.textTertiary, marginTop: 6 },
  });
}
