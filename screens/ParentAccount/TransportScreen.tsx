import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal, TextInput, Alert, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useTransport, useOptOuts } from '../../hooks/useTransport';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { ChildTransport } from '../../api/transport.types';

export const TransportScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { children, loading, refreshing, refresh, error } = useTransport();
  const { selectedChild, selectChild } = useSelectedChild();

  const transportChildren = children.filter((c) => c.studentId != null);
  const active = transportChildren.find((c) => c.studentId === selectedChild?.studentId)
    ?? transportChildren[0] ?? null;

  const [optOutOpen, setOptOutOpen] = useState(false);

  return (
    <View style={styles.safe}>
      <ParentHeader title="Transport" showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={refresh}><Text style={styles.retryInline}>Retry</Text></TouchableOpacity>
          </View>
        )}

        {!loading && !error && transportChildren.length === 0 && (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bus" size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No transport routes</Text>
            <Text style={styles.emptyText}>None of your children are currently on a school transport route.</Text>
          </View>
        )}

        {transportChildren.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {transportChildren.map((c) => {
              const isActive = c.studentId === active?.studentId;
              return (
                <TouchableOpacity
                  key={c.studentId}
                  activeOpacity={0.85}
                  onPress={() => c.studentId != null && selectChild(c.studentId)}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {firstName(c.studentName)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {!loading && active && (
          <TransportCard
            colors={colors} styles={styles}
            child={active}
            onOpenTracking={() => active.trackingUrl && Linking.openURL(active.trackingUrl)}
            onOptOut={() => setOptOutOpen(true)}
          />
        )}

        {!loading && active?.studentId && <OptOutSection colors={colors} styles={styles} />}

        <View style={{ height: 40 }} />
      </ScrollView>

      {active?.studentId && (
        <OptOutModal
          colors={colors} styles={styles}
          visible={optOutOpen}
          onClose={() => setOptOutOpen(false)}
          studentId={active.studentId}
          studentName={active.studentName ?? 'child'}
        />
      )}
    </View>
  );
};

const TransportCard: React.FC<{
  child: ChildTransport; onOpenTracking: () => void; onOptOut: () => void;
  colors: ColorPalette; styles: any;
}> = ({ child, onOpenTracking, onOptOut, colors, styles }) => {
  const tripStatus = (child.tripStatus ?? '').toUpperCase();
  const inProgress = tripStatus === 'IN_PROGRESS';
  const direction = (child.tripDirection ?? '').toUpperCase();

  return (
    <View style={styles.card}>
      <View style={[
        styles.statusBanner,
        inProgress && styles.statusBannerLive,
        child.optedOutToday && styles.statusBannerOptedOut,
      ]}>
        <View style={styles.statusIconWrap}>
          <MaterialCommunityIcons
            name={child.optedOutToday ? 'bus-stop' : 'bus'}
            size={20}
            color={child.optedOutToday ? colors.warning : (inProgress ? colors.success : colors.primary)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>
            {child.optedOutToday ? 'Opted out today'
              : inProgress ? `On bus — ${direction === 'TO_SCHOOL' ? 'heading to school' : 'heading home'}`
              : tripStatus === 'COMPLETED' ? 'Trip completed'
              : tripStatus === 'SCHEDULED' ? 'Scheduled'
              : (child.onTransport ? 'On transport' : 'Not on transport')}
          </Text>
          <Text style={styles.statusSubtitle}>{child.studentName ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoCell colors={colors} styles={styles} icon="map-marker-path" label="Route" value={child.routeName ?? child.routeCode ?? '—'} />
        <InfoCell colors={colors} styles={styles} icon="map-marker" label="Pickup" value={child.pickupPointName ?? '—'} />
        <InfoCell colors={colors} styles={styles} icon="bus" label="Vehicle" value={child.vehiclePlate ?? '—'} />
        <InfoCell colors={colors} styles={styles} icon="seat" label="Seat" value={prettySeatStatus(child.seatStatus)} />
      </View>

      <View style={styles.actions}>
        {child.trackingUrl && inProgress && (
          <TouchableOpacity activeOpacity={0.85} style={styles.primaryBtn} onPress={onOpenTracking}>
            <Feather name="map-pin" size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>Track bus</Text>
          </TouchableOpacity>
        )}
        {!child.optedOutToday && (
          <TouchableOpacity activeOpacity={0.85} style={styles.secondaryBtn} onPress={onOptOut}>
            <Feather name="x-circle" size={14} color={colors.warning} />
            <Text style={styles.secondaryBtnText}>Opt out for a day</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const InfoCell: React.FC<{ icon: any; label: string; value: string; colors: ColorPalette; styles: any }> = ({ icon, label, value, colors, styles }) => (
  <View style={styles.infoCell}>
    <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
    <View style={{ flex: 1, marginLeft: 8 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const OptOutSection: React.FC<{ colors: ColorPalette; styles: any }> = ({ colors, styles }) => {
  const { items, loading, removeOptOut } = useOptOuts();
  if (loading || items.length === 0) return null;

  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.sectionTitle}>UPCOMING OPT-OUTS</Text>
      <View style={styles.optOutsCard}>
        {items.map((o, idx) => (
          <View key={o.id ?? idx} style={[styles.optOutRow, idx < items.length - 1 && styles.optOutRowDivider]}>
            <View style={styles.optOutDateBox}>
              <Text style={styles.optOutDay}>{formatDay(o.date)}</Text>
              <Text style={styles.optOutMonth}>{formatMonth(o.date)}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.optOutDate}>{formatFullDate(o.date)}</Text>
              {!!o.note && <Text style={styles.optOutNote} numberOfLines={2}>{o.note}</Text>}
            </View>
            <TouchableOpacity
              hitSlop={6}
              onPress={() => {
                if (!o.id) return;
                Alert.alert('Cancel opt-out?', `Your child will be expected on the bus on ${formatFullDate(o.date)}.`, [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Cancel opt-out', style: 'destructive', onPress: () => removeOptOut(o.id!) },
                ]);
              }}
              style={styles.cancelOptOutBtn}
            >
              <Feather name="x" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const OptOutModal: React.FC<{
  colors: ColorPalette; styles: any;
  visible: boolean; onClose: () => void;
  studentId: number; studentName: string;
}> = ({ colors, styles, visible, onClose, studentId, studentName }) => {
  const { submitOptOut } = useOptOuts();
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Invalid date', 'Use YYYY-MM-DD format.'); return; }
    setSubmitting(true);
    try {
      await submitOptOut({ date, note: note || null });
      setNote(''); onClose();
    } catch (e: any) { Alert.alert('Could not opt out', e?.message ?? 'Please try again.'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Opt out of transport</Text>
          <TouchableOpacity hitSlop={8} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 18, flex: 1 }}>
          <Text style={styles.sheetSubtitle}>Let the bus team know {studentName} won't need transport on this day.</Text>

          <Text style={styles.label}>Date</Text>
          <View style={styles.inputWrap}>
            <Feather name="calendar" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Reason (optional)</Text>
          <View style={[styles.inputWrap, { alignItems: 'flex-start' }]}>
            <TextInput
              style={[styles.input, { paddingTop: 12, minHeight: 80 }]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Doctor's appointment"
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={300}
            />
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity activeOpacity={0.85} onPress={handleSubmit} disabled={submitting}
            style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit opt-out'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function firstName(name: string | null): string {
  if (!name) return '?';
  return name.split(/\s+/)[0] ?? name;
}
function prettySeatStatus(s: string | null): string {
  if (!s) return '—';
  const u = s.toUpperCase();
  if (u === 'ASSIGNED') return 'Assigned';
  if (u === 'UNASSIGNED') return 'Unassigned';
  return s;
}
function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function formatFullDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}
function formatDay(iso: string | null): string {
  if (!iso) return '—';
  try { return String(new Date(iso).getDate()).padStart(2, '0'); } catch { return ''; }
}
function formatMonth(iso: string | null): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(); } catch { return ''; }
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.backgroundAlt },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    loadingText: { fontSize: 11.5, color: c.textSecondary, marginTop: 8, fontWeight: '500' },
    emptyIconCircle: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: c.card, alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, borderWidth: 1, borderColor: c.border,
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    emptyText: { fontSize: 11.5, color: c.textSecondary, marginTop: 6, textAlign: 'center' },

    errorBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.dangerSoft, borderRadius: 12,
      padding: 12, marginBottom: 12,
    },
    errorBannerText: { flex: 1, color: c.danger, fontSize: 12.5, fontWeight: '700' },
    retryInline: { color: c.danger, fontWeight: '800', fontSize: 13 },

    chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 12, paddingTop: 4 },
    chip: {
      backgroundColor: c.card, borderRadius: 999,
      paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 12.5, fontWeight: '700', color: c.textSecondary },
    chipTextActive: { color: '#fff' },

    card: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, padding: 12,
    },
    statusBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.primarySoft,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 12,
    },
    statusBannerLive: { backgroundColor: c.successSoft },
    statusBannerOptedOut: { backgroundColor: c.warningSoft },
    statusIconWrap: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    statusTitle: { fontSize: 13.5, fontWeight: '700', color: c.text },
    statusSubtitle: { fontSize: 11.5, color: c.textSecondary, marginTop: 1 },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    infoCell: { flexDirection: 'row', alignItems: 'center', width: '50%', paddingHorizontal: 6, marginBottom: 12 },
    infoLabel: { fontSize: 10, color: c.textSecondary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    infoValue: { fontSize: 13, fontWeight: '700', color: c.text, marginTop: 2 },

    actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    primaryBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.primary, paddingVertical: 11, borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    secondaryBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: c.warningSoft, paddingVertical: 11, borderRadius: 12,
    },
    secondaryBtnText: { color: c.warning, fontWeight: '800', fontSize: 13 },

    sectionTitle: {
      fontSize: 11.5, fontWeight: '800', color: c.primary,
      letterSpacing: 0.6, marginBottom: 8, marginLeft: 2,
    },
    optOutsCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    optOutRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    optOutRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    optOutDateBox: {
      width: 44, height: 50, borderRadius: 8,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    optOutDay: { fontSize: 17, fontWeight: '800', color: c.primary, lineHeight: 22 },
    optOutMonth: { fontSize: 9.5, fontWeight: '800', color: c.primary, letterSpacing: 0.5 },
    optOutDate: { fontSize: 13.5, fontWeight: '700', color: c.text },
    optOutNote: { fontSize: 11.5, color: c.textSecondary, marginTop: 2 },
    cancelOptOutBtn: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.backgroundAlt,
      alignItems: 'center', justifyContent: 'center',
    },

    sheetHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12,
      backgroundColor: c.background,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    sheetSubtitle: { fontSize: 13.5, color: c.textSecondary, marginBottom: 18, lineHeight: 20 },
    label: { fontSize: 11.5, fontWeight: '700', color: c.textSecondary, marginBottom: 6 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12, borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 12,
    },
    input: { flex: 1, fontSize: 13.5, color: c.text, paddingVertical: 12 },
  });
}
