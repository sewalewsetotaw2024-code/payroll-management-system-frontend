import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'urgent';
  read: boolean;
  category: string;
  /** When set, only users with this role see the notification. */
  targetRole?: string;
  createdAt: string;
  /** Optional deep-link the user can click. */
  link?: string;
}

export interface NotificationState {
  items: AppNotification[];
}

const loadFromStorage = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem('app_notifications');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items: AppNotification[]) => {
  try {
    localStorage.setItem('app_notifications', JSON.stringify(items));
  } catch {
    // storage unavailable
  }
};

const initialState: NotificationState = {
  items: loadFromStorage(),
};

// ── Slice ────────────────────────────────────────────────────────────────────

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.items.unshift(action.payload);
      saveToStorage(state.items);
    },
    markAsRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item) {
        item.read = true;
        saveToStorage(state.items);
      }
    },
    markAllAsRead(state) {
      state.items.forEach((n) => {
        n.read = true;
      });
      saveToStorage(state.items);
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload);
      saveToStorage(state.items);
    },
    clearAll(state) {
      state.items = [];
      saveToStorage(state.items);
    },
  },
});

export const notificationActions = notificationSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────────

export const selectAllNotifications = (state: RootState) =>
  state.notifications.items;

export const selectUnreadCount = (state: RootState) =>
  state.notifications.items.filter((n) => !n.read).length;

export const selectNotificationsForRole = (role: string) => (state: RootState) =>
  state.notifications.items.filter(
    (n) => !n.targetRole || n.targetRole === role,
  );

export const selectUnreadForRole = (role: string) => (state: RootState) =>
  state.notifications.items.filter(
    (n) => !n.read && (!n.targetRole || n.targetRole === role),
  ).length;

export default notificationSlice.reducer;
