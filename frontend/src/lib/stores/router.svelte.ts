// Svelte 5 Rune-based Lightweight SPA Router
class RouterStore {
  currentPath = $state(typeof window !== 'undefined' ? window.location.pathname : '/');

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.currentPath = window.location.pathname;
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

    if (replace) {
      window.history.replaceState({}, '', normalized);
    } else {
      window.history.pushState({}, '', normalized);
    }
    this.currentPath = normalized;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  matches(path: string): boolean {
    const current = this.currentPath.replace(/\/$/, '') || '/';
    const target = path.replace(/\/$/, '') || '/';
    return current === target;
  }
}

export const router = new RouterStore();
