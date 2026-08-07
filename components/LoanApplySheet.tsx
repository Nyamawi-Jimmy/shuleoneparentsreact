// The apply step of ShuleOne Lend — one bank's offer, opened as a sheet.
//
// The parent has already picked a bank by the time this opens, so the sheet's
// only job is amount, term and purpose, with the installment recalculating as
// they move. The preview figure is computed locally; the number the bank
// commits to is whatever the server returns on submit.

import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/palettes';
import { moneyToNumber } from '../api/fees.types';
import {
  LoanOffer, LoanApplicationRequest, PURPOSES, estimateInstallment, formatRate,
} from '../api/lending.types';

const ksh = (n: number): string => `KSh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-KE')}`;

interface Props {
  visible: boolean;
  onClose: () => void;
  offer: LoanOffer | null;
  studentId: number | null;
  studentName?: string | null;
  /** Resolves to an error message, or null when the application went through. */
  onSubmit: (req: LoanApplicationRequest) => Promise<string | null>;
}

/**
 * Offer terms are quoted at the product's maximum. Rather than a 1–24 picker,
 * offer the repayment periods families actually ask for, always including the
 * product's own ceiling so the cheapest monthly figure stays reachable.
 */
function termChoices(maxMonths: number): number[] {
  if (!Number.isFinite(maxMonths) || maxMonths <= 1) return [Math.max(1, maxMonths || 1)];
  const common = [3, 6, 9, 12, 18, 24].filter((m) => m <= maxMonths);
  if (!common.includes(maxMonths)) common.push(maxMonths);
  return common.length ? common : [maxMonths];
}

