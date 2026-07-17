// Transport — quiet, blue-accented design (the bus color used across the
// app): a neutral route card riding over the app bar with a live journey
// stepper (Awaiting pickup → On the bus → At school / Dropped off) driven by
// the child's real seat status, the live tracking CTA inside the card while
// the bus is moving, recent trips, and the "not using the bus" flag flow.
// The brand color stays on the app bar only.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
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
import { DatePickerModal } from '../../components/DatePickerModal';

// Labels for a custom (calendar-picked) date chip.
const customChipLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { weekday: 'short' });
};
const customChipSub = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Transport's accent — the same bus blue used on Today's quick access & cards.
const BUS_BLUE = '#2563EB';

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
  const [calOpen, setCalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useFocusEffect(useCallback(() => {
    const sid = child?.studentId ?? null;
    if (!accessToken || sid == null) { setTrips([]); return; }
    getChildTransportTrips(accessToken, sid).then((t) => setTrips(Array.isArray(t) ? t : [])).catch(() => setTrips([]));
  }, [accessToken, child]));

  // Live poll (web parity: refresh every 30s while the screen is open) so the
  // journey stepper and seat status stay current without a manual pull.
  const pollRef = useRef({ refresh, accessToken, sid: child?.studentId ?? null });
  pollRef.current = { refresh, accessToken, sid: child?.studentId ?? null };
  useEffect(() => {
    const id = setInterval(() => {
      const { refresh: r, accessToken: tok, sid } = pollRef.current;
      r();
      if (tok && sid != null) getChildTransportTrips(tok, sid).then((t) => setTrips(Array.isArray(t) ? t : [])).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

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
              {/* ── Route card — neutral, blue-accented, rides over the app bar ── */}
              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <View style={styles.busIcon}>
                    <MaterialCommunityIcons name="bus" size={22} color={BUS_BLUE} />
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
                      <View style={styles.liveDot} />
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
                                ? <Ionicons name="checkmark" size={11} color="#FFF" />
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
                    <Ionicons name="information-circle" size={14} color={colors.textSecondary} />
                    <Text style={styles.seatNoteText}>{SEAT_LABEL[child.seatStatus] || child.seatStatus}</Text>
                  </View>
                ) : (
                  <View style={styles.seatNote}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.seatNoteText}>No trip today yet — status appears when the school starts the trip.</Text>
                  </View>
                )}

                {/* Live tracking CTA lives right in the hero while the bus moves */}
                {live && (
                  child.trackingUrl ? (
                    <TouchableOpacity style={styles.trackBtn} activeOpacity={0.85} onPress={() => Linking.openURL(child.trackingUrl!)}>
                      <Ionicons name="navigate" size={16} color="#FFF" />
                      <Text style={styles.trackBtnText}>Open live tracking</Text>
                      <Feather name="external-link" size={14} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.trackNote}>A live tracking link appears here as the bus nears your stop.</Text>
                  )
                )}
              </View>

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

              {/* ── Bus details — the vehicle & route info, key values in bold ── */}
              <SectionHead styles={styles} title="Bus details" />
              <View style={styles.card}>
                <DetailRow styles={styles} colors={colors} icon="bus" label="Bus"
                  value={child.vehiclePlate || 'Not assigned yet'} strong={!!child.vehiclePlate} />
                <DetailRow styles={styles} colors={colors} icon="map-marker-path" label="Route" divider strong
                  value={[child.routeCode, child.routeName].filter(Boolean).join(' · ') || 'School bus'} />
                <DetailRow styles={styles} colors={colors} icon="map-marker" label="Pickup point" divider strong
                  value={child.pickupPointName || 'Not set'} />
                <DetailRow styles={styles} colors={colors} icon="seat-passenger" label="Today" divider
                  value={child.seatStatus ? (SEAT_LABEL[child.seatStatus] || child.seatStatus) : 'No status yet'}
                  valueColor={child.seatStatus ? seatHex : undefined} strong={!!child.seatStatus} />
              </View>

              {/* Recent trips — timeline */}
              {trips.length > 0 && (
                <>
                  <SectionHead styles={styles} title="Recent trips" />
                  <View style={styles.card}>
                    {trips.map((r, i) => {
                      const times = [r.boardedAt && `Boarded ${hhmm(r.boardedAt)}`, r.arrivedAt && `arrived ${hhmm(r.arrivedAt)}`, r.droppedAt && `dropped ${hhmm(r.droppedAt)}`].filter(Boolean).join(' · ');
                      const morning = dirLabel(r.direction) === 'Morning';
                      return (
                        <View key={i} style={[styles.tripRow, i > 0 && styles.divider]}>
                          <View style={[styles.tripIcon, { backgroundColor: morning ? colors.warningSoft : colors.infoSoft }]}>
                            <Ionicons name={morning ? 'sunny-outline' : 'moon-outline'} size={15} color={morning ? colors.warning : colors.info} />
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
              <SectionHead styles={styles} title="Not using the bus?" />
              <View style={styles.card2}>
                <Text style={styles.optIntro}>Travelling separately on a given day? Flag it — the driver’s list updates and the bus won’t wait at your stop.</Text>
                {child.optedOutToday && (
                  <View style={styles.optBanner}>
                    <Ionicons name="information-circle" size={15} color={colors.warning} />
                    <Text style={styles.optBannerText}>Flagged as not using transport today.</Text>
                  </View>
                )}
                <View style={styles.optLabelRow}>
                  <Text style={styles.optLabel}>Pick a date</Text>
                  {/* Always-visible calendar button — pick ANY future day */}
                  <TouchableOpacity style={styles.pickDateBtn} activeOpacity={0.85} onPress={() => setCalOpen(true)}>
                    <Ionicons name="calendar-outline" size={14} color={BUS_BLUE} />
                    <Text style={styles.pickDateBtnText}>Choose date</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
                  {(() => {
                    const chips = dateChips(14);
                    const isCustom = !!optDate && !chips.some((d) => d.iso === optDate);
                    return (
                      <>
                        {isCustom && (
                          <View style={[styles.dateChip, { borderColor: BUS_BLUE, backgroundColor: BUS_BLUE + '14' }]}>
                            <Text style={[styles.dateChipLabel, { color: BUS_BLUE }]}>{customChipLabel(optDate)}</Text>
                            <Text style={[styles.dateChipSub, { color: BUS_BLUE }]}>{customChipSub(optDate)}</Text>
                          </View>
                        )}
                        {chips.map((d) => {
                          const active = d.iso === optDate;
                          return active ? (
                            <View key={d.iso} style={[styles.dateChip, { borderColor: BUS_BLUE, backgroundColor: BUS_BLUE + '14' }]}>
                              <Text style={[styles.dateChipLabel, { color: BUS_BLUE }]}>{d.label}</Text>
                              <Text style={[styles.dateChipSub, { color: BUS_BLUE }]}>{d.sub}</Text>
                            </View>
                          ) : (
                            <TouchableOpacity key={d.iso} style={styles.dateChip} activeOpacity={0.8} onPress={() => setOptDate(d.iso)}>
                              <Text style={styles.dateChipLabel}>{d.label}</Text>
                              <Text style={styles.dateChipSub}>{d.sub}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </>
                    );
                  })()}
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
                <TouchableOpacity activeOpacity={0.85} disabled={saving} onPress={flagDate}
                  style={[styles.flagBtn, { backgroundColor: colors.text }, saving && { opacity: 0.6 }]}>
                  {saving ? <ActivityIndicator size="small" color={colors.card} /> : <><MaterialCommunityIcons name="calendar-remove" size={16} color={colors.card} /><Text style={[styles.flagBtnText, { color: colors.card }]}>Flag this date</Text></>}
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

      <DatePickerModal
        visible={calOpen}
        onClose={() => setCalOpen(false)}
        selected={optDate}
        minIso={todayIso()}
        accent={BUS_BLUE}
        onSelect={(iso) => setOptDate(iso)}
      />
    </View>
  );
};

// Section heading with a small bus-blue accent bar — a cleaner, more modern
// hierarchy than a bare title.
const SectionHead: React.FC<{ styles: any; title: string }> = ({ styles, title }) => (
  <View style={styles.sectionHead}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

// One labelled bus-detail row; `strong` renders the value bold (the required
// items — bus plate, route, pickup — stand out).
const DetailRow: React.FC<{
  styles: any; colors: ColorPalette; icon: any; label: string; value: string;
  strong?: boolean; divider?: boolean; valueColor?: string;
}> = ({ styles, colors, icon, label, value, strong, divider, valueColor }) => (
  <View style={[styles.detailRow, divider && styles.divider]}>
    <View style={styles.detailIcon}>
      <MaterialCommunityIcons name={icon} size={17} color={BUS_BLUE} />
    </View>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, strong && styles.detailValueStrong, valueColor ? { color: valueColor } : null]}
      numberOfLines={1}>
      {value}
    </Text>
  </View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
    center: { padding: 44, alignItems: 'center' },

    errorBox: { backgroundColor: c.dangerSoft, borderRadius: 12, padding: 14, marginTop: 14 },
    errorText: { fontSize: 12.5, fontFamily: fonts.medium, color: c.danger, marginTop: 8 },
    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 34, alignItems: 'center', marginTop: 14 },
    emptyTitle: { fontSize: 15.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 19 },

    // Route card — neutral surface riding over the app bar edge, blue accents
    hero: {
      backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 12,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    busIcon: {
      width: 46, height: 46, borderRadius: 14, backgroundColor: BUS_BLUE + '14',
      alignItems: 'center', justifyContent: 'center',
    },
    routeCode: { fontSize: 10, fontFamily: fonts.bold, color: BUS_BLUE, letterSpacing: 1 },
    routeName: { fontSize: 16.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginTop: 1 },
    routeMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3 },
    livePill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.successSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.success },
    livePillText: { fontSize: 10.5, fontFamily: fonts.extrabold, color: c.success, letterSpacing: 0.8 },
    tripPill: { backgroundColor: c.backgroundAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    tripPillText: { fontSize: 10.5, fontFamily: fonts.bold, color: c.textSecondary },

    // Journey stepper — blue for progress, neutral for the rest
    stepper: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18 },
    step: { alignItems: 'center', width: 76 },
    stepDot: {
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: c.border, backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    stepDotOn: { backgroundColor: BUS_BLUE, borderColor: BUS_BLUE },
    stepDotCurrent: { backgroundColor: BUS_BLUE + '1F', borderColor: BUS_BLUE },
    stepDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: BUS_BLUE },
    stepLine: { flex: 1, height: 2, backgroundColor: c.border, marginTop: 10, marginHorizontal: -14 },
    stepLineOn: { backgroundColor: BUS_BLUE },
    stepLabel: { fontSize: 9.5, fontFamily: fonts.semibold, color: c.textTertiary, textAlign: 'center', marginTop: 6, lineHeight: 12 },
    stepLabelOn: { color: c.text, fontFamily: fonts.bold },

    seatNote: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 11, marginTop: 16,
    },
    seatNoteText: { flex: 1, fontSize: 12, fontFamily: fonts.semibold, color: c.textSecondary, lineHeight: 17 },

    trackBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: BUS_BLUE, borderRadius: 12, paddingVertical: 12, marginTop: 16,
    },
    trackBtnText: { fontSize: 13.5, fontFamily: fonts.extrabold, color: '#FFF' },
    trackNote: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 14, lineHeight: 16 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    infoChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7,
    },
    infoChipText: { fontSize: 12, fontFamily: fonts.bold, color: c.textSecondary },
    seatDot: { width: 7, height: 7, borderRadius: 4 },

    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 2 },
    sectionAccent: { width: 3, height: 15, borderRadius: 2, backgroundColor: BUS_BLUE },
    sectionTitle: { fontSize: 14.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    card: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, marginBottom: 22,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },

    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
    detailIcon: {
      width: 32, height: 32, borderRadius: 10, backgroundColor: BUS_BLUE + '14',
      alignItems: 'center', justifyContent: 'center',
    },
    detailLabel: { fontSize: 12.5, fontFamily: fonts.medium, color: c.textSecondary },
    detailValue: { flex: 1, textAlign: 'right', fontSize: 13, fontFamily: fonts.regular, color: c.text },
    detailValueStrong: { fontFamily: fonts.extrabold, fontSize: 13.5, letterSpacing: -0.2 },
    card2: {
      backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 22,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
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
    optLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
    optLabel: { fontSize: 11.5, fontFamily: fonts.bold, color: c.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
    pickDateBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: BUS_BLUE + '12', borderRadius: 999,
      paddingHorizontal: 12, paddingVertical: 7,
    },
    pickDateBtnText: { fontSize: 12, fontFamily: fonts.bold, color: BUS_BLUE },
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
