// Pairing routes.
//
//  - POST /pair/code        Parent generates a 6-digit code (TTL 5 min).
//  - POST /pair/claim       Child submits the code; backend records the pair.
//  - POST /pair/unpair      Either side dissolves the pair.

import { FastifyInstance } from 'fastify';
import { store } from '../store/memoryStore';

interface ClaimBody { code: string }

export async function pairingRoutes(app: FastifyInstance) {
  app.post('/code', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });
    const entry = store.newPairingCode(auth.deviceId);
    return { code: entry.code, expiresAt: entry.expiresAt };
  });

  app.post<{ Body: ClaimBody }>('/claim', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });
    const code = (req.body?.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) {
      return reply.code(400).send({ error: 'invalid_code' });
    }
    const pair = store.consumePairingCode(code, auth.deviceId);
    if (!pair) return reply.code(404).send({ error: 'code_expired_or_invalid' });
    return { pair };
  });

  app.post('/unpair', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });
    const ok = store.unpair(auth.deviceId);
    return { ok };
  });
}
