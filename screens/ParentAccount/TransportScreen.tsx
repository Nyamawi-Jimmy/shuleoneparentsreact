import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
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

  const studentId = child?.studentId ?? null;
  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) { setTrips([]); return; }
    getChildTransportTrips(accessToken, studentId).then((t) => setTrips(Array.isArray(t) ? t : [])).catch(() => setTrips([]));
  }, [accessToken, studentId]));

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

  return (
    <View style={styles.root}>
      <ParentHeader title="Transport" showBack rightIcon="none" />
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
              <Text style={styles.emptyText}>{child.studentName || 'This child'} has no active bus assignment. If that's unexpected, contact the school's transport office.</Text>
            </View>
          ) : (
            <>
              {/* Route hero */}
              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <View style={[styles.busIcon, { backgroundColor: colors.primarySofter }]}>
                    <MaterialCommunityIcons name="bus" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.routeCode}>{child.routeCode || 'ROUTE'}</Text>
                    <Text style={styles.routeName} numberOfLines={1}>{child.routeName || 'School bus'}</Text>
                  </View>
                </View>
                <View style={styles.heroMeta}>
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.heroMetaText} numberOfLines={1}>{child.pickupPointName || 'Pickup point —'}</Text>
                  </View>
                  {!!child.vehiclePlate && (
                    <View style={styles.heroMetaItem}>
                      <MaterialCommunityIcons name="card-text-outline" size={14} color={colors.textTertiary} />
                      <Text style={styles.heroMetaText}>{child.vehiclePlate}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.heroChips}>
                  {child.tripStatus ? (
                    <View style={[styles.chip, { backgroundColor: live ? colors.successSoft : colors.backgroundAlt }]}>
                      {live && <View style={[styles.liveDot, { backgroundColor: colors.success }]} />}
                      <Text style={[styles.chipText, { color: live ? colors.success : colors.textSecondary }]}>
                        {TRIP_LABEL[child.tripStatus] || child.tripStatus}{child.tripDirection ? ` · ${dirLabel(child.tripDirection)}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.chip, { backgroundColor: colors.backgroundAlt }]}><Text style={[styles.chipText, { color: colors.textSecondary }]}>No trip today yet</Text></View>
                  )}
                  {!!child.seatStatus && (
                    <View style={[styles.chip, { backgroundColor: seatColor(child.seatStatus, colors) + '1A' }]}>
                      <Text style={[styles.chipText, { color: seatColor(child.seatStatus, colors) }]}>{SEAT_LABEL[child.seatStatus] || child.seatStatus}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Status tiles */}
              <View style={styles.tileRow}>
                <StatTile styles={styles} label="Today" value={child.seatStatus ? (SEAT_LABEL[child.seatStatus] || child.seatStatus) : 'No status'} color={seatColor(child.seatStatus, colors)} />
                <StatTile styles={styles} label="Trip" value={child.tripStatus ? (TRIP_LABEL[child.tripStatus] || child.tripStatus) : 'None yet'} />
              </View>
              <View style={styles.tileRow}>
                <StatTile styles={styles} label="Direction" value={child.tripDirection ? dirLabel(child.tripDirection) : '—'} />
                <StatTile styles={styles} label="Bus" value={child.vehiclePlate || '—'} />
              </View>

              {/* Live tracking / parked */}
              {live ? (
                <View style={styles.trackCard}>
                  <View style={styles.trackHead}>
                    <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.trackTitle}>Bus is on the road</Text>
                  </View>
                  {child.trackingUrl ? (
                    <TouchableOpacity style={styles.trackBtn} activeOpacity={0.85} onPress={() => Linking.openURL(child.trackingUrl!)}>
                      <Ionicons name="navigate" size={16} color="#FFF" />
                      <Text style={styles.trackBtnText}>Open live tracking</Text>
                      <Feather name="external-link" size={14} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.trackNote}>A live tracking link is sent when the trip nears your stop — it will also appear here.</Text>
                  )}
                </View>
              ) : (
                <View style={styles.parkedCard}>
                  <MaterialCommunityIcons name="bus-stop" size={30} color={colors.textTertiary} />
                  <Text style={styles.parkedTitle}>The bus is parked{child.routeName ? ` on the ${child.routeName} route` : ''}</Text>
                  <Text style={styles.parkedText}>
                    {child.tripStatus ? 'No trip is on the road right now. Live tracking takes over this space while the bus is moving.'
                      : 'No trip scheduled yet today. Live tracking and status appear here once the school starts the trip.'}
                  </Text>
                </View>
              )}

              {/* Recent trips */}
              {trips.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Recent trips</Text>
                  <View style={styles.card}>
                    {trips.map((r, i) => {
                      const times = [r.boardedAt && `boarded ${hhmm(r.boardedAt)}`, r.arrivedAt && `arrived ${hhmm(r.arrivedAt)}`, r.droppedAt && `dropped ${hhmm(r.droppedAt)}`].filter(Boolean).join(' · ');
                      return (
                        <View key={i} style={[styles.tripRow, i > 0 && styles.divider]}>
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
              <Text style={styles.sectionTitle}>Not using transport</Text>
              <View style={styles.card2}>
                <Text style={styles.optIntro}>Travelling separately on a given day? Flag it — the driver's list updates and the bus won't wait at your stop.</Text>
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
                    return (
                      <TouchableOpacity key={d.iso} style={[styles.dateChip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]} activeOpacity={0.8} onPress={() => setOptDate(d.iso)}>
                        <Text style={[styles.dateChipLabel, active && { color: '#FFF' }]}>{d.label}</Text>
                        <Text style={[styles.dateChipSub, active && { color: 'rgba(255,255,255,0.85)' }]}>{d.sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TextInput
                  style={styles.optInput}
                  value={optNote}
                  onChangeText={setOptNote}
                  placeholder="Note (optional) — e.g. Doctor's appointment"
                  placeholderTextColor={colors.textTertiary}
                  maxLength={255}
                />
                {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}
                <TouchableOpacity style={[styles.flagBtn, saving && { opacity: 0.6 }]} activeOpacity={0.85} disabled={saving} onPress={flagDate}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <><MaterialCommunityIcons name="calendar-remove" size={16} color="#FFF" /><Text style={styles.flagBtnText}>Flag this date</Text></>}
                </TouchableOpacity>

                {upcoming.length > 0 && (
                  <View style={styles.optList}>
                    {upcoming.map((o, i) => (
                      <View key={o.id ?? i} style={[styles.optRow, i > 0 && styles.divider]}>
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

const StatTile: React.FC<{ styles: any; label: string; value: string; color?: string }> = ({ styles, label, value, color }) => (
  <View style={styles.statTile}>
    <Text style={styles.statTileLabel}>{label}</Text>
    <Text style={[styles.statTileValue, color ? { color } : null]} numberOfLines={1}>{value}</Text>
  </View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 8 },
    center: { padding: 44, alignItems: 'center' },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14, marginTop: 8 },
    errorText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.danger, marginTop: 8 },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 34, alignItems: 'center', marginTop: 8 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    hero: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 14 },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    busIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    routeCode: { fontSize: 10.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 1 },
    routeName: { fontSize: 17, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginTop: 1 },
    heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
    heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    heroMetaText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
    chipText: { fontSize: 12, fontFamily: fonts.bold },
    liveDot: { width: 7, height: 7, borderRadius: 4 },

    tileRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statTile: { flex: 1, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 13 },
    statTileLabel: { fontSize: 11, fontFamily: fonts.medium, color: c.textTertiary },
    statTileValue: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, marginTop: 4 },

    trackCard: { backgroundColor: c.successSoft, borderRadius: 16, padding: 16, marginTop: 10, marginBottom: 20 },
    trackHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    trackTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text },
    trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13 },
    trackBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },
    trackNote: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18 },

    parkedCard: { backgroundColor: c.backgroundAlt, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 24, marginTop: 10, marginBottom: 20, alignItems: 'center' },
    parkedTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, marginTop: 12, textAlign: 'center' },
    parkedText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 18 },

    sectionTitle: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 22 },
    card2: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 22 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
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
    flagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
    flagBtnText: { color: '#FFF', fontSize: 14, fontFamily: fonts.bold },
    optList: { marginTop: 14, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 4 },
    optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
    optRowDate: { fontSize: 13, fontFamily: fonts.bold, color: c.text },
    optRowNote: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    optCancel: { fontSize: 12.5, fontFamily: fonts.bold, color: c.danger },
  });
}
