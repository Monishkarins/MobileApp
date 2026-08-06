/**
 * Hook for screens that need a live unread notification count badge.
 * Refreshes dashboard alerts + API broadcasts (same sources as web bell).
 */

import { useCallback, useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '../../../services/notifications/notificationCenter';
import { refreshNotificationInboxForSession } from '../../../services/notifications/notificationInboxRefresh';
import { notificationEvents } from '../../../services/notifications/notificationEvents';
import { useAppSelector } from '../../../store';

export function useUnreadNotificationCount(): number {
  const auth = useAppSelector((s) => s.auth);
  const [count, setCount] = useState(() => getUnreadNotificationCount());

  const reloadLocal = useCallback(() => {
    setCount(getUnreadNotificationCount());
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!auth.accessToken) {
      reloadLocal();
      return;
    }
    await refreshNotificationInboxForSession({
      user: auth.user,
      dashboardContext: auth.dashboardContext,
      accessToken: auth.accessToken,
      // Refresh dashboard summary for badge count so compliance alerts stay current.
      fetchFreshDashboard: true,
    });
    reloadLocal();
  }, [auth.accessToken, auth.dashboardContext, auth.user, reloadLocal]);

  useEffect(() => {
    reloadLocal();
    void refreshInbox();
    return notificationEvents.subscribe(reloadLocal);
  }, [reloadLocal, refreshInbox]);

  return count;
}
