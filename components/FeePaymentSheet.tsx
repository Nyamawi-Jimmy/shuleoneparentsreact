import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  getPaymentOptions, initiateMpesaPayment, getFeePayment,
} from '../api/fees';
import {
  PaymentOptions, FeePayment, normalizeKenyanPhone,
  isPaymentSuccess, isPaymentFailed, formatMoney,
} from '../api/fees.types';

interface Props {
  visible: boolean;
  onClose: () => void;
  studentId: number;
  studentName?: string;
  /** Suggested amount (e.g., the outstanding balance). User can override. */
  defaultAmount?: number;
  /** Suggested phone (e.g., from parent profile). */
  defaultPhone?: string;
  /** Called after a successful payment so the caller can refresh fees. */
  onSuccess?: (payment: FeePayment) => void;
}

type Step =
  | 'form'                  // user enters amount + phone
  | 'initiating'            // sending STK push
  | 'awaiting'              // STK sent, polling for status
  | 'success'
  | 'failed';

export const FeePaymentSheet: React.FC<Props> = ({
  visible, onClose, studentId, studentName, defaultAmount, defaultPhone, onSuccess,
}) => {
  const { accessToken } = useAuth();

  const [step, setStep] = useState<Step>('form');
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [amount, setAmount] = useState(defaultAmount?.toString() ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [payment, setPayment] = useState<FeePayment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Reset on close ───
  useEffect(() => {
    if (!visible) {
      setStep('form');
      setPayment(null);
      setError(null);
      setPhoneError(null);
      setAmountError(null);
    }
  }, [visible]);

  // ── Load payment options on open ───
  useEffect(() => {
    if (!visible || !accessToken) return;
    (async () => {
      try {
        const opts = await getPaymentOptions(accessToken, studentId);
        setOptions(opts);
      } catch {
        setOptions(null);
      }
    })();
  }, [visible, accessToken, studentId]);

  // ── Cleanup poll timer on unmount / step change ───
  useEffect(() => () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }, []);

  // ── Validate + initiate ───
  const handlePay = async () => {
    setPhoneError(null);
    setAmountError(null);
    setError(null);

    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt < 1) {
      setAmountError('Enter a valid amount');
      return;
    }
    const phoneNorm = normalizeKenyanPhone(phone);
    if (!phoneNorm) {
      setPhoneError('Enter a valid Kenyan phone number');
      return;
    }
    if (!accessToken) return;

    setStep('initiating');
    try {
      const p = await initiateMpesaPayment(accessToken, studentId, {
        amount: amt,
        phone: phoneNorm,
      });
      setPayment(p);
      setStep('awaiting');
      if (p.id) startPolling(p.id);
    } catch (e: any) {
      setError(e?.message ?? 'Could not initiate payment.');
      setStep('failed');
    }
  };

  const startPolling = (paymentId: number) => {
    const POLL_MS = 3000;
    const MAX_ATTEMPTS = 30;     // ~90 seconds
    let attempts = 0;

    pollTimerRef.current = setInterval(async () => {
      attempts += 1;
      if (!accessToken) return;
      try {
        const p = await getFeePayment(accessToken, paymentId);
        setPayment(p);
        if (isPaymentSuccess(p.status)) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setStep('success');
          onSuccess?.(p);
        } else if (isPaymentFailed(p.status)) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setError(p.failureReason ?? 'Payment failed or was cancelled.');
          setStep('failed');
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setError('Payment is taking longer than expected. Check Payments later.');
          setStep('failed');
        }
      } catch { /* keep polling */ }
    }, POLL_MS);
  };

  const handleClose = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    onClose();
  };

  // ── Render ───
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pay School Fees</Text>
          <TouchableOpacity hitSlop={8} onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {step === 'form' && (
            <FormStep
              amount={amount} setAmount={setAmount}
              phone={phone} setPhone={setPhone}
              amountError={amountError} phoneError={phoneError}
              options={options} studentName={studentName}
              balance={defaultAmount ?? null}
              onPay={handlePay}
            />
          )}

          {step === 'initiating' && (
            <StateView
              icon="cellphone-message"
              tint={colors.primary}
              title="Sending STK push..."
              subtitle="Wait while we send the M-Pesa prompt to your phone."
              spinner
            />
          )}

          {step === 'awaiting' && (
            <StateView
              icon="cellphone-key"
              tint={colors.primary}
              title="Check your phone"
              subtitle={`Enter your M-Pesa PIN on the prompt sent to ${phone}.\nYou'll be notified once payment is confirmed.`}
              spinner
              footnote={`Status: ${payment?.status ?? 'PENDING'}`}
            />
          )}

          {step === 'success' && (
            <StateView
              icon="check-circle"
              tint={colors.success}
              title="Payment received!"
              subtitle={
                payment?.mpesaReceipt
                  ? `Receipt: ${payment.mpesaReceipt}\nAmount: ${formatMoney(payment.amount, 'KSh')}`
                  : 'Your payment has been recorded. The school will confirm shortly.'
              }
              actionLabel="Done"
              onAction={handleClose}
            />
          )}

          {step === 'failed' && (
            <StateView
              icon="alert-circle-outline"
              tint={colors.danger}
              tone="danger"
              title="Payment didn't go through"
              subtitle={error ?? 'The payment was not completed. No money has left your account — you can try again.'}
              actionLabel="Try again"
              onAction={() => setStep('form')}
              secondary="Close"
              onSecondary={handleClose}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// =================================================================
// Form step
// =================================================================
const ksh = (n: number) => `KSh ${(Number.isFinite(n) ? n : 0).toLocaleString('en-KE')}`;

const FormStep: React.FC<{
  amount: string; setAmount: (s: string) => void;
  phone: string; setPhone: (s: string) => void;
  amountError: string | null; phoneError: string | null;
  options: PaymentOptions | null;
  studentName?: string;
  balance: number | null;
  onPay: () => void;
}> = ({ amount, setAmount, phone, setPhone, amountError, phoneError, options, studentName, balance, onPay }) => {
  // Preset amounts, mirroring the web: Full = balance, Half = balance/2 rounded
  // to the nearest 50 (min 10). "Custom" lets the parent type their own.
  const hasBalance = balance != null && balance > 0;
  const fullAmt = hasBalance ? Math.round(balance!) : 0;
  const halfAmt = hasBalance ? Math.max(10, Math.round(balance! / 2 / 50) * 50) : 0;
  const [mode, setMode] = useState<'full' | 'half' | 'custom'>(hasBalance ? 'full' : 'custom');

  const choose = (m: 'full' | 'half' | 'custom', value: number) => {
    setMode(m);
    if (m !== 'custom') setAmount(String(value));
  };
  const amtNum = parseFloat(amount);
  const canPay = Number.isFinite(amtNum) && amtNum >= 1 && !!phone.trim();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      {/* Outstanding balance summary */}
      {hasBalance && (
        <View style={styles.balCard}>
          <View style={styles.mpesaBadgeLg}>
            <Text style={styles.mpesaBadgeText}>M-PESA</Text>
          </View>
          <Text style={styles.balLabel}>
            {studentName ? `${studentName}'s outstanding balance` : 'Outstanding balance'}
          </Text>
          <Text style={styles.balValue}>{ksh(fullAmt)}</Text>
        </View>
      )}

      {/* Choose how much to pay — Full / Half / Custom */}
      {hasBalance && (
        <>
          <Text style={styles.label}>How much would you like to pay?</Text>
          <View style={styles.presetRow}>
            <PresetCard
              title="Pay in full" amountLabel={ksh(fullAmt)}
              active={mode === 'full'} onPress={() => choose('full', fullAmt)}
            />
            <PresetCard
              title="Pay half" amountLabel={ksh(halfAmt)}
              active={mode === 'half'} onPress={() => choose('half', halfAmt)}
            />
          </View>
          <TouchableOpacity
            style={[styles.customChip, mode === 'custom' && styles.customChipOn]}
            activeOpacity={0.8}
            onPress={() => choose('custom', 0)}
          >
            <Ionicons name="create-outline" size={15} color={mode === 'custom' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.customChipText, mode === 'custom' && { color: colors.primary }]}>
              Enter a different amount
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Amount field (auto-selects "custom" once edited) */}
      <Text style={[styles.label, { marginTop: spacing.lg }]}>Amount (KSh)</Text>
      <View style={[styles.inputWrap, amountError && styles.inputError]}>
        <Text style={styles.inputPrefix}>KSh</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={(t) => { setMode('custom'); setAmount(t); }}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      {amountError && <Text style={styles.errorText}>{amountError}</Text>}

      <Text style={[styles.label, { marginTop: spacing.lg }]}>M-Pesa phone number</Text>
      <View style={[styles.inputWrap, phoneError && styles.inputError]}>
        <Text style={styles.inputPrefix}>+254</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="7XX XXX XXX"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

      {options?.payInstructions && (
        <View style={styles.instructions}>
          <Ionicons name="information-circle-outline" size={15} color={colors.info} />
          <Text style={styles.instructionsText}>{options.payInstructions}</Text>
        </View>
      )}

      {options?.shortcode && (
        <View style={styles.shortcodeRow}>
          <MaterialCommunityIcons name="cellphone" size={15} color={colors.textSecondary} />
          <Text style={styles.shortcodeText}>
            M-Pesa shortcode: <Text style={{ fontWeight: '800', color: colors.text }}>{options.shortcode}</Text>
          </Text>
        </View>
      )}

      <Text style={styles.reassure}>
        Paid straight to the school&apos;s M-Pesa account — you&apos;ll get the school receipt as usual.
      </Text>

      <TouchableOpacity activeOpacity={0.85} style={[styles.payBtn, !canPay && { opacity: 0.55 }]} onPress={onPay}>
        <MaterialCommunityIcons name="cellphone-check" size={17} color="#fff" />
        <Text style={styles.payBtnText}>
          {canPay && Number.isFinite(amtNum) ? `Send STK Push · ${ksh(amtNum)}` : 'Send STK Push'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const PresetCard: React.FC<{ title: string; amountLabel: string; active: boolean; onPress: () => void }> =
  ({ title, amountLabel, active, onPress }) => (
    <TouchableOpacity style={[styles.preset, active && styles.presetOn]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.presetRadio, active && styles.presetRadioOn]}>
        {active && <View style={styles.presetRadioDot} />}
      </View>
      <Text style={[styles.presetTitle, active && { color: colors.primary }]}>{title}</Text>
      <Text style={[styles.presetAmt, active && { color: colors.primary }]}>{amountLabel}</Text>
    </TouchableOpacity>
  );

// =================================================================
// State view (loading / success / failure)
// =================================================================
const StateView: React.FC<{
  icon: any; tint: string; title: string; subtitle: string;
  spinner?: boolean;
  actionLabel?: string; onAction?: () => void;
  secondary?: string; onSecondary?: () => void;
  footnote?: string;
  tone?: 'neutral' | 'success' | 'danger';
}> = ({ icon, tint, title, subtitle, spinner, actionLabel, onAction, secondary, onSecondary, footnote, tone = 'neutral' }) => (
  <View style={styles.stateView}>
    <View style={styles.stateTop}>
      <View style={[styles.stateHalo, { backgroundColor: tint + '14' }]}>
        <View style={[styles.stateIcon, { backgroundColor: tint + '22' }]}>
          <MaterialCommunityIcons name={icon} size={44} color={tint} />
        </View>
      </View>
      <Text style={styles.stateTitle}>{title}</Text>

      {tone === 'danger' ? (
        <View style={styles.reasonCard}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginTop: 1 }} />
          <Text style={styles.reasonText}>{subtitle}</Text>
        </View>
      ) : (
        <Text style={styles.stateSubtitle}>{subtitle}</Text>
      )}

      {spinner && <ActivityIndicator size="small" color={tint} style={{ marginTop: spacing.lg }} />}
      {footnote && (
        <View style={[styles.footChip, { backgroundColor: tint + '14' }]}>
          <View style={[styles.footDot, { backgroundColor: tint }]} />
          <Text style={[styles.footChipText, { color: tint }]}>{footnote}</Text>
        </View>
      )}
    </View>

    <View style={{ flex: 1 }} />

    {actionLabel && (
      <TouchableOpacity activeOpacity={0.85} style={[styles.stateBtn, { backgroundColor: tint }]} onPress={onAction}>
        <Text style={styles.stateBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
    {secondary && (
      <TouchableOpacity activeOpacity={0.7} onPress={onSecondary} style={styles.stateBtnGhost}>
        <Text style={styles.stateBtnGhostText}>{secondary}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.h2, color: colors.text },
  body: { flex: 1, padding: spacing.lg },

  greenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#dcfce7',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.lg, marginBottom: spacing.lg,
  },
  mpesaBadge: {
    backgroundColor: '#25c764',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  mpesaBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  bannerText: { flex: 1, fontSize: 12.5, color: '#15803d', fontWeight: '700', lineHeight: 17 },

  // Balance summary card at the top of the form.
  balCard: {
    backgroundColor: '#0b3d2e', borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.lg, overflow: 'hidden',
  },
  mpesaBadgeLg: {
    alignSelf: 'flex-start', backgroundColor: '#25c764',
    paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 6, marginBottom: 12,
  },
  balLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  balValue: { fontSize: 30, color: '#fff', fontWeight: '800', letterSpacing: -0.8, marginTop: 3 },

  // Full / Half preset cards.
  presetRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  preset: {
    flex: 1, backgroundColor: '#fff', borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, padding: 13,
  },
  presetOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  presetRadio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 9,
  },
  presetRadioOn: { borderColor: colors.primary },
  presetRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  presetTitle: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },
  presetAmt: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.3 },

  customChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg,
    paddingVertical: 11, paddingHorizontal: 13, backgroundColor: '#fff',
  },
  customChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  customChipText: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary },

  reassure: {
    fontSize: 11, color: colors.textTertiary, textAlign: 'center',
    lineHeight: 16, marginTop: spacing.lg, marginBottom: spacing.md, paddingHorizontal: 8,
  },

  label: {
    ...typography.label, color: colors.textSecondary, marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  inputPrefix: { ...typography.body, color: colors.textSecondary, marginRight: 8, fontWeight: '700' },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: 12 },
  errorText: { color: colors.danger, fontSize: 11.5, marginTop: 4, fontWeight: '600' },

  instructions: {
    flexDirection: 'row', gap: 6, padding: spacing.md,
    backgroundColor: colors.infoSoft, borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  instructionsText: { flex: 1, fontSize: 12, color: colors.info, lineHeight: 17, fontWeight: '500' },

  shortcodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.sm, paddingHorizontal: 2,
  },
  shortcodeText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: radius.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  stateView: { flex: 1, alignItems: 'stretch', paddingTop: 44 },
  stateTop: { alignItems: 'center' },
  stateHalo: {
    width: 118, height: 118, borderRadius: 59,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  stateIcon: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
  },
  stateTitle: { ...typography.h2, color: colors.text, textAlign: 'center', fontWeight: '800' },
  stateSubtitle: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', marginTop: spacing.sm, lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  reasonCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#fef2f2', borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#fecaca',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    marginTop: spacing.md, marginHorizontal: spacing.sm,
  },
  reasonText: { flex: 1, fontSize: 12.5, color: '#b91c1c', lineHeight: 18, fontWeight: '600' },
  footChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: spacing.lg,
  },
  footDot: { width: 6, height: 6, borderRadius: 3 },
  footChipText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 },

  stateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: radius.xl,
  },
  stateBtnText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
  stateBtnGhost: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: radius.xl, marginTop: spacing.sm,
    borderWidth: 1.5, borderColor: colors.border,
  },
  stateBtnGhostText: { color: colors.textSecondary, fontSize: 13.5, fontWeight: '700' },
});
