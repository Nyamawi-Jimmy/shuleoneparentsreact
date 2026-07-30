// Professional coding path — the campus/college "Coding" surface, matching the
// web's CampusLearn: tabs My path · Playground · Exams · Revise. "My path" is
// the server-grouped 7-level professional spine (Python, Web, SWE, AI, …) from
// GET /api/professional/catalog — real professional content, not kid Scratch.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StudentColors, STUDENT_LIGHT, STUDENT_DARK, themedSheets, useSchemeTick } from '../studentTheme';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { useAuth } from '../../../context/AuthContext';
import { getProfessionalCatalog, ProfessionalCatalog, ProLevel, ProTrack } from '../../../api/professional';
import { getQuest } from '../../../api/quests';
import { QuestDetail, QuestSummary, Stage } from '../../../api/quest.types';
import { getStudentProfile } from '../../../api/student';
import { StudentProfile } from '../../../api/student.types';
import { QuestMapView } from './QuestView';
import { CodingExamsSection } from './CodingExamsSection';

type Tab = 'path' | 'playground' | 'exams' | 'revise';
const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'path', icon: '🧭', label: 'My path' },
  { key: 'playground', icon: '🎮', label: 'Playground' },
  { key: 'exams', icon: '🏅', label: 'Exams' },
  { key: 'revise', icon: '🔁', label: 'Revise' },
];

// Campus playground languages — the web's CampusLearn subset (no blocks/hardware).
const PG = [
  { kind: 'PYTHON', icon: '🐍', label: 'Python' },
  { kind: 'WEB', icon: '🌐', label: 'Web' },
  { kind: 'JS', icon: '🟨', label: 'JavaScript' },
  { kind: 'SQL', icon: '🗄️', label: 'SQL' },
  { kind: 'BASH', icon: '💻', label: 'Terminal' },
];

const pct = (done: number, total: number) => (total > 0 ? Math.round((100 * done) / total) : 0);
const statusMeta = (s: string | null | undefined) => {
  const u = String(s || '').toUpperCase();
  if (u === 'LIVE') return { label: 'Live', color: '#15c98c' };
  if (u === 'COMING_SOON') return { label: 'Coming soon', color: '#f4a716' };
  return { label: 'Roadmap', color: '#9b93c4' };
};

