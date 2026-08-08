/**
 * Notification APIs — same as karins_fastag_react / Node:
 * list type=1 broadcasts, mark one / all read.
 * Mobile syncs these into the inbox and raises new unread rows as tray pushes.
 */
import { apiClient } from './client';

export interface NotificationListRow {
  id: number;
  text?: string | null;
  description?: string | null;
  image?: string | null;
  /** Legacy Yii list field — same path as `image` when present. */
  image_path?: string | null;
  createdAt?: string | null;
  isRead?: boolean;
  type?: number;
}

interface ListResponse {
  success?: boolean;
  message?: string;
  data?: {
    rows?: NotificationListRow[];
    count?: number;
  };
  rows?: NotificationListRow[];
  count?: number;
}

function unwrapList(res: ListResponse): NotificationListRow[] {
  return res?.data?.rows ?? res?.rows ?? [];
}

export const notificationApi = {
  /**
   * Broadcast list for the bell (read + unread) — same params as web drawer.
   */
  list: async (pageSize = 50): Promise<NotificationListRow[]> => {
    const { data } = await apiClient.get<ListResponse>('/notification', {
      params: {
        pageNo: 1,
        pageSize,
      },
    });
    return unwrapList(data);
  },

  /**
   * Unread-only feed (badge / legacy callers).
   */
  listUnread: async (pageSize = 50): Promise<NotificationListRow[]> => {
    const { data } = await apiClient.get<ListResponse>('/notification', {
      params: {
        pageNo: 1,
        pageSize,
        unreadOnly: true,
      },
    });
    return unwrapList(data);
  },

  /** Marks a type=1/2 notification as read for the current user. */
  markRead: (notificationId: string | number) =>
    apiClient.get(`/notification/${notificationId}`),

  /** Marks all visible broadcasts as read for the current user. */
  markAllRead: () => apiClient.post('/notification/mark-all-read'),
};
