import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useChildFees } from '../../hooks/useChildFees';
import { moneyToNumber } from '../../api/fees.types';
import { buildReceiptPdfUrl, buildStatementPdfUrl } from '../../api/fees';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useParentProfile } from '../../context/ParentProfileContext';
import { useAuth } from '../../context/AuthContext';
import { downloadAuthFile } from '../../utils/downloadAuthFile';
import { FeePaymentSheet } from '../../components/FeePaymentSheet';

const formatKsh = (amount: number | null | undefined): string => {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return `KSh ${n.toLocaleString('en-KE')}`;
};

export const FinanceScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { summary, statement, refreshing, refresh, error } = useChildFees();
  const { selectedChild } = useSelectedChild();
  const { parent } = useParentProfile();
  const { accessToken } = useAuth();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const outstandingBalance = moneyToNumber(summary?.balance);
  const termBilling = moneyToNumber(summary?.termBilling);

  const termLabel =
    statement?.term != null && statement?.year != null
      ? `Term ${statement.term}, ${statement.year}`
      : 'Current Term';
  const periodLabel = statement?.year ? `Jan – Jun ${statement.year}` : '';

  const recentReceipts = (statement?.lines ?? [])
    .filter((line) => moneyToNumber(line.credit) > 0)
    .slice(-3)
    .reverse()
    .map((line, idx) => ({
      id: line.reference || `${line.date ?? 'r'}-${idx}`,
      date: line.date ?? '—',
      method: line.type ?? 'M-Pesa',
      description: line.description ?? 'Payment to School',
      amount: moneyToNumber(line.credit),
    }));

  const handleDownloadStatement = async () => {
    if (!selectedChild?.studentId || !accessToken) return;
    setDownloading(true);
    const childSlug = (selectedChild.fullName || 'student').replace(/\s+/g, '-');
    await downloadAuthFile(
      accessToken,
      buildStatementPdfUrl(selectedChild.studentId, {
        year: statement?.year ?? undefined, term: statement?.term ?? undefined,
      }),
      { fileName: `fees-statement-${childSlug}.pdf` },
    );
    setDownloading(false);
  };

  const handleDownloadReceipts = async () => {
    if (!selectedChild?.studentId || !accessToken) return;
    setDownloading(true);
    const childSlug = (selectedChild.fullName || 'student').replace(/\s+/g, '-');
    await downloadAuthFile(
      accessToken,
      buildReceiptPdfUrl(selectedChild.studentId),
      { fileName: `receipts-${childSlug}.pdf` },
    );
    setDownloading(false);
  };

  const fmtDate = (s: string) => {
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return s; }
  };

  return (
    <View style={styles.safe}>
      <ParentHeader title="Finance" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Outstanding Balance - keeps pink gradient in both themes (brand) */}
        <LinearGradient
          colors={['#FB7185', '#E11D48']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.balanceLabel}>Outstanding Balance</Text>
              <Text style={styles.balanceValue}>{formatKsh(outstandingBalance)}</Text>
              <Text style={styles.balanceDue}>Due on 31 May 2025</Text>
            </View>
            <View style={styles.walletCircle}>
              <MaterialCommunityIcons name="wallet" size={28} color="#FFFFFF" />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payBtn, outstandingBalance <= 0 && { opacity: 0.55 }]}
            activeOpacity={0.9}
            onPress={() => setPaymentOpen(true)}
            disabled={outstandingBalance <= 0}
          >
            <Ionicons name="phone-portrait-outline" size={17} color="#E11D48" />
            <Text style={styles.payBtnText}>Pay with M-Pesa</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Fee Statement */}
        <Text style={styles.sectionTitle}>Fee Statement</Text>
        <TouchableOpacity activeOpacity={0.85} style={styles.statementCard} onPress={handleDownloadStatement}>
          <View style={styles.statementIcon}>
            <MaterialCommunityIcons name="file-document" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.statementTerm}>{termLabel}</Text>
            <Text style={styles.statementPeriod}>{periodLabel}</Text>
            <Text style={styles.viewStatementText}>
              {downloading ? 'Downloading…' : 'View statement'}
            </Text>
          </View>
          <View style={styles.statementRight}>
            <Text style={styles.statementAmount}>{formatKsh(termBilling)}</Text>
            <Feather name="chevron-right" size={18} color={colors.textTertiary} style={{ marginTop: 4 }} />
          </View>
        </TouchableOpacity>

        {/* Recent Receipts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Receipts</Text>
          <TouchableOpacity hitSlop={10} onPress={handleDownloadReceipts}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentReceipts.length > 0 ? (
          <View style={styles.receiptsCard}>
            {recentReceipts.map((r, idx) => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.7}
                onPress={handleDownloadReceipts}
                style={[styles.receiptRow, idx < recentReceipts.length - 1 && styles.receiptRowDivider]}
              >
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.receiptTitle}>{r.description}</Text>
                  <Text style={styles.receiptMeta}>
                    {fmtDate(r.date)}  •  {r.method}
                  </Text>
                </View>
                <View style={styles.receiptRight}>
                  <Text style={styles.receiptAmount}>{formatKsh(r.amount)}</Text>
                  <Feather name="download" size={16} color={colors.textTertiary} style={{ marginLeft: 12 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.receiptsCard}>
            <View style={[styles.receiptRow, { justifyContent: 'center' }]}>
              <Text style={styles.receiptMeta}>{error ? error : 'No receipts yet'}</Text>
            </View>
          </View>
        )}

        {/* Reminder card */}
        <TouchableOpacity activeOpacity={0.85} style={styles.reminderCard} onPress={() => router.push('/reminders' as any)}>
          <View style={styles.reminderBell}>
            <Ionicons name="notifications" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.reminderTitle}>Set up fee reminders</Text>
            <Text style={styles.reminderSub}>Never miss a payment. Get alerts before due dates.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {selectedChild?.studentId && (
        <FeePaymentSheet
          visible={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          studentId={selectedChild.studentId}
          studentName={selectedChild.fullName}
          defaultAmount={outstandingBalance > 0 ? outstandingBalance : undefined}
          defaultPhone={parent?.phone || ''}
          onSuccess={() => { refresh(); }}
        />
      )}
    </View>
  );
};

