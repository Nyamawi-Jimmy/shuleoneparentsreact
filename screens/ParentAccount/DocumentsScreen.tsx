// Documents — the parent's real, downloadable paperwork, mirroring the web
// Documents page (fee statements + the school's own payment receipts + a
// report-cards note) but in its own mobile design: a tinted intro banner and
// left-accent document rows with View / Download actions. All PDFs are the
// school's branded endpoints; receipts come from the fee ledger (money-in
// lines), exactly like the web.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientAppBar } from '../../components/GradientAppBar';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/palettes';
import { useSelectedChild } from '../../context/SelectedChildContext';
import { useAuth } from '../../context/AuthContext';
import { useChildFees } from '../../hooks/useChildFees';
import { buildStatementPdfUrl, buildReceiptPdfUrl } from '../../api/fees';
import { moneyToNumber } from '../../api/fees.types';
import { saveAuthFileToDevice } from '../../utils/downloadAuthFile';
import { PdfViewerModal } from '../../components/PdfViewerModal';

const ksh = (n: number) => `KSh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-KE')}`;
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
  const { statement, loading, refreshing, refresh } = useChildFees();

  const [busy, setBusy] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string; fileName: string } | null>(null);

  const studentId = selectedChild?.studentId ?? null;
  const slug = (selectedChild?.fullName || 'student').replace(/\s+/g, '-');

  const lines = statement?.lines ?? [];
  // Receipts = the school ledger's money-in lines with a reference (same as web).
  const receipts = lines.filter((l) => moneyToNumber(l.credit) > 0 && !!l.reference).slice().reverse();

  const save = async (id: string, url: string, fileName: string) => {
    if (!accessToken || busy) return;
    setBusy(id);
    try { await saveAuthFileToDevice(accessToken, url, { fileName }); } catch {}
    setBusy(null);
  };

  const statements = [
    { id: 'stmt-term', scope: 'TERM' as const, title: 'Current term statement', desc: 'Charges & payments for this term', file: `statement-${slug}-term.pdf` },
    { id: 'stmt-full', scope: 'FULL' as const, title: 'Full statement', desc: 'Complete history, all terms', file: `statement-${slug}-all.pdf` },
  ];

  return (
    <View style={styles.root}>
      <GradientAppBar title="Documents" subtitle="Statements, receipts & report cards" showBack />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {/* Intro banner */}
        <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <View style={styles.bannerIcon}><Ionicons name="folder-open" size={20} color="#FFF" /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.bannerTitle}>{selectedChild?.fullName ? `${selectedChild.fullName.split(' ')[0]}’s documents` : 'Your documents'}</Text>
            <Text style={styles.bannerSub}>Download the school’s official PDFs to your device.</Text>
          </View>
        </LinearGradient>

        {/* Fee statements */}
        <SectionHead styles={styles} icon="document-text" tint={colors.info} title="Fee statements" />
        {loading && !statement ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <View style={styles.card}>
            {statements.map((s, i) => (
              <View key={s.id} style={[styles.docRow, i > 0 && styles.divider]}>
                <View style={[styles.docAccent, { backgroundColor: colors.info }]} />
                <View style={[styles.docIcon, { backgroundColor: colors.infoSoft }]}>
                  <Ionicons name={s.scope === 'FULL' ? 'albums-outline' : 'document-text-outline'} size={18} color={colors.info} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.docTitle}>{s.title}</Text>
                  <Text style={styles.docDesc} numberOfLines={1}>{s.desc}</Text>
                </View>
                <DownloadBtn styles={styles} colors={colors} busy={busy === s.id}
                  onPress={() => studentId != null && save(s.id, buildStatementPdfUrl(studentId, s.scope), s.file)} />
              </View>
            ))}
          </View>
        )}

        {/* Receipts */}
        <SectionHead styles={styles} icon="receipt" tint={colors.success} title="Payment receipts"
          meta={receipts.length > 0 ? `${receipts.length}` : undefined} />
        {receipts.length === 0 ? (
          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textTertiary} />
            <Text style={styles.noteText}>Receipts appear here once a payment is recorded on your fee account.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {receipts.slice(0, 12).map((l, i) => {
              const ref = String(l.reference);
              return (
                <View key={ref + i} style={[styles.docRow, i > 0 && styles.divider]}>
                  <View style={[styles.docAccent, { backgroundColor: colors.success }]} />
                  <View style={[styles.docIcon, { backgroundColor: colors.successSoft }]}>
                    <MaterialCommunityIcons name="receipt" size={18} color={colors.success} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.docTitle}>{ksh(moneyToNumber(l.credit))}</Text>
                    <Text style={styles.docDesc} numberOfLines={1}>{[fmtDate(l.date), ref].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewBtn} activeOpacity={0.75}
                    onPress={() => studentId != null && setViewer({ url: buildReceiptPdfUrl(studentId, ref), title: `Receipt · ${ref}`, fileName: `receipt-${ref}.pdf` })}>
                    <Ionicons name="eye-outline" size={15} color={colors.primary} />
                  </TouchableOpacity>
                  <DownloadBtn styles={styles} colors={colors} busy={busy === `rcpt-${ref}`} compact
                    onPress={() => studentId != null && save(`rcpt-${ref}`, buildReceiptPdfUrl(studentId, ref), `receipt-${ref}.pdf`)} />
                </View>
              );
            })}
          </View>
        )}

        {/* Report cards */}
        <SectionHead styles={styles} icon="school" tint={colors.purple} title="Report cards & letters" />
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="school-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Published by the school</Text>
          <Text style={styles.emptyText}>When your school publishes report cards or sends letters, they’ll show up here to download.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <PdfViewerModal
        visible={!!viewer}
        onClose={() => setViewer(null)}
        title={viewer?.title ?? 'Document'}
        url={viewer?.url ?? null}
        accessToken={accessToken}
        fileName={viewer?.fileName ?? 'document.pdf'}
      />
    </View>
  );
};

