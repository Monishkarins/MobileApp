/**
 * Per-device notification toggles from Profile › Notifications — gates which
 * derived dashboard alerts and local wallet pushes are shown.
 */

import { Cache } from '../storage/SecureStorage';

export interface NotificationPreferences {
  walletAlerts: boolean;
  challanAlerts: boolean;
  complianceAlerts: boolean;
  claimsAlerts: boolean;
}

const PREFERENCES_KEY = 'notification_preferences';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  walletAlerts: true,
  challanAlerts: true,
  complianceAlerts: true,
  claimsAlerts: true,
};

export function loadNotificationPreferences(): NotificationPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...(Cache.getJSON<Partial<NotificationPreferences>>(PREFERENCES_KEY) ?? {}),
  };
}

export function saveNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): NotificationPreferences {
  const next = { ...loadNotificationPreferences(), ...patch };
  Cache.setJSON(PREFERENCES_KEY, next);
  return next;
}

export function isWalletAlertsEnabled(): boolean {
  return loadNotificationPreferences().walletAlerts;
}

export function isCategoryAlertsEnabled(category: string): boolean {
  const prefs = loadNotificationPreferences();
  switch (category) {
    case 'low_wallet':
      return prefs.walletAlerts;
    case 'echallan':
      return prefs.challanAlerts;
    case 'rc_expiry':
    case 'dl_expiry':
      return prefs.complianceAlerts;
    case 'claim_update':
      return prefs.claimsAlerts;
    default:
      return true;
  }
}
