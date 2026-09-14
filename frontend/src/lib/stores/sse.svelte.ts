import { auth } from './auth.svelte';
import { router } from './router.svelte';

export type SseStatus = 'online' | 'offline';

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
  private isManualDisconnect = false;
  private lastConnectAttempt = 0;
  private minConnectCooldown = 100; // 100ms cooldown
  private listenersInitialized = false;

  constructor() {
    this.initWindowListeners();
  }

  private initWindowListeners() {
    if (typeof window === 'undefined' || this.listenersInitialized) return;
    this.listenersInitialized = true;

    window.addEventListener('online', () => {
      if (!this.isManualDisconnect && auth.token && this.status === 'offline') {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      this.status = 'offline';
      this.cleanupEventSource();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isManualDisconnect && auth.token && this.status === 'offline') {
        this.connect();
      }
    });
  }

  async connect() {
    if (typeof window === 'undefined') return;

    if (!auth.token) {
      this.status = 'offline';
      return;
    }

    // If already open, keep online
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      this.status = 'online';
      return;
    }

    // Cooldown throttle: 100ms
    const now = Date.now();
    if (now - this.lastConnectAttempt < this.minConnectCooldown) {
      if (!this.retryTimer) {
        this.scheduleReconnect(this.minConnectCooldown);
      }
      return;
    }
    this.lastConnectAttempt = now;

    this.isManualDisconnect = false;
    this.clearRetryTimer();
    this.cleanupEventSource();

    try {
      const sseUrl = `/api/sse?token=${encodeURIComponent(auth.token)}`;
      const sse = new EventSource(sseUrl, {
        withCredentials: true,
      });
      this.eventSource = sse;

      sse.onopen = () => {
        if (this.isManualDisconnect || !auth.token) {
          this.cleanupEventSource();
          this.status = 'offline';
          return;
        }
        this.status = 'online';
        this.clearRetryTimer();
      };

      sse.onerror = () => {
        if (this.isManualDisconnect) return;

        this.status = 'offline';
        this.cleanupEventSource();

        // Schedule next SSE reconnect attempt after 100ms without spamming login endpoints
        this.scheduleReconnect(100);
      };

      sse.onmessage = async (e) => {
        if (this.isManualDisconnect || !auth.token) return;

        this.status = 'online';

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
                if (auth.hasSavedCredentials()) {
                  const relogged = await auth.reloginWithSavedCredentials();
                  if (relogged) {
                    this.cleanupEventSource();
                    this.connect();
                    return;
                  }
                }
                this.disconnect();
                await auth.logout();
                router.navigate('/login', true);
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
    } catch {
      this.status = 'offline';
      this.scheduleReconnect(100);
    }
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.clearRetryTimer();
    this.cleanupEventSource();
    this.status = 'offline';
  }

  private cleanupEventSource() {
    if (this.eventSource) {
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

  private scheduleReconnect(explicitDelay = 100) {
    if (this.isManualDisconnect) return;
    if (this.retryTimer) return;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.isManualDisconnect) {
        this.connect();
      }
    }, explicitDelay);
  }

  subscribe(handler: SseHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const sse = new SseStore();
