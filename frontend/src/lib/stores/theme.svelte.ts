// Svelte 5 Rune-based Theme Store
class ThemeStore {
  isDark = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        this.setDark(true);
      } else {
        this.setDark(false);
      }
    }
  }

  setDark(val: boolean) {
    this.isDark = val;
    if (typeof document !== 'undefined') {
      if (val) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }

  toggle() {
    this.setDark(!this.isDark);
  }
}

export const theme = new ThemeStore();
