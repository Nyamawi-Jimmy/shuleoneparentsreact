import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
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
              icon="close-circle"
              tint={colors.danger}
              title="Payment didn't go through"
              subtitle={error ?? 'Please try again.'}
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
const FormStep: React.FC<{
  amount: string; setAmount: (s: string) => void;
  phone: string; setPhone: (s: string) => void;
  amountError: string | null; phoneError: string | null;
  options: PaymentOptions | null;
  studentName?: string;
  onPay: () => void;
}> = ({ amount, setAmount, phone, setPhone, amountError, phoneError, options, studentName, onPay }) => (
  <>
    <View style={styles.greenBanner}>
      <View style={styles.mpesaBadge}>
        <Text style={styles.mpesaBadgeText}>M-PESA</Text>
      </View>
      <Text style={styles.bannerText}>
        Pay {studentName ? studentName + "'s" : "your child's"} fees with an instant STK push.
      </Text>
    </View>

    <Text style={styles.label}>Amount (KSh)</Text>
    <View style={[styles.inputWrap, amountError && styles.inputError]}>
      <Text style={styles.inputPrefix}>KSh</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
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

    <View style={{ flex: 1 }} />

    <TouchableOpacity activeOpacity={0.85} style={styles.payBtn} onPress={onPay}>
      <Ionicons name="phone-portrait-outline" size={16} color="#fff" />
      <Text style={styles.payBtnText}>Send STK Push</Text>
    </TouchableOpacity>
  </>
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
}> = ({ icon, tint, title, subtitle, spinner, actionLabel, onAction, secondary, onSecondary, footnote }) => (
  <View style={styles.stateView}>
    <View style={[styles.stateIcon, { backgroundColor: tint + '20' }]}>
      <MaterialCommunityIcons name={icon} size={48} color={tint} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateSubtitle}>{subtitle}</Text>
    {spinner && <ActivityIndicator size="small" color={tint} style={{ marginTop: spacing.md }} />}
    {footnote && <Text style={styles.stateFootnote}>{footnote}</Text>}

    <View style={{ flex: 1 }} />

    {actionLabel && (
      <TouchableOpacity activeOpacity={0.85} style={[styles.payBtn, { backgroundColor: tint }]} onPress={onAction}>
        <Text style={styles.payBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
    {secondary && (
      <TouchableOpacity activeOpacity={0.7} onPress={onSecondary} style={{ marginTop: spacing.sm }}>
        <Text style={styles.secondaryBtnText}>{secondary}</Text>
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
  secondaryBtnText: {
    textAlign: 'center', color: colors.textSecondary,
    fontSize: 13, fontWeight: '700', paddingVertical: 8,
  },

  stateView: { flex: 1, alignItems: 'center', paddingTop: 40 },
  stateIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stateTitle: { ...typography.h2, color: colors.text, textAlign: 'center' },
  stateSubtitle: {
    ...typography.body, color: colors.textSecondary,
    textAlign: 'center', marginTop: spacing.sm, lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  stateFootnote: { fontSize: 11, color: colors.textTertiary, marginTop: spacing.md, fontWeight: '600', letterSpacing: 0.5 },
});
