// =================================================================
// Fees types - extended to include the payment flow.
// =================================================================

export type Money = number | null;

// Existing summary + statement (unchanged)
export interface FeeSummary {
  studentId: number | null;
  admNo: string | null;
  studentName: string | null;
  className: string | null;
  currency: string | null;
  broughtForward: Money;
  termBilling: Money;
  paid: Money;
  balance: Money;
}

export interface StatementLine {
  date: string | null;
  description: string | null;
  type: string | null;
  reference: string | null;
  debit: Money;
  credit: Money;
}

export interface FeeStatement {
  studentId: number | null;
  studentName: string | null;
  className: string | null;
  year: number | null;
  term: number | null;
  currency: string | null;
  openingBalance: Money;
  currentBalance: Money;
  lines: StatementLine[] | null;
}

// =================================================================
// Payment flow (NEW)
// =================================================================

/** GET .../fees/payment-options → PaymentOptionsDTO */
export interface PaymentOptions {
  mpesaStkEnabled: boolean | null;
  shortcode: string | null;
  payInstructions: string | null;
}

/** POST .../fees/pay/mpesa request body */
export interface InitiateFeePaymentRequest {
  amount: number;
  phone: string;        // 2547XXXXXXXX format expected by Daraja
}

export type FeePaymentStatus =
  | 'PENDING'
  | 'AWAITING_USER'      // STK push sent, waiting for user PIN
  | 'SUCCESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | string;

/** FeePaymentDTO returned by /pay/mpesa and /fees/payments/{id} */
export interface FeePayment {
  id: number | null;
  studentId: number | null;
  amount: Money;
  phone: string | null;
  status: FeePaymentStatus | null;
  mpesaReceipt: string | null;
  failureReason: string | null;
  createdAt: string | null;
  completedAt: string | null;
}

// =================================================================
// Helpers
// =================================================================
export function moneyToNumber(m: Money): number {
  if (m == null) return 0;
  if (typeof m === 'number' && Number.isFinite(m)) return m;
  const n = Number(m);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(amount: Money, currency: string | null = 'KSh'): string {
  const n = moneyToNumber(amount);
  return `${currency ?? 'KSh'} ${n.toLocaleString('en-KE')}`;
}

/** Normalize a Kenyan phone number to Daraja's 2547XXXXXXXX format. */
export function normalizeKenyanPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('7') && digits.length === 9) return '254' + digits;
  if (digits.startsWith('1') && digits.length === 9) return '254' + digits;
  return null;
}

/** True for SUCCESS / COMPLETED. */
export function isPaymentSuccess(status: FeePaymentStatus | null): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'SUCCESS' || s === 'COMPLETED';
}

/** True for FAILED / CANCELLED. */
export function isPaymentFailed(status: FeePaymentStatus | null): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'FAILED' || s === 'CANCELLED';
}
