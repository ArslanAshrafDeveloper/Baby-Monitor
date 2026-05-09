// Wake-on-cry. The Child Device hits this when its on-device detector fires.
// We rate-limit per pair so a stuck detector can't spam the parent's lock screen.

import { FastifyInstance } from 'fastify';
import { store } from '../store/memoryStore';
import { sendWakePush } from '../push/fcm';

const lastWakeAt = new Map<string, number>(); // pairId -> ms timestamp
const WAKE_COOLDOWN_MS = 30 * 1000;

export async function wakeRoutes(app: FastifyInstance) {
  app.post('/', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });

    const pair = store.pairForDevice(auth.deviceId);
    if (!pair) return reply.code(404).send({ error: 'no_pair' });
    if (pair.childDeviceId !== auth.deviceId) {
      return reply.code(403).send({ error: 'only_child_can_wake' });
    }

    const last = lastWakeAt.get(pair.id) ?? 0;
    const now = Date.now();
    if (now - last < WAKE_COOLDOWN_MS) {
      return { ok: true, throttled: true };
    }
    lastWakeAt.set(pair.id, now);

    const parent = store.devices.get(pair.parentDeviceId);
    if (!parent?.pushToken) {
      app.log.warn({ pairId: pair.id }, 'parent has no push token registered');
      return reply.code(404).send({ error: 'parent_unreachable' });
    }

    try {
      await sendWakePush({
        platform: parent.platform,
        token: parent.pushToken,
        pairId: pair.id,
      });
    } catch (err) {
      app.log.error({ err }, 'wake push failed');
      return reply.code(502).send({ error: 'push_failed' });
    }

    return { ok: true };
  });
}
