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
  buildStatementPdfUrl, buildReceiptPdfUrl, getChildFeePayments, getPaymentOptions,
} from '../../api/fees';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useAuth } from '../../context/AuthContext';
import { downloadAuthFile, saveAuthFileToDevice } from '../../utils/downloadAuthFile';
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
  // Per-receipt busy state, keyed by "<ref>:<view|save>".
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);

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

  // Recent receipts = the school's own ledger credits (money in) that carry a
  // reference, newest first — each has a printable receipt PDF (view/download).
  const receipts = lines
    .filter((l) => moneyToNumber(l.credit) > 0 && !!l.reference)
    .slice()
    .reverse();

  const slug = (selectedChild?.fullName || 'student').replace(/\s+/g, '-');

  const downloadStatement = async (kind: 'term' | 'all') => {
    if (!studentId || !accessToken || downloading === kind) return;
    setDownloading(kind);
    await saveAuthFileToDevice(
      accessToken,
      buildStatementPdfUrl(studentId, kind === 'all' ? 'FULL' : 'TERM'),
      { fileName: `fees-statement-${slug}${kind === 'all' ? '-all' : '-term'}.pdf` },
    ).catch(() => {});
    setDownloading(null);
  };

  // View opens the receipt in the system viewer; Save writes it to the device.
  const handleReceipt = async (ref: string, action: 'view' | 'save') => {
    if (!studentId || !accessToken) return;
    const key = `${ref}:${action}`;
    if (receiptBusy) return;
    setReceiptBusy(key);
    const url = buildReceiptPdfUrl(studentId, ref);
    const opts = { fileName: `receipt-${ref}.pdf`.replace(/\s+/g, '-') };
    try {
      if (action === 'view') await downloadAuthFile(accessToken, url, opts);
      else await saveAuthFileToDevice(accessToken, url, opts);
    } catch { /* helper already alerts */ }
    setReceiptBusy(null);
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
            {/* ── Balance hero — a premium gradient card with a paid-progress bar ── */}
            <LinearGradient
              colors={balance > 0 ? [colors.primary, colors.primaryDeep] : ['#0f8a5f', '#0b6b49']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlow} />
              <View style={styles.heroChipRow}>
                <View style={styles.heroChip}>
                  <View style={[styles.chipDot, { backgroundColor: '#fff' }]} />
                  <Text style={styles.heroChipText}>{balance > 0 ? 'Balance due' : 'All cleared'}</Text>
                </View>
                <Text style={styles.heroPct}>{pctPaid}% paid</Text>
              </View>

              <Text style={styles.heroLabel}>Outstanding balance</Text>
              <Text style={styles.heroValue} numberOfLines={1}>{ksh(balance)}</Text>

              {/* Paid-progress bar */}
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.max(3, Math.min(100, pctPaid))}%` }]} />
              </View>

              <View style={styles.strip}>
                <Mini styles={styles} label="Billed" value={ksh(billed)} />
                <View style={styles.stripDivider} />
                <Mini styles={styles} label="Paid" value={ksh(paid)} />
                <View style={styles.stripDivider} />
                <Mini styles={styles} label="B/Forward" value={ksh(broughtForward)} />
              </View>

              {balance > 0 && mpesaEnabled && (
                <TouchableOpacity activeOpacity={0.9} style={styles.payBtn} onPress={() => setPayOpen(true)}>
                  <MaterialCommunityIcons name="cellphone-check" size={18} color={colors.primaryDeep} />
                  <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>

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

            {/* ── Recent receipts — view or save each one ────────────────── */}
            {receipts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent receipts</Text>
                <View style={styles.card}>
                  {receipts.slice(0, 6).map((l, i) => {
                    const ref = String(l.reference);
                    return (
                      <View key={ref + i} style={[styles.rcptRow, i > 0 && styles.divider]}>
                        <View style={styles.rcptIcon}>
                          <MaterialCommunityIcons name="receipt" size={17} color={colors.success} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.rcptAmt}>{ksh(moneyToNumber(l.credit))}</Text>
                          <Text style={styles.rcptMeta} numberOfLines={1}>
                            {fmtDate(l.date)}{ref ? `  ·  ${ref}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity style={styles.rcptBtn} activeOpacity={0.7}
                          onPress={() => handleReceipt(ref, 'view')} disabled={!!receiptBusy}>
                          {receiptBusy === `${ref}:view`
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : <><Ionicons name="eye-outline" size={15} color={colors.primary} /><Text style={styles.rcptBtnText}>View</Text></>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.rcptBtn, styles.rcptBtnAlt]} activeOpacity={0.7}
                          onPress={() => handleReceipt(ref, 'save')} disabled={!!receiptBusy}>
                          {receiptBusy === `${ref}:save`
                            ? <ActivityIndicator size="small" color={colors.textSecondary} />
                            : <Ionicons name="download-outline" size={16} color={colors.textSecondary} />}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

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

const Mini: React.FC<{ styles: any; label: string; value: string }> = ({ styles, label, value }) => (
  <View style={styles.mini}>
    <Text style={styles.miniLabel}>{label}</Text>
    <Text style={styles.miniValue} numberOfLines={1}>{value}</Text>
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
      <Text style={styles.dlActionText}>{busy ? 'Downloading' : 'Save to device'}</Text>
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
      borderRadius: 24, padding: 20, marginTop: 14, marginBottom: 22, overflow: 'hidden',
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28, shadowRadius: 20, elevation: 8,
    },
    heroGlow: {
      position: 'absolute', top: -50, right: -40, width: 150, height: 150,
      borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.10)',
    },
    heroChipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    chipDot: { width: 6, height: 6, borderRadius: 3 },
    heroChipText: { fontSize: 11, fontFamily: fonts.bold, color: '#FFF' },
    heroPct: { fontSize: 12, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.9)' },
    heroLabel: { fontSize: 12.5, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.8)', marginTop: 16 },
    heroValue: { fontSize: 32, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: -0.9, marginTop: 2 },

    track: {
      height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)',
      marginTop: 14, overflow: 'hidden',
    },
    trackFill: { height: '100%', borderRadius: 999, backgroundColor: '#FFF' },

    strip: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 11, marginTop: 16,
    },
    stripDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.22)' },
    mini: { flex: 1, minWidth: 0 },
    miniLabel: { fontSize: 9.5, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6, textTransform: 'uppercase' },
    miniValue: { fontSize: 13, fontFamily: fonts.extrabold, color: '#FFF', marginTop: 2, letterSpacing: -0.2 },

    payBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      borderRadius: 14, paddingVertical: 14, marginTop: 18, backgroundColor: '#FFF',
    },
    payBtnText: { color: c.primaryDeep, fontSize: 14.5, fontFamily: fonts.bold },

    rcptRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 },
    rcptIcon: {
      width: 36, height: 36, borderRadius: 11, backgroundColor: c.successSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    rcptAmt: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    rcptMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    rcptBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
      backgroundColor: c.primarySoft, minWidth: 40, justifyContent: 'center',
    },
    rcptBtnAlt: { backgroundColor: c.backgroundAlt, paddingHorizontal: 9 },
    rcptBtnText: { fontSize: 12, fontFamily: fonts.bold, color: c.primary },

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
