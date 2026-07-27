/**
 * Subscribes to FCM when the user has an active session.
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { pushService, syncInboxFromSystemTray } from '../../../services/notifications/pushService';
import { registerPushDevice } from '../../../services/notifications/registerPushDevice';
import { syncDashboardNotifications } from '../../../services/notifications/syncDashboardNotifications';
import { Cache } from '../../../services/storage/SecureStorage';
import type { DashboardSummary } from '../../../types/dashboard';
import { useAppSelector } from '../../../store';
import { resolveActiveCustomerId } from '../../../types/auth';

function buildDashboardCacheKey(userId?: number, customerId?: number): string {
  return `dashboard_snapshot:${userId ?? 'anon'}:${customerId ?? 'self'}`;
}

function syncCachedDashboardAlerts(userId?: number, customerId?: number): void {
  const cached = Cache.getJSON<DashboardSummary>(
    buildDashboardCacheKey(userId, customerId),
  );
  if (!cached) return;
  syncDashboardNotifications(cached, { userId, customerId });
}

export function usePushNotifications(isAuthenticated: boolean): void {
  const { user, dashboardContext } = useAppSelector((s) => s.auth);
  const customerId = resolveActiveCustomerId(dashboardContext, user?.defaultCustomerId);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let unsubscribeForeground = () => {};
    let unsubscribeTokenRefresh = () => {};

    (async () => {
      await pushService.ensureAndroidChannel();
      await pushService.ensureNotificationPermission();
      pushService.setupNotifeeHandlers();
      await registerPushDevice();
      await syncInboxFromSystemTray();
      syncCachedDashboardAlerts(user?.userId, customerId);

      unsubscribeForeground = pushService.registerForegroundHandler(
        async (message: FirebaseMessagingTypes.RemoteMessage) => {
          await pushService.handleIncomingMessage(message);
        },
      );

      unsubscribeTokenRefresh = pushService.onTokenRefresh(async () => {
        await registerPushDevice();
      });

      pushService.setupNotificationOpenHandlers();
    })();

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        syncInboxFromSystemTray().catch(() => {});
        syncCachedDashboardAlerts(user?.userId, customerId);
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
      appStateSub.remove();
    };
  }, [isAuthenticated, user?.userId, customerId]);
}
