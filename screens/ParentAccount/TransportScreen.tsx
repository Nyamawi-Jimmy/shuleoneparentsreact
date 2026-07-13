// Transport — mobile-first redesign: a gradient route hero riding over the
// rose app bar with a live journey stepper (Awaiting pickup → On the bus →
// At school / Dropped off) driven by the child's real seat status, the live
// tracking CTA right inside the hero while the bus is moving, a timeline of
// recent trips, and the "not using the bus" flag flow with a date strip.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useTransport, useOptOuts } from '../../hooks/useTransport';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { getChildTransportTrips } from '../../api/transport';
import { TransportTrip, OptOut } from '../../api/transport.types';

const SEAT_LABEL: Record<string, string> = {
  PENDING: 'Awaiting pickup', BOARDED: 'On the bus', ARRIVED: 'Arrived at school',
  DROPPED: 'Dropped off', ABSENT: 'Marked absent', NOT_USING_TODAY: 'Not using today', LATE: 'Marked late',
};
const TRIP_LABEL: Record<string, string> = {
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'On the road', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};
const seatColor = (s: string | null | undefined, c: ColorPalette): string => {
  const k = String(s || '').toUpperCase();
  if (['BOARDED', 'ARRIVED', 'DROPPED'].includes(k)) return c.success;
  if (['PENDING', 'LATE'].includes(k)) return c.warning;
  if (k === 'ABSENT') return c.danger;
  return c.textTertiary;
};
const dirLabel = (d: string | null | undefined) => (d === 'PICKUP' || d === 'TO_SCHOOL' ? 'Morning' : d ? 'Evening' : '—');
const hhmm = (v?: string | null) => (v ? String(v).slice(11, 16) : '');
const todayIso = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const dateChips = (n = 14) => {
  const out: { iso: string; label: string; sub: string }[] = [];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-GB', { weekday: 'short' });
    out.push({ iso, label, sub: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
  }
  return out;
};

/** Today's journey as a 3-step progression, from the child's real seat status. */
const journeySteps = (seatStatus: string | null | undefined, direction: string | null | undefined) => {
  const morning = direction === 'PICKUP' || direction === 'TO_SCHOOL';
  const labels = morning
    ? ['Awaiting pickup', 'On the bus', 'At school']
    : ['Awaiting pickup', 'On the bus', 'Dropped off'];
  const k = String(seatStatus || '').toUpperCase();
  const reached = k === 'PENDING' || k === 'LATE' ? 0
    : k === 'BOARDED' ? 1
    : k === 'ARRIVED' || k === 'DROPPED' ? 2
    : -1; // absent / not using / unknown → no stepper
  return { labels, reached };
};

export const TransportScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { children, loading, refreshing, refresh, error } = useTransport();
  const { selectedChild } = useSelectedChild();
  const { accessToken } = useAuth();
  const { items: optOuts, submitOptOut, removeOptOut, refresh: refreshOptOuts } = useOptOuts();

  const transportChildren = children.filter((c) => c.studentId != null);
  const child = transportChildren.find((c) => c.studentId === selectedChild?.studentId) ?? transportChildren[0] ?? null;
  const live = child?.tripStatus === 'IN_PROGRESS';

  const [trips, setTrips] = useState<TransportTrip[]>([]);
  const [optDate, setOptDate] = useState(todayIso());
  const [optNote, setOptNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useFocusEffect(useCallback(() => {
    const sid = child?.studentId ?? null;
    if (!accessToken || sid == null) { setTrips([]); return; }
    getChildTransportTrips(accessToken, sid).then((t) => setTrips(Array.isArray(t) ? t : [])).catch(() => setTrips([]));
  }, [accessToken, child]));

  const upcoming = (child?.upcomingOptOuts?.length ? child.upcomingOptOuts : optOuts) as OptOut[];

  const flagDate = async () => {
    if (!optDate || saving) return;
    setSaving(true); setActionError('');
    try {
      await submitOptOut({ date: optDate, note: optNote || null });
      setOptNote('');
      refresh(); refreshOptOuts();
    } catch (e: any) {
      setActionError(e?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const { labels: stepLabels, reached } = journeySteps(child?.seatStatus, child?.tripDirection);
  const seatHex = seatColor(child?.seatStatus, colors);

  return (
    <View style={styles.root}>
      <GradientAppBar
        title="Transport"
        subtitle={child?.onTransport ? [child.routeName, child.vehiclePlate].filter(Boolean).join(' · ') : 'School bus & live tracking'}
        showBack
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {loading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : error ? (
            <View style={styles.errorBox}><Text style={[styles.errorText, { marginTop: 0 }]}>{error}</Text></View>
          ) : !child ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bus-school" size={30} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No transport info</Text>
              <Text style={styles.emptyText}>Select a child to see their school transport.</Text>
            </View>
          ) : !child.onTransport ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bus-school" size={30} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Not on school transport</Text>
              <Text style={styles.emptyText}>{child.studentName || 'This child'} has no active bus assignment. If that’s unexpected, contact the school’s transport office.</Text>
            </View>
          ) : (
            <>
              {/* ── Route hero — rides over the app bar ───────────────────── */}
              <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
                <View style={styles.heroTop}>
                  <View style={styles.busIcon}>
                    <MaterialCommunityIcons name="bus" size={24} color="#FFF" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.routeCode}>{child.routeCode || 'ROUTE'}</Text>
                    <Text style={styles.routeName} numberOfLines={1}>{child.routeName || 'School bus'}</Text>
                    <Text style={styles.routeMeta} numberOfLines={1}>
                      {child.pickupPointName || 'Pickup point —'}{child.vehiclePlate ? `  ·  ${child.vehiclePlate}` : ''}
                    </Text>
                  </View>
                  {live ? (
                    <View style={styles.livePill}>
                      <View style={styles.liveDotWhite} />
                      <Text style={styles.livePillText}>LIVE</Text>
                    </View>
                  ) : child.tripStatus ? (
                    <View style={styles.tripPill}>
                      <Text style={styles.tripPillText}>{TRIP_LABEL[child.tripStatus] || child.tripStatus}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Journey stepper — today's real progression */}
                {reached >= 0 ? (
                  <View style={styles.stepper}>
                    {stepLabels.map((label, i) => {
                      const done = i < reached;
                      const current = i === reached;
                      return (
                        <React.Fragment key={label}>
                          {i > 0 && <View style={[styles.stepLine, (done || current) && styles.stepLineOn]} />}
                          <View style={styles.step}>
                            <View style={[styles.stepDot, (done || current) && styles.stepDotOn, current && styles.stepDotCurrent]}>
                              {done
                                ? <Ionicons name="checkmark" size={11} color={colors.primaryDeep} />
                                : current
                                  ? <View style={styles.stepDotInner} />
                                  : null}
                            </View>
                            <Text style={[styles.stepLabel, (done || current) && styles.stepLabelOn]} numberOfLines={2}>{label}</Text>
                          </View>
                        </React.Fragment>
                      );
                    })}
                  </View>
                ) : child.seatStatus ? (
                  <View style={styles.seatNote}>
                    <Ionicons name="information-circle" size={14} color="#FFF" />
                    <Text style={styles.seatNoteText}>{SEAT_LABEL[child.seatStatus] || child.seatStatus}</Text>
                  </View>
                ) : (
                  <View style={styles.seatNote}>
                    <Ionicons name="time-outline" size={14} color="#FFF" />
                    <Text style={styles.seatNoteText}>No trip today yet — status appears when the school starts the trip.</Text>
                  </View>
                )}

                {/* Live tracking CTA lives right in the hero while the bus moves */}
                {live && (
                  child.trackingUrl ? (
                    <TouchableOpacity style={styles.trackBtn} activeOpacity={0.85} onPress={() => Linking.openURL(child.trackingUrl!)}>
                      <Ionicons name="navigate" size={16} color={colors.primaryDeep} />
                      <Text style={styles.trackBtnText}>Open live tracking</Text>
                      <Feather name="external-link" size={14} color={colors.primaryDeep} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.trackNote}>A live tracking link appears here as the bus nears your stop.</Text>
                  )
                )}
              </LinearGradient>

              {/* Today chips — direction + seat status at a glance */}
              <View style={styles.chipRow}>
                <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name={dirLabel(child.tripDirection) === 'Evening' ? 'moon-outline' : 'sunny-outline'} size={13} color={colors.textSecondary} />
                  <Text style={styles.infoChipText}>{child.tripDirection ? `${dirLabel(child.tripDirection)} trip` : 'No trip yet'}</Text>
                </View>
                {!!child.seatStatus && (
                  <View style={[styles.infoChip, { backgroundColor: seatHex + '14', borderColor: seatHex + '33' }]}>
                    <View style={[styles.seatDot, { backgroundColor: seatHex }]} />
                    <Text style={[styles.infoChipText, { color: seatHex }]}>{SEAT_LABEL[child.seatStatus] || child.seatStatus}</Text>
                  </View>
                )}
              </View>

              {/* Recent trips — timeline */}
              {trips.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recent trips</Text>
                  <View style={styles.card}>
                    {trips.map((r, i) => {
                      const times = [r.boardedAt && `Boarded ${hhmm(r.boardedAt)}`, r.arrivedAt && `arrived ${hhmm(r.arrivedAt)}`, r.droppedAt && `dropped ${hhmm(r.droppedAt)}`].filter(Boolean).join(' · ');
                      const morning = dirLabel(r.direction) === 'Morning';
                      return (
                        <View key={i} style={[styles.tripRow, i > 0 && styles.divider]}>
                          <View style={[styles.tripIcon, { backgroundColor: colors.primarySoft }]}>
                            <Ionicons name={morning ? 'sunny-outline' : 'moon-outline'} size={15} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.tripDate}>{String(r.tripDate).slice(0, 10)} · {dirLabel(r.direction)}</Text>
                            <Text style={styles.tripMeta} numberOfLines={1}>{[r.plateNo, times].filter(Boolean).join(' · ') || '—'}</Text>
                          </View>
                          <View style={[styles.miniChip, { backgroundColor: seatColor(r.seatStatus, colors) + '1A' }]}>
                            <Text style={[styles.miniChipText, { color: seatColor(r.seatStatus, colors) }]}>{SEAT_LABEL[String(r.seatStatus)] || r.seatStatus || '—'}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Not using transport */}
              <Text style={styles.sectionTitle}>Not using the bus?</Text>
              <View style={styles.card2}>
                <Text style={styles.optIntro}>Travelling separately on a given day? Flag it — the driver’s list updates and the bus won’t wait at your stop.</Text>
                {child.optedOutToday && (
                  <View style={styles.optBanner}>
                    <Ionicons name="information-circle" size={15} color={colors.warning} />
                    <Text style={styles.optBannerText}>Flagged as not using transport today.</Text>
                  </View>
                )}
                <Text style={styles.optLabel}>Pick a date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
                  {dateChips(14).map((d) => {
                    const active = d.iso === optDate;
                    return active ? (
                      <LinearGradient key={d.iso} colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.dateChip, { borderColor: 'transparent' }]}>
                        <Text style={[styles.dateChipLabel, { color: '#FFF' }]}>{d.label}</Text>
                        <Text style={[styles.dateChipSub, { color: 'rgba(255,255,255,0.85)' }]}>{d.sub}</Text>
                      </LinearGradient>
                    ) : (
                      <TouchableOpacity key={d.iso} style={styles.dateChip} activeOpacity={0.8} onPress={() => setOptDate(d.iso)}>
                        <Text style={styles.dateChipLabel}>{d.label}</Text>
                        <Text style={styles.dateChipSub}>{d.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TextInput
                  style={styles.optInput}
                  value={optNote}
                  onChangeText={setOptNote}
                  placeholder="Note (optional) — e.g. Doctor’s appointment"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={255}
                />
                {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}
                <TouchableOpacity activeOpacity={0.85} disabled={saving} onPress={flagDate}>
                  <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.flagBtn, saving && { opacity: 0.6 }]}>
                    {saving ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialCommunityIcons name="calendar-remove" size={16} color="#FFF" /><Text style={styles.flagBtnText}>Flag this date</Text></>}
                  </LinearGradient>
                </TouchableOpacity>

                {upcoming.length > 0 && (
                  <View style={styles.optList}>
                    {upcoming.map((o, i) => (
                      <View key={o.id ?? i} style={[styles.optRow, i > 0 && styles.divider]}>
                        <View style={[styles.tripIcon, { backgroundColor: colors.backgroundAlt }]}>
                          <MaterialCommunityIcons name="calendar-remove" size={14} color={colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optRowDate}>{o.date}</Text>
                          {!!o.note && <Text style={styles.optRowNote} numberOfLines={1}>{o.note}</Text>}
                        </View>
                        <TouchableOpacity hitSlop={8} onPress={() => o.id != null && removeOptOut(o.id)}>
                          <Text style={styles.optCancel}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16 },
    center: { padding: 44, alignItems: 'center' },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14, marginTop: 14 },
    errorText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.danger, marginTop: 8 },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 34, alignItems: 'center', marginTop: 14 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    // Route hero — gradient card riding over the app bar edge
    hero: {
      borderRadius: 22, padding: 16,
      marginTop: -20, marginBottom: 12,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25, shadowRadius: 18, elevation: 7,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    busIcon: {
      width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
    },
    routeCode: { fontSize: 10, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
    routeName: { fontSize: 17, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: -0.3, marginTop: 1 },
    routeMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
    livePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    },
    liveDotWhite: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
    livePillText: { fontSize: 10.5, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: 0.8 },
    tripPill: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    tripPillText: { fontSize: 10.5, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.9)' },

    // Journey stepper
    stepper: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
    step: { alignItems: 'center', width: 76 },
    stepDot: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center', justifyContent: 'center',
    },
    stepDotOn: { backgroundColor: '#FFF', borderColor: '#FFF' },
    stepDotCurrent: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: '#FFF' },
    stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
    stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 10, marginHorizontal: -14 },
    stepLineOn: { backgroundColor: '#FFF' },
    stepLabel: { fontSize: 9.5, fontFamily: fonts.semibold, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 6, lineHeight: 12 },
    stepLabelOn: { color: '#FFF', fontFamily: fonts.bold },

    seatNote: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 11, marginTop: 16,
    },
    seatNoteText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: '#FFF', lineHeight: 17 },

    trackBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, marginTop: 16,
    },
    trackBtnText: { fontSize: 13.5, fontFamily: fonts.extrabold, color: c.primaryDeep },
    trackNote: { fontSize: 11.5, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.85)', marginTop: 14, lineHeight: 16 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    infoChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7,
    },
    infoChipText: { fontSize: 12, fontFamily: fonts.bold, color: c.textSecondary },
    seatDot: { width: 7, height: 7, borderRadius: 4 },

    sectionTitle: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 22 },
    card2: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 22 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
    tripIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tripDate: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text },
    tripMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    miniChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    miniChipText: { fontSize: 10.5, fontFamily: fonts.bold },

    optIntro: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18 },
    optBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.warning + '1A', borderRadius: 10, padding: 10, marginTop: 12 },
    optBannerText: { fontSize: 12, fontFamily: fonts.semibold, color: c.warning, flex: 1 },
    optLabel: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary, marginTop: 14, marginBottom: 8 },
    dateStrip: { gap: 8, paddingBottom: 2 },
    dateChip: { alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minWidth: 58 },
    dateChipLabel: { fontSize: 12, fontFamily: fonts.bold, color: c.text },
    dateChipSub: { fontSize: 10, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    optInput: { borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.background, paddingHorizontal: 12, height: 46, fontSize: 13.5, fontFamily: fonts.regular, color: c.text, marginTop: 12 },
    flagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
    flagBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },
    optList: { marginTop: 14, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 4 },
    optRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
    optRowDate: { fontSize: 13, fontFamily: fonts.bold, color: c.text },
    optRowNote: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    optCancel: { fontSize: 12.5, fontFamily: fonts.bold, color: c.danger },
  });
}
