/**
 * Notifee background events — persists tray alerts when the user taps them
 * while the app is backgrounded.
 */

import notifee, { EventType } from '@notifee/react-native';
import { upsertNotification } from './notificationCenter';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS || !detail.notification) return;

  const data = detail.notification.data ?? {};
  upsertNotification({
    id: String(detail.notification.id ?? data.notificationId ?? Date.now()),
    category: String(data.category ?? data.type ?? 'product_update'),
    title: detail.notification.title ?? 'Karins Fleet',
    body: detail.notification.body ?? '',
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    read: false,
    data: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)]),
    ),
  });
});
