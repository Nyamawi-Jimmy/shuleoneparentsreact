// Fees — mobile-first redesign (deliberately different from the web page's
// tabbed layout): one scrolling story in the brand theme —
//   1. Balance hero riding over the app bar: paid-% donut, outstanding
//      balance, Billed / Paid / B-Forward strip and the M-Pesa pay button.
//   2. Statements — term and whole-history downloads as two separate tiles,
//      each with its own progress state (they download independently).
//   3. Ledger — the fee statement entries, first few visible, "Show all"
//      expands the rest. Credits pull green pills, charges neutral.
//   4. Payments — M-Pesa receipts made from this app + how-to-pay card.

import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useChildFees } from '../../hooks/useChildFees';
import {
  moneyToNumber, FeePayment, PaymentOptions, isPaymentSuccess, isPaymentFailed,
} from '../../api/fees.types';
import {
  buildStatementPdfUrl, getChildFeePayments, getPaymentOptions,
} from '../../api/fees';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useAuth } from '../../context/AuthContext';
import { downloadAuthFile } from '../../utils/downloadAuthFile';
import { FeePaymentSheet } from '../../components/FeePaymentSheet';

const ksh = (n: number): string => `KSh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-KE')}`;
const fmtDate = (s?: string | null): string => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const LEDGER_PREVIEW = 6;

