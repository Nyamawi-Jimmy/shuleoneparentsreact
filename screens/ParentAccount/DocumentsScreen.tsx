import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { ParentHeader } from '../../components/ParentHeader';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { useChildFees } from '../../hooks/useChildFees';
import {
  buildStatementPdfUrl, buildReceiptPdfUrl, getChildFeePayments,
} from '../../api/fees';
import { FeePayment, moneyToNumber, isPaymentSuccess } from '../../api/fees.types';
import { downloadAuthFile } from '../../utils/downloadAuthFile';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const DocumentsScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { selectedChild } = useSelectedChild();
  const { accessToken } = useAuth();
  const { statement, isFromBackend, loading, refreshing, refresh } = useChildFees();

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const studentId = selectedChild?.studentId ?? null;
  const slug = (selectedChild?.fullName || 'student').replace(/\s+/g, '-');

  useFocusEffect(useCallback(() => {
    if (!accessToken || studentId == null) { setPayments([]); return; }
    getChildFeePayments(accessToken, studentId).then((p) => setPayments(Array.isArray(p) ? p : [])).catch(() => setPayments([]));
  }, [accessToken, studentId]));

  const receipts = payments.filter((p) => isPaymentSuccess(p.status));

  const download = async (id: string, url: string, fileName: string) => {
    if (!accessToken || busy) return;
    setBusy(id);
    await downloadAuthFile(accessToken, url, { fileName }).catch(() => {});
    setBusy(null);
  };

  const statements = [
    { id: 'stmt-term', title: "Current term statement", desc: 'Charges and payments for this term', filters: { year: statement?.year ?? undefined, term: statement?.term ?? undefined } },
    { id: 'stmt-full', title: 'Full statement', desc: 'Complete history across all terms', filters: {} as { year?: number; term?: number } },
  ];

  return (
    <View style={styles.root}>
      <ParentHeader title="Documents" showBack rightIcon="none" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <Text style={styles.subtitle}>Report cards, fee statements and receipts</Text>

        {/* Fee statements */}
        <Text style={styles.sectionTitle}>Fee statements</Text>
        {loading && !statement ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : !isFromBackend ? (
          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textTertiary} />
            <Text style={styles.noteText}>Not linked to a school fee account yet — statements appear once connected.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {statements.map((s, i) => (
              <View key={s.id} style={[styles.docRow, i > 0 && styles.divider]}>
                <View style={[styles.docIcon, { backgroundColor: colors.infoSoft }]}>
                  <Ionicons name="document-text-outline" size={19} color={colors.info} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.docTitle}>{s.title}</Text>
                  <Text style={styles.docDesc} numberOfLines={1}>{s.desc}</Text>
                </View>
                <DownloadBtn styles={styles} colors={colors} busy={busy === s.id}
                  onPress={() => studentId != null && download(s.id, buildStatementPdfUrl(studentId, s.filters), `statement-${slug}-${s.id === 'stmt-full' ? 'all' : 'term'}.pdf`)} />
              </View>
            ))}
          </View>
        )}

        {/* Receipts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Receipts</Text>
          {receipts.length > 0 && <Text style={styles.metaSmall}>{receipts.length} receipt{receipts.length === 1 ? '' : 's'}</Text>}
        </View>
        {receipts.length === 0 ? (
          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textTertiary} />
            <Text style={styles.noteText}>{isFromBackend ? 'No payment receipts yet — they appear here after a payment is recorded.' : 'Receipts appear once your school fee account is linked.'}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {receipts.map((rc, i) => (
              <View key={rc.id ?? i} style={[styles.docRow, i > 0 && styles.divider]}>
                <View style={[styles.docIcon, { backgroundColor: colors.successSoft }]}>
                  <MaterialCommunityIcons name="receipt" size={19} color={colors.success} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.docTitle}>{`KSh ${moneyToNumber(rc.amount).toLocaleString('en-KE')}`}</Text>
                  <Text style={styles.docDesc} numberOfLines={1}>
                    {['M-Pesa', rc.mpesaReceipt, fmtDate(rc.completedAt || rc.createdAt)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <DownloadBtn styles={styles} colors={colors} busy={busy === `rcpt-${rc.id}`}
                  onPress={() => studentId != null && download(`rcpt-${rc.id}`, buildReceiptPdfUrl(studentId), `receipts-${slug}.pdf`)} />
              </View>
            ))}
          </View>
        )}

        {/* Report cards */}
        <Text style={styles.sectionTitle}>Report cards & letters</Text>
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="school-outline" size={28} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No report cards shared yet</Text>
          <Text style={styles.emptyText}>When the school publishes report cards or sends letters, they'll appear here — never sample files.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const DownloadBtn: React.FC<{ styles: any; colors: ColorPalette; busy: boolean; onPress: () => void }> = ({ styles, colors, busy, onPress }) => (
  <TouchableOpacity style={styles.dlBtn} activeOpacity={0.8} disabled={busy} onPress={onPress}>
    {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <><Feather name="download" size={13} color={colors.primary} /><Text style={styles.dlBtnText}>Download</Text></>}
  </TouchableOpacity>
);

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 4 },
    center: { padding: 30, alignItems: 'center' },
    subtitle: { fontSize: 12, fontFamily: fonts.medium, color: c.textTertiary, marginBottom: 16, marginLeft: 2 },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3, marginBottom: 12 },
    metaSmall: { fontSize: 12, fontFamily: fonts.medium, color: c.textTertiary },

    card: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 24 },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    docIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    docDesc: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },
    dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, minWidth: 92, justifyContent: 'center' },
    dlBtnText: { fontSize: 12, fontFamily: fonts.bold, color: c.primary },

    noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 14, marginBottom: 24 },
    noteText: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18 },

    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 28, alignItems: 'center', marginBottom: 24 },
    emptyTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text, marginTop: 12 },
    emptyText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 18 },
  });
}
