import { apiFetch } from '../config/api';
import { LiveClass, LiveClassJoin, TermEvent, Announcement } from './communication.types';

/** GET /api/parent/announcements */
export function getAnnouncements(accessToken: string) {
  return apiFetch<Announcement[]>('/api/parent/announcements', { accessToken });
}

/** POST /api/parent/announcements/mark-read */
export function markAnnouncementRead(accessToken: string, announcementId: string) {
  return apiFetch<void>('/api/parent/announcements/mark-read', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ id: announcementId }),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/parent/announcements/read-ids - returns array of read announcement IDs */
export function getAnnouncementReadIds(accessToken: string) {
  return apiFetch<string[]>('/api/parent/announcements/read-ids', { accessToken });
}

/** GET /api/parent/children/{studentId}/live-classes */
export function getChildLiveClasses(accessToken: string, studentId: number) {
  return apiFetch<LiveClass[]>(
    `/api/parent/children/${studentId}/live-classes`,
    { accessToken },
  );
}

/**
 * GET /api/parent/children/{studentId}/live-classes/{id}/join
 * Returns a Jitsi JWT + ready-to-open external joinUrl for one class.
 */
export function joinChildLiveClass(accessToken: string, studentId: number, liveClassId: number) {
  return apiFetch<LiveClassJoin>(
    `/api/parent/children/${studentId}/live-classes/${liveClassId}/join`,
    { accessToken },
  );
}

/** GET /api/parent/children/{studentId}/events[?from&to] */
export function getChildEvents(
  accessToken: string,
  studentId: number,
  filters?: { from?: string; to?: string },
) {
  const qs = new URLSearchParams();
  if (filters?.from) qs.set('from', filters.from);
  if (filters?.to) qs.set('to', filters.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<TermEvent[]>(
    `/api/parent/children/${studentId}/events${query}`,
    { accessToken },
  );
}
