import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
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

type Tab = 'overview' | 'statement' | 'payments';

export const FinanceScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { summary, statement, refreshing, refresh, loading, error, isFromBackend } = useChildFees();
  const { selectedChild } = useSelectedChild();
  const { parent } = useParentProfile();
  const { accessToken } = useAuth();

  const [tab, setTab] = useState<Tab>('overview');
  const [payOpen, setPayOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [options, setOptions] = useState<PaymentOptions | null>(null);

  const studentId = selectedChild?.studentId ?? null;

  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) return;
    getChildFeePayments(accessToken, studentId).then(setPayments).catch(() => setPayments([]));
    getPaymentOptions(accessToken, studentId).then(setOptions).catch(() => setOptions(null));
  }, [accessToken, studentId]));

  const balance = moneyToNumber(summary?.balance);
  const broughtForward = moneyToNumber(summary?.broughtForward);
  const termBilling = moneyToNumber(summary?.termBilling);
  const paid = moneyToNumber(summary?.paid);
  const billed = broughtForward + termBilling;
  const pctPaid = billed > 0 ? Math.round((paid / billed) * 100) : (balance <= 0 ? 100 : 0);
  const mpesaEnabled = options?.mpesaStkEnabled !== false;

  const statusLine = loading
    ? 'Loading fees…'
    : error
      ? error
      : isFromBackend && summary?.admNo
        ? `Live balance • ${summary.admNo}${summary.studentName ? ` · ${summary.studentName}` : ''}`
        : 'Fee balance from the school';

  const successPayments = payments.filter((p) => isPaymentSuccess(p.status));

  const downloadStatement = async (whole: boolean) => {
    if (!studentId || !accessToken) return;
    setDownloading(true);
    const slug = (selectedChild?.fullName || 'student').replace(/\s+/g, '-');
    await downloadAuthFile(
      accessToken,
      buildStatementPdfUrl(studentId, whole ? {} : { year: statement?.year ?? undefined, term: statement?.term ?? undefined }),
      { fileName: `fees-statement-${slug}${whole ? '-all' : ''}.pdf` },
    ).catch(() => {});
    setDownloading(false);
  };

  return (
    <View style={styles.root}>
      <ParentHeader title="Fees" showBack rightIcon="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Text style={styles.statusLine} numberOfLines={1}>{statusLine}</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TabBtn styles={styles} colors={colors} label="Overview" active={tab === 'overview'} onPress={() => setTab('overview')} />
          <TabBtn styles={styles} colors={colors} label="Statement" active={tab === 'statement'} onPress={() => setTab('statement')} />
          <TabBtn styles={styles} colors={colors} label="Payments" active={tab === 'payments'} onPress={() => setTab('payments')}
            count={payments.length} />
        </View>

        {loading && !summary ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : tab === 'overview' ? (
          <>
            {/* Balance card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceTop}>
                <View style={[styles.chip, { backgroundColor: balance > 0 ? colors.dangerSoft : colors.successSoft }]}>
                  <Text style={[styles.chipText, { color: balance > 0 ? colors.danger : colors.success }]}>
                    {balance > 0 ? 'Outstanding balance' : 'All paid'}
                  </Text>
                </View>
                <Donut pct={pctPaid} color={balance > 0 ? colors.primary : colors.success} track={colors.backgroundAlt} textColor={colors.text} />
              </View>
              <Text style={styles.balanceLabel}>Outstanding balance</Text>
              <Text style={[styles.balanceValue, { color: balance > 0 ? colors.text : colors.success }]}>{ksh(balance)}</Text>

              <View style={styles.breakdown}>
                <Break styles={styles} label="Brought f/wd" value={ksh(broughtForward)} />
                <View style={styles.breakDivider} />
                <Break styles={styles} label="This term" value={ksh(termBilling)} />
                <View style={styles.breakDivider} />
                <Break styles={styles} label="Paid" value={ksh(paid)} valueColor={colors.success} />
              </View>

              {balance > 0 && mpesaEnabled && (
                <TouchableOpacity style={styles.payBtn} activeOpacity={0.85} onPress={() => setPayOpen(true)}>
                  <MaterialCommunityIcons name="cellphone-check" size={18} color="#FFF" />
                  <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Latest receipts */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest receipts</Text>
              {payments.length > 0 && (
                <TouchableOpacity onPress={() => setTab('payments')} hitSlop={8}><Text style={styles.link}>See all</Text></TouchableOpacity>
              )}
            </View>
            {successPayments.length > 0 ? (
              <View style={styles.card}>
                {successPayments.slice(0, 3).map((p, i) => (
                  <ReceiptRow key={p.id ?? i} styles={styles} colors={colors} p={p} first={i === 0} />
                ))}
              </View>
            ) : (
              <EmptyLine styles={styles} text="No receipts yet." />
            )}
          </>
        ) : tab === 'statement' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fee statement</Text>
              <Text style={styles.metaSmall}>{statement?.lines?.length ?? 0} entries</Text>
            </View>
            {statement?.lines && statement.lines.length > 0 ? (
              <View style={styles.card}>
                {statement.lines.map((l, i) => {
                  const debit = moneyToNumber(l.debit);
                  const credit = moneyToNumber(l.credit);
                  const isCredit = credit > 0;
                  return (
                    <View key={i} style={[styles.lineRow, i > 0 && styles.divider]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lineDesc} numberOfLines={1}>{l.description || l.type || 'Entry'}</Text>
                        <Text style={styles.lineMeta}>{fmtDate(l.date)}{l.reference ? `  •  ${l.reference}` : ''}</Text>
                      </View>
                      <Text style={[styles.lineAmt, { color: isCredit ? colors.success : colors.text }]}>
                        {isCredit ? `-${ksh(credit)}` : ksh(debit)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <EmptyLine styles={styles} text="No statement entries yet." />
            )}

            <View style={styles.card}>
              <DownloadRow styles={styles} colors={colors} title="This term's statement" desc="Charges and payments for this term"
                busy={downloading} onPress={() => downloadStatement(false)} first />
              <DownloadRow styles={styles} colors={colors} title="Whole statement" desc="Complete history across all terms"
                busy={downloading} onPress={() => downloadStatement(true)} />
            </View>
          </>
        ) : (
          <>
            {/* Payments tab */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{balance > 0 ? 'Balance due' : 'All paid up 🎉'}</Text>
              <Text style={[styles.balanceValue, { color: balance > 0 ? colors.text : colors.success }]}>{ksh(balance)}</Text>
              {balance > 0 && mpesaEnabled && (
                <TouchableOpacity style={styles.payBtn} activeOpacity={0.85} onPress={() => setPayOpen(true)}>
                  <MaterialCommunityIcons name="cellphone-check" size={18} color="#FFF" />
                  <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>M-Pesa payments from this app</Text>
            {payments.length > 0 ? (
              <View style={styles.card}>
                {payments.map((p, i) => (
                  <ReceiptRow key={p.id ?? i} styles={styles} colors={colors} p={p} first={i === 0} showStatus />
                ))}
              </View>
            ) : (
              <EmptyLine styles={styles} text="You haven't paid through the app yet." />
            )}

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
  const size = 64, stroke = 7;
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
    </View>
  );
};

const TabBtn: React.FC<{ styles: any; colors: ColorPalette; label: string; active: boolean; onPress: () => void; count?: number }> =
  ({ styles, label, active, onPress }) => (
  <TouchableOpacity style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8} onPress={onPress}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const Break: React.FC<{ styles: any; label: string; value: string; valueColor?: string }> = ({ styles, label, value, valueColor }) => (
  <View style={styles.break}>
    <Text style={[styles.breakValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
    <Text style={styles.breakLabel}>{label}</Text>
  </View>
);

const ReceiptRow: React.FC<{ styles: any; colors: ColorPalette; p: FeePayment; first?: boolean; showStatus?: boolean }> =
  ({ styles, colors, p, first, showStatus }) => {
  const amt = moneyToNumber(p.amount);
  const ok = isPaymentSuccess(p.status);
  const failed = isPaymentFailed(p.status);
  const statusColor = ok ? colors.success : failed ? colors.danger : colors.warning;
  const statusLabel = ok ? 'Paid' : failed ? 'Failed' : 'Awaiting PIN';
  return (
    <View style={[styles.receiptRow, !first && styles.divider]}>
      <View style={[styles.receiptIcon, { backgroundColor: colors.successSoft }]}>
        <MaterialCommunityIcons name="cellphone" size={18} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.receiptAmt}>{`KSh ${amt.toLocaleString('en-KE')}`}</Text>
        <Text style={styles.receiptMeta} numberOfLines={1}>
          {p.mpesaReceipt || 'M-Pesa'}{p.createdAt ? `  •  ${fmtDate(p.createdAt)}` : ''}
        </Text>
      </View>
      {showStatus && (
        <View style={[styles.statusChip, { backgroundColor: statusColor + '1A' }]}>
          <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      )}
    </View>
  );
};

const DownloadRow: React.FC<{ styles: any; colors: ColorPalette; title: string; desc: string; busy: boolean; onPress: () => void; first?: boolean }> =
  ({ styles, colors, title, desc, busy, onPress, first }) => (
  <TouchableOpacity style={[styles.dlRow, !first && styles.divider]} activeOpacity={0.7} onPress={onPress} disabled={busy}>
    <View style={[styles.receiptIcon, { backgroundColor: colors.infoSoft }]}>
      <Ionicons name="document-text-outline" size={18} color={colors.info} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.receiptAmt}>{title}</Text>
      <Text style={styles.receiptMeta}>{desc}</Text>
    </View>
    {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="download" size={18} color={colors.primary} />}
  </TouchableOpacity>
);

const EmptyLine: React.FC<{ styles: any; text: string }> = ({ styles, text }) => (
  <View style={styles.emptyLine}><Text style={styles.emptyText}>{text}</Text></View>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },
    center: { padding: 40, alignItems: 'center' },
    statusLine: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textTertiary, marginBottom: 12, marginLeft: 2 },

    tabs: { flexDirection: 'row', backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
    tabActive: { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    tabText: { fontSize: 13, fontFamily: fonts.semibold, color: c.textSecondary },
    tabTextActive: { color: c.text, fontFamily: fonts.bold },

    balanceCard: { backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 22 },
    balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    chip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, alignSelf: 'flex-start' },
    chipText: { fontSize: 11.5, fontFamily: fonts.bold },
    balanceLabel: { fontSize: 12.5, fontFamily: fonts.medium, color: c.textSecondary },
    balanceValue: { fontSize: 30, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.8, marginTop: 2 },
    breakdown: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border },
    break: { flex: 1, alignItems: 'center' },
    breakValue: { fontSize: 13.5, fontFamily: fonts.bold, color: c.text },
    breakLabel: { fontSize: 11, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 3 },
    breakDivider: { width: 1, backgroundColor: c.border, marginVertical: 2 },
    payBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: c.primary, borderRadius: 13, paddingVertical: 13, marginTop: 16,
    },
    payBtnText: { color: '#FFF', fontSize: 14.5, fontFamily: fonts.bold },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4, marginBottom: 12 },
    link: { fontSize: 12.5, fontFamily: fonts.bold, color: c.primary },
    metaSmall: { fontSize: 12, fontFamily: fonts.medium, color: c.textTertiary },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 22 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },

    receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    receiptIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    receiptAmt: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    receiptMeta: { fontSize: 12, fontFamily: fonts.regular, color: c.textSecondary, marginTop: 2 },
    statusChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
    statusChipText: { fontSize: 11, fontFamily: fonts.bold },

    lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 10 },
    lineDesc: { fontSize: 13.5, fontFamily: fonts.semibold, color: c.text },
    lineMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    lineAmt: { fontSize: 13.5, fontFamily: fonts.bold },

    dlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },

    instructions: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 20 },
    shortcode: { fontSize: 13, fontFamily: fonts.bold, color: c.text, marginTop: 8 },

    emptyLine: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20, marginBottom: 22, alignItems: 'center' },
    emptyText: { fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary },
  });
}
