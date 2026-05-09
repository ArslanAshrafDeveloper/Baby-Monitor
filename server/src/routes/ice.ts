// Short-lived TURN credentials.
//
// Uses the standard "rest API for TURN" HMAC scheme: username = "<expiry>:<userId>",
// password = base64(HMAC-SHA1(secret, username)). Coturn natively understands this.

import crypto from 'crypto';
import { FastifyInstance } from 'fastify';

export async function iceRoutes(app: FastifyInstance) {
  app.get('/credentials', async (req, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = (req as any).deviceAuth as { deviceId: string; userId: string } | null;
    if (!auth) return reply.code(401).send({ error: 'unauthorized' });

    const turnHost = process.env.TURN_HOST;
    const turnSecret = process.env.TURN_SECRET;

    const stun = ['stun:stun.l.google.com:19302'];

    if (!turnHost || !turnSecret) {
      // Dev fallback: return only public STUN. Direct P2P will work on most home networks.
      return {
        iceServers: [{ urls: stun }],
        ttlSec: 600,
        warning: 'no_turn_configured',
      };
    }

    const ttl = 60 * 60; // 1 hour
    const expiry = Math.floor(Date.now() / 1000) + ttl;
    const username = `${expiry}:${auth.userId}`;
    const credential = crypto
      .createHmac('sha1', turnSecret)
      .update(username)
      .digest('base64');

    return {
      iceServers: [
        { urls: stun },
        {
          urls: [
            `turn:${turnHost}:3478?transport=udp`,
            `turn:${turnHost}:3478?transport=tcp`,
            `turns:${turnHost}:5349?transport=tcp`,
          ],
          username,
          credential,
        },
      ],
      ttlSec: ttl,
    };
  });
}
