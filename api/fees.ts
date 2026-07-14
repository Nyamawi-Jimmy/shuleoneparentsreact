import { apiFetch, API_BASE_URL } from '../config/api';
import {
  FeeSummary, FeeStatement, FeePayment,
  PaymentOptions, InitiateFeePaymentRequest,
} from './fees.types';

// =================================================================
// Existing endpoints (unchanged)
// =================================================================
export function getChildFees(accessToken: string, studentId: number) {
  return apiFetch<FeeSummary>(
    `/api/parent/children/${studentId}/fees`,
    { accessToken },
  );
}

export function getChildFeeStatement(
  accessToken: string,
  studentId: number,
  filters?: { year?: number; term?: number },
) {
  const qs = new URLSearchParams();
  if (filters?.year != null) qs.set('year', String(filters.year));
  if (filters?.term != null) qs.set('term', String(filters.term));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<FeeStatement>(
    `/api/parent/children/${studentId}/fees/statement${query}`,
    { accessToken },
  );
}

// =================================================================
// Payment flow (NEW)
// =================================================================

/** GET /api/parent/children/{id}/fees/payment-options */
export function getPaymentOptions(accessToken: string, studentId: number) {
  return apiFetch<PaymentOptions>(
    `/api/parent/children/${studentId}/fees/payment-options`,
    { accessToken },
  );
}

/** POST /api/parent/children/{id}/fees/pay/mpesa */
export function initiateMpesaPayment(
  accessToken: string,
  studentId: number,
  body: InitiateFeePaymentRequest,
) {
  return apiFetch<FeePayment>(
    `/api/parent/children/${studentId}/fees/pay/mpesa`,
    {
      method: 'POST',
      accessToken,
      body,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/** GET /api/parent/children/{id}/fees/payments */
export function getChildFeePayments(accessToken: string, studentId: number) {
  return apiFetch<FeePayment[]>(
    `/api/parent/children/${studentId}/fees/payments`,
    { accessToken },
  );
}

/** GET /api/parent/fees/payments/{paymentId} (status polling) */
export function getFeePayment(accessToken: string, paymentId: number) {
  return apiFetch<FeePayment>(
    `/api/parent/fees/payments/${paymentId}`,
    { accessToken },
  );
}

// =================================================================
// PDF downloads - return ready-to-open URLs (need Bearer header so
// the caller usually fetches as blob, OR backend supports a signed token).
// =================================================================
/**
 * The school's own branded receipt PDF. Pass a ledger `ref` to fetch that
 * specific receipt (matches the web receipt.pdf?ref= endpoint); omit for the
 * generic latest receipt.
 */
export function buildReceiptPdfUrl(studentId: number, ref?: string | null): string {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  return `${API_BASE_URL}/api/parent/children/${studentId}/fees/receipt.pdf${query}`;
}

/**
 * The school's own statement PDF. scope 'TERM' = current term, 'FULL' = the
 * whole statement across all years (matches the web statement.pdf?scope= API).
 */
export function buildStatementPdfUrl(
  studentId: number,
  scope: 'TERM' | 'FULL' = 'TERM',
): string {
  return `${API_BASE_URL}/api/parent/children/${studentId}/fees/statement.pdf?scope=${scope}`;
}