export const FinanceScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { summary, statement, refreshing, refresh, loading, error, isFromBackend } = useChildFees();
  const { selectedChild } = useSelectedChild();
  const { parent } = useParentProfile();
  const { accessToken } = useAuth();

  const [payOpen, setPayOpen] = useState(false);
  // Which statement is downloading — 'term' and 'all' are independent, so
  // tapping one never shows progress (or blocks) the other.
  const [downloading, setDownloading] = useState<'term' | 'all' | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [allLines, setAllLines] = useState(false);

  const studentId = selectedChild?.studentId ?? null;

  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) return;
    getChildFeePayments(accessToken, studentId).then(setPayments).catch(() => setPayments([]));
    getPaymentOptions(accessToken, studentId).then(setOptions).catch(() => setOptions(null));
  }, [accessToken, studentId]));

  const balance = moneyToNumber(summary?.balance ?? null);
  const broughtForward = moneyToNumber(summary?.broughtForward ?? null);
  const termBilling = moneyToNumber(summary?.termBilling ?? null);
  const paid = moneyToNumber(summary?.paid ?? null);
  const billed = broughtForward + termBilling;
  const pctPaid = billed > 0 ? Math.round((paid / billed) * 100) : (balance <= 0 ? 100 : 0);
  const mpesaEnabled = options?.mpesaStkEnabled !== false;

  const subtitle = loading
    ? 'Loading fees…'
    : error
      ? 'Balance unavailable right now'
      : isFromBackend && summary?.admNo
        ? `Live balance · ${summary.admNo}${summary.studentName ? ` · ${summary.studentName}` : ''}`
        : 'Fee balance from the school';

  const lines = statement?.lines ?? [];
  const visibleLines = allLines ? lines : lines.slice(0, LEDGER_PREVIEW);
  const successPayments = payments.filter((p) => isPaymentSuccess(p.status));

  const downloadStatement = async (kind: 'term' | 'all') => {
    if (!studentId || !accessToken || downloading === kind) return;
    setDownloading(kind);
    const slug = (selectedChild?.fullName || 'student').replace(/\s+/g, '-');
    await downloadAuthFile(
      accessToken,
      buildStatementPdfUrl(studentId, kind === 'all' ? {} : { year: statement?.year ?? undefined, term: statement?.term ?? undefined }),
      { fileName: `fees-statement-${slug}${kind === 'all' ? '-all' : ''}.pdf` },
    ).catch(() => {});
    setDownloading(null);
  };

  return (
    <View style={styles.root}>
      <GradientAppBar large title="Fees" subtitle={subtitle} showBack={false} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading && !summary ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <>
            {/* ── Balance hero — rides over the app bar ──────────────────── */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[styles.chip, { backgroundColor: balance > 0 ? colors.dangerSoft : colors.successSoft }]}>
                    <View style={[styles.chipDot, { backgroundColor: balance > 0 ? colors.danger : colors.success }]} />
                    <Text style={[styles.chipText, { color: balance > 0 ? colors.danger : colors.success }]}>
                      {balance > 0 ? 'Balance due' : 'All cleared'}
                    </Text>
                  </View>
                  <Text style={styles.heroLabel}>Outstanding balance</Text>
                  <Text style={[styles.heroValue, balance <= 0 && { color: colors.success }]} numberOfLines={1}>
                    {ksh(balance)}
                  </Text>
                </View>
                <Donut pct={pctPaid} color={colors.primary} track={colors.backgroundAlt} textColor={colors.text} />
              </View>

              <View style={styles.strip}>
                <Mini styles={styles} label="Billed" value={ksh(billed)} />
                <View style={styles.stripDivider} />
                <Mini styles={styles} label="Paid" value={ksh(paid)} valueColor={colors.success} />
                <View style={styles.stripDivider} />
                <Mini styles={styles} label="B/Forward" value={ksh(broughtForward)} />
              </View>

              {balance > 0 && mpesaEnabled && (
                <TouchableOpacity activeOpacity={0.85} onPress={() => setPayOpen(true)}>
                  <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.payBtn}>
                    <MaterialCommunityIcons name="cellphone-check" size={18} color="#FFF" />
                    <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Statements — two independent downloads ─────────────────── */}
            <Text style={styles.sectionTitle}>Statements</Text>
            <View style={styles.dlRow}>
              <DownloadTile
                styles={styles} colors={colors}
                icon="document-text-outline" title="This term"
                desc={statement?.term != null ? `Term ${statement.term}${statement.year ? ` · ${statement.year}` : ''}` : 'Current term'}
                busy={downloading === 'term'}
                onPress={() => downloadStatement('term')}
              />
              <DownloadTile
                styles={styles} colors={colors}
                icon="albums-outline" title="Whole history"
                desc="All terms, one PDF"
                busy={downloading === 'all'}
                onPress={() => downloadStatement('all')}
              />
            </View>

            {/* ── Ledger ─────────────────────────────────────────────────── */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Statement entries</Text>
              <Text style={styles.metaSmall}>{lines.length} {lines.length === 1 ? 'entry' : 'entries'}</Text>
            </View>
            {lines.length > 0 ? (
              <View style={styles.card}>
                {visibleLines.map((l, i) => {
                  const debit = moneyToNumber(l.debit);
                  const credit = moneyToNumber(l.credit);
                  const isCredit = credit > 0;
                  return (
                    <View key={i} style={[styles.lineRow, i > 0 && styles.divider]}>
                      <View style={[styles.lineIcon, { backgroundColor: isCredit ? colors.successSoft : colors.backgroundAlt }]}>
                        <Ionicons name={isCredit ? 'arrow-down' : 'arrow-up'} size={13}
                          color={isCredit ? colors.success : colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.lineDesc} numberOfLines={1}>{l.description || l.type || 'Entry'}</Text>
                        <Text style={styles.lineMeta} numberOfLines={1}>{fmtDate(l.date)}{l.reference ? `  ·  ${l.reference}` : ''}</Text>
                      </View>
                      <Text style={[styles.lineAmt, { color: isCredit ? colors.success : colors.text }]}>
                        {isCredit ? `−${ksh(credit)}` : ksh(debit)}
                      </Text>
                    </View>
                  );
                })}
                {lines.length > LEDGER_PREVIEW && (
                  <TouchableOpacity style={[styles.showAll, styles.divider]} activeOpacity={0.7} onPress={() => setAllLines((v) => !v)}>
                    <Text style={styles.showAllText}>
                      {allLines ? 'Show less' : `Show all ${lines.length} entries`}
                    </Text>
                    <Ionicons name={allLines ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <EmptyLine styles={styles} text="No statement entries yet." />
            )}

            {/* ── Payments from this app ─────────────────────────────────── */}
            <Text style={styles.sectionTitle}>M-Pesa payments from this app</Text>
            {payments.length > 0 ? (
              <View style={styles.card}>
                {payments.map((p, i) => (
                  <ReceiptRow key={p.id ?? i} styles={styles} colors={colors} p={p} first={i === 0} />
                ))}
              </View>
            ) : successPayments.length === 0 ? (
              <EmptyLine styles={styles} text="You haven’t paid through the app yet." />
            ) : null}

            {!!options?.payInstructions && (
              <>
                <Text style={styles.sectionTitle}>How to pay</Text>
                <View style={[styles.card, { paddingVertical: 14 }]}>
                  <Text style={styles.instructions}>{options.payInstructions}</Text>
                  {!!options.shortcode && <Text style={styles.shortcode}>Paybill / Till: {options.shortcode}</Text>}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {studentId != null && (
        <FeePaymentSheet
          visible={payOpen}
          onClose={() => setPayOpen(false)}
          studentId={studentId}
          studentName={selectedChild?.fullName}
          defaultAmount={balance > 0 ? balance : undefined}
          defaultPhone={(parent as any)?.phone}
          onSuccess={() => { refresh(); if (accessToken && studentId != null) getChildFeePayments(accessToken, studentId).then(setPayments).catch(() => {}); }}
        />
      )}
    </View>
  );
};

const Donut: React.FC<{ pct: number; color: string; track: string; textColor: string }> = ({ pct, color, track, textColor }) => {
  const size = 68, stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ fontFamily: fonts.extrabold, fontSize: 14, color: textColor }}>{p}%</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 8.5, color: textColor, opacity: 0.6 }}>paid</Text>
    </View>
  );
};

