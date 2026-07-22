import { tokenStorage } from './token';

// ── Types ────────────────────────────────────────────────────────────────────

interface WebSocketMessage {
  type: 'auth' | 'notification' | 'error' | 'auth_ok' | 'auth_failed';
  token?: string;
  message?: string;
  data?: any;
}

type NotificationCallback = (notification: any) => void;
type ConnectionCallback = (connected: boolean) => void;

// ── WebSocket Service ───────────────────────────────────────────────────────

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private authTimer: NodeJS.Timeout | null = null;
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private isAuthenticating = false;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = tokenStorage.getToken();
    if (!token) {
      console.debug('[WebSocket] Waiting for an authenticated session before connecting');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrl = import.meta.env.VITE_API_URL;
    const apiOrigin = apiUrl && /^https?:\/\//i.test(apiUrl)
      ? new URL(apiUrl).origin
      : null;
    const backendOrigin = apiOrigin
      ? apiOrigin.replace(/^https?:/, protocol)
      : `${protocol}//${window.location.host}`;
    const host = import.meta.env.VITE_WS_URL || `${backendOrigin}/ws`;

    try {
      this.ws = new WebSocket(host);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    
    this.notifyConnectionState(false);
  }

  /**
   * Subscribe to notification events
   */
  onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Send authentication message
   */
  private authenticate(): void {
    const token = tokenStorage.getToken();
    if (!token) {
      console.warn('[WebSocket] No token available for authentication');
      return;
    }

    const authMessage: WebSocketMessage = { type: 'auth', token };
    this.ws?.send(JSON.stringify(authMessage));
    this.isAuthenticating = true;

    // Auth timeout - close if not authenticated within 10s
    this.authTimer = setTimeout(() => {
      if (this.isAuthenticating) {
        console.warn('[WebSocket] Authentication timeout');
        this.ws?.close(4001, 'Authentication timeout');
      }
    }, 10000);
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.notifyConnectionState(true);
      this.authenticate();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log(`[WebSocket] Disconnected: ${event.code} ${event.reason}`);
      this.clearTimers();
      this.isAuthenticating = false;
      this.notifyConnectionState(false);
      
      // Reconnect if not a normal closure
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'auth_ok':
        console.log('[WebSocket] Authentication successful');
        this.isAuthenticating = false;
        this.clearAuthTimer();
        break;

      case 'auth_failed':
        console.warn('[WebSocket] Authentication failed');
        this.isAuthenticating = false;
        this.clearAuthTimer();
        this.ws?.close(4003, 'Authentication failed');
        break;

      case 'notification':
        console.log('[WebSocket] Received notification:', message.data);
        this.notificationCallbacks.forEach((callback) => callback(message.data));
        break;

      case 'error':
        console.warn('[WebSocket] Server error:', message.message);
        break;

      default:
        console.debug('[WebSocket] Unknown message type:', message.type);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearAuthTimer();
  }

  /**
   * Clear auth timer
   */
  private clearAuthTimer(): void {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
  }

  /**
   * Notify connection state subscribers
   */
  private notifyConnectionState(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
