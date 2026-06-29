import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { getChildDiary } from '../../api/diary';
import {
  DiarySession, DiaryPlanRow, DiaryDailyEntry, DiaryWeeklyEntry,
} from '../../api/diary.types';
import { ApiError } from '../../config/api';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const DiaryScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();

  const [sessions, setSessions] = useState<DiarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const studentId = selectedChild?.studentId ?? null;

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await getChildDiary(accessToken, studentId);
      setSessions(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load diary.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!selectedChild) {
    return (
      <View style={styles.safe}>
        <ParentHeader title="School Diary" showBack />
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="person-add-outline" size={28} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>Pick a child from Home to view their school diary.</Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.primaryBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ParentHeader title="School Diary" showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={colors.primary} />
        }
      >
        <View style={styles.childCard}>
          <View style={styles.childAvatar}>
            <Text style={styles.childInitials}>{selectedChild.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>{selectedChild.fullName}</Text>
            <Text style={styles.childMeta}>{selectedChild.classLabel || 'Viewing weekly diary'}</Text>
          </View>
          <MaterialCommunityIcons name="notebook-outline" size={20} color={colors.primary} />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading diary…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} hitSlop={6}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {!loading && !error && sessions.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="notebook-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No diary entries yet</Text>
            <Text style={styles.emptyText}>Your child's teacher hasn't published any diary weeks yet.</Text>
          </View>
        )}

        {!loading && sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            expanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            colors={colors}
            styles={styles}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const SessionCard: React.FC<{
  session: DiarySession; expanded: boolean; onToggle: () => void;
  colors: ColorPalette; styles: any;
}> = ({ session, expanded, onToggle, colors, styles }) => {
  const dateRange = formatDateRange(session.weekStart);
  const commentCount = session.dailyEntries.filter(d => d.teacherComment).length;
  const hasWeekly = session.weeklyEntry?.teacherComment != null;

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.75} onPress={onToggle} style={styles.cardHeader}>
        <View style={styles.weekIcon}>
          <Feather name="calendar" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.weekLabel}>{session.weekLabel}</Text>
          <Text style={styles.weekDate}>{dateRange}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.metaRow}>
        <View style={styles.teacherAvatar}>
          <Text style={styles.teacherInitials}>{session.teacherInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.teacherName}>{session.teacherName}</Text>
          <Text style={styles.classLabel}>{session.classLabel}</Text>
        </View>
        <View style={styles.countsCol}>
          {commentCount > 0 && (
            <View style={styles.countPill}>
              <Ionicons name="chatbubble-ellipses" size={10} color={colors.purple} />
              <Text style={styles.countText}>{commentCount} comments</Text>
            </View>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.expanded}>
          {session.notes && (
            <Section colors={colors} styles={styles} title="Teacher's note" icon="document-text-outline">
              <Text style={styles.notesText}>{session.notes}</Text>
            </Section>
          )}
          {session.planRows.length > 0 && (
            <Section colors={colors} styles={styles} title="Weekly plan" icon="list-outline">
              <WeeklyPlan rows={session.planRows} colors={colors} styles={styles} />
            </Section>
          )}
          {commentCount > 0 && (
            <Section colors={colors} styles={styles} title="Daily comments" icon="chatbubble-ellipses-outline">
              <DailyComments entries={session.dailyEntries} colors={colors} styles={styles} />
            </Section>
          )}
          {hasWeekly && session.weeklyEntry && (
            <Section colors={colors} styles={styles} title="Weekly comment" icon="star-outline">
              <WeeklyComment entry={session.weeklyEntry} colors={colors} styles={styles} />
            </Section>
          )}
        </View>
      )}
    </View>
  );
};

