import type { DatabaseConfig, ServerConfig, StoreConfig, AdminConfig } from './types';

async function handleResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (res.ok) {
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  } else {
    const errorText = await res.text();
    let message = errorText;
    try {
      const json = JSON.parse(errorText);
      if (json.message) message = json.message;
      else if (json.error) message = json.error;
    } catch {}
    throw new Error(message || `Request failed with status ${res.status}`);
  }
}

export async function testDbConnection(config: DatabaseConfig): Promise<{ success: boolean; message?: string }> {
  const payload = {
    type: config.type,
    host: config.host,
    port: Number(config.port),
    name: config.name,
    user: config.user,
    pass: config.pass,
  };

  const res = await fetch('/test_connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  await handleResponse(res);
  return { success: true };
}

export async function checkCertificate(certBase64: string, keyBase64: string): Promise<boolean> {
  const res = await fetch('/check_certificate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cert: certBase64, key: keyBase64 }),
  });
  await handleResponse(res);
  return true;
}

export async function setupDatabase(config: DatabaseConfig): Promise<void> {
  const payload = {
    type: config.type,
    host: config.host,
    port: Number(config.port),
    name: config.name,
    user: config.user,
    pass: config.pass
  };
  const res = await fetch('/setup_db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await handleResponse(res);
}

export async function setupServer(config: ServerConfig): Promise<void> {
  const payload: any = {
    protocol: config.protocol,
    port: Number(config.port),
    tls: {
      mode: config.tls.mode,
    },
  };
  if (config.protocol === 'https' && config.tls.mode === 'upload') {
    payload.tls.cert = config.tls.cert;
    payload.tls.key = config.tls.key;
  }
  const res = await fetch('/setup_server', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await handleResponse(res);
}

export async function setupStore(config: StoreConfig): Promise<void> {
  const res = await fetch('/setup_store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse(res);
}

export async function setupAdmin(config: AdminConfig): Promise<void> {
  const res = await fetch('/setup_admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  await handleResponse(res);
}

export async function setupFinal(): Promise<void> {
  const res = await fetch('/setup_final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  await handleResponse(res);
}

export async function pollPing(targetUrl: string, maxAttempts = 40, intervalMs = 1500): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${targetUrl}/ping`, { 
        signal: controller.signal,
        tls: {
          rejectUnauthorized: false
        }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
