/**
 * Shows dashboard-derived fleet alerts in the OS notification tray (Notifee).
 * In-app inbox rows are written separately — this layer handles the system banner.
 */

import { Cache } from '../storage/SecureStorage';
import { pushService } from './pushService';
import { isCategoryAlertsEnabled } from './notificationPreferences';
import type { FleetNotification } from './notificationTypes';

const DERIVED_PUSH_COOLDOWNS_KEY = 'derived_push_cooldowns';
const DERIVED_PUSH_COOLDOWN_MS = 4 * 60 * 60 * 1000;

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

/** Display a dashboard-derived alert in the system tray when its category toggle is on. */
export async function showDerivedFleetPush(notification: FleetNotification): Promise<void> {
  if (!isCategoryAlertsEnabled(notification.category)) return;

  // Always refresh the tray row (short body + Inbox/BigText detail). Cooldown
  // only suppresses sound/heads-up so dashboard polling does not keep buzzing.
  const onCooldown = isOnCooldown(notification.id, notification.body);
  const shown = await pushService.displayLocalNotification(notification, {
    onlyAlertOnce: onCooldown,
  });
  if (shown) {
    saveCooldown(notification.id, notification.body);
  }
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
