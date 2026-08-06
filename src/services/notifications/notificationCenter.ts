/**
 * Local notification inbox for the mobile bell.
 *
 * Two sources (same idea as karins_fastag_react fleet bell):
 * 1. Dashboard-derived alerts (wallet, challan, RC, …) — local, today-scoped
 * 2. Admin type=1 broadcasts — fetched from GET /notification (no Firebase)
 */

import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Cache } from '../storage/SecureStorage';
import { notificationApi, type NotificationListRow } from '../api/notificationApi';
import type { FleetNotification } from './notificationTypes';
import { notificationEvents } from './notificationEvents';

export const NOTIFICATIONS_CACHE_KEY = 'notifications_center';
const MAX_STORED_NOTIFICATIONS = 200;

/** Prefix for alerts derived from the dashboard summary. */
export const DASHBOARD_NOTIFICATION_ID_PREFIX = 'dash-';

/** Broadcast rows synced from Node GET /notification. */
export const BROADCAST_CATEGORY = 'broadcast';

/** Operational alerts — stay visible while the underlying issue exists (web bell parity). */
export const CONDITION_BASED_DASHBOARD_IDS = new Set([
  'dash-wallet',
  'dash-compliance',
  'dash-challans',
  'dash-drivers',
  'dash-claims',
]);

export function isConditionBasedDashboardRow(row: FleetNotification): boolean {
  return CONDITION_BASED_DASHBOARD_IDS.has(row.id);
}

function isAnnouncementDashboardRow(row: FleetNotification): boolean {
  return row.id.startsWith(`${DASHBOARD_NOTIFICATION_ID_PREFIX}announcement-`);
}

function startOfLocalDay(date = new Date()): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

function isCreatedToday(createdAt: string): boolean {
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() >= startOfLocalDay().getTime();
}

function isBroadcastRow(row: FleetNotification): boolean {
  return (
    row.category === BROADCAST_CATEGORY ||
    row.data?.type === '1' ||
    row.data?.page === '1'
  );
}

function isDashboardRow(row: FleetNotification): boolean {
  return row.id.startsWith(DASHBOARD_NOTIFICATION_ID_PREFIX);
}

/**
 * Keep dashboard alerts for today only; keep unread API broadcasts until read
 * (matches web bell — not limited to “today”).
 */
function pruneInbox(items: FleetNotification[]): FleetNotification[] {
  return items.filter((row) => {
    if (isDashboardRow(row)) return isCreatedToday(row.createdAt);
    if (isBroadcastRow(row)) return true;
    // Legacy FCM / other local rows — keep today’s only
    return isCreatedToday(row.createdAt);
  });
}

export function loadNotifications(): FleetNotification[] {
  const stored = Cache.getJSON<FleetNotification[]>(NOTIFICATIONS_CACHE_KEY) ?? [];
  const pruned = pruneInbox(stored);

  if (pruned.length !== stored.length) {
    Cache.setJSON(NOTIFICATIONS_CACHE_KEY, pruned.slice(0, MAX_STORED_NOTIFICATIONS));
  }

  return pruned;
}

export function saveNotifications(items: FleetNotification[]): void {
  const pruned = pruneInbox(items);
  Cache.setJSON(NOTIFICATIONS_CACHE_KEY, pruned.slice(0, MAX_STORED_NOTIFICATIONS));
}

export function getUnreadNotificationCount(): number {
  return getVisibleNotifications().length;
}

/** Rows shown in the bell badge and notifications list — mirrors web drawer rules. */
export function getVisibleNotifications(): FleetNotification[] {
  return loadNotifications().filter((row) => {
    if (isConditionBasedDashboardRow(row)) return true;
    if (isBroadcastRow(row)) return true;
    if (isAnnouncementDashboardRow(row)) return !row.read;
    return !row.read;
  });
}

