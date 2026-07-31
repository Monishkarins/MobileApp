/**
 * Fleet notification types — shared between push delivery and the in-app center.
 */

export interface FleetNotification {
  id: string;
  category: string;
  title: string;
  /** Short one-liner for the in-app inbox list. */
  body: string;
  /**
   * Optional full message used by the system tray (flattened to one line so
   * Android shows everything without expand/collapse). Falls back to `body`.
   */
  detail?: string;
  createdAt: string;
  read: boolean;
  data?: Record<string, string>;
}
