/**
 * Root navigation ref — lets push/Notifee tap handlers open screens
 * without being inside a React component tree.
 */

import {
  createNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';

/** Untyped root ref — container hosts AuthStack or MainTabs depending on session. */
export const navigationRef = createNavigationContainerRef();

/** Pending deep-link when the user taps a tray alert before nav is ready. */
let pendingNotificationsOpen = false;

function dispatchOpenNotifications(): void {
  if (!navigationRef.isReady()) return;

  // More › Notifications — same target as the dashboard bell / More menu item.
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'More',
      params: { screen: 'Notifications' },
    }),
  );
}

/** Open the in-app Notifications menu (queues if the navigator is not ready yet). */
export function navigateToNotificationsScreen(): void {
  if (navigationRef.isReady()) {
    pendingNotificationsOpen = false;
    dispatchOpenNotifications();
    return;
  }
  pendingNotificationsOpen = true;
}

/** Call from NavigationContainer onReady / sessionReady to flush a cold-start tray tap. */
export function flushPendingNotificationNavigation(): void {
  if (!pendingNotificationsOpen) return;
  if (!navigationRef.isReady()) return;
  pendingNotificationsOpen = false;
  dispatchOpenNotifications();
}
