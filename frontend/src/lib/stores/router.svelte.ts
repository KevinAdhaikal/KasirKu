// Svelte 5 Rune-based Lightweight SPA Router
import { progress } from './progress.svelte';

function normalizeRoute(p: string): string {
  const pathname = p.split('?')[0].split('#')[0];
  let cleaned = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (!cleaned.startsWith('/')) cleaned = '/' + cleaned;
  cleaned = cleaned.replace(/\/$/, '') || '/';
  if (cleaned === '/dashboard') cleaned = '/';
  if (cleaned === '/penjualan') cleaned = '/pembukuan/penjualan';
  if (cleaned === '/pengeluaran') cleaned = '/pembukuan/pengeluaran';
  if (cleaned === '/laporan') cleaned = '/pembukuan/laporan';
  return cleaned;
}

class RouterStore {
  currentPath = $state(typeof window !== 'undefined' ? normalizeRoute(window.location.pathname) : '/');
  search = $state(typeof window !== 'undefined' ? window.location.search : '');

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        const prev = this.currentPath;
        this.currentPath = normalizeRoute(window.location.pathname);
        this.search = window.location.search;
        if (prev !== this.currentPath) {
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

    const parts = path.split('?');
    const pathname = parts[0];
    const queryString = parts[1] ? `?${parts[1]}` : '';
    const normalized = normalizeRoute(pathname);
    const fullTarget = `${normalized}${queryString}`;

    const currentFull = `${this.currentPath}${this.search}`;
    if (currentFull === fullTarget) {
      return;
    }

    if (replace) {
      window.history.replaceState({}, '', fullTarget);
    } else {
      window.history.pushState({}, '', fullTarget);
    }
    progress.start();
    this.currentPath = normalized;
    this.search = queryString;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => progress.done(), 180);
  }

  matches(path: string): boolean {
    return normalizeRoute(this.currentPath) === normalizeRoute(path);
  }
}

export const router = new RouterStore();
