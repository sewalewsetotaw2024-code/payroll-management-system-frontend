import store from '../store/store';
import { notificationActions } from '../features/notifications/store/notificationSlice';
import { websocketService } from './websocket';
import type { Notification } from '../api/notifications';
import { tokenStorage } from './token';

/**
 * Initialize WebSocket integration with Redux store
 * This should be called after the store is created
 */
export function initializeWebSocketIntegration(): void {
  websocketService.onNotification((notification: Notification) => {
    store.dispatch(notificationActions.addNotification(notification));
    store.dispatch(notificationActions.fetchUnreadCountRequest());
  });

  let isConnected = false;

  const syncConnection = () => {
    const authState = store.getState().auth;
    const hasToken = !!tokenStorage.getToken();

    if (authState.isAuthenticated && hasToken && !isConnected) {
      websocketService.connect();
      isConnected = true;
      return;
    }

    if ((!authState.isAuthenticated || !hasToken) && isConnected) {
      websocketService.disconnect();
      isConnected = false;
    }
  };

  store.subscribe(syncConnection);
  syncConnection();
}

/**
 * Cleanup WebSocket integration
 * Call this when the app unmounts or user logs out
 */
export function cleanupWebSocketIntegration(): void {
  websocketService.disconnect();
}
