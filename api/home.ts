import { apiFetch } from '../config/api';

// =================================================================
// Parent home feed — GET /api/parent/home → ParentHomeDto
// Drives the "Today" screen: status line, needs-attention actions,
// and today's timeline signals. Parent-level (aggregates children).
// =================================================================

export interface ParentHomeAction {
  id: string;
  /** e.g. 'PAY_FEES' | 'ATTENDANCE' | 'ANNOUNCEMENTS' | ... */
  kind: string;
  /** 'URGENT' | 'SOON' | 'WHENEVER' */
  priority?: string | null;
  title: string;
  subtitle?: string | null;
  cta?: string | null;
  /** Web deep link like '/parent/finance' — mapped to a mobile route by the screen. */
  deepLink?: string | null;
  amount?: number | null;
  [key: string]: any;
}

export interface ParentHomeSignal {
  id?: string;
  kind?: string | null;
  title: string;
  subtitle?: string | null;
  /** epoch millis */
  occurredAt?: number | null;
  isNew?: boolean;
  deepLink?: string | null;
  [key: string]: any;
}

export interface ParentHome {
  status?: string | null;
  statusLine?: string | null;
  generatedAt?: number | null;
  summary?: { childrenNeedingYou?: number | null; totalActions?: number | null } | null;
  actions: ParentHomeAction[];
  signals: ParentHomeSignal[];
}

export function getParentHome(accessToken: string) {
  return apiFetch<ParentHome>('/api/parent/home', { accessToken });
}

/** Mark the current home signals as seen. */
export function markHomeRead(accessToken: string) {
  return apiFetch<unknown>('/api/parent/home/read', { method: 'POST', accessToken });
}
