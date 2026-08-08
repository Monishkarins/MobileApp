/**
 * Firebase Cloud Messaging + Notifee — delivers and displays Karins Fleet push alerts.
 *
 * Requires `android/app/google-services.json` from the Firebase console
 * (package name: com.karins). Without it, push calls no-op safely.
 *
 * Tray layout: put the full alert copy in `body` (single line) so the system
 * notification box shows the complete message without expand/collapse.
 * MessagingStyle / InboxStyle / BigText are avoided — OEMs reverse, truncate,
 * or hide content behind a chevron with those styles.
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
  resolveNotificationImageUrl,
  upsertNotification,
} from './notificationCenter';
import { navigateToNotificationsScreen } from './notificationNavigation';
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
/** Launcher branding in the expanded row — status bar still uses the monochrome small icon. */
const ANDROID_NOTIFICATION_LARGE_ICON = 'ic_launcher';
/** Matches android/app/src/main/res/values/colors.xml notification_accent. */
const ANDROID_NOTIFICATION_COLOR = '#16B7F3';
let openHandlersRegistered = false;
let notifeeHandlersRegistered = false;

/**
 * Flatten multi-line detail into one tray line so Android shows the full message
 * in the notification box instead of hiding lines behind expand/collapse.
 */
function formatTrayBody(notification: Pick<FleetNotification, 'body' | 'detail'>): string {
  const fullText = (notification.detail ?? notification.body).trim();
  if (!fullText) return 'Karins Fleet';
  // Keep intentional sections readable in one row (comma-separated, no BigText chevron).
  return fullText.replace(/\s*\n+\s*/g, ', ');
}

/** Shared Android tray chrome so local + FCM alerts look the same across OEMs. */
function buildAndroidDisplayOptions(
  options?: { onlyAlertOnce?: boolean; imageUrl?: string | null },
) {
  const imageUrl = options?.imageUrl?.trim() || null;

  return {
    channelId: ANDROID_CHANNEL_ID,
    pressAction: { id: 'default' as const },
    smallIcon: ANDROID_NOTIFICATION_SMALL_ICON,
    // Prefer the alert image as large icon when present; else app launcher mark.
    largeIcon: imageUrl || ANDROID_NOTIFICATION_LARGE_ICON,
    color: ANDROID_NOTIFICATION_COLOR,
    importance: AndroidImportance.HIGH,
    sound: 'default',
    onlyAlertOnce: options?.onlyAlertOnce ?? false,
    // BigPicture expands the tray row so received image broadcasts are visible.
    ...(imageUrl
      ? {
          style: {
            type: AndroidStyle.BIGPICTURE as const,
            picture: imageUrl,
          },
        }
      : {}),
  };
}

/** Pull alerts already shown in the system tray into the in-app inbox. */
export async function syncInboxFromSystemTray(): Promise<void> {
  try {
    const displayed = await notifee.getDisplayedNotifications();
    displayed.forEach(({ notification }) => {
      if (!notification?.id) return;

      const data = notification.data ?? {};
      const image =
        resolveNotificationImageUrl(
          String(data.image ?? data.imageUrl ?? data.picture ?? ''),
        ) ?? undefined;
      upsertNotification({
        id: String(notification.id),
        category: String(data.category ?? data.type ?? 'product_update'),
        title: notification.title ?? 'Karins Fleet',
        body: notification.body ?? '',
        image,
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

      // Full detail in body (one line) — no short/collapse summary and no BigText chevron.
      const trayBody = formatTrayBody(notification);
      const imageUrl = resolveNotificationImageUrl(
        notification.image ?? notification.data?.image,
      );
      await notifee.displayNotification({
        id: notification.id,
        title: notification.title,
        body: trayBody,
        data: {
          category: notification.category,
          createdAt: notification.createdAt,
          ...(notification.data ?? {}),
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        android: buildAndroidDisplayOptions({
          onlyAlertOnce: options?.onlyAlertOnce,
          imageUrl,
        }),
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
          ...(imageUrl
            ? {
                attachments: [{ url: imageUrl }],
              }
            : {}),
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
          const image =
            resolveNotificationImageUrl(
              String(data.image ?? data.imageUrl ?? data.picture ?? ''),
            ) ?? undefined;
          upsertNotification({
            id: String(detail.notification.id ?? Date.now()),
            category: String(data.category ?? data.type ?? 'product_update'),
            title: detail.notification.title ?? 'Karins Fleet',
            body: detail.notification.body ?? '',
            image,
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
          const image =
            resolveNotificationImageUrl(
              String(data.image ?? data.imageUrl ?? data.picture ?? ''),
            ) ?? undefined;
          upsertNotification({
            id: String(detail.notification.id ?? Date.now()),
            category: String(data.category ?? data.type ?? 'product_update'),
            title: detail.notification.title ?? 'Karins Fleet',
            body: detail.notification.body ?? '',
            image,
            createdAt: String(data.createdAt ?? new Date().toISOString()),
            read: false,
            data: Object.fromEntries(
              Object.entries(data).map(([k, v]) => [k, String(v)]),
            ),
          });
          // Tray tap → Notifications menu (bell inbox).
          navigateToNotificationsScreen();
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

      const trayBody = formatTrayBody(mapped);
      const imageUrl = resolveNotificationImageUrl(mapped.image ?? mapped.data?.image);
      await notifee.displayNotification({
        id: mapped.id,
        title: mapped.title,
        body: trayBody,
        data: {
          ...mapped.data,
          category: mapped.category,
          createdAt: mapped.createdAt,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
        android: buildAndroidDisplayOptions({ imageUrl }),
        ios: {
          ...(imageUrl
            ? {
                attachments: [{ url: imageUrl }],
              }
            : {}),
        },
      });
    } catch {
      /* display is best-effort */
    }
  },

  /** Persist incoming push and optionally show a banner when the app is open. */
  async handleIncomingMessage(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    const mapped = mapRemoteMessageToNotification(message);
    upsertNotification(mapped);
    // Admin broadcasts also open an in-app popup while the session is active.
    void import('./localFleetNotificationService')
      .then(({ maybeShowBroadcastPopup }) => maybeShowBroadcastPopup(mapped))
      .catch(() => undefined);
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
        if (message) {
          upsertNotification(mapRemoteMessageToNotification(message));
          navigateToNotificationsScreen();
        }
      });

      messaging
        .getInitialNotification()
        .then((message) => {
          if (message) {
            upsertNotification(mapRemoteMessageToNotification(message));
            navigateToNotificationsScreen();
          }
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
