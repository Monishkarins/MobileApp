/**
 * Firebase Cloud Messaging + Notifee — delivers and displays Karins Fleet push alerts.
 *
 * Requires `android/app/google-services.json` from the Firebase console
 * (package name: com.karins). Without it, push calls no-op safely.
 */

import { Platform } from 'react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
  AuthorizationStatus,
} from '@notifee/react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import {
  mapRemoteMessageToNotification,
  upsertNotification,
} from './notificationCenter';
import type { FleetNotification } from './notificationTypes';
import {
  getMessagingInstance,
  isFirebaseMessagingAvailable,
  loadMessagingModuleForAuthStatus,
} from './messagingProvider';

export const NOTIFICATION_CATEGORIES: readonly string[] = [
  'low_wallet',
  'suspicious_toll',
  'double_debit',
  'claim_update',
  'echallan',
  'rc_expiry',
  'dl_expiry',
  'recharge_status',
  'product_update',
];

const ANDROID_CHANNEL_ID = 'karins_fleet_alerts_high';
export const ANDROID_NOTIFICATION_SMALL_ICON = 'ic_stat_notification';
// Android requires a monochrome small icon; use the launcher icon as the *large* icon
// so the notification row shows the app branding.
const ANDROID_NOTIFICATION_LARGE_ICON = 'ic_launcher';
/** Soft-wrap width for tray lines — keeps OEM rows from collapsing into "…". */
const ANDROID_NOTIFICATION_WRAP_CHARS = 40;
let openHandlersRegistered = false;
let notifeeHandlersRegistered = false;

/**
 * Break long notification copy into short lines so Android shows overflow on the
 * next row instead of truncating mid-word with "...".
 */
function wrapNotificationLines(text: string, maxChars = ANDROID_NOTIFICATION_WRAP_CHARS): string[] {
  const paragraphs = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lines: string[] = [];
  paragraphs.forEach((paragraph) => {
    if (paragraph.length <= maxChars) {
      lines.push(paragraph);
      return;
    }

    // Word-wrap within each paragraph so phrases stay readable across lines.
    const words = paragraph.split(/\s+/);
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
  });

  return lines.length > 0 ? lines : [text.trim() || 'Karins Fleet'];
}

/**
 * Multi-line fleet alerts use MessagingStyle — Android shows several message
 * rows in the shade without requiring the user to tap expand (Inbox/BigText
 * only reveal the full copy after expand, which is why users saw "...").
 */
function buildAndroidTextStyle(text: string, title?: string) {
  const lines = wrapNotificationLines(text);
  const now = Date.now();

  if (lines.length > 1) {
    const person = { name: 'Karins Fleet' };
    return {
      type: AndroidStyle.MESSAGING as const,
      person,
      title: title || 'Karins Fleet',
      messages: lines.map((line, index) => ({
        text: line,
        timestamp: now + index,
        person,
      })),
    };
  }

  return {
    type: AndroidStyle.BIGTEXT as const,
    text: lines[0] ?? text,
  };
}

/** Pull alerts already shown in the system tray into the in-app inbox. */
export async function syncInboxFromSystemTray(): Promise<void> {
  try {
    const displayed = await notifee.getDisplayedNotifications();
    displayed.forEach(({ notification }) => {
      if (!notification?.id) return;

      const data = notification.data ?? {};
      upsertNotification({
        id: String(notification.id),
        category: String(data.category ?? data.type ?? 'product_update'),
        title: notification.title ?? 'Karins Fleet',
        body: notification.body ?? '',
        createdAt: String(data.createdAt ?? new Date().toISOString()),
        read: false,
        data: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)]),
        ),
      });
    });
  } catch {
    /* tray sync is best-effort */
  }
}

async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;

  const permission = PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
  const current = await check(permission);
  if (current === RESULTS.GRANTED) return true;
  if (current === RESULTS.BLOCKED) return false;

  const result = await request(permission);
  return result === RESULTS.GRANTED;
}

/** OS permission for local Notifee banners — does not require Firebase. */
async function ensureLocalNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    if (Platform.OS === 'android' && Platform.Version < 33) {
      return true;
    }

    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED
      || settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    if (Platform.OS === 'android') {
      return requestAndroidNotificationPermission();
    }
    return false;
  }
}

