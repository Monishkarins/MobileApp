/**
 * Hook for screens that need a live unread notification count badge.
 */

import { useCallback, useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '../../../services/notifications/notificationCenter';
import { notificationEvents } from '../../../services/notifications/notificationEvents';

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(() => getUnreadNotificationCount());

  const reload = useCallback(() => {
    setCount(getUnreadNotificationCount());
  }, []);

  useEffect(() => {
    reload();
    return notificationEvents.subscribe(reload);
  }, [reload]);

  return count;
}
