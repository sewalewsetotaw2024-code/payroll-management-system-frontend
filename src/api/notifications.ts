import { apiClient } from '../lib/api-client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  /** Optional for local/optimistic notifications — backend sets this server-side. */
  recipientId?: number;
  type: string;
  title: string;
  message: string | null;
  category: 'payroll' | 'attendance' | 'payslip' | 'system' | 'general' | 'approval';
  /** Optional for local notifications — backend sets this when persisting. */
  referenceId?: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  /** Optional for local notifications — defaults to createdAt. */
  updatedAt?: string;
  /** Role to target (e.g. "HR_GENERALIST", "FINANCE_MANAGER") — used for role-routed notifications. */
  targetRole?: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

// ── API Service ───────────────────────────────────────────────────────────────

export const notificationsApi = {
  /**
   * Fetch notifications for the current user
   */
  async fetchNotifications(params?: {
    unreadOnly?: boolean;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<NotificationsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.unreadOnly) queryParams.append('unreadOnly', 'true');
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.offset) queryParams.append('offset', String(params.offset));

    const response = await apiClient.get(`/notifications?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Fetch unread notification count
   */
  async fetchUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data.data.count;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data.data;
  },
};
