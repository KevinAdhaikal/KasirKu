// High-level API client for KasirKu backend
import { progress } from '../stores/progress.svelte';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  progress.requestStarted();
  try {
    const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('token')) {
    headers.set('token', token);
  }

  const res = await fetch(`${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(401, 'Sesi telah berakhir atau server sedang offline.');
  }

  if (res.status === 429) {
    throw new ApiError(429, 'Terlalu banyak permintaan. Mohon tunggu beberapa detik.');
  }

  if (res.status === 403) {
    let errorText = await res.text();
    if (errorText === "0") throw new ApiError(403, "Anda tidak memiliki akses untuk melakukan ini.")
    else return <T>errorText
  }

  if (!res.ok) {
    let errorText = await res.text();
    try {
      const json = JSON.parse(errorText);
      throw new ApiError(res.status, json.message || errorText, json);
    } catch {
      throw new ApiError(res.status, errorText || `Permintaan gagal dengan status ${res.status}`);
    }
  }

    const text = await res.text();
    if (!text || text.trim() === '') {
      return null as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } finally {
    progress.requestFinished();
  }
}

export const api = {
  get: <T = any>(path: string, headers?: HeadersInit) =>
    request<T>(path, { method: 'GET', headers }),

  post: <T = any>(path: string, body?: any, headers?: HeadersInit) => {
    const isFormData = body instanceof FormData;
    const isUrlEncoded = body instanceof URLSearchParams;
    const isString = typeof body === 'string';

    const reqHeaders: Record<string, string> = {};
    if (!isFormData && !isUrlEncoded && !isString && body !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    return request<T>(path, {
      method: 'POST',
      body,
      headers: { ...reqHeaders, ...(headers as Record<string, string>) },
    });
  },

  patch: <T = any>(path: string, body?: any, headers?: HeadersInit) => {
    const isFormData = body instanceof FormData;
    const isUrlEncoded = body instanceof URLSearchParams;
    const isString = typeof body === 'string';

    const reqHeaders: Record<string, string> = {};
    if (!isFormData && !isUrlEncoded && !isString && body !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    return request<T>(path, {
      method: 'PATCH',
      body,
      headers: { ...reqHeaders, ...(headers as Record<string, string>) },
    });
  },

  delete: <T = any>(path: string, body?: any, headers?: HeadersInit) => {
    const isFormData = body instanceof FormData;
    const isUrlEncoded = body instanceof URLSearchParams;
    const isString = typeof body === 'string';

    const reqHeaders: Record<string, string> = {};
    if (!isFormData && !isUrlEncoded && !isString && body !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    return request<T>(path, {
      method: 'DELETE',
      body,
      headers: { ...reqHeaders, ...(headers as Record<string, string>) },
    });
  },
};
