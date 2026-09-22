// Svelte 5 Rune-based Auth Store
import { api } from '../api/api';
import { sse } from './sse.svelte';

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days = 30) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 86400;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

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
  token = $state<string | null>(typeof window !== 'undefined' ? localStorage.getItem('token') || getCookie('token') : null);
  user = $state<UserProfile | null>(null);
  publicInfo = $state<StorePublicInfo>(
    typeof window !== 'undefined'
      ? (() => {
          try {
            const cached = localStorage.getItem('kasirku_public_info');
            return (
              (cached && JSON.parse(cached)) || {
                store_name: 'KasirKu',
                store_desc: 'Sistem Kasir & Inventaris Modern',
                store_address: '',
                store_phone_num: '',
              }
            );
          } catch {
            return {
              store_name: 'KasirKu',
              store_desc: 'Sistem Kasir & Inventaris Modern',
              store_address: '',
              store_phone_num: '',
            };
          }
        })()
      : {
          store_name: 'KasirKu',
          store_desc: 'Sistem Kasir & Inventaris Modern',
          store_address: '',
          store_phone_num: '',
        }
  );
  isLoading = $state(true);
  isInitialized = $state(false);

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__AUTH__ = this;
      window.addEventListener('auth:unauthorized', () => {
        this.token = null;
        this.user = null;
      });
    }
  }

  isAuthenticated = $derived(this.isInitialized && !!this.token && !!this.user);

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

  hasSavedCredentials(): boolean {
    const creds = this.getSavedCredentials();
    return !!creds && !!creds.username && !!creds.password;
  }

  getSavedCredentials(): { username: string; password: string } | null {
    const u = getCookie('username') || (typeof window !== 'undefined' ? localStorage.getItem('username') : null);
    const p = getCookie('password') || (typeof window !== 'undefined' ? localStorage.getItem('password') : null);
    if (u && p && u.trim() && p.trim()) {
      return { username: u.trim(), password: p.trim() };
    }
    return null;
  }

  clearSavedPassword() {
    deleteCookie('password');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('password');
      localStorage.removeItem('remember_password');
    }
  }

  async reloginWithSavedCredentials(): Promise<boolean> {
    const creds = this.getSavedCredentials();
    if (!creds) return false;

    try {
      const params = new URLSearchParams({ username: creds.username, password: creds.password });
      const res = await fetch('/login', {
        method: 'POST',
        body: params,
      });

      if (res.status === 200) {
        const token = await res.text();
        this.token = token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        if (typeof document !== 'undefined') {
          document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
          setCookie('username', creds.username, 30);
          setCookie('password', creds.password, 30);
        }
        const profileData = await api.get<UserProfile>('/api/profile');
        const userProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        await this.fetchPublicInfo();

        this.user = userProfile;
        if (typeof window !== 'undefined' && userProfile) {
          localStorage.setItem('kasirku_user', JSON.stringify(userProfile));
        }
        return !!this.user;
      }
      return false;
    } catch {
      this.token = null;
      this.user = null;
      return false;
    }
  }

  async init() {
    if (this.isInitialized) return;
    this.isLoading = true;

    let authSucceeded = false;

    // 1. Check existing session token if available
    const existingToken = this.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null) || getCookie('token');
    if (existingToken) {
      this.token = existingToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', existingToken);
      }
      try {
        const profileData = await api.get<UserProfile>('/api/profile');
        const userProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        await this.fetchPublicInfo();

        try {
          await sse.connect();
        } catch {}

        this.user = userProfile;
        if (typeof window !== 'undefined' && userProfile) {
          localStorage.setItem('kasirku_user', JSON.stringify(userProfile));
        }
        if (this.user) {
          authSucceeded = true;
        }
      } catch (err) {
        console.warn('Session verification with existing token failed:', err);
        this.token = null;
        this.user = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('kasirku_user');
        }
        if (typeof document !== 'undefined') {
          deleteCookie('token');
        }
      }
    }

    // 2. If token check was not successful, attempt auto-relogin using saved credentials (Remember My Account)
    if (!authSucceeded && this.hasSavedCredentials()) {
      try {
        const relogged = await this.reloginWithSavedCredentials();
        if (relogged && this.user) {
          authSucceeded = true;
        } else {
          this.clearSavedPassword();
        }
      } catch (err) {
        console.warn('Auto-relogin with remembered credentials failed:', err);
        this.clearSavedPassword();
      }
    }

    // 3. If authentication did not succeed, ensure clean state and fetch public store info for login page
    if (!authSucceeded) {
      this.token = null;
      this.user = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('kasirku_user');
      }
      if (typeof document !== 'undefined') {
        deleteCookie('token');
      }
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
      if (typeof window !== 'undefined' && user) {
        localStorage.setItem('kasirku_user', JSON.stringify(user));
      }
      return user;
    } catch (err) {
      this.user = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kasirku_user');
      }
      throw err;
    }
  }

  async fetchPublicInfo() {
    try {
      const data = await api.get<any>('/api/public_info');
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const storeInfo = parsed?.store || parsed || {};
      this.publicInfo = { ...this.publicInfo, ...storeInfo };
      if (typeof window !== 'undefined') {
        localStorage.setItem('kasirku_public_info', JSON.stringify(this.publicInfo));
      }
      return this.publicInfo;
    } catch (err) {
      return this.publicInfo;
    }
  }

  async login(username: string, password: string, rememberPassword = true): Promise<boolean> {
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

      // Handle Remember my Account via Cookie & localStorage
      if (rememberPassword) {
        setCookie('username', username, 30);
        setCookie('password', password, 30);
        localStorage.setItem('username', username);
        localStorage.setItem('password', password);
        localStorage.setItem('remember_password', 'true');
      } else {
        deleteCookie('username');
        deleteCookie('password');
        localStorage.removeItem('password');
        localStorage.removeItem('remember_password');
        localStorage.setItem('username', username);
      }

      // Fetch profile & public info first without setting this.user immediately
      const profileData = await api.get<UserProfile>('/api/profile');
      const userProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
      await this.fetchPublicInfo();

      // Connect SSE before activating user state so that the dashboard doesn't flash red
      try {
        await sse.connect();
      } catch (err) {
        console.warn('SSE connect during login error:', err);
      }

      this.user = userProfile;
      if (typeof window !== 'undefined' && userProfile) {
        localStorage.setItem('kasirku_user', JSON.stringify(userProfile));
      }

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
    sse.disconnect();
    // 1. Immediately invalidate local token, user, and credentials
    this.token = null;
    this.user = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('kasirku_user');
      localStorage.removeItem('kasirku_public_info');
      localStorage.removeItem('password');
      localStorage.removeItem('remember_password');
    }
    if (typeof document !== 'undefined') {
      deleteCookie('password');
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    }

    // 2. Notify backend server to destroy session
    try {
      await api.post('/api/logout');
    } catch {}
  }
}

export const auth = new AuthStore();
