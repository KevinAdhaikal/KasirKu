// Svelte 5 Rune-based UI State Store
class UiStore {
  sidebarCollapsed = $state(false);
  mobileSidebarOpen = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar_collapsed');
      this.sidebarCollapsed = stored === 'true';
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(this.sidebarCollapsed));
    }
  }

  setSidebarCollapsed(val: boolean) {
    this.sidebarCollapsed = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(val));
    }
  }

  toggleMobileSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen = false;
  }
}

export const ui = new UiStore();
