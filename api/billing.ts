import { apiFetch } from '../config/api';
import {
  BillingStatus, BillingPayment, BillingHistoryEntry,
  MpesaCheckoutBody, PaystackCheckoutBody,
  parseBillingStatus, parseBillingPayment, normalizeHistoryEntry,
} from './billing.types';

// =================================================================
// GET /api/parent/billing/status (returns JSON-string)
// =================================================================
export async function getBillingStatus(accessToken: string): Promise<BillingStatus> {
  const raw = await apiFetch<string | object>('/api/parent/billing/status', { accessToken });
  return parseBillingStatus(raw);
}

// =================================================================
// GET /api/parent/billing/history (returns Map[])
// =================================================================
export async function getBillingHistory(accessToken: string): Promise<BillingHistoryEntry[]> {
  const raw = await apiFetch<Record<string, any>[]>('/api/parent/billing/history', { accessToken });
  return (raw ?? []).map(normalizeHistoryEntry);
}

// =================================================================
// GET /api/parent/billing/payments/{id}  (status polling)
// =================================================================
export async function getBillingPayment(accessToken: string, paymentId: number): Promise<BillingPayment> {
  const raw = await apiFetch<string | object>(`/api/parent/billing/payments/${paymentId}`, { accessToken });
  return parseBillingPayment(raw);
}

// =================================================================
// Per-child checkout
// =================================================================
export async function startTrial(accessToken: string, studentId: number) {
  return apiFetch<string>(`/api/parent/billing/child/${studentId}/trial`, {
    method: 'POST',
    accessToken,
  });
}

export async function mpesaCheckoutChild(
  accessToken: string,
  studentId: number,
  body: MpesaCheckoutBody,
): Promise<BillingPayment> {
  const raw = await apiFetch<string | object>(
    `/api/parent/billing/child/${studentId}/mpesa/checkout`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return parseBillingPayment(raw);
}

export async function paystackCheckoutChild(
  accessToken: string,
  studentId: number,
  body: PaystackCheckoutBody,
  qs = '',
): Promise<BillingPayment> {
  const raw = await apiFetch<string | object>(
    `/api/parent/billing/child/${studentId}/paystack/checkout${qs}`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return parseBillingPayment(raw);
}

export async function cancelChildSubscription(accessToken: string, studentId: number) {
  return apiFetch<string>(`/api/parent/billing/child/${studentId}/cancel`, {
    method: 'POST',
    accessToken,
  });
}

export async function resumeChildSubscription(accessToken: string, studentId: number) {
  return apiFetch<string>(`/api/parent/billing/child/${studentId}/resume`, {
    method: 'POST',
    accessToken,
  });
}

// =================================================================
// Family checkout
// =================================================================
export async function mpesaCheckoutFamily(
  accessToken: string,
  body: MpesaCheckoutBody,
): Promise<BillingPayment> {
  const raw = await apiFetch<string | object>(
    '/api/parent/billing/family/mpesa/checkout',
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return parseBillingPayment(raw);
}

export async function paystackCheckoutFamily(
  accessToken: string,
  body: PaystackCheckoutBody,
  qs = '',
): Promise<BillingPayment> {
  const raw = await apiFetch<string | object>(
    `/api/parent/billing/family/paystack/checkout${qs}`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return parseBillingPayment(raw);
}

// =================================================================
// Paystack verification (called after browser callback)
// =================================================================
export async function verifyPaystack(accessToken: string, reference: string): Promise<BillingPayment> {
  const raw = await apiFetch<string | object>(
    `/api/parent/billing/paystack/verify/${encodeURIComponent(reference)}`,
    { accessToken },
  );
  return parseBillingPayment(raw);
}


// =================================================================
// Plans catalogue + promo codes (same endpoints the web page uses)
// =================================================================
import { BillingPlanRow, PromoResult } from './billing.types';

/** GET /api/learner/billing/plans — priced rows per seats × period. */
export function listBillingPlans(accessToken: string) {
  return apiFetch<BillingPlanRow[]>('/api/learner/billing/plans', { accessToken });
}

/** GET /api/parent/billing/promo/{code} — validate a discount/referral code. */
export function fetchParentPromo(
  accessToken: string, code: string, scope: 'child' | 'family',
  studentId?: number | null, period?: string | null,
) {
  const qs = [`scope=${scope}`, studentId != null ? `studentId=${studentId}` : null, period ? `period=${period}` : null]
    .filter(Boolean).join('&');
  return apiFetch<PromoResult>(`/api/parent/billing/promo/${encodeURIComponent(code)}?${qs}`, { accessToken });
}

/** Query-string suffix for paystack checkouts (period + promo). */
export function paystackQs(period?: string | null, code?: string | null): string {
  const qs = [period ? `period=${period}` : null, code ? `code=${encodeURIComponent(code)}` : null].filter(Boolean).join('&');
  return qs ? `?${qs}` : '';
}
