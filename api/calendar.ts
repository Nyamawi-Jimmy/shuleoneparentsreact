import { apiFetch } from '../config/api';
import { TermEvent } from './calendar.types';

/**
 * GET /api/parent/children/{studentId}/events[?from&to]
 * With no dates, returns all events for the child's school.
 */
export function getChildEvents(
  accessToken: string,
  studentId: number,
  range?: { from?: string; to?: string },
) {
  const qs = new URLSearchParams();
  if (range?.from) qs.set('from', range.from);
  if (range?.to) qs.set('to', range.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<TermEvent[]>(
    `/api/parent/children/${studentId}/events${query}`,
    { accessToken },
  );
}