export const ProfessionalPathView: React.FC = () => {
  const { tier } = useTier();
  const tokens = useTokens(tier);
  useSchemeTick();
  const { accessToken } = useAuth();

  const [catalog, setCatalog] = useState<ProfessionalCatalog | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('path');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<QuestDetail | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken) { setError('Please sign in again.'); setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading((l) => (catalog ? l : true));
    const [c, p] = await Promise.allSettled([
      getProfessionalCatalog(accessToken),
      getStudentProfile(accessToken),
    ]);
    if (c.status === 'fulfilled') { setCatalog(c.value); setError(null); }
    else setError('Could not load your coding path.');
    if (p.status === 'fulfilled') setProfile(p.value);
    setLoading(false); setRefreshing(false);
  }, [accessToken, catalog]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const openQuest = async (id: number | null) => {
    if (!accessToken || id == null || openingId != null) return;
    setOpeningId(id); setLoadingDetail(true);
    try { setDetail(await getQuest(accessToken, id)); }
    catch { Alert.alert('Could not open', 'Please try again in a moment.'); }
    finally { setOpeningId(null); setLoadingDetail(false); }
  };

  const onStageTap = (stage: Stage) => {
    if (stage.status === 'LOCKED') { Alert.alert('🔒 Locked', 'Finish the step before this one!'); return; }
    router.push(`/student/lesson?lessonId=${stage.lessonId}&questId=${detail?.quest.id}&stageId=${stage.id}` as any);
  };

  // Every professional quest, flattened, for the Revise tab.
  const allQuests = useMemo<QuestSummary[]>(() => {
    if (!catalog) return [];
    const out: QuestSummary[] = [];
    for (const lv of catalog.levels) {
      out.push(...lv.quests);
      (lv.tracks || []).forEach((t) => out.push(...t.quests));
    }
    out.push(...(catalog.ungrouped || []));
    const seen = new Set<number>();
    return out.filter((q) => q && q.id != null && !seen.has(q.id) && seen.add(q.id));
  }, [catalog]);

  if (detail) {
    return (
      <QuestMapView
        questDetail={detail} tier={tier} tokens={tokens} loadingDetail={loadingDetail}
        onBack={() => setDetail(null)} onStageTap={onStageTap}
      />
    );
  }

  if (loading && !catalog) {
    return (
      <View style={[styles.safe, styles.center, { backgroundColor: tokens.bgColor }]}>
        <ActivityIndicator size="large" color={tokens.accent1} />
        <Text style={styles.loadingText}>Loading your coding path…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={tokens.accent1} />}>
        <View style={styles.secH}>
          <Text style={styles.secHTitle}>💻 Coding</Text>
          <View style={styles.secHLine} />
        </View>

        {/* Tab strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <TouchableOpacity key={t.key} activeOpacity={0.85} onPress={() => setTab(t.key)}
                style={[styles.tab, on && { backgroundColor: tokens.accent1, borderColor: tokens.accent1 }]}>
                <Text style={styles.tabIcon}>{t.icon}</Text>
                <Text style={[styles.tabText, on && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color="#dc2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => load(true)} hitSlop={6}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {/* ── My path ─────────────────────────────────────────── */}
        {tab === 'path' && catalog && (
          <>
            {catalog.levels.map((lv) => (
              <LevelCard key={lv.level} level={lv} tokens={tokens}
                expanded={expanded.has(`L${lv.level}`)} onToggle={() => toggle(`L${lv.level}`)}
                openingId={openingId} onOpenQuest={openQuest} toggleTrack={toggle} isTrackOpen={(k) => expanded.has(k)} />
            ))}
            {catalog.ungrouped.length > 0 && (
              <View style={styles.levelCard}>
                <Text style={styles.levelName}>More</Text>
                {catalog.ungrouped.map((q) => (
                  <QuestRow key={q.id} quest={q} tokens={tokens} opening={openingId === q.id} onOpen={() => openQuest(q.id)} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Playground ──────────────────────────────────────── */}
        {tab === 'playground' && (
          <View style={styles.pgGrid}>
            {PG.map((k) => (
              <TouchableOpacity key={k.kind} activeOpacity={0.85} style={styles.pgTile}
                onPress={() => router.push(`/student/playground?kind=${k.kind}` as any)}>
                <Text style={styles.pgIcon}>{k.icon}</Text>
                <Text style={styles.pgLabel}>{k.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Exams ───────────────────────────────────────────── */}
        {tab === 'exams' && <CodingExamsSection studentId={profile?.studentId ?? null} />}

        {/* ── Revise (browse every professional quest) ────────── */}
        {tab === 'revise' && (
          allQuests.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>No coding quests yet — check back soon.</Text></View>
          ) : (
            <View style={styles.levelCard}>
              {allQuests.map((q) => (
                <QuestRow key={q.id} quest={q} tokens={tokens} opening={openingId === q.id} onOpen={() => openQuest(q.id)} />
              ))}
            </View>
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// One level of the professional spine.
const LevelCard: React.FC<{
  level: ProLevel; tokens: any; expanded: boolean; onToggle: () => void;
  openingId: number | null; onOpenQuest: (id: number | null) => void;
  toggleTrack: (k: string) => void; isTrackOpen: (k: string) => boolean;
}> = ({ level, tokens, expanded, onToggle, openingId, onOpenQuest, toggleTrack, isTrackOpen }) => {
  const st = statusMeta(level.status);
  const p = pct(level.completedQuests, level.totalQuests);
  return (
    <View style={[styles.levelCard, { borderColor: tokens.accent1 + '22' }]}>
      <TouchableOpacity activeOpacity={0.8} style={styles.levelHead} onPress={onToggle}>
        <View style={[styles.levelBadge, { backgroundColor: tokens.accent1 + '1A' }]}>
          <Text style={[styles.levelBadgeText, { color: tokens.accent1 }]}>L{level.level}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.levelName} numberOfLines={1}>{level.name}</Text>
          {!!level.tagline && <Text style={styles.levelTag} numberOfLines={1}>{level.tagline}</Text>}
        </View>
        <View style={[styles.statusChip, { backgroundColor: st.color + '1A' }]}>
          <Text style={[styles.statusChipText, { color: st.color }]}>{st.label}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={tokens.accent1} />
      </TouchableOpacity>
      <View style={styles.levelMetaRow}>
        <View style={styles.track}><View style={[styles.fill, { width: `${p}%`, backgroundColor: tokens.accent1 }]} /></View>
        <Text style={styles.levelMeta}>{level.completedQuests}/{level.totalQuests} · ⚡{level.earnedXp}/{level.totalXp}</Text>
      </View>

      {expanded && (
        <View style={{ marginTop: 6 }}>
          {level.quests.map((q) => (
            <QuestRow key={q.id} quest={q} tokens={tokens} opening={openingId === q.id} onOpen={() => onOpenQuest(q.id)} />
          ))}
          {(level.tracks || []).map((t) => (
            <TrackCard key={t.track} track={t} tokens={tokens}
              expanded={isTrackOpen(`T${t.track}`)} onToggle={() => toggleTrack(`T${t.track}`)}
              openingId={openingId} onOpenQuest={onOpenQuest} />
          ))}
          {level.quests.length === 0 && (level.tracks || []).length === 0 && (
            <Text style={styles.levelEmpty}>Content for this level is coming soon.</Text>
          )}
        </View>
      )}
    </View>
  );
};

// One L5 specialization track.
const TrackCard: React.FC<{
  track: ProTrack; tokens: any; expanded: boolean; onToggle: () => void;
  openingId: number | null; onOpenQuest: (id: number | null) => void;
}> = ({ track, tokens, expanded, onToggle, openingId, onOpenQuest }) => {
  const st = statusMeta(track.status);
  const p = pct(track.completedQuests, track.totalQuests);
  return (
    <View style={styles.trackCard}>
      <TouchableOpacity activeOpacity={0.8} style={styles.levelHead} onPress={onToggle}>
        <Text style={styles.trackDot}>◆</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
          {!!track.tagline && <Text style={styles.levelTag} numberOfLines={1}>{track.tagline}</Text>}
        </View>
        <View style={[styles.statusChip, { backgroundColor: st.color + '1A' }]}>
          <Text style={[styles.statusChipText, { color: st.color }]}>{track.examined ? 'Exam' : st.label}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={tokens.accent1} />
      </TouchableOpacity>
      <View style={styles.levelMetaRow}>
        <View style={styles.track}><View style={[styles.fill, { width: `${p}%`, backgroundColor: tokens.accent1 }]} /></View>
        <Text style={styles.levelMeta}>{track.completedQuests}/{track.totalQuests}</Text>
      </View>
      {expanded && track.quests.map((q) => (
        <QuestRow key={q.id} quest={q} tokens={tokens} opening={openingId === q.id} onOpen={() => onOpenQuest(q.id)} />
      ))}
    </View>
  );
};

// Compact professional-quest row.
const QuestRow: React.FC<{ quest: QuestSummary; tokens: any; opening: boolean; onOpen: () => void }> = ({ quest, tokens, opening, onOpen }) => {
  const p = quest.totalStages ? Math.round((quest.completedStages / quest.totalStages) * 100) : 0;
  const done = quest.status === 'COMPLETED';
  const locked = quest.status === 'LOCKED';
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.qRow} onPress={onOpen} disabled={locked || opening}>
      <View style={[styles.qDot, { backgroundColor: done ? '#15c98c' : locked ? '#9b93c4' : tokens.accent1 }]}>
        <Text style={styles.qDotText}>{done ? '✓' : locked ? '🔒' : `${p}%`}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.qTitle} numberOfLines={1}>{quest.title}</Text>
        <Text style={styles.qMeta} numberOfLines={1}>{quest.completedStages}/{quest.totalStages} stages · ⚡ {quest.earnedXp}/{quest.totalXp}</Text>
      </View>
      {opening ? <ActivityIndicator size="small" color={tokens.accent1} />
        : <Text style={[styles.qOpen, { color: locked ? '#9b93c4' : tokens.accent1 }]}>{done ? 'Replay' : locked ? '' : 'Open ▶'}</Text>}
    </TouchableOpacity>
  );
};

const makeSheet = (S: StudentColors) => StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  loadingText: { color: S.inkSoft, marginTop: 14, fontWeight: '600' },

  secH: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  secHTitle: { fontSize: 17, fontWeight: '800', color: S.ink },
  secHLine: { flex: 1, height: 3, borderRadius: 3, backgroundColor: S.line },

  tabStrip: { gap: 8, paddingBottom: 4, marginBottom: 14, paddingRight: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: S.line, backgroundColor: S.card,
    borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8,
  },
  tabIcon: { fontSize: 13 },
  tabText: { fontSize: 12.5, fontWeight: '800', color: S.inkSoft },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: S.badSoft, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorBannerText: { flex: 1, color: '#dc2626', fontSize: 12.5, fontWeight: '700' },
  retryInline: { color: '#dc2626', fontWeight: '800', fontSize: 13 },

  levelCard: {
    backgroundColor: S.card, borderRadius: 18, borderWidth: 1.5, borderColor: S.line, padding: 14, marginBottom: 12,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  levelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelBadgeText: { fontSize: 14, fontWeight: '900' },
  levelName: { fontSize: 14.5, fontWeight: '800', color: S.ink, letterSpacing: -0.2 },
  levelTag: { fontSize: 11.5, fontWeight: '600', color: S.inkSoft, marginTop: 1 },
  statusChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: '800' },
  levelMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  levelMeta: { fontSize: 11, fontWeight: '700', color: S.inkSoft },
  levelEmpty: { fontSize: 12, color: S.inkSoft, fontWeight: '600', paddingVertical: 8 },
  track: { flex: 1, height: 7, borderRadius: 99, backgroundColor: S.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },

  trackCard: { backgroundColor: S.soft, borderRadius: 14, padding: 12, marginTop: 10 },
  trackDot: { fontSize: 14, color: S.inkSoft },
  trackName: { fontSize: 13.5, fontWeight: '800', color: S.ink },

  qRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, borderTopWidth: 1, borderTopColor: S.divider },
  qDot: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qDotText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  qTitle: { fontSize: 13.5, fontWeight: '800', color: S.ink },
  qMeta: { fontSize: 11, fontWeight: '600', color: S.inkSoft, marginTop: 2 },
  qOpen: { fontSize: 12, fontWeight: '800' },

  pgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pgTile: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: S.card, borderRadius: 16, borderWidth: 1.5, borderColor: S.line,
    alignItems: 'center', paddingVertical: 20, gap: 8,
    shadowColor: '#5038A0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  pgIcon: { fontSize: 30 },
  pgLabel: { fontSize: 13, fontWeight: '800', color: S.ink },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 13, color: S.inkSoft, fontWeight: '600', textAlign: 'center' },
});

const styles = themedSheets(makeSheet(STUDENT_LIGHT), makeSheet(STUDENT_DARK));
