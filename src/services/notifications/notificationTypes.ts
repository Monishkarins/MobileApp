/**
 * Fleet notification types — shared between push delivery and the in-app center.
 */

export interface FleetNotification {
  id: string;
  category: string;
  title: string;
  /** Short one-liner shown in the collapsed notification row. */
  body: string;
  /**
   * Optional full multi-line text shown when the notification is expanded
   * (Android BigText expanded view). Falls back to `body` when absent.
   */
  detail?: string;
  createdAt: string;
  read: boolean;
  data?: Record<string, string>;
}
