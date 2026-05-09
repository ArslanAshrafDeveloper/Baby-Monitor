// Push token registration. Real FCM/APNs delivery is in ./push/fcm.ts.

import { FastifyInstance } from 'fastify';
import { store } from '../store/memoryStore';

interface RegisterBody { token: string }

export async function pushRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/register', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });
    const token = (req.body?.token ?? '').trim();
    if (!token) return reply.code(400).send({ error: 'missing_token' });
    store.setPushToken(auth.deviceId, token);
    return { ok: true };
  });
}
