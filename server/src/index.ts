// Signaling backend entrypoint.
//
// Boots Fastify with REST routes for auth/pairing/push/ICE/wake and a WebSocket
// route for SDP/ICE candidate relay. All audio is peer-to-peer; this server
// never touches media.

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';

import { authRoutes } from './routes/auth';
import { pairingRoutes } from './routes/pairing';
import { pushRoutes } from './routes/push';
import { iceRoutes } from './routes/ice';
import { wakeRoutes } from './routes/wake';
import { signalingRoutes } from './ws/signaling';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  // eslint-disable-next-line no-console
  console.error('JWT_SECRET is required and must be at least 16 chars.');
  process.exit(1);
}

async function main() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  });

  await app.register(cors, {
    origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : true,
    credentials: true,
  });

  await app.register(jwt, { secret: JWT_SECRET });
  await app.register(websocket);

  // Auth decorator: attaches `req.deviceAuth` if a valid Bearer token is present.
  app.decorateRequest('deviceAuth', null);
  app.addHook('onRequest', async (req) => {
    const header = req.headers['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      try {
        const token = header.slice('Bearer '.length);
        // The plugin attaches verify() on the request via request.jwtVerify(),
        // but for the WS upgrade path we manually decode below in /ws/signal.
        const payload = app.jwt.verify(token) as {
          deviceId: string;
          userId: string;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).deviceAuth = payload;
      } catch {
        // ignore — protected routes will reject below
      }
    }
  });

  app.get('/healthz', async () => ({ ok: true, ts: Date.now() }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(pairingRoutes, { prefix: '/pair' });
  await app.register(pushRoutes, { prefix: '/push' });
  await app.register(iceRoutes, { prefix: '/ice' });
  await app.register(wakeRoutes, { prefix: '/wake' });
  await app.register(signalingRoutes, { prefix: '/ws' });

  await app.listen({ host: HOST, port: PORT });
  app.log.info(`Signaling server listening on ${HOST}:${PORT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