const Mini: React.FC<{ styles: any; label: string; value: string; valueColor?: string }> = ({ styles, label, value, valueColor }) => (
  <View style={styles.mini}>
    <Text style={styles.miniLabel}>{label}</Text>
    <Text style={[styles.miniValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
  </View>
);

/** One statement download tile — its own spinner; never reflects the other tile's state. */
const DownloadTile: React.FC<{
  styles: any; colors: ColorPalette; icon: any; title: string; desc: string; busy: boolean; onPress: () => void;
}> = ({ styles, colors, icon, title, desc, busy, onPress }) => (
  <TouchableOpacity style={styles.dlTile} activeOpacity={0.75} onPress={onPress} disabled={busy}>
    <View style={[styles.dlIcon, { backgroundColor: colors.primarySoft }]}>
      {busy
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <Ionicons name={icon} size={19} color={colors.primary} />}
    </View>
    <Text style={styles.dlTitle}>{title}</Text>
    <Text style={styles.dlDesc} numberOfLines={1}>{busy ? 'Preparing PDF…' : desc}</Text>
    <View style={styles.dlAction}>
      <Ionicons name="download-outline" size={13} color={colors.primary} />
      <Text style={styles.dlActionText}>{busy ? 'Downloading' : 'Download PDF'}</Text>
    </View>
  </TouchableOpacity>
);

const ReceiptRow: React.FC<{ styles: any; colors: ColorPalette; p: FeePayment; first?: boolean }> =
  ({ styles, colors, p, first }) => {
  const amt = moneyToNumber(p.amount);
  const ok = isPaymentSuccess(p.status);
  const failed = isPaymentFailed(p.status);
  const statusColor = ok ? colors.success : failed ? colors.danger : colors.warning;
  const statusLabel = ok ? 'Paid' : failed ? 'Failed' : 'Awaiting PIN';
  return (
    <View style={[styles.receiptRow, !first && styles.divider]}>
      <View style={[styles.receiptIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialCommunityIcons name="cellphone" size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.receiptAmt}>{`KSh ${amt.toLocaleString('en-KE')}`}</Text>
        <Text style={styles.receiptMeta} numberOfLines={1}>
          {p.mpesaReceipt || 'M-Pesa'}{p.createdAt ? `  ·  ${fmtDate(p.createdAt)}` : ''}
        </Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: statusColor + '1A' }]}>
        <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
};

const EmptyLine: React.FC<{ styles: any; text: string }> = ({ styles, text }) => (
  <View style={styles.emptyLine}><Text style={styles.emptyText}>{text}</Text></View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16 },
    center: { padding: 40, alignItems: 'center' },

    heroCard: {
      backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.border,
      padding: 18, marginTop: 14, marginBottom: 22,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14, shadowRadius: 18, elevation: 6,
    },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
    },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    chipText: { fontSize: 11, fontFamily: fonts.bold },
    heroLabel: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 12 },
    heroValue: { fontSize: 29, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.8, marginTop: 2 },

    strip: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.backgroundAlt, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 11, marginTop: 16,
    },
    stripDivider: { width: 1, alignSelf: 'stretch', backgroundColor: c.border },
    mini: { flex: 1, minWidth: 0 },
    miniLabel: { fontSize: 9.5, fontFamily: fonts.bold, color: c.textTertiary, letterSpacing: 0.6, textTransform: 'uppercase' },
    miniValue: { fontSize: 13, fontFamily: fonts.extrabold, color: c.text, marginTop: 2, letterSpacing: -0.2 },

    payBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 13, paddingVertical: 13, marginTop: 16,
    },
    payBtnText: { color: '#FFF', fontSize: 14.5, fontFamily: fonts.bold },

    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4, marginBottom: 12 },
    metaSmall: { fontSize: 12, fontFamily: fonts.medium, color: c.textTertiary },

    dlRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    dlTile: {
      flex: 1, backgroundColor: c.card, borderRadius: 18,
      borderWidth: 1, borderColor: c.border, padding: 14,
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    dlIcon: {
      width: 38, height: 38, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    },
    dlTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    dlDesc: { fontSize: 11, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    dlAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
    dlActionText: { fontSize: 11.5, fontFamily: fonts.bold, color: c.primary },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 22 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    lineRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
    lineIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    lineDesc: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text },
    lineMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    lineAmt: { fontSize: 13.5, fontFamily: fonts.bold },
    showAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
    showAllText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },

    receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    receiptIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    receiptAmt: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    receiptMeta: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    statusChipText: { fontSize: 11, fontFamily: fonts.bold },

    instructions: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 20 },
    shortcode: { fontSize: 13, fontFamily: fonts.bold, color: c.text, marginTop: 8 },

    emptyLine: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20, marginBottom: 22, alignItems: 'center' },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary },
  });
}