const SectionHead: React.FC<{ styles: any; icon: any; tint: string; title: string; meta?: string }> =
  ({ styles, icon, tint, title, meta }) => (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionDot, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={12} color="#FFF" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {meta ? <View style={styles.sectionMeta}><Text style={styles.sectionMetaText}>{meta}</Text></View> : null}
    </View>
  );

const DownloadBtn: React.FC<{ styles: any; colors: ColorPalette; busy: boolean; compact?: boolean; onPress: () => void }> =
  ({ styles, colors, busy, compact, onPress }) => (
    <TouchableOpacity style={[styles.dlBtn, compact && styles.dlBtnCompact]} activeOpacity={0.8} disabled={busy} onPress={onPress}>
      {busy ? <ActivityIndicator size="small" color="#FFF" />
        : <><Ionicons name="download-outline" size={compact ? 15 : 14} color="#FFF" />{!compact && <Text style={styles.dlBtnText}>Download</Text>}</>}
    </TouchableOpacity>
  );

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 16, paddingTop: 14 },
    center: { padding: 30, alignItems: 'center' },

    banner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderRadius: 18, padding: 16, marginBottom: 22,
      shadowColor: c.primaryDeep, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
    },
    bannerIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    bannerTitle: { fontSize: 15.5, fontFamily: fonts.extrabold, color: '#FFF', letterSpacing: -0.3 },
    bannerSub: { fontSize: 12, fontFamily: fonts.regular, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionDot: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 15, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    sectionMeta: { backgroundColor: c.backgroundAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    sectionMetaText: { fontSize: 11, fontFamily: fonts.bold, color: c.textSecondary },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      paddingRight: 12, marginBottom: 24, overflow: 'hidden',
      shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    divider: { borderTopWidth: 1, borderTopColor: c.border },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
    docAccent: { width: 4, alignSelf: 'stretch' },
    docIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
    docTitle: { fontSize: 14, fontFamily: fonts.bold, color: c.text, letterSpacing: -0.2 },
    docDesc: { fontSize: 11.5, fontFamily: fonts.regular, color: c.textTertiary, marginTop: 2 },

    viewBtn: {
      width: 36, height: 34, borderRadius: 10, backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    dlBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary,
      borderRadius: 11, paddingHorizontal: 13, paddingVertical: 8, justifyContent: 'center',
    },
    dlBtnCompact: { paddingHorizontal: 0, width: 36, height: 34 },
    dlBtnText: { fontSize: 12, fontFamily: fonts.bold, color: '#FFF' },

    noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.backgroundAlt, borderRadius: 12, padding: 14, marginBottom: 24 },
    noteText: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, lineHeight: 18 },

    emptyCard: { backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 24, alignItems: 'center', marginBottom: 24 },
    emptyIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: c.text },
    emptyText: { fontSize: 12.5, fontFamily: fonts.regular, color: c.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 18 },
  });
}
