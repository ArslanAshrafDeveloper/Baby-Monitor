// Auth routes.
//
// v1 keeps it minimal: a device can request an anonymous token. Email magic-link
// auth is stubbed out for later — it just creates a user and returns a token,
// without actually emailing anything.

import { FastifyInstance } from 'fastify';
import { store } from '../store/memoryStore';

interface AnonBody {
  platform?: 'ios' | 'android';
}

interface MagicLinkBody {
  email: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: AnonBody }>('/anon', async (req) => {
    const user = store.createUser();
    const device = store.createDevice(user.id, req.body?.platform);
    const token = app.jwt.sign({ deviceId: device.id, userId: user.id });
    return { token, deviceId: device.id, userId: user.id };
  });

  app.post<{ Body: MagicLinkBody }>('/magic-link', async (req, reply) => {
    const email = (req.body?.email ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: 'invalid_email' });
    }
    // TODO: replace with real magic-link email send.
    const user = store.createUser(email);
    const device = store.createDevice(user.id);
    const token = app.jwt.sign({ deviceId: device.id, userId: user.id });
    return { token, deviceId: device.id, userId: user.id, dev_only: true };
  });

  app.get('/me', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string; userId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });
    const device = store.devices.get(auth.deviceId);
    const user = store.users.get(auth.userId);
    if (!device || !user) return reply.code(404).send({ error: 'not_found' });
    store.touchDevice(device.id);
    const pair = store.pairForDevice(device.id);
    return { device, user, pair };
  });
}
