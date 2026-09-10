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
  status = $state<SseStatus>('connecting');
  private eventSource: EventSource | null = null;
  private handlers = new Set<SseHandler>();
  private retryTimer: any = null;
  private retryCount = 0;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.eventSource) {
      if (this.status === 'online' || this.status === 'connecting') return;
      this.disconnect();
    }

    if (!auth.token) {
      this.status = 'offline';
      return;
    }

    this.status = 'connecting';

    try {
      const sseUrl = `/api/sse?token=${encodeURIComponent(auth.token)}`;
      const sse = new EventSource(sseUrl, {
        withCredentials: true,
      });
      this.eventSource = sse;

      sse.onopen = () => {
        this.status = 'online';
        this.retryCount = 0;
      };

      sse.onerror = () => {
        this.status = 'offline';
        this.disconnect();

        // Reconnect with backoff
        const delay = this.retryCount < 5 ? 1000 : 3000;
        this.retryCount++;

        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          this.connect();
        }, delay);
      };

      sse.onmessage = async (e) => {
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
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    clearTimeout(this.retryTimer);
    this.status = 'offline';
  }

  subscribe(handler: SseHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

export const sse = new SseStore();
