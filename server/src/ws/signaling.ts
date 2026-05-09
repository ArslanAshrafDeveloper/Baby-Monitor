// WebSocket signaling relay.
//
// Each device connects to /ws/signal?token=<jwt>. The server joins them to a "room"
// keyed by their pair ID, and forwards SDP offer/answer + ICE candidates between the
// two members. We never inspect or store the payloads.

import { FastifyInstance } from 'fastify';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WS = any;
import { store } from '../store/memoryStore';

interface RoomMembers { child?: WS; parent?: WS }
const rooms = new Map<string, RoomMembers>(); // pairId -> members

interface SignalEnvelope {
  type: 'offer' | 'answer' | 'ice' | 'bye' | 'ping';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

export async function signalingRoutes(app: FastifyInstance) {
  app.get('/signal', { websocket: true }, (connection, req) => {
    const url = new URL(req.url ?? '', 'http://x');
    const token = url.searchParams.get('token');
    if (!token) {
      connection.socket.close(4001, 'missing_token');
      return;
    }
    let auth: { deviceId: string; userId: string };
    try {
      auth = app.jwt.verify(token) as { deviceId: string; userId: string };
    } catch {
      connection.socket.close(4002, 'bad_token');
      return;
    }

    const pair = store.pairForDevice(auth.deviceId);
    if (!pair) {
      connection.socket.close(4003, 'not_paired');
      return;
    }

    const role: 'child' | 'parent' =
      pair.childDeviceId === auth.deviceId ? 'child' : 'parent';
    let room = rooms.get(pair.id);
    if (!room) {
      room = {};
      rooms.set(pair.id, room);
    }
    // Replace any prior connection from the same role (e.g. reconnect).
    if (room[role]) {
      try { room[role]!.close(4000, 'replaced'); } catch { /* ignore */ }
    }
    room[role] = connection.socket;

    const send = (peer: WS | undefined, env: SignalEnvelope) => {
      if (!peer || peer.readyState !== 1) return;
      try { peer.send(JSON.stringify(env)); } catch { /* ignore */ }
    };

    // Tell each side whether the peer is online.
    send(connection.socket, { type: 'ping', payload: { peerOnline: !!room[role === 'child' ? 'parent' : 'child'] } });
    const peerSocket = role === 'child' ? room.parent : room.child;
    send(peerSocket, { type: 'ping', payload: { peerOnline: true } });

    connection.socket.on('message', (raw: Buffer | string) => {
      let env: SignalEnvelope;
      try {
        env = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
      } catch {
        return;
      }
      const peer = role === 'child' ? rooms.get(pair.id)?.parent : rooms.get(pair.id)?.child;
      // We only forward known signaling envelope types — no arbitrary data.
      if (env.type === 'offer' || env.type === 'answer' || env.type === 'ice' || env.type === 'bye') {
        send(peer, env);
      }
    });

    connection.socket.on('close', () => {
      const r = rooms.get(pair.id);
      if (!r) return;
      if (r[role] === connection.socket) {
        r[role] = undefined;
      }
      // Tell the peer we left.
      const peer = role === 'child' ? r.parent : r.child;
      send(peer, { type: 'ping', payload: { peerOnline: false } });
      // Clean up empty rooms.
      if (!r.child && !r.parent) rooms.delete(pair.id);
    });
  });
}
