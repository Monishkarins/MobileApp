/**
 * Local notification inbox — persists push alerts for the Notifications screen.
 * Only today's rows are kept so the inbox reads as a daily alert feed, not a
 * multi-day archive.
 */

import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Cache } from '../storage/SecureStorage';
import type { FleetNotification } from './notificationTypes';
import { notificationEvents } from './notificationEvents';

export const NOTIFICATIONS_CACHE_KEY = 'notifications_center';
const MAX_STORED_NOTIFICATIONS = 200;

/** Prefix for alerts derived from the dashboard summary (not FCM). */
export const DASHBOARD_NOTIFICATION_ID_PREFIX = 'dash-';

/** Local midnight — used to drop yesterday’s (and older) inbox rows. */
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

/** Daily inbox: discard anything that wasn’t created on the local calendar day. */
function keepTodaysNotifications(items: FleetNotification[]): FleetNotification[] {
  return items.filter((row) => isCreatedToday(row.createdAt));
}

export function loadNotifications(): FleetNotification[] {
  const stored = Cache.getJSON<FleetNotification[]>(NOTIFICATIONS_CACHE_KEY) ?? [];
  const todayOnly = keepTodaysNotifications(stored);

  // Persist the prune so overnight leftovers don’t linger on disk.
  if (todayOnly.length !== stored.length) {
    Cache.setJSON(NOTIFICATIONS_CACHE_KEY, todayOnly.slice(0, MAX_STORED_NOTIFICATIONS));
  }

  return todayOnly;
}

export function saveNotifications(items: FleetNotification[]): void {
  const todayOnly = keepTodaysNotifications(items);
  Cache.setJSON(NOTIFICATIONS_CACHE_KEY, todayOnly.slice(0, MAX_STORED_NOTIFICATIONS));
}

export function getUnreadNotificationCount(): number {
  return loadNotifications().filter((row) => !row.read).length;
}

export function upsertNotification(item: FleetNotification): FleetNotification[] {
  // Ignore stale inserts that already fall outside today’s window.
  if (!isCreatedToday(item.createdAt)) {
    return loadNotifications();
  }

  const existing = loadNotifications();
  const index = existing.findIndex((row) => row.id === item.id);
  const next = index >= 0
    ? existing.map((row, i) => (
      i === index
        ? {
          ...row,
          ...item,
          // Keep read state when the same alert is refreshed with updated text.
          read: row.read,
        }
        : row
    ))
    : [item, ...existing];

  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

/**
 * Replace dashboard-derived alerts with the latest summary snapshot.
 * Push-delivered rows (non dash-* ids) from today are left untouched;
 * older push rows are dropped with the daily prune.
 */
export function syncDerivedNotifications(derived: FleetNotification[]): FleetNotification[] {
  const existing = loadNotifications();
  const pushRows = existing.filter(
    (row) => !row.id.startsWith(DASHBOARD_NOTIFICATION_ID_PREFIX),
  );

  const mergedDerived = derived.map((item) => {
    const prior = existing.find((row) => row.id === item.id);
    return prior ? { ...item, read: prior.read } : item;
  });

  const next = [...mergedDerived, ...pushRows];
  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

export function markNotificationRead(id: string): FleetNotification[] {
  const next = loadNotifications().map((row) => (
    row.id === id ? { ...row, read: true } : row
  ));
  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

export function markAllNotificationsRead(): FleetNotification[] {
  const next = loadNotifications().map((row) => ({ ...row, read: true }));
  saveNotifications(next);
  notificationEvents.emit();
  return loadNotifications();
}

/** Normalise FCM payloads from Karins backend into inbox rows. */
export function mapRemoteMessageToNotification(
  message: FirebaseMessagingTypes.RemoteMessage,
): FleetNotification {
  const data = message.data ?? {};
  const id = String(data.notificationId ?? data.id ?? message.messageId ?? Date.now());

  return {
    id,
    category: String(data.category ?? data.type ?? 'product_update'),
    title: message.notification?.title ?? String(data.title ?? 'Karins Fleet'),
    body: message.notification?.body ?? String(data.body ?? data.message ?? ''),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    read: false,
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)]),
    ),
  };
}
