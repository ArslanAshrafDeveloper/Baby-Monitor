// Tiny REST client for the signaling backend. Auth header is attached automatically
// from the settings store.

import { useSettingsStore } from '@/store/settings';
import { logger } from '@/utils/logger';

const log = logger('api');

// Configure this for your environment. In dev, you typically point this at your
// laptop's LAN IP (e.g. http://192.168.1.20:8080) so both phones can reach it.
export const API_BASE = 'http://10.0.2.2:8080';

interface FetchOpts {
  method?: 'GET' | 'POST';
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = useSettingsStore.getState().token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    log.warn('api', method, path, res.status, text);
    throw new Error(`api ${method} ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}
