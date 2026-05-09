// Anonymous device sign-in. Returns a JWT we'll attach to all subsequent calls
// and use to upgrade the WebSocket signaling channel.

import { Platform } from 'react-native';
import { api } from './api';
import { useSettingsStore } from '@/store/settings';

interface AnonResp {
  token: string;
  deviceId: string;
  userId: string;
}

export async function ensureSignedIn(): Promise<void> {
  const { token, deviceId } = useSettingsStore.getState();
  if (token && deviceId) return;
  const resp = await api<AnonResp>('/auth/anon', {
    method: 'POST',
    auth: false,
    body: { platform: Platform.OS === 'ios' ? 'ios' : 'android' },
  });
  useSettingsStore.getState().setAuth(resp.token, resp.deviceId, resp.userId);
}