async function canShowLocalNotifications(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();
    if (Platform.OS === 'android' && Platform.Version < 33) {
      return true;
    }
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED
      || settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export const pushService = {
  isAvailable: isFirebaseMessagingAvailable,

  /** Create the Android notification channel used by FCM + Notifee. */
  async ensureAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      await notifee.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: 'Karins Fleet Alerts',
        importance: AndroidImportance.HIGH,
        vibration: true,
      });
    } catch {
      /* channel creation is best-effort */
    }
  },

  /** Request OS permission so local wallet alerts can appear in the tray. */
  async ensureNotificationPermission(): Promise<boolean> {
    const granted = await ensureLocalNotificationPermission();
    if (granted) return true;
    return canShowLocalNotifications();
  },

  /** Show a fleet alert in the system tray (dashboard-derived or local). */
  async displayLocalNotification(
    notification: FleetNotification,
    options?: { onlyAlertOnce?: boolean },
  ): Promise<boolean> {
    try {
      await pushService.ensureAndroidChannel();

      let canShow = await canShowLocalNotifications();
      if (!canShow) {
        canShow = await ensureLocalNotificationPermission();
      }
      if (!canShow) return false;

      // Full message goes in body; MessagingStyle shows each line in the shade
      // without requiring the user to tap the expand chevron.
      const fullText = notification.detail ?? notification.body;
      await notifee.displayNotification({
        id: notification.id,
        title: notification.title,
        body: fullText,
        data: {
          category: notification.category,
          createdAt: notification.createdAt,
          ...(notification.data ?? {}),
        },
        android: {
          channelId: ANDROID_CHANNEL_ID,
          pressAction: { id: 'default' },
          smallIcon: ANDROID_NOTIFICATION_SMALL_ICON,
          largeIcon: ANDROID_NOTIFICATION_LARGE_ICON,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          // Re-sync updates the tray row quietly so MessagingStyle replaces old "...".
          onlyAlertOnce: options?.onlyAlertOnce ?? false,
          style: buildAndroidTextStyle(fullText, notification.title),
        },
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /** Register Notifee tap/delivery handlers — works without Firebase. */
  setupNotifeeHandlers(): void {
    if (notifeeHandlersRegistered) return;
    notifeeHandlersRegistered = true;

    try {
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.DELIVERED && detail.notification) {
          const data = detail.notification.data ?? {};
          upsertNotification({
            id: String(detail.notification.id ?? Date.now()),
            category: String(data.category ?? data.type ?? 'product_update'),
            title: detail.notification.title ?? 'Karins Fleet',
            body: detail.notification.body ?? '',
            createdAt: String(data.createdAt ?? new Date().toISOString()),
            read: false,
            data: Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)]),
            ),
          });
          return;
        }

        if (type === EventType.PRESS && detail.notification) {
          const data = detail.notification.data ?? {};
          upsertNotification({
            id: String(detail.notification.id ?? Date.now()),
            category: String(data.category ?? data.type ?? 'product_update'),
            title: detail.notification.title ?? 'Karins Fleet',
            body: detail.notification.body ?? '',
            createdAt: String(data.createdAt ?? new Date().toISOString()),
            read: false,
            data: Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)]),
            ),
          });
        }
      });
    } catch {
      /* handlers are best-effort */
    }
  },

  /** Request OS push permission; returns whether alerts can be shown. */
  async requestPermission(): Promise<boolean> {
    const localGranted = await ensureLocalNotificationPermission();
    if (!localGranted && Platform.OS === 'android' && Platform.Version >= 33) {
      return false;
    }

    const messaging = getMessagingInstance();
    if (!messaging) return localGranted;

    try {
      const status = await messaging.requestPermission();
      const moduleRef = loadMessagingModuleForAuthStatus();
      if (!moduleRef) return localGranted;

      const { AUTHORIZED, PROVISIONAL } = moduleRef.AuthorizationStatus;
      return status === AUTHORIZED || status === PROVISIONAL || localGranted;
    } catch {
      return localGranted;
    }
  },

  /** Fetch the FCM registration token for this device, or null on error. */
  async getToken(): Promise<string | null> {
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    try {
      return await messaging.getToken();
    } catch {
      return null;
    }
  },

  /** Re-register with backend when Firebase rotates the device token. */
  onTokenRefresh(onRefresh: (token: string) => void): () => void {
    const messaging = getMessagingInstance();
    if (!messaging) return () => {};

    try {
      return messaging.onTokenRefresh(onRefresh);
    } catch {
      return () => {};
    }
  },

  /** Show a system notification via Notifee (foreground + background). */
  async displayNotification(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    const mapped = mapRemoteMessageToNotification(message);

    try {
      // Ensure channel exists even if this path runs before sessionReady / Notifee bootstrap.
      await pushService.ensureAndroidChannel();

      await notifee.displayNotification({
        id: mapped.id,
        title: mapped.title,
        body: mapped.body,
        data: {
          ...mapped.data,
          category: mapped.category,
          createdAt: mapped.createdAt,
        },
        android: {
          channelId: ANDROID_CHANNEL_ID,
          pressAction: { id: 'default' },
          smallIcon: ANDROID_NOTIFICATION_SMALL_ICON,
          largeIcon: ANDROID_NOTIFICATION_LARGE_ICON,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          // MessagingStyle shows multi-line FCM copy without requiring expand.
          style: buildAndroidTextStyle(mapped.body, mapped.title),
        },
      });
    } catch {
      /* display is best-effort */
    }
  },

  /** Persist incoming push and optionally show a banner when the app is open. */
  async handleIncomingMessage(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    upsertNotification(mapRemoteMessageToNotification(message));
    await pushService.displayNotification(message);
  },

  /**
   * Register a foreground message handler.
   * @returns an unsubscribe function (no-op if messaging is unavailable).
   */
  registerForegroundHandler(
    onMessage: (msg: FirebaseMessagingTypes.RemoteMessage) => void,
  ): () => void {
    const messaging = getMessagingInstance();
    if (!messaging) return () => {};

    try {
      return messaging.onMessage(async (message) => onMessage(message));
    } catch {
      return () => {};
    }
  },

  /** Opened from background/killed state — store the alert for the inbox. */
  setupNotificationOpenHandlers(): void {
    pushService.setupNotifeeHandlers();

    if (openHandlersRegistered) return;
    openHandlersRegistered = true;

    const messaging = getMessagingInstance();
    if (!messaging) return;

    try {
      messaging.onNotificationOpenedApp((message) => {
        if (message) upsertNotification(mapRemoteMessageToNotification(message));
      });

      messaging
        .getInitialNotification()
        .then((message) => {
          if (message) upsertNotification(mapRemoteMessageToNotification(message));
        })
        .catch(() => {});
    } catch {
      /* handlers are best-effort */
    }
  },
};

/** Called for data-only / background FCM messages. */
export async function handleBackgroundPush(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  await pushService.ensureAndroidChannel();
  upsertNotification(mapRemoteMessageToNotification(message));
  await pushService.displayNotification(message);
}
