import { api } from './api';
import { useSettingsStore } from '@/store/settings';
import type { Pair } from '@/types';

export async function generatePairingCode(): Promise<{ code: string; expiresAt: number }> {
  return api('/pair/code', { method: 'POST' });
}

export async function claimPairingCode(code: string): Promise<Pair> {
  const resp = await api<{ pair: Pair }>('/pair/claim', {
    method: 'POST',
    body: { code },
  });
  useSettingsStore.getState().setPair(resp.pair);
  useSettingsStore.getState().setRole('child');
  return resp.pair;
}

export async function unpair(): Promise<void> {
  await api<{ ok: boolean }>('/pair/unpair', { method: 'POST' });
  useSettingsStore.getState().clearPair();
}

export async function refreshSelf(): Promise<void> {
  const me = await api<{ pair: Pair | null; device: { role: 'child' | 'parent' | 'unset' } }>(
    '/auth/me',
    {},
  );
  if (me.pair) useSettingsStore.getState().setPair(me.pair);
  if (me.device?.role && me.device.role !== 'unset') {
    useSettingsStore.getState().setRole(me.device.role);
  }
}
