/**
 * In-app popup queue for admin type=1 broadcasts.
 * Decouples sync/push delivery from UI so a Modal can show while the app is open.
 */

import type { FleetNotification } from './notificationTypes';

type Listener = (notification: FleetNotification) => void;

const listeners = new Set<Listener>();
const queue: FleetNotification[] = [];
const seenIds = new Set<string>();
let isPresenting = false;

function flush(): void {
  // One modal at a time; wait until a host is mounted and nothing is on screen.
  if (isPresenting || queue.length === 0 || listeners.size === 0) return;
  const next = queue.shift();
  if (!next) return;
  isPresenting = true;
  listeners.forEach((listener) => listener(next));
}

export const broadcastPopupEvents = {
  /** Subscribe to popup requests; returns unsubscribe. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    flush();
    return () => listeners.delete(listener);
  },

  /**
   * Ask the UI to show an admin broadcast popup.
   * Dedupes by id so poll + FCM do not open the same alert twice.
   */
  enqueue(notification: FleetNotification): void {
    if (seenIds.has(notification.id)) return;
    seenIds.add(notification.id);
    queue.push(notification);
    flush();
  },

  /** Call when the user dismisses the current popup so the next can open. */
  release(_notificationId: string): void {
    isPresenting = false;
    flush();
  },
};
