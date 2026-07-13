// =================================================================
// Notifications + Reminders types.
// =================================================================

export interface ParentNotification {
  id: number | null;
  parentId: number | null;
  studentId: number | null;
  category: string | null;        // FEES / ATTENDANCE / DIARY / ACADEMICS / TRANSPORT / etc.
  title: string | null;
  body: string | null;
  link: string | null;            // deep link
  readAt: string | null;          // ISO date-time, null = unread
  createdAt: string | null;
}

/**
 * Per-category routing preferences — the backend's canonical shape
 * (ParentNotificationController): { FEES: { inApp, push }, ... }.
 * Defaults are ALL ON; the server only stores changed values.
 */
export interface CategoryRouting { inApp: boolean; push: boolean }
export type NotificationPrefs = Record<string, CategoryRouting>;

/** The stable category set, in the order the web Settings page renders. */
export const PREF_CATEGORIES = [
  'FEES', 'ATTENDANCE', 'MESSAGES', 'ACADEMICS', 'ANNOUNCEMENTS', 'DIARY',
  'TRANSPORT', 'CALENDAR',
] as const;

export function defaultPrefs(): NotificationPrefs {
  const out: NotificationPrefs = {};
  for (const c of PREF_CATEGORIES) out[c] = { inApp: true, push: true };
  return out;
}

// =================================================================
// Reminders
// =================================================================
export interface SetReminderRequest {
  sourceType: string;             // 'DIARY' / 'LIVE_CLASS' / 'EVENT' / 'FEE_DUE' etc.
  sourceId: string;
  title: string;
  startsAt: string;               // ISO date-time
  leadMinutes?: number;           // minutes before startsAt to fire
}

export interface ParentReminder {
  id: number | null;
  parentId: number | null;
  studentId: number | null;
  sourceType: string | null;
  sourceId: string | null;
  title: string | null;
  startsAt: string | null;
  leadMinutes: number | null;
  notifyAt: string | null;
  firedAt: string | null;
  createdAt: string | null;
}
