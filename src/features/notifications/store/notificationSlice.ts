import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../../store/store';
import type { Notification } from '../../../api/notifications';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotificationState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

// ── Slice ────────────────────────────────────────────────────────────────────

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // API Actions
    fetchNotificationsRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchNotificationsSuccess(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchNotificationsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchUnreadCountRequest(state) {
      // No loading state for count updates
    },
    fetchUnreadCountSuccess(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    // Local Actions (optimistic updates)
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAsReadSuccess(state, action: PayloadAction<string>) {
      // Already updated optimistically, just ensure consistency
    },
    markAllAsRead(state) {
      state.items.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    markAllAsReadSuccess(state) {
      // Already updated optimistically
    },
    removeNotification(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      state.items = state.items.filter((n) => n.id !== action.payload);
      if (item && !item.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearAll(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const notificationActions = notificationSlice.actions;

// ── Selectors ────────────────────────────────────────────────────────────────

export const selectAllNotifications = (state: RootState) =>
  state.notifications.items;

export const selectUnreadCount = (state: RootState) =>
  state.notifications.unreadCount;

export const selectNotificationsLoading = (state: RootState) =>
  state.notifications.loading;

export const selectNotificationsError = (state: RootState) =>
  state.notifications.error;

export default notificationSlice.reducer;