// =================================================================
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 18, paddingTop: 12 },

    balanceCard: {
      borderRadius: 24, padding: 22,
      shadowColor: '#E11D48',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.30, shadowRadius: 20, elevation: 10,
    },
    balanceTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
    balanceLabel: { color: '#FFFFFF', opacity: 0.92, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
    balanceValue: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', letterSpacing: -0.8, marginTop: 4, marginBottom: 6 },
    balanceDue: { color: '#FFFFFF', opacity: 0.92, fontSize: 12.5, fontWeight: '500' },
    walletCircle: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center', justifyContent: 'center',
    },
    payBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 16, gap: 8,
    },
    payBtnText: { color: '#E11D48', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

    sectionTitle: { fontSize: 17, fontWeight: '800', color: c.text, marginTop: 24, marginBottom: 12, letterSpacing: -0.3 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    viewAllText: { color: c.primary, fontSize: 13, fontWeight: '700' },

    statementCard: {
      flexDirection: 'row', alignItems: 'flex-start',
      backgroundColor: c.card, padding: 14, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.04,
      shadowRadius: 4, elevation: 1,
    },
    statementIcon: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    statementTerm: { fontSize: 15, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    statementPeriod: { fontSize: 12, color: c.textTertiary, fontWeight: '500', marginTop: 2 },
    viewStatementText: { color: c.primary, fontSize: 12, fontWeight: '700', marginTop: 6 },
    statementRight: { alignItems: 'flex-end' },
    statementAmount: { fontSize: 15, fontWeight: '800', color: c.text, letterSpacing: -0.2 },

    receiptsCard: {
      backgroundColor: c.card, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: c.scheme === 'dark' ? 0.3 : 0.04,
      shadowRadius: 4, elevation: 1,
    },
    receiptRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
    receiptRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
    checkCircle: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: c.success,
      alignItems: 'center', justifyContent: 'center',
    },
    receiptTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    receiptMeta: { fontSize: 11.5, color: c.textTertiary, marginTop: 2, fontWeight: '500' },
    receiptRight: { flexDirection: 'row', alignItems: 'center' },
    receiptAmount: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },

    reminderCard: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      backgroundColor: c.primarySoft, borderRadius: 16, marginTop: 18,
    },
    reminderBell: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    reminderTitle: { fontSize: 14, fontWeight: '800', color: c.text, letterSpacing: -0.2 },
    reminderSub: { fontSize: 11.5, color: c.textSecondary, marginTop: 2, fontWeight: '500', lineHeight: 15 },
  });
}
