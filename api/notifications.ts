import { apiFetch } from '../config/api';
import {
  ParentNotification,
  NotificationPrefs,
  ParentReminder,
  SetReminderRequest,
  defaultPrefs,
} from './notifications.types';

// =================================================================
// Notifications
// =================================================================

/** GET /api/parent/notifications */
export function listNotifications(accessToken: string) {
  return apiFetch<ParentNotification[]>(
    '/api/parent/notifications',
    { accessToken },
  );
}

/** GET /api/parent/notifications/unread-count */
export function getUnreadCount(accessToken: string) {
  return apiFetch<{ count: number } | number>(
    '/api/parent/notifications/unread-count',
    { accessToken },
  );
}

/** POST /api/parent/notifications/{id}/read */
export function markNotificationRead(accessToken: string, id: number) {
  return apiFetch<void>(
    `/api/parent/notifications/${id}/read`,
    { method: 'POST', accessToken },
  );
}

/** POST /api/parent/notifications/read-all */
export function markAllRead(accessToken: string) {
  return apiFetch<void>(
    '/api/parent/notifications/read-all',
    { method: 'POST', accessToken },
  );
}

/**
 * GET /api/parent/notifications/prefs — the backend returns the canonical
 * per-category map { FEES: { inApp, push }, ... } with every category present.
 */
export async function getNotificationPrefs(accessToken: string): Promise<NotificationPrefs> {
  const raw = await apiFetch<NotificationPrefs>(
    '/api/parent/notifications/prefs',
    { accessToken },
  );
  return normalizePrefs(raw);
}

/** PUT /api/parent/notifications/prefs — send the full map back. */
export async function setNotificationPrefs(
  accessToken: string,
  prefs: NotificationPrefs,
): Promise<NotificationPrefs> {
  const raw = await apiFetch<NotificationPrefs>(
    '/api/parent/notifications/prefs',
    { method: 'PUT', accessToken, body: prefs },
  );
  return normalizePrefs(raw);
}

/** Overlay the server map on all-on defaults so every category always renders. */
function normalizePrefs(raw: NotificationPrefs | null | undefined): NotificationPrefs {
  const out = defaultPrefs();
  if (raw && typeof raw === 'object') {
    for (const [cat, r] of Object.entries(raw)) {
      if (r && typeof r === 'object') {
        out[cat] = { inApp: (r as any).inApp !== false, push: (r as any).push !== false };
      }
    }
  }
  return out;
}

// =================================================================
// FCM token registration (POST /api/parent/fcm-token)
// =================================================================
export function registerFcmToken(accessToken: string, token: string) {
  // NOTE: apiFetch already JSON.stringifies `body`; pass the raw object (a
  // pre-existing bug elsewhere double-stringifies — see HANDOVER cleanup item).
  return apiFetch<void>(
    '/api/parent/fcm-token',
    {
      method: 'POST',
      accessToken,
      body: { token },
    },
  );
}

// =================================================================
// Reminders
// =================================================================

/** GET /api/parent/children/{studentId}/reminders */
export function listChildReminders(accessToken: string, studentId: number) {
  return apiFetch<ParentReminder[]>(
    `/api/parent/children/${studentId}/reminders`,
    { accessToken },
  );
}

/** POST /api/parent/children/{studentId}/reminders */
export function setReminder(
  accessToken: string,
  studentId: number,
  body: SetReminderRequest,
) {
  return apiFetch<ParentReminder>(
    `/api/parent/children/${studentId}/reminders`,
    {
      method: 'POST',
      accessToken,
      body,
    },
  );
}

/** DELETE /api/parent/reminders/{sourceType}/{sourceId} */
export function cancelReminder(
  accessToken: string,
  sourceType: string,
  sourceId: string,
) {
  return apiFetch<void>(
    `/api/parent/reminders/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}`,
    { method: 'DELETE', accessToken },
  );
}
