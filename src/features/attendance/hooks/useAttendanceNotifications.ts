import { useState, useEffect, useCallback, useRef } from 'react';
import { tokenStorage } from '../../../lib/token';
import type { AttendanceNotification } from '../types/attendance.types';

const POLL_INTERVAL = 30000; // 30 seconds

interface UseAttendanceNotificationsReturn {
  notifications: AttendanceNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Polls the backend for attendance notifications for the current user.
 * Automatically polls every 30 seconds.
 */
export function useAttendanceNotifications(): UseAttendanceNotificationsReturn {
  const [notifications, setNotifications] = useState<AttendanceNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = tokenStorage.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/notifications?unreadOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data ?? []);
      }
    } catch {
      // Silently fail — polling should not disrupt the UI
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const token = tokenStorage.getToken();
      await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = tokenStorage.getToken();
      await fetch(`${import.meta.env.VITE_API_URL || '/api/v1'}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Start polling
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh };
}
