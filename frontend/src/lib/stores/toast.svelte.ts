// Svelte 5 Rune-based Toast Store
export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
}

class ToastStore {
  toasts = $state<ToastItem[]>([]);

  add(type: ToastItem['type'], message: string, title?: string, duration = 3500) {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, type, message, title, duration };
    this.toasts.push(item);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(message: string, title?: string) {
    this.add('success', message, title);
  }

  error(message: string, title?: string) {
    this.add('error', message, title, 5000);
  }

  info(message: string, title?: string) {
    this.add('info', message, title);
  }

  warning(message: string, title?: string) {
    this.add('warning', message, title, 4000);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}

export const toast = new ToastStore();
