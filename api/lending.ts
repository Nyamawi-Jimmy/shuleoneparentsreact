// ShuleOne Lend endpoints on the Companion backend.
//
// All three are parent-scoped: the server resolves the parent from the JWT and
// checks that any studentId in the body belongs to them, so the client never
// sends a schoolId or a parentId.

import { apiFetch } from '../config/api';
import {
  LendingSummary, ConsentResult, LoanApplication, LoanApplicationRequest,
} from './lending.types';

/** GET /api/parent/lending/summary — every child, their score and offers, plus family applications. */
export function getLendingSummary(accessToken: string) {
  return apiFetch<LendingSummary>('/api/parent/lending/summary', { accessToken });
}

/**
 * POST /api/parent/lending/consent
 * Offers stay empty until the parent allows their fee history to be scored.
 * Revocable — pass granted:false to withdraw.
 */
export function setLendConsent(accessToken: string, studentId: number, granted: boolean) {
  return apiFetch<ConsentResult>('/api/parent/lending/consent', {
    method: 'POST',
    accessToken,
    body: { studentId, granted },
  });
}

/**
 * POST /api/parent/lending/applications
 * Rejections come back as 422 with a human reason in `message`, which apiFetch
 * already surfaces as the ApiError message.
 */
export function submitLoanApplication(accessToken: string, req: LoanApplicationRequest) {
  return apiFetch<LoanApplication>('/api/parent/lending/applications', {
    method: 'POST',
    accessToken,
    body: req,
  });
}
