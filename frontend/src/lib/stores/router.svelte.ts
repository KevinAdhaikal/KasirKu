// Svelte 5 Rune-based Lightweight SPA Router
import { progress } from './progress.svelte';

function normalizeRoute(p: string): string {
  let cleaned = p.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (!cleaned.startsWith('/')) cleaned = '/' + cleaned;
  cleaned = cleaned.replace(/\/$/, '') || '/';
  if (cleaned === '/dashboard') cleaned = '/';
  if (cleaned === '/penjualan') cleaned = '/pembukuan/penjualan';
  if (cleaned === '/pengeluaran') cleaned = '/pembukuan/pengeluaran';
  if (cleaned === '/laporan') cleaned = '/pembukuan/laporan';
  return cleaned;
}

class RouterStore {
  currentPath = $state(typeof window !== 'undefined' ? window.location.pathname : '/');

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        const prev = this.currentPath;
        this.currentPath = window.location.pathname;
        if (normalizeRoute(prev) !== normalizeRoute(this.currentPath)) {
          progress.start();
          setTimeout(() => progress.done(), 180);
        }
      });

      // Intercept local link clicks
      document.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).closest('a');
        if (!target) return;

        const href = target.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('mailto:') || target.getAttribute('target') === '_blank') {
          return;
        }

        e.preventDefault();
        this.navigate(href);
      });
    }
  }

  navigate(path: string, replace = false) {
    if (typeof window === 'undefined') return;

    // Normalize path
    let normalized = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (!normalized.startsWith('/')) normalized = '/' + normalized;

    // If target path is already active / current, do nothing and do not show progress
    if (this.matches(normalized)) {
      return;
    }

    if (replace) {
      window.history.replaceState({}, '', normalized);
    } else {
      window.history.pushState({}, '', normalized);
    }
    progress.start();
    this.currentPath = normalized;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => progress.done(), 180);
  }

  matches(path: string): boolean {
    return normalizeRoute(this.currentPath) === normalizeRoute(path);
  }
}

export const router = new RouterStore();