export const LoanApplySheet: React.FC<Props> = ({
  visible, onClose, offer, studentId, studentName, onSubmit,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const minAmount = moneyToNumber(offer?.minAmount ?? null);
  const maxAmount = moneyToNumber(offer?.offerAmount ?? null);
  const rate = moneyToNumber(offer?.annualRate ?? null);
  const maxTerm = offer?.maxTermMonths ?? 12;
  const terms = useMemo(() => termChoices(maxTerm), [maxTerm]);

  const [amount, setAmount] = useState<string>('');
  const [term, setTerm] = useState<number>(terms[terms.length - 1]);
  const [purpose, setPurpose] = useState<string>(offer?.purpose ?? 'SCHOOL_FEES');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Re-seed whenever a different offer opens the sheet.
  const offerKey = `${offer?.bankId ?? ''}-${offer?.productId ?? ''}`;
  const [seededFor, setSeededFor] = useState<string>('');
  if (visible && offerKey !== seededFor) {
    setSeededFor(offerKey);
    setAmount(maxAmount > 0 ? String(Math.round(maxAmount)) : '');
    setTerm(terms[terms.length - 1]);
    setPurpose(offer?.purpose ?? 'SCHOOL_FEES');
    setError(null);
    setDone(false);
    setBusy(false);
  }

  const amountNum = Number(amount.replace(/[^0-9.]/g, ''));
  const amountValid = Number.isFinite(amountNum) && amountNum >= minAmount && amountNum <= maxAmount;
  const installment = amountValid ? estimateInstallment(amountNum, rate, term) : 0;
  const totalRepayable = installment * term;

  const amountHint = !amount
    ? `Between ${ksh(minAmount)} and ${ksh(maxAmount)}`
    : !amountValid
      ? `Enter an amount between ${ksh(minAmount)} and ${ksh(maxAmount)}`
      : null;

  const handleSubmit = async () => {
    if (!offer || studentId == null || !amountValid || busy) return;
    setBusy(true);
    setError(null);
    const msg = await onSubmit({
      studentId,
      bankId: offer.bankId,
      productId: offer.productId,
      amount: amountNum,
      termMonths: term,
      purpose,
    });
    setBusy(false);
    if (msg) setError(msg);
    else setDone(true);
  };

  const accent = offer?.logoColor || colors.primary;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{done ? 'Application sent' : 'Apply for financing'}</Text>
          <TouchableOpacity hitSlop={8} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={styles.doneWrap}>
              <View style={[styles.doneIcon, { backgroundColor: colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              </View>
              <Text style={styles.doneTitle}>Sent to {offer?.bankName}</Text>
              <Text style={styles.doneText}>
                {offer?.bankName} will review this against your ShuleOne payment history. You&apos;ll see the
                decision under &quot;My applications&quot;. Approved money is paid straight to the school.
              </Text>
              <TouchableOpacity activeOpacity={0.85} onPress={onClose} style={{ width: '100%' }}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Which bank, and on whose behalf */}
              <View style={styles.bankRow}>
                <View style={[styles.bankMark, { backgroundColor: accent }]}>
                  <Text style={styles.bankMarkText}>{offer?.bankCode ?? '—'}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.bankName} numberOfLines={1}>{offer?.bankName}</Text>
                  <Text style={styles.bankMeta} numberOfLines={1}>
                    {offer?.productName} · {formatRate(offer?.annualRate ?? null)}
                  </Text>
                </View>
              </View>
              {!!studentName && (
                <Text style={styles.forChild}>For {studentName}</Text>
              )}

              <Text style={styles.label}>How much do you need?</Text>
              <View style={[styles.amountBox, amountHint && !!amount ? { borderColor: colors.danger } : null]}>
                <Text style={styles.amountPrefix}>KSh</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(t) => { setAmount(t); setError(null); }}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  editable={!busy}
                />
              </View>
              {!!amountHint && (
                <Text style={[styles.hint, !!amount && { color: colors.danger }]}>{amountHint}</Text>
              )}

              <Text style={styles.label}>Repay over</Text>
              <View style={styles.chipWrap}>
                {terms.map((m) => {
                  const on = m === term;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      activeOpacity={0.8}
                      disabled={busy}
                      onPress={() => setTerm(m)}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{m} mo</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>What is it for?</Text>
              <View style={styles.chipWrap}>
                {PURPOSES.map((p) => {
                  const on = p.value === purpose;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.chip, on && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      activeOpacity={0.8}
                      disabled={busy}
                      onPress={() => setPurpose(p.value)}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live preview — the number the parent is really deciding on */}
              <View style={[styles.preview, { borderColor: accent }]}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Estimated monthly</Text>
                  <Text style={[styles.previewValue, { color: accent }]}>
                    {amountValid ? ksh(installment) : '—'}
                  </Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabelSm}>Total repayable over {term} months</Text>
                  <Text style={styles.previewValueSm}>{amountValid ? ksh(totalRepayable) : '—'}</Text>
                </View>
              </View>

              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={!amountValid || busy}
                style={{ opacity: !amountValid || busy ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDeep]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.primaryBtn}
                >
                  {busy
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.primaryBtnText}>Send application</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Preview only — no money moves and no bank is contacted. Figures are simulations based on your
                real fee history.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 18, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
    },
    headerTitle: { fontSize: 16.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    body: { padding: 18, paddingBottom: 40 },

    bankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bankMark: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    bankMarkText: { color: '#FFF', fontFamily: fonts.extrabold, fontSize: 12.5, letterSpacing: 0.3 },
    bankName: { fontSize: 15.5, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.3 },
    bankMeta: { fontSize: 12, fontFamily: fonts.medium, color: c.textSecondary, marginTop: 2 },
    forChild: { fontSize: 12, fontFamily: fonts.medium, color: c.textTertiary, marginTop: 10 },

    label: {
      fontSize: 10.5, fontFamily: fonts.extrabold, color: c.textTertiary,
      letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 22, marginBottom: 9,
    },
    amountBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card, borderWidth: 1.5, borderColor: c.border,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4,
    },
    amountPrefix: { fontSize: 14, fontFamily: fonts.bold, color: c.textTertiary },
    amountInput: {
      flex: 1, fontSize: 24, fontFamily: fonts.extrabold, color: c.text,
      paddingVertical: 10, letterSpacing: -0.5,
    },
    hint: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textTertiary, marginTop: 7 },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
    },
    chipText: { fontSize: 12.5, fontFamily: fonts.bold, color: c.textSecondary },
    chipTextOn: { color: '#FFF' },

    preview: {
      marginTop: 24, borderRadius: 16, borderWidth: 1.5,
      backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 14,
    },
    previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    previewDivider: { height: 1, backgroundColor: c.border, marginVertical: 11 },
    previewLabel: { fontSize: 13, fontFamily: fonts.bold, color: c.text },
    previewValue: { fontSize: 21, fontFamily: fonts.extrabold, letterSpacing: -0.6 },
    previewLabelSm: { fontSize: 11.5, fontFamily: fonts.medium, color: c.textSecondary, flex: 1 },
    previewValueSm: { fontSize: 13, fontFamily: fonts.bold, color: c.text },

    errorBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      borderRadius: 12, padding: 12, marginTop: 18,
    },
    errorText: { flex: 1, fontSize: 12.5, fontFamily: fonts.medium, lineHeight: 18 },

    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 14, paddingVertical: 15, marginTop: 22,
    },
    primaryBtnText: { color: '#FFF', fontSize: 15, fontFamily: fonts.bold },

    disclaimer: {
      fontSize: 11, fontFamily: fonts.regular, color: c.textTertiary,
      lineHeight: 16, marginTop: 16, textAlign: 'center',
    },

    doneWrap: { alignItems: 'center', paddingTop: 30 },
    doneIcon: {
      width: 76, height: 76, borderRadius: 38,
      alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    },
    doneTitle: { fontSize: 19, fontFamily: fonts.extrabold, color: c.text, letterSpacing: -0.4 },
    doneText: {
      fontSize: 13, fontFamily: fonts.regular, color: c.textSecondary,
      lineHeight: 20, textAlign: 'center', marginTop: 10, paddingHorizontal: 6,
    },
  });
}