export function upsertNotification(item: FleetNotification): FleetNotification[] {
  if (isDashboardRow(item) && !isCreatedToday(item.createdAt)) {
    return loadNotifications();
  }

  const existing = loadNotifications();
  const index = existing.findIndex((row) => row.id === item.id);
  const next =
    index >= 0
      ? existing.map((row, i) =>
          i === index
            ? {
                ...row,
                ...item,
                read: row.read,
              }
            : row,
        )
      : [item, ...existing];

  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

/**
 * Replace dashboard-derived alerts; leave broadcast (API) rows in place.
 */
export function syncDerivedNotifications(
  derived: FleetNotification[],
): FleetNotification[] {
  const existing = loadNotifications();
  const nonDashboard = existing.filter((row) => !isDashboardRow(row));

  const mergedDerived = derived.map((item) => {
    // Wallet/challan/compliance alerts must not stay “read” after mark-all — issue still open
    if (isConditionBasedDashboardRow(item)) {
      return { ...item, read: false };
    }
    const prior = existing.find((row) => row.id === item.id);
    return prior ? { ...item, read: prior.read } : item;
  });

  const next = [...mergedDerived, ...nonDashboard];
  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

function mapApiRowToFleetNotification(row: NotificationListRow): FleetNotification {
  const fullText = String(row.description ?? '');
  const shortBody =
    fullText.length > 90 ? `${fullText.substring(0, 90)}…` : fullText || row.text || '';

  const createdAt = row.createdAt
    ? new Date(row.createdAt).toISOString()
    : new Date().toISOString();

  return {
    id: String(row.id),
    category: BROADCAST_CATEGORY,
    title: row.text || 'Notification',
    body: shortBody,
    detail: fullText || shortBody || undefined,
    createdAt,
    read: Boolean(row.isRead),
    data: {
      type: String(row.type ?? 1),
      page: '1',
      notificationId: String(row.id),
    },
  };
}

/**
 * Pull unread type=1 broadcasts from Node (same as web fleet bell).
 * Replaces previous broadcast rows; keeps dashboard-derived alerts.
 */
export async function syncBroadcastNotificationsFromApi(): Promise<FleetNotification[]> {
  try {
    const rows = await notificationApi.listUnread(50);
    const broadcasts = rows
      .filter((row) => !row.isRead)
      .map(mapApiRowToFleetNotification);

    const existing = loadNotifications();
    const dashboardAndOther = existing.filter((row) => !isBroadcastRow(row));

    const next = [...broadcasts, ...dashboardAndOther];
    saveNotifications(next);
    notificationEvents.emit();
    return loadNotifications();
  } catch (error) {
    if (__DEV__) {
      console.warn('[Notifications] API sync failed — showing cached inbox', error);
    }
    return loadNotifications();
  }
}

export function markNotificationRead(id: string): FleetNotification[] {
  // Drop broadcast rows once read (same as web: unreadOnly feed)
  const existing = loadNotifications();
  const target = existing.find((row) => row.id === id);
  let next: FleetNotification[];

  if (target && isBroadcastRow(target)) {
    next = existing.filter((row) => row.id !== id);
  } else {
    next = existing.map((row) => (row.id === id ? { ...row, read: true } : row));
  }

  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

export function markAllNotificationsRead(): FleetNotification[] {
  const existing = loadNotifications();
  // Web: mark-all clears broadcasts + dismisses announcements only — not operational alerts
  const next = existing
    .filter((row) => !isBroadcastRow(row))
    .map((row) => {
      if (isConditionBasedDashboardRow(row)) {
        return { ...row, read: false };
      }
      return { ...row, read: true };
    });

  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

/** Kept for optional FCM; primary broadcast path is API sync. */
export function mapRemoteMessageToNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): FleetNotification {
  const data = message.data ?? {};
  const id = String(data.notificationId ?? data.id ?? message.messageId ?? Date.now());

  const isBroadcast =
    String(data.category) === 'broadcast' ||
    String(data.type) === '1' ||
    String(data.page) === '1';

  const title =
    message.notification?.title ?? String(data.title ?? 'Karins Fleet');

  const fullText = String(
    data.description ?? data.message ?? message.notification?.body ?? data.body ?? '',
  );
  const shortBody = String(
    data.body ?? (fullText.length > 90 ? `${fullText.substring(0, 90)}…` : fullText) ?? '',
  );

  return {
    id,
    category: isBroadcast
      ? BROADCAST_CATEGORY
      : String(data.category ?? data.type ?? 'product_update'),
    title,
    body: shortBody || title,
    detail: fullText || shortBody || undefined,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    read: false,
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)]),
    ),
  };
}
