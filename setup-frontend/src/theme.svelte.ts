class ThemeStore {
  isDark = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('setup-theme');
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
        localStorage.setItem('setup-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('setup-theme', 'light');
      }
    }
  }

  toggle() {
    this.setDark(!this.isDark);
  }
}

export const theme = new ThemeStore();
