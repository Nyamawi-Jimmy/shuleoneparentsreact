import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useAuth } from '../../context/AuthContext';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { getChildDiary, signDiaryEntry, DiarySignResult } from '../../api/diary';
import { DiarySession, DiaryDailyEntry, DiaryWeeklyEntry } from '../../api/diary.types';
import { ApiError } from '../../config/api';

const DAY_LABELS = [
  { short: 'MON', full: 'Monday' },
  { short: 'TUE', full: 'Tuesday' },
  { short: 'WED', full: 'Wednesday' },
  { short: 'THU', full: 'Thursday' },
  { short: 'FRI', full: 'Friday' },
  { short: 'WK', full: 'Weekly' },
];

const fmtDate = (s?: string | null, opts?: Intl.DateTimeFormatOptions): string => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
};
const dayDate = (weekStart: string, idx: number): Date | null => {
  const d = new Date(weekStart);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + idx);
  return d;
};

type Override = { parentComment?: string | null; parentSign?: string | null; parentSignedAt?: string | null };

export const DiaryScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { accessToken } = useAuth();
  const { selectedChild } = useSelectedChild();
  const { parent } = useParentProfile();

  const [sessions, setSessions] = useState<DiarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const studentId = selectedChild?.studentId ?? null;

  const load = useCallback(async (isRefresh = false) => {
    if (!accessToken || studentId == null) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getChildDiary(accessToken, studentId);
      setSessions((data ?? []).filter((s) => s.status === 'PUBLISHED'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load diary.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken, studentId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openSession = sessions.find((s) => s.id === openId) ?? null;

  if (!selectedChild) {
    return (
      <View style={styles.root}>
        <ParentHeader title="Class Diary" showBack rightIcon="none" />
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="person-add-outline" size={26} color={colors.textSecondary} /></View>
          <Text style={styles.emptyTitle}>No child selected</Text>
          <Text style={styles.emptyText}>Pick a child from Home to view their class diary.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ParentHeader
        title="Class Diary"
        showBack
        rightIcon="none"
      />
      {openSession ? (
        <SessionDetail
          key={openSession.id}
          styles={styles}
          colors={colors}
          session={openSession}
          studentId={selectedChild.studentId}
          parentName={(parent as any)?.name || (parent as any)?.fullName || ''}
          accessToken={accessToken!}
          onBack={() => setOpenId(null)}
          onSigned={() => load(true)}
        />
      ) : (
        <SessionList
          styles={styles}
          colors={colors}
          sessions={sessions}
          loading={loading}
          refreshing={refreshing}
          error={error}
          query={query}
          setQuery={setQuery}
          childName={selectedChild.firstName || selectedChild.fullName || 'your child'}
          onOpen={setOpenId}
          onRefresh={() => load(true)}
        />
      )}
    </View>
  );
};

// ── List ─────────────────────────────────────────────────────────────────────
const SessionList: React.FC<{
  styles: any; colors: ColorPalette; sessions: DiarySession[];
  loading: boolean; refreshing: boolean; error: string | null;
  query: string; setQuery: (s: string) => void; childName: string;
  onOpen: (id: number) => void; onRefresh: () => void;
}> = ({ styles, colors, sessions, loading, refreshing, error, query, setQuery, childName, onOpen, onRefresh }) => {
  const filtered = useMemo(() => {
    if (!query.trim()) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) =>
      s.weekLabel?.toLowerCase().includes(q) ||
      s.teacherName?.toLowerCase().includes(q) ||
      s.classLabel?.toLowerCase().includes(q));
  }, [sessions, query]);

  const totalUnsigned = sessions.reduce((sum, s) => {
    const dayU = s.dailyEntries.filter((d) => d.teacherComment && !d.parentSignedAt).length;
    const wkU = s.weeklyEntry?.teacherComment && !s.weeklyEntry?.parentSignedAt ? 1 : 0;
    return sum + dayU + wkU;
  }, 0);
  const totalComments = sessions.reduce((sum, s) => sum + s.dailyEntries.filter((d) => d.teacherComment).length, 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

      {/* Stats strip */}
      <View style={styles.statsRow}>
        <Stat styles={styles} value={String(sessions.length)} label="Weeks" sub="published" color={colors.primary} />
        <View style={styles.statDivider} />
        <Stat styles={styles} value={String(totalUnsigned)} label="To sign" sub="your responses" color={totalUnsigned > 0 ? colors.warning : colors.success} />
        <View style={styles.statDivider} />
        <Stat styles={styles} value={String(totalComments)} label="Comments" sub="from teachers" color={colors.text} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by week, teacher, class…"
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Week cards */}
      {filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="notebook-outline" size={30} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{query ? 'No matches' : 'No diary weeks yet'}</Text>
          <Text style={styles.emptyText}>
            {query ? `Nothing matches "${query}".` : `Teachers haven't published any diary weeks for ${childName} yet.`}
          </Text>
        </View>
      ) : (
        filtered.map((s) => {
          const teacherCount = s.dailyEntries.filter((d) => d.teacherComment).length;
          const parentSigned = s.dailyEntries.filter((d) => d.parentSignedAt).length;
          const weeklyTeacher = !!s.weeklyEntry?.teacherComment;
          const weeklySigned = !!s.weeklyEntry?.parentSignedAt;
          const totalSignable = teacherCount + (weeklyTeacher ? 1 : 0);
          const totalSigned = parentSigned + (weeklySigned ? 1 : 0);
          const pending = totalSignable - totalSigned;
          const pct = totalSignable === 0 ? 0 : Math.round((totalSigned / totalSignable) * 100);
          const weekNo = s.weekLabel?.match(/Week (\d+)/)?.[1] || '?';

          return (
            <TouchableOpacity key={s.id} style={styles.weekCard} activeOpacity={0.85} onPress={() => onOpen(s.id)}>
              <LinearGradient colors={[colors.primary, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.weekBadge}>
                <MaterialCommunityIcons name="notebook" size={14} color="#FFF" style={{ opacity: 0.85 }} />
                <Text style={styles.weekBadgeKicker}>WEEK</Text>
                <Text style={styles.weekBadgeNo}>{weekNo}</Text>
              </LinearGradient>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.weekTitleRow}>
                  <Text style={styles.weekTitle} numberOfLines={1}>{s.weekLabel}</Text>
                  {totalSignable > 0 && (
                    pending > 0 ? (
                      <View style={[styles.miniChip, { backgroundColor: colors.warning + '1A' }]}>
                        <Feather name="edit-2" size={10} color={colors.warning} />
                        <Text style={[styles.miniChipText, { color: colors.warning }]}>{pending} to sign</Text>
                      </View>
                    ) : (
                      <View style={[styles.miniChip, { backgroundColor: colors.successSoft }]}>
                        <Ionicons name="checkmark" size={11} color={colors.success} />
                        <Text style={[styles.miniChipText, { color: colors.success }]}>Signed</Text>
                      </View>
                    )
                  )}
                </View>
                <Text style={styles.weekMeta} numberOfLines={1}>
                  {s.classLabel}{s.weekStart ? `  •  ${fmtDate(s.weekStart, { day: 'numeric', month: 'short' })}` : ''}{s.teacherName ? `  •  ${s.teacherName}` : ''}
                </Text>
                {!!s.notes && <Text style={styles.weekNotes} numberOfLines={1}>"{s.notes}"</Text>}
                {totalSignable > 0 && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={styles.progressText}>{totalSigned}/{totalSignable}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        })
      )}

      {/* Helper */}
      <View style={styles.helperCard}>
        <View style={[styles.helperIcon, { backgroundColor: colors.purple + '1A' }]}>
          <Ionicons name="sparkles" size={16} color={colors.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.helperTitle}>How the Class Diary works</Text>
          <Text style={styles.helperText}>
            Each week your child's teacher publishes a diary covering Mon–Fri lessons plus a weekly summary.
            Open any week to see the lesson plan and daily comments — then sign right from the app.
          </Text>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

// ── Detail ───────────────────────────────────────────────────────────────────
const SessionDetail: React.FC<{
  styles: any; colors: ColorPalette; session: DiarySession; studentId: number;
  parentName: string; accessToken: string; onBack: () => void; onSigned: () => void;
}> = ({ styles, colors, session, studentId, parentName, accessToken, onBack, onSigned }) => {
  const [activeDay, setActiveDay] = useState(0);   // 0..4 days, 5 = weekly
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [comment, setComment] = useState('');
  const [signName, setSignName] = useState(parentName || '');
  const [busy, setBusy] = useState(false);
  const [signErr, setSignErr] = useState<string | null>(null);

  const isWeekly = activeDay === 5;
  const key = (idx: number) => (idx === 5 ? 'W' : `D${idx}`);
  const withOverride = <T extends object>(entry: T | null | undefined, idx: number): T | null => {
    const o = overrides[key(idx)];
    return o ? ({ ...(entry || {}), ...o } as T) : (entry ?? null);
  };

  const dayEntry = !isWeekly
    ? withOverride<DiaryDailyEntry>(session.dailyEntries.find((d) => d.dayIndex === activeDay), activeDay)
    : null;
  const weeklyEntry = withOverride<DiaryWeeklyEntry>(session.weeklyEntry, 5);
  const active: any = isWeekly ? weeklyEntry : dayEntry;
  const planForDay = !isWeekly ? session.planRows.filter((r) => r.dayIndex === activeDay) : [];

  const hasTeacher = !!active?.teacherComment;
  const parentSigned = !!active?.parentSignedAt;

  const submit = async () => {
    if (busy || !signName.trim()) return;
    setBusy(true); setSignErr(null);
    try {
      const saved: DiarySignResult = await signDiaryEntry(accessToken, studentId, {
        sessionId: session.id,
        scope: isWeekly ? 'WEEKLY' : 'DAILY',
        dayIndex: isWeekly ? undefined : activeDay,
        comment: comment.trim() || undefined,
        signature: signName.trim(),
      });
      setOverrides((prev) => ({
        ...prev,
        [key(activeDay)]: {
          parentComment: saved.parentComment ?? (comment.trim() || null),
          parentSign: saved.parentSign ?? signName.trim(),
          parentSignedAt: saved.parentSignedAt || new Date().toISOString(),
        },
      }));
      setComment('');
      onSigned();
    } catch (e) {
      setSignErr(e instanceof ApiError ? e.message : 'Could not save your signature.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backChip} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={15} color={colors.primary} />
          <Text style={styles.backChipText}>All weeks</Text>
        </TouchableOpacity>

        {/* Teacher header */}
        <View style={styles.teacherCard}>
          <View style={[styles.teacherAvatar, { backgroundColor: colors.primarySofter }]}>
            <Text style={styles.teacherInitials}>{session.teacherInitials || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teacherName}>{session.teacherName || 'Class teacher'}</Text>
            <Text style={styles.teacherSub}>{session.classLabel} · {session.weekLabel}</Text>
            {!!session.notes && <Text style={styles.teacherNotes}>"{session.notes}"</Text>}
          </View>
        </View>

        {/* Day tabs */}
        <View style={styles.dayTabs}>
          {DAY_LABELS.map((d, idx) => {
            const isActive = activeDay === idx;
            const e: any = idx < 5
              ? withOverride<DiaryDailyEntry>(session.dailyEntries.find((x) => x.dayIndex === idx), idx)
              : weeklyEntry;
            const hasContent = !!e?.teacherComment;
            const signed = !!e?.parentSignedAt;
            const dd = idx < 5 ? dayDate(session.weekStart, idx) : null;
            return (
              <TouchableOpacity key={idx} style={[styles.dayTab, isActive && { backgroundColor: colors.primarySofter }]} activeOpacity={0.7} onPress={() => { setActiveDay(idx); setComment(''); setSignErr(null); }}>
                <Text style={[styles.dayTabShort, { color: idx === 5 ? colors.purple : colors.textSecondary }, isActive && { color: colors.primary }]}>{d.short}</Text>
                {dd ? <Text style={[styles.dayTabDate, isActive && { color: colors.text }]}>{dd.getDate()}</Text> : <Text style={[styles.dayTabDate, isActive && { color: colors.text }]}>·</Text>}
                {hasContent && <View style={[styles.dayDot, { backgroundColor: signed ? colors.success : colors.warning }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Learning plan (days only) */}
        {!isWeekly && (
          <>
            <Text style={styles.sectionTitle}>Learning plan — {DAY_LABELS[activeDay].full}</Text>
            {planForDay.length === 0 ? (
              <View style={styles.subtleBox}><Text style={styles.subtleText}>No learning plan posted for this day.</Text></View>
            ) : (
              <View style={styles.planCard}>
                {planForDay.map((r, i) => (
                  <View key={r.rowIndex ?? i} style={[styles.planRow, i > 0 && styles.divider]}>
                    <Text style={styles.planNum}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planSubject}>{r.subject || '—'}</Text>
                      <Text style={styles.planMeta}>
                        {[r.book, r.exercise].filter(Boolean).join(' · ') || 'No details'}
                        {r.page ? `  ·  p.${r.page}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Teacher comment */}
        <Text style={styles.sectionTitle}>{isWeekly ? 'Weekly comment' : `${DAY_LABELS[activeDay].full} comment`} from teacher</Text>
        {hasTeacher ? (
          <View style={[styles.commentCard, { borderColor: colors.primary + '33', backgroundColor: colors.primarySofter }]}>
            <Text style={styles.commentText}>{active.teacherComment}</Text>
            {!!active.teacherSign && (
              <View style={[styles.signLine, { borderTopColor: colors.primary + '22' }]}>
                <MaterialCommunityIcons name="draw-pen" size={14} color={colors.primary} />
                <Text style={styles.signBy}>Signed by </Text>
                <Text style={styles.signName}>{active.teacherSign}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.subtleBox}><Text style={styles.subtleText}>Teacher hasn't commented for {isWeekly ? 'this week' : 'this day'} yet.</Text></View>
        )}

        {/* Parent response */}
        {hasTeacher && (
          <>
            <Text style={styles.sectionTitle}>Your response</Text>
            {parentSigned ? (
              <View style={[styles.commentCard, { borderColor: colors.success + '33', backgroundColor: colors.successSoft }]}>
                {!!active.parentComment && <Text style={styles.commentText}>{active.parentComment}</Text>}
                <View style={[styles.signLine, { borderTopColor: colors.success + '33', marginTop: active.parentComment ? 12 : 0, paddingTop: active.parentComment ? 12 : 0 }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.signBy}>Signed by </Text>
                  <Text style={styles.signName}>{active.parentSign}</Text>
                  <Text style={styles.signDate}>{active.parentSignedAt ? `  ·  ${fmtDate(active.parentSignedAt, { day: 'numeric', month: 'short' })}` : ''}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.signForm}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={isWeekly ? 'Add a note about the week (optional)…' : 'Add a note for the teacher (optional)…'}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={2000}
                  style={styles.textArea}
                />
                <View style={styles.signInputRow}>
                  <MaterialCommunityIcons name="draw-pen" size={16} color={colors.textTertiary} />
                  <TextInput
                    value={signName}
                    onChangeText={setSignName}
                    placeholder="Your name (signature)"
                    placeholderTextColor={colors.textTertiary}
                    maxLength={120}
                    style={styles.signInput}
                  />
                </View>
                {signErr && <Text style={styles.signErrText}>{signErr}</Text>}
                <TouchableOpacity
                  style={[styles.signBtn, (!signName.trim() || busy) && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                  disabled={!signName.trim() || busy}
                  onPress={submit}
                >
                  {busy ? <ActivityIndicator size="small" color="#FFF" /> : (
                    <>
                      <Ionicons name="checkmark" size={17} color="#FFF" />
                      <Text style={styles.signBtnText}>{isWeekly ? 'Sign the week' : 'Save & sign'}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.signHint}>Your signature and note are saved to the class diary and visible to the teacher.</Text>
              </View>
            )}
          </>
        )}

        {/* Day nav */}
        <View style={styles.navRow}>
          <TouchableOpacity disabled={activeDay === 0} style={styles.navBtn} onPress={() => setActiveDay(Math.max(0, activeDay - 1))}>
            <Ionicons name="chevron-back" size={16} color={activeDay === 0 ? colors.textTertiary : colors.primary} />
            <Text style={[styles.navText, activeDay === 0 && { color: colors.textTertiary }]}>Prev</Text>
          </TouchableOpacity>
          <Text style={styles.navCenter}>{isWeekly ? 'Weekly summary' : `Day ${activeDay + 1} of 5`}</Text>
          <TouchableOpacity disabled={activeDay === 5} style={styles.navBtn} onPress={() => setActiveDay(Math.min(5, activeDay + 1))}>
            <Text style={[styles.navText, activeDay === 5 && { color: colors.textTertiary }]}>Next</Text>
            <Ionicons name="chevron-forward" size={16} color={activeDay === 5 ? colors.textTertiary : colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Stat: React.FC<{ styles: any; value: string; label: string; sub: string; color: string }> = ({ styles, value, label, sub, color }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statSub}>{sub}</Text>
  </View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 14 },
    errorText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.danger },

    statsRow: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingVertical: 14, marginBottom: 14 },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontFamily: fonts.extrabold, letterSpacing: -0.5 },
    statLabel: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary, marginTop: 2 },
    statSub: { fontSize: 10, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 1 },
    statDivider: { width: 1, backgroundColor: c.border, marginVertical: 4 },

    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, height: 44, marginBottom: 16 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: c.text, paddingVertical: 0 },

    weekCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 13, marginBottom: 10 },
    weekBadge: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    weekBadgeKicker: { fontSize: 8, fontFamily: fonts.bold, color: '#FFF', letterSpacing: 1, opacity: 0.9, marginTop: 1 },
    weekBadgeNo: { fontSize: 18, fontFamily: fonts.extrabold, color: '#FFF', lineHeight: 20 },
    weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    weekTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2, flexShrink: 1 },
    miniChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    miniChipText: { fontSize: 10.5, fontFamily: fonts.bold },
    weekMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3 },
    weekNotes: { fontSize: 11.5, fontFamily: fonts.regular, fontStyle: 'italic', color: c.textSecondary, marginTop: 4 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
    progressTrack: { flex: 1, height: 5, borderRadius: 999, backgroundColor: c.backgroundAlt, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    progressText: { fontSize: 10.5, fontFamily: fonts.bold, color: c.textTertiary },

    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 30, alignItems: 'center', marginBottom: 14 },
    emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    helperCard: { flexDirection: 'row', gap: 12, backgroundColor: c.purple + '0D', borderRadius: 16, borderWidth: 1, borderColor: c.purple + '26', padding: 14, marginTop: 6 },
    helperIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    helperTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    helperText: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 4, lineHeight: 18 },

    backChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginBottom: 14 },
    backChipText: { fontSize: 13, fontFamily: fonts.bold, color: c.primary },

    teacherCard: { flexDirection: 'row', gap: 12, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 16 },
    teacherAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    teacherInitials: { fontSize: 15, fontFamily: fonts.extrabold, color: c.primary },
    teacherName: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text },
    teacherSub: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    teacherNotes: { fontSize: 12, fontFamily: fonts.regular, fontStyle: 'italic', color: c.textSecondary, marginTop: 6 },

    dayTabs: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 4, marginBottom: 18 },
    dayTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, position: 'relative' },
    dayTabShort: { fontSize: 10.5, fontFamily: fonts.bold, letterSpacing: 0.5 },
    dayTabDate: { fontSize: 13, fontFamily: fonts.bold, color: c.textTertiary, marginTop: 3 },
    dayDot: { position: 'absolute', top: 5, right: '30%', width: 6, height: 6, borderRadius: 3 },

    sectionTitle: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 10 },

    planCard: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 20 },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    planNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.backgroundAlt, textAlign: 'center', lineHeight: 22, fontSize: 11, fontFamily: fonts.bold, color: c.textSecondary },
    planSubject: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    planMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    subtleBox: { backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 16, marginBottom: 20, alignItems: 'center' },
    subtleText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center' },

    commentCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
    commentText: { fontSize: 13.5, fontFamily: fonts.regular, color: c.text, lineHeight: 20 },
    signLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    signBy: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary },
    signName: { fontSize: 11.5, fontFamily: fonts.bold, color: c.text },
    signDate: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary },

    signForm: { backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 20 },
    textArea: { minHeight: 74, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, padding: 12, fontSize: 13.5, fontFamily: fonts.regular, color: c.text, textAlignVertical: 'top' },
    signInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: 12, height: 46, marginTop: 10 },
    signInput: { flex: 1, fontSize: 13.5, fontFamily: fonts.medium, color: c.text, paddingVertical: 0 },
    signErrText: { fontSize: 12, fontFamily: fonts.medium, color: c.danger, marginTop: 8 },
    signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
    signBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },
    signHint: { fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 10, lineHeight: 16 },

    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 6 },
    navText: { fontSize: 13, fontFamily: fonts.bold, color: c.primary },
    navCenter: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textTertiary },
  });
}
