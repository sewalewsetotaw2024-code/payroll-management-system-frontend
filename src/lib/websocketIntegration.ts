import store from '../store/store';
import { notificationActions } from '../features/notifications/store/notificationSlice';
import { websocketService } from './websocket';
import type { Notification } from '../api/notifications';

/**
 * Initialize WebSocket integration with Redux store
 * This should be called after the store is created
 */
export function initializeWebSocketIntegration(): void {
  // Subscribe to WebSocket notifications and dispatch to Redux
  websocketService.onNotification((notification: Notification) => {
    store.dispatch(notificationActions.addNotification(notification));
    // Refresh unread count when new notification arrives
    store.dispatch(notificationActions.fetchUnreadCountRequest());
  });
}

/**
 * Cleanup WebSocket integration
 * Call this when the app unmounts or user logs out
 */
export function cleanupWebSocketIntegration(): void {
  websocketService.disconnect();
}
