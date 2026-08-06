/**
 * Refreshes the mobile notification inbox from the web API when the user has an active session.
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { refreshNotificationInboxForSession } from '../../../services/notifications/notificationInboxRefresh';
import { useAppSelector } from '../../../store';

export function usePushNotifications(isAuthenticated: boolean): void {
  const auth = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

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

    return () => {
      appStateSub.remove();
    };
  }, [isAuthenticated, auth.accessToken, auth.dashboardContext, auth.user]);
}
