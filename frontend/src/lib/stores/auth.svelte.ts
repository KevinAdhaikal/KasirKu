// Svelte 5 Rune-based Auth Store
import { api } from '../api/api';

export const Permissions = {
  ADMINISTRATOR: 1 << 0, // 1
  MANAGE_BARANG: 1 << 1, // 2
  KASIR: 1 << 2,         // 4
  MANAGE_PEMBUKUAN: 1 << 3, // 8
  DASHBOARD: 1 << 4,     // 16
} as const;

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  permission_level: number;
  profile_img?: string | null;
}

export interface StorePublicInfo {
  store_name?: string;
  store_desc?: string;
  store_address?: string;
  store_phone_num?: string;
  [key: string]: any;
}

class AuthStore {
  token = $state<string | null>(typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  user = $state<UserProfile | null>(null);
  publicInfo = $state<StorePublicInfo>({
    store_name: 'KasirKu',
    store_desc: 'Sistem Kasir & Inventaris Modern',
    store_address: '',
    store_phone_num: '',
  });
  isLoading = $state(true);
  isInitialized = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__AUTH__ = this;
    }
  }

  isAuthenticated = $derived(!!this.token && !!this.user);

  can(permission: number): boolean {
    if (!this.user) {
      // While session is initializing, preserve core navigation so sidebar is never blank
      return permission === Permissions.DASHBOARD || permission === Permissions.KASIR;
    }
    const userRole = this.user.role_name;
    const userPerm = Number(this.user.permission_level);
    // Administrator has all permissions
    if (userRole === 'Administrator' || (userPerm & Permissions.ADMINISTRATOR)) return true;
    return (userPerm & permission) !== 0;
  }

  async init() {
    if (this.isInitialized) return;
    this.isLoading = true;

    if (this.token) {
      try {
        await Promise.all([this.fetchProfile(), this.fetchPublicInfo()]);
      } catch (err) {
        console.error('Failed to initialize session:', err);
        this.token = null;
        localStorage.removeItem('token');
      }
    } else {
      // Still fetch public info if available
      try {
        await this.fetchPublicInfo();
      } catch {}
    }

    this.isLoading = false;
    this.isInitialized = true;
  }

  async fetchProfile() {
    try {
      const data = await api.get<UserProfile>('/api/profile');
      const user = typeof data === 'string' ? JSON.parse(data) : data;
      this.user = user;
      return user;
    } catch (err) {
      this.user = null;
      throw err;
    }
  }

  async fetchPublicInfo() {
    try {
      const data = await api.get<any>('/api/public_info');
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const storeInfo = parsed?.store || parsed || {};
      this.publicInfo = { ...this.publicInfo, ...storeInfo };
      return this.publicInfo;
    } catch (err) {
      return this.publicInfo;
    }
  }

  async login(username: string, password: string, remember = true): Promise<boolean> {
    const params = new URLSearchParams({ username, password });
    const res = await fetch('/login', {
      method: 'POST',
      body: params,
    });

    if (res.status === 200) {
      const token = await res.text();
      this.token = token;
      localStorage.setItem('token', token);
      if (typeof document !== 'undefined') {
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
      }

      if (remember) {
        localStorage.setItem('username', username);
      } else {
        localStorage.removeItem('username');
      }

      await this.fetchProfile();
      await this.fetchPublicInfo();
      return true;
    } else if (res.status === 403) {
      throw new Error('Username atau kata sandi tidak valid.');
    } else if (res.status === 429) {
      throw new Error('Terlalu banyak percobaan login. Mohon tunggu beberapa saat.');
    } else {
      throw new Error(`Login gagal (${res.status}). Silakan coba lagi.`);
    }
  }

  async logout() {
    try {
      await api.post('/api/logout');
    } catch {}
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    }
  }
}

export const auth = new AuthStore();
