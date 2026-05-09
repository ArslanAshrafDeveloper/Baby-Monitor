// Push registration. v1 supports:
//   - iOS: VoIP push via PushKit (so wake-on-cry works while suspended)
//   - Android: data-only FCM message handled by a foreground service
//
// In this scaffold we only show the registration shape and the wake handler.
// The native modules referenced here are listed in package.json; see SETUP.md
// for the iOS PushKit + CallKit wiring.

import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import { api } from './api';
import { logger } from '@/utils/logger';

const log = logger('push');

type WakeHandler = (pairId: string) => void;
let wakeHandler: WakeHandler | null = null;
export function onWake(handler: WakeHandler) { wakeHandler = handler; }

export async function initPush(): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const VoipPushNotification = require('react-native-voip-push-notification').default;
      VoipPushNotification.addEventListener('register', async (token: string) => {
        log.info('voip token', token.slice(0, 8) + '...');
        try { await api('/push/register', { method: 'POST', body: { token } }); }
        catch (err) { log.warn('push/register failed', err); }
      });
      VoipPushNotification.addEventListener('notification', (notif: { pairId?: string }) => {
        const pairId = notif?.pairId;
        if (pairId && wakeHandler) wakeHandler(pairId);
      });
      VoipPushNotification.registerVoipToken();
    } catch (err) {
      log.warn('VoIP push not available (dev?)', err);
    }
  } else if (Platform.OS === 'android') {
    // Wire FCM token via your messaging library of choice (e.g. @react-native-firebase/messaging).
    // For the scaffold, we emit a placeholder event and let the foreground service handle wake intents.
    try {
      const emitter = new NativeEventEmitter(NativeModules.RNFirebaseMessaging ?? undefined);
      emitter.addListener?.('remoteMessage', (msg: { data?: { type?: string; pairId?: string } }) => {
        if (msg?.data?.type === 'wake_on_cry' && msg.data.pairId && wakeHandler) {
          wakeHandler(msg.data.pairId);
        }
      });
    } catch {
      // Messaging module not installed in scaffold — fine for first-run.
    }
  }
}
