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
      {/* One slim line, not a banner — the child's screen belongs to the quest, and the
          only thing a parent needs up here is the way back. */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText} numberOfLines={1}>
          🎓 {childName} is learning — progress saves to their account
        </Text>
        <TouchableOpacity style={styles.doneBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Ionicons name="close" size={13} color={colors.textSecondary} />
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

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
        // ── Stage path for one quest ────────────────────────────────
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backRow} activeOpacity={0.7} onPress={backToList}>
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
            <Text style={styles.backRowText}>All quests</Text>
          </TouchableOpacity>

          <View style={styles.metaCard}>
            <Text style={[styles.metaSubject, { color: detail.quest.accentColor || colors.primary }]}>
              {detail.quest.subject}
            </Text>
            <Text style={styles.metaTitle}>{detail.quest.title}</Text>
            {!!detail.quest.description && <Text style={styles.metaDesc} numberOfLines={2}>{detail.quest.description}</Text>}
            <View style={styles.xpRow}>
              <View style={styles.track}>
                <View style={[styles.fill, {
                  width: `${(detail.quest.earnedXp / Math.max(detail.quest.totalXp, 1)) * 100}%`,
                  backgroundColor: detail.quest.accentColor || colors.primary,
                }]} />
              </View>
              <Text style={styles.xpText}>{detail.quest.earnedXp}/{detail.quest.totalXp} XP</Text>
            </View>
          </View>

          {detail.stages.map((stage, i) => {
            const isBoss = String(stage.type).toUpperCase().includes('BOSS');
            const done = stage.status === 'COMPLETED';
            const locked = stage.status === 'LOCKED';
            const playable = !locked && !done;
            const bubbleColors: [string, string] =
              isBoss && !locked ? ['#f4a716', '#ff9d2e']
              : done ? ['#15c98c', '#0fae78']
              : playable ? ['#ff9d2e', '#ff5e9c']
              : ['#b9b2d8', '#9b93c4'];
            return (
              <View key={stage.id} style={styles.stageRow}>
                {/* connector */}
                {i > 0 && <View style={styles.connector} />}
                <TouchableOpacity style={styles.stageCard} activeOpacity={0.8} onPress={() => onStageTap(stage)}>
                  <LinearGradient colors={bubbleColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stageBubble}>
                    <Text style={styles.stageBubbleText}>
                      {isBoss ? '🏆' : done ? '⭐' : locked ? '🔒' : '▶'}
                    </Text>
                  </LinearGradient>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.stageTitle} numberOfLines={1}>{stage.title}</Text>
                    <Text style={styles.stageMeta}>
                      {done ? `⭐ ${stage.stars}/3 · ${stage.xpReward} XP`
                        : locked ? 'Locked'
                        : `${stage.xpReward} XP${isBoss ? ' · Big challenge!' : ''}`}
                    </Text>
                  </View>
                  {!locked && (
                    <View style={[styles.playPill, done && { backgroundColor: colors.backgroundAlt }]}>
                      <Text style={[styles.playPillText, done && { color: colors.textSecondary }]}>
                        {done ? 'Replay' : stage.status === 'IN_PROGRESS' ? 'Continue' : 'Play'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
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

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
    scroll: { paddingHorizontal: 16, paddingTop: 8 },

    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 58 : 40, paddingBottom: 10,
      backgroundColor: c.background,
    },
    topBarText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.textTertiary },
    doneBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
      borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
    },
    doneBtnText: { fontSize: 12, fontFamily: fonts.bold, color: c.textSecondary },

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
