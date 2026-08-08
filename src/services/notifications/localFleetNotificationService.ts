/**
 * Shows dashboard-derived and admin broadcast alerts in the OS notification tray (Notifee)
 * and raises an in-app popup for newly arrived admin broadcasts.
 * In-app inbox rows are written separately — this layer handles tray + popup delivery.
 */

import { AppState } from 'react-native';
import { Cache } from '../storage/SecureStorage';
import { pushService } from './pushService';
import { isCategoryAlertsEnabled } from './notificationPreferences';
import { broadcastPopupEvents } from './broadcastPopupEvents';
import type { FleetNotification } from './notificationTypes';

const DERIVED_PUSH_COOLDOWNS_KEY = 'derived_push_cooldowns';
const DERIVED_PUSH_COOLDOWN_MS = 4 * 60 * 60 * 1000;
/** IDs already shown as tray pushes so API polling does not re-buzz the same admin alert. */
const BROADCAST_PUSHED_IDS_KEY = 'broadcast_push_shown_ids';
/** After first successful broadcast sync we stop treating backlog as “new”. */
const BROADCAST_PUSH_SEEDED_KEY = 'broadcast_push_seeded';
const MAX_BROADCAST_PUSHED_IDS = 300;

type CooldownMap = Record<string, { body: string; at: string }>;

function loadCooldowns(): CooldownMap {
  return Cache.getJSON<CooldownMap>(DERIVED_PUSH_COOLDOWNS_KEY) ?? {};
}

function saveCooldown(id: string, body: string): void {
  const next = { ...loadCooldowns(), [id]: { body, at: new Date().toISOString() } };
  Cache.setJSON(DERIVED_PUSH_COOLDOWNS_KEY, next);
}

function isOnCooldown(id: string, body: string): boolean {
  const entry = loadCooldowns()[id];
  if (!entry || entry.body !== body || !entry.at) return false;
  return Date.now() - new Date(entry.at).getTime() < DERIVED_PUSH_COOLDOWN_MS;
}

function loadBroadcastPushedIds(): Set<string> {
  return new Set(Cache.getJSON<string[]>(BROADCAST_PUSHED_IDS_KEY) ?? []);
}

function saveBroadcastPushedIds(ids: Set<string>): void {
  Cache.setJSON(
    BROADCAST_PUSHED_IDS_KEY,
    [...ids].slice(0, MAX_BROADCAST_PUSHED_IDS),
  );
}

/** Display a dashboard-derived alert in the system tray when its category toggle is on. */
export async function showDerivedFleetPush(notification: FleetNotification): Promise<void> {
  if (!isCategoryAlertsEnabled(notification.category)) return;

  // Always refresh the tray row with the full one-line message. Cooldown
  // only suppresses sound/heads-up so dashboard polling does not keep buzzing.
  const onCooldown = isOnCooldown(notification.id, notification.body);
  const shown = await pushService.displayLocalNotification(notification, {
    onlyAlertOnce: onCooldown,
  });
  if (shown) {
    saveCooldown(notification.id, notification.body);
  }
}

/**
 * Turn newly synced admin (type=1) broadcasts into tray pushes + in-app popups.
 * First sync only seeds IDs so historical inbox rows do not flood the user.
 */
export async function showNewBroadcastPushes(
  broadcasts: FleetNotification[],
): Promise<void> {
  if (broadcasts.length === 0) return;

  const pushedIds = loadBroadcastPushedIds();
  const isSeeded = Cache.getString(BROADCAST_PUSH_SEEDED_KEY) === '1';

  // Cold start / first login: remember current API rows without heads-up spam.
  if (!isSeeded) {
    broadcasts.forEach((row) => pushedIds.add(row.id));
    saveBroadcastPushedIds(pushedIds);
    Cache.set(BROADCAST_PUSH_SEEDED_KEY, '1');
    return;
  }

  const isAppActive = AppState.currentState === 'active';

  for (const row of broadcasts) {
    // Already read on server/inbox, or already delivered once — skip.
    if (row.read || pushedIds.has(row.id)) continue;
    if (!isCategoryAlertsEnabled(row.category)) {
      pushedIds.add(row.id);
      continue;
    }

    // In-app popup while foregrounded (web NotificationDetailPopup parity).
    if (isAppActive) {
      broadcastPopupEvents.enqueue(row);
    }

    const shown = await pushService.displayLocalNotification(row);
    // Mark shown even on permission failure so we do not retry every poll.
    pushedIds.add(row.id);
    if (__DEV__ && shown) {
      console.log('[Notifications] admin broadcast pushed to tray', row.id, row.title);
    }
  }

  saveBroadcastPushedIds(pushedIds);
}

/**
 * Show popup for an admin broadcast that arrived via FCM while the app is open.
 * Tray display is handled separately by pushService.
 */
export function maybeShowBroadcastPopup(notification: FleetNotification): void {
  const isBroadcast =
    notification.category === 'broadcast'
    || notification.data?.type === '1'
    || notification.data?.page === '1';
  if (!isBroadcast || notification.read) return;
  if (AppState.currentState !== 'active') return;
  broadcastPopupEvents.enqueue(notification);
}

export function clearDerivedPushCooldown(notificationId?: string): void {
  if (!notificationId) {
    Cache.delete(DERIVED_PUSH_COOLDOWNS_KEY);
    return;
  }

  const next = { ...loadCooldowns() };
  delete next[notificationId];
  Cache.setJSON(DERIVED_PUSH_COOLDOWNS_KEY, next);
}

/** @deprecated Use showDerivedFleetPush — kept for imports that still reference wallet-only helper. */
export const maybeShowLowWalletPush = showDerivedFleetPush;

/** @deprecated Use clearDerivedPushCooldown */
export const clearLowWalletPushCooldown = clearDerivedPushCooldown;
