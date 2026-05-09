// WebSocket signaling client.
// Connects to /ws/signal?token=<jwt>; emits typed events for the WebRTC layer.

import { API_BASE } from './api';
import { useSettingsStore } from '@/store/settings';
import { logger } from '@/utils/logger';
import type { SignalEnvelope } from '@/types';

const log = logger('signal');

type Listener = (env: SignalEnvelope) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempt = 0;
  private explicitClose = false;

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect() {
    const token = useSettingsStore.getState().token;
    if (!token) throw new Error('Not signed in');
    // ws / wss based on the API_BASE protocol.
    const wsBase = API_BASE.replace(/^http/, 'ws');
    const url = `${wsBase}/ws/signal?token=${encodeURIComponent(token)}`;
    log.info('connecting', url);
    this.explicitClose = false;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      log.info('open');
    };
    ws.onmessage = (ev) => {
      try {
        const env = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as SignalEnvelope;
        for (const l of this.listeners) l(env);
      } catch (err) {
        log.warn('bad signaling frame', err);
      }
    };
    ws.onerror = (ev) => log.warn('ws error', ev);
    ws.onclose = (ev) => {
      log.info('close', ev.code, ev.reason);
      this.ws = null;
      if (this.explicitClose) return;
      // Exponential backoff reconnect (capped at 30 s).
      const delay = Math.min(30_000, 500 * 2 ** this.reconnectAttempt++);
      setTimeout(() => this.connect(), delay);
    };
  }

  send(env: SignalEnvelope) {
    if (!this.ws || this.ws.readyState !== 1) {
      log.warn('send while not open', env.type);
      return;
    }
    this.ws.send(JSON.stringify(env));
  }

  close() {
    this.explicitClose = true;
    this.ws?.close();
    this.ws = null;
  }
}

// Singleton — one signaling channel per app instance.
export const signaling = new SignalingClient();
