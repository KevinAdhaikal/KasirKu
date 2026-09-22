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
  private connectPromise: Promise<boolean> | null = null;
  private isHandlingUnauthorized = false;

  constructor() {
    this.initWindowListeners();
  }

  private initWindowListeners() {
    if (typeof window === 'undefined' || this.listenersInitialized) return;
    this.listenersInitialized = true;

    window.addEventListener('online', () => {
      if (!this.isManualDisconnect && !this.isHandlingUnauthorized && auth.token && this.status === 'offline') {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      this.status = 'offline';
      this.cleanupEventSource();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isManualDisconnect && !this.isHandlingUnauthorized && auth.token && this.status === 'offline') {
        this.connect();
      }
    });
  }

  async connect(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!auth.token) {
      this.status = 'offline';
      return false;
    }

    // If already open and online, return immediately
    if (this.status === 'online' && this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return true;
    }

    // If a connection attempt is already actively waiting, return that same promise
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<boolean>((resolve) => {
      // Cooldown throttle: 100ms
      const now = Date.now();
      if (now - this.lastConnectAttempt < this.minConnectCooldown) {
        if (!this.retryTimer) {
          this.scheduleReconnect(this.minConnectCooldown);
        }
        resolve(this.status === 'online');
        return;
      }
      this.lastConnectAttempt = now;

      this.isManualDisconnect = false;
      this.clearRetryTimer();
      this.cleanupEventSource();

      let settled = false;
      const settle = (isOnline: boolean) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(isOnline);
        }
      };

      // Fallback timeout so we never hang indefinitely (e.g. 3.5s)
      const timeoutId = setTimeout(() => {
        settle(this.status === 'online');
      }, 3500);

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
            settle(false);
            return;
          }
          this.clearRetryTimer();
          // Do not mark online yet; wait for authorized event confirmation from server
        };

        sse.onerror = () => {
          if (this.isManualDisconnect || this.isHandlingUnauthorized) {
            settle(false);
            return;
          }

          this.status = 'offline';
          this.cleanupEventSource();
          settle(false);

          // Schedule next SSE reconnect attempt after 100ms without spamming login endpoints
          this.scheduleReconnect(100);
        };

        sse.onmessage = async (e) => {
          if (this.isManualDisconnect || !auth.token) return;

          try {
            const data: SseEventData = JSON.parse(e.data);

            if (data.type === 1) {
              switch (data.code) {
                case 'OK':
                  this.status = 'online';
                  this.clearRetryTimer();
                  settle(true);
                  break;
                case 'CHANGE_PROFILE':
                  this.status = 'online';
                  settle(true);
                  await auth.fetchProfile();
                  break;
                case 'UNAUTHORIZED':
                  this.status = 'offline';
                  settle(false);
                  this.connectPromise = null;
                  this.cleanupEventSource();

                  if (auth.hasSavedCredentials() && !this.isHandlingUnauthorized) {
                    this.isHandlingUnauthorized = true;
                    try {
                      const relogged = await auth.reloginWithSavedCredentials();
                      if (relogged) {
                        this.isHandlingUnauthorized = false;
                        this.lastConnectAttempt = 0;
                        await this.connect();
                        return;
                      }
                    } catch (err) {
                      console.warn('Auto relogin after unauthorized failed:', err);
                    } finally {
                      this.isHandlingUnauthorized = false;
                    }
                  }

                  this.disconnect();
                  await auth.logout();
                  router.navigate('/login', true);
                  return;
              }
            } else {
              // Any other operational data event from server confirms connection is active
              this.status = 'online';
              settle(true);
              if (data.type === 8 && data.code === 'UPDATE_TOKO_SETTING') {
                auth.publicInfo = { ...auth.publicInfo, ...data.data };
              }
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
        settle(false);
        this.scheduleReconnect(100);
      }
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.isHandlingUnauthorized = false;
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
    if (this.isManualDisconnect || this.isHandlingUnauthorized) return;
    if (this.retryTimer) return;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.isManualDisconnect && !this.isHandlingUnauthorized) {
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
