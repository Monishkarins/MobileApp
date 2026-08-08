/**
 * Boots push delivery for an authenticated session.
 *
 * Admin type=1 broadcasts arrive via:
 * 1. FCM (when backend targets the registered device token)
 * 2. GET /notification poll → local Notifee tray push (fallback / primary today)
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { syncBroadcastNotificationsFromApi } from '../../../services/notifications/notificationCenter';
import { refreshNotificationInboxForSession } from '../../../services/notifications/notificationInboxRefresh';
import { pushService } from '../../../services/notifications/pushService';
import { registerPushDevice } from '../../../services/notifications/registerPushDevice';
import { useAppSelector } from '../../../store';

/** How often to check for new admin broadcasts while the app is foregrounded. */
const BROADCAST_POLL_MS = 45_000;

export function usePushNotifications(isAuthenticated: boolean): void {
  const auth = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    // Tray tap + FCM open handlers — safe to call repeatedly (idempotent).
    pushService.setupNotificationOpenHandlers();

    // Foreground FCM: OS will not auto-display — we mirror into Notifee + inbox.
    const unsubscribeForeground = pushService.registerForegroundHandler((message) => {
      void pushService.handleIncomingMessage(message);
    });

    // Register FCM token so admin/backend can target this handset when they push.
    void registerPushDevice();

    const refreshInbox = async () => {
      await refreshNotificationInboxForSession({
        user: auth.user,
        dashboardContext: auth.dashboardContext,
        accessToken: auth.accessToken,
        fetchFreshDashboard: true,
      });
    };

    void refreshInbox();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshInbox();
      }
    });

    // Poll broadcasts while open so admin sends become tray pushes without leaving the app.
    const pollId = setInterval(() => {
      if (AppState.currentState !== 'active') return;
      void syncBroadcastNotificationsFromApi();
    }, BROADCAST_POLL_MS);

    const unsubscribeTokenRefresh = pushService.onTokenRefresh(() => {
      void registerPushDevice();
    });

    return () => {
      appStateSub.remove();
      clearInterval(pollId);
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  }, [isAuthenticated, auth.accessToken, auth.dashboardContext, auth.user]);
}