const Section: React.FC<{ title: string; icon: any; children: React.ReactNode; colors: ColorPalette; styles: any }> = ({ title, icon, children, colors, styles }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const WeeklyPlan: React.FC<{ rows: DiaryPlanRow[]; colors: ColorPalette; styles: any }> = ({ rows, colors, styles }) => {
  const groupedByDay = new Map<number, DiaryPlanRow[]>();
  for (const r of rows) {
    if (!groupedByDay.has(r.dayIndex)) groupedByDay.set(r.dayIndex, []);
    groupedByDay.get(r.dayIndex)!.push(r);
  }
  const sortedDays = [...groupedByDay.keys()].sort((a, b) => a - b);

  return (
    <View style={styles.planList}>
      {sortedDays.map((dayIdx) => {
        const dayRows = groupedByDay.get(dayIdx)!.sort((a, b) => a.rowIndex - b.rowIndex);
        const labelIdx = dayIdx >= 1 && dayIdx <= 5 ? dayIdx - 1 : dayIdx;
        return (
          <View key={dayIdx} style={styles.planDay}>
            <Text style={styles.planDayLabel}>{DAY_NAMES[labelIdx] ?? `Day ${dayIdx}`}</Text>
            <View style={styles.planEntries}>
              {dayRows.map((r) => (
                <View key={`${r.dayIndex}-${r.rowIndex}`} style={styles.planRow}>
                  <Text style={styles.planSubject}>{r.subject || '—'}</Text>
                  <Text style={styles.planDetails}>
                    {[r.book, r.exercise && `Ex ${r.exercise}`, r.page && `p. ${r.page}`].filter(Boolean).join(' · ') || '\u2014'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const DailyComments: React.FC<{ entries: DiaryDailyEntry[]; colors: ColorPalette; styles: any }> = ({ entries, colors, styles }) => {
  const withComments = entries.filter((e) => e.teacherComment);
  return (
    <View style={styles.commentList}>
      {withComments.map((e) => {
        const idx = e.dayIndex >= 1 && e.dayIndex <= 5 ? e.dayIndex - 1 : e.dayIndex;
        return (
          <View key={`day-${e.dayIndex}`} style={styles.commentBlock}>
            <Text style={styles.commentDay}>{DAY_NAMES[idx] ?? `Day ${e.dayIndex}`}</Text>
            {e.teacherComment && (
              <CommentBubble author="Teacher" comment={e.teacherComment}
                signedBy={e.teacherSign} signedAt={e.teacherSignedAt}
                accent={colors.purple} colors={colors} styles={styles} />
            )}
            {e.parentComment && (
              <CommentBubble author="You" comment={e.parentComment}
                signedBy={e.parentSign} signedAt={e.parentSignedAt}
                accent={colors.primary} colors={colors} styles={styles} />
            )}
          </View>
        );
      })}
    </View>
  );
};

const WeeklyComment: React.FC<{ entry: DiaryWeeklyEntry; colors: ColorPalette; styles: any }> = ({ entry, colors, styles }) => (
  <View>
    {entry.teacherComment && (
      <CommentBubble author="Teacher" comment={entry.teacherComment}
        signedBy={entry.teacherSign} signedAt={entry.teacherSignedAt}
        accent={colors.purple} colors={colors} styles={styles} />
    )}
    {entry.parentComment && (
      <CommentBubble author="You" comment={entry.parentComment}
        signedBy={entry.parentSign} signedAt={entry.parentSignedAt}
        accent={colors.primary} colors={colors} styles={styles} />
    )}
  </View>
);

const CommentBubble: React.FC<{
  author: string; comment: string; signedBy: string | null; signedAt: string | null; accent: string;
  colors: ColorPalette; styles: any;
}> = ({ author, comment, signedBy, signedAt, accent, styles }) => (
  <View style={[styles.bubble, { borderLeftColor: accent }]}>
    <Text style={[styles.bubbleAuthor, { color: accent }]}>{author}</Text>
    <Text style={styles.bubbleText}>{comment}</Text>
    {(signedBy || signedAt) && (
      <Text style={styles.bubbleSig}>
        {signedBy ? `Signed by ${signedBy}` : 'Signed'}
        {signedAt && ` · ${formatTimestamp(signedAt)}`}
      </Text>
    )}
  </View>
);

function formatDateRange(weekStartIso: string): string {
  try {
    const start = new Date(weekStartIso);
    if (isNaN(start.getTime())) return weekStartIso;
    const end = new Date(start);
    end.setDate(start.getDate() + 4);
    const sameMonth = start.getMonth() === end.getMonth();
    const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
    const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  } catch { return weekStartIso; }
}

function formatTimestamp(iso: string): string {
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
    loadingText: { fontSize: 11.5, color: c.textSecondary, marginTop: 8, fontWeight: '500' },
    emptyIconCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 11.5, color: c.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 },
    primaryBtn: {
      marginTop: 16, backgroundColor: c.primary,
      paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },

    childCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, padding: 12, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 16,
    },
    childAvatar: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    childInitials: { color: c.primary, fontSize: 14, fontWeight: '800' },
    childName: { fontSize: 13.5, fontWeight: '700', color: c.text },
    childMeta: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },

    card: {
      backgroundColor: c.card,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      marginBottom: 12, overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 8 },
    weekIcon: {
      width: 36, height: 36, borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    weekLabel: { fontSize: 13.5, fontWeight: '700', color: c.text },
    weekDate: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
    teacherAvatar: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: c.purpleLight,
      alignItems: 'center', justifyContent: 'center',
    },
    teacherInitials: { color: c.purple, fontSize: 11, fontWeight: '800' },
    teacherName: { fontSize: 12.5, fontWeight: '700', color: c.text },
    classLabel: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },
    countsCol: { alignItems: 'flex-end' },
    countPill: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.purpleLight,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
    },
    countText: { color: c.purple, fontSize: 10, fontWeight: '700' },

    expanded: {
      borderTopWidth: 1, borderTopColor: c.border,
      padding: 12, paddingTop: 8, gap: 12,
    },
    section: {},
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { fontSize: 11.5, fontWeight: '800', color: c.primary, letterSpacing: 0.6, textTransform: 'uppercase' },
    notesText: { fontSize: 13.5, color: c.text, lineHeight: 20, fontWeight: '500' },

    planList: { gap: 8 },
    planDay: { backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 8 },
    planDayLabel: { fontSize: 11.5, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.4, marginBottom: 6 },
    planEntries: { gap: 6 },
    planRow: { paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: c.primarySoft, paddingLeft: 8 },
    planSubject: { fontSize: 13, fontWeight: '700', color: c.text },
    planDetails: { fontSize: 11.5, color: c.textSecondary, fontWeight: '500', marginTop: 1 },

    commentList: { gap: 12 },
    commentBlock: {},
    commentDay: { fontSize: 11.5, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.4, marginBottom: 6 },
    bubble: {
      backgroundColor: c.backgroundAlt,
      borderLeftWidth: 3, borderRadius: 12,
      padding: 8, marginBottom: 6,
    },
    bubbleAuthor: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4 },
    bubbleText: { fontSize: 13.5, color: c.text, lineHeight: 19, fontWeight: '500' },
    bubbleSig: { fontSize: 11.5, color: c.textTertiary, marginTop: 6, fontStyle: 'italic' },
  });
}
