// Svelte 5 Rune-based SSE Store
import { auth } from './auth.svelte';

export type SseStatus = 'online' | 'connecting' | 'offline';

export interface SseEventData {
  type: number;
  code?: string;
  data?: any;
  [key: string]: any;
}

type SseHandler = (event: SseEventData) => void | Promise<void>;

class SseStore {
  status = $state<SseStatus>('offline');
  private eventSource: EventSource | null = null;
  private handlers = new Set<SseHandler>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private isManualDisconnect = false;
  private lastConnectAttempt = 0;
  private minConnectCooldown = 1500;
  private listenersInitialized = false;

  constructor() {
    this.initWindowListeners();
  }

  private initWindowListeners() {
    if (typeof window === 'undefined' || this.listenersInitialized) return;
    this.listenersInitialized = true;

    window.addEventListener('online', () => {
      if (!this.isManualDisconnect && auth.token && this.status === 'offline') {
        this.retryCount = 0;
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      this.status = 'offline';
      this.cleanupEventSource();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isManualDisconnect && auth.token && this.status === 'offline') {
        // When tab is restored from background, attempt reconnection once
        this.connect();
      }
    });
  }

  connect() {
    if (typeof window === 'undefined') return;

    if (!auth.token) {
      this.status = 'offline';
      return;
    }

    // If already active or connecting, skip to prevent redundant connection churn
    if (this.eventSource) {
      if (this.eventSource.readyState === EventSource.OPEN) {
        this.status = 'online';
        return;
      }
      if (this.eventSource.readyState === EventSource.CONNECTING && this.status === 'connecting') {
        return;
      }
    }

    // Cooldown throttle: prevent tight loops from hammering the server
    const now = Date.now();
    if (now - this.lastConnectAttempt < this.minConnectCooldown) {
      if (!this.retryTimer) {
        this.scheduleReconnect(this.minConnectCooldown);
      }
      return;
    }
    this.lastConnectAttempt = now;

    // Reset manual disconnect flag
    this.isManualDisconnect = false;
    this.clearRetryTimer();
    this.cleanupEventSource();

    this.status = 'connecting';

    try {
      const sseUrl = `/api/sse?token=${encodeURIComponent(auth.token)}`;
      const sse = new EventSource(sseUrl, {
        withCredentials: true,
      });
      this.eventSource = sse;

      sse.onopen = () => {
        if (this.isManualDisconnect) {
          this.cleanupEventSource();
          return;
        }
        this.status = 'online';
        this.retryCount = 0;
        this.clearRetryTimer();
      };

      sse.onerror = () => {
        if (this.isManualDisconnect) return;

        this.status = 'offline';
        this.cleanupEventSource();

        // Do not spam reconnects if device is offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return;
        }

        // Schedule next reconnect with progressive exponential backoff
        this.scheduleReconnect();
      };

      sse.onmessage = async (e) => {
        if (this.isManualDisconnect) return;

        this.status = 'online';
        this.retryCount = 0;

        try {
          const data: SseEventData = JSON.parse(e.data);

          if (data.type === 1) {
            switch (data.code) {
              case 'OK':
                this.status = 'online';
                break;
              case 'CHANGE_PROFILE':
                await auth.fetchProfile();
                break;
              case 'UNAUTHORIZED':
                this.disconnect();
                await auth.logout();
                window.location.href = '/login';
                return;
            }
          } else if (data.type === 8 && data.code === 'UPDATE_TOKO_SETTING') {
            auth.publicInfo = { ...auth.publicInfo, ...data.data };
          }

          // Notify all custom handlers
          for (const handler of this.handlers) {
            try {
              await handler(data);
            } catch (err) {
              console.error('SSE handler error:', err);
            }
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };
    } catch (err) {
      this.status = 'offline';
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.clearRetryTimer();
    this.cleanupEventSource();
    this.retryCount = 0;
    this.status = 'offline';
  }

  private cleanupEventSource() {
    if (this.eventSource) {
      // Detach listeners before closing to prevent unwanted callback recursion
      this.eventSource.onopen = null;
      this.eventSource.onerror = null;
      this.eventSource.onmessage = null;
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }
  }

  private clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private scheduleReconnect(explicitDelay?: number) {
    if (this.isManualDisconnect || !auth.token) return;
    if (this.retryTimer) return; // Reconnect is already pending

    // Exponential backoff: 2s, 3s, 4.5s, 6.75s, up to max 20s + jitter
    const delay =
      explicitDelay ??
      Math.min(20000, 2000 * Math.pow(1.5, Math.min(this.retryCount, 8))) +
        Math.floor(Math.random() * 600);

    this.retryCount++;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.isManualDisconnect && auth.token) {
        this.connect();
      }
    }, delay);
  }

  subscribe(handler: SseHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const sse = new SseStore();

