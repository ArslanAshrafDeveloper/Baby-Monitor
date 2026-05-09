// Tiny in-memory store. Swap for Postgres / Firestore in production —
// the surface area is intentionally small (one file, three maps).

import { nanoid } from 'nanoid';

export type Role = 'child' | 'parent' | 'unset';
export type Platform = 'ios' | 'android';

export interface User {
  id: string;
  email?: string;
  createdAt: number;
}

export interface Device {
  id: string;
  userId: string;
  role: Role;
  platform?: Platform;
  pushToken?: string;
  lastSeenAt: number;
}

export interface Pair {
  id: string;
  childDeviceId: string;
  parentDeviceId: string;
  createdAt: number;
}

export interface PendingCode {
  code: string;             // 6-digit string
  parentDeviceId: string;
  expiresAt: number;
}

class Store {
  users = new Map<string, User>();
  devices = new Map<string, Device>();
  pairs = new Map<string, Pair>();
  /** code -> PendingCode */
  codes = new Map<string, PendingCode>();

  createUser(email?: string): User {
    const u: User = { id: nanoid(), email, createdAt: Date.now() };
    this.users.set(u.id, u);
    return u;
  }

  createDevice(userId: string, platform?: Platform): Device {
    const d: Device = {
      id: nanoid(),
      userId,
      role: 'unset',
      platform,
      lastSeenAt: Date.now(),
    };
    this.devices.set(d.id, d);
    return d;
  }

  touchDevice(deviceId: string) {
    const d = this.devices.get(deviceId);
    if (d) d.lastSeenAt = Date.now();
  }

  setPushToken(deviceId: string, token: string) {
    const d = this.devices.get(deviceId);
    if (d) d.pushToken = token;
  }

  setRole(deviceId: string, role: Role) {
    const d = this.devices.get(deviceId);
    if (d) d.role = role;
  }

  /** Pairing code utilities */
  newPairingCode(parentDeviceId: string): PendingCode {
    // Random 6-digit; collisions are unlikely at our scale but we retry just in case.
    for (let i = 0; i < 5; i++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      if (!this.codes.has(code)) {
        const entry: PendingCode = {
          code,
          parentDeviceId,
          expiresAt: Date.now() + 5 * 60 * 1000,
        };
        this.codes.set(code, entry);
        return entry;
      }
    }
    throw new Error('Failed to allocate pairing code');
  }

  consumePairingCode(code: string, childDeviceId: string): Pair | null {
    const entry = this.codes.get(code);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.codes.delete(code);
      return null;
    }
    this.codes.delete(code);
    const pair: Pair = {
      id: nanoid(),
      childDeviceId,
      parentDeviceId: entry.parentDeviceId,
      createdAt: Date.now(),
    };
    this.pairs.set(pair.id, pair);
    this.setRole(childDeviceId, 'child');
    this.setRole(entry.parentDeviceId, 'parent');
    return pair;
  }

  pairForDevice(deviceId: string): Pair | null {
    for (const p of this.pairs.values()) {
      if (p.childDeviceId === deviceId || p.parentDeviceId === deviceId) {
        return p;
      }
    }
    return null;
  }

  unpair(deviceId: string): boolean {
    const p = this.pairForDevice(deviceId);
    if (!p) return false;
    this.pairs.delete(p.id);
    return true;
  }

  /** GC expired codes — call periodically. */
  gc() {
    const now = Date.now();
    for (const [code, entry] of this.codes) {
      if (entry.expiresAt < now) this.codes.delete(code);
    }
  }
}

export const store = new Store();

// GC every minute. Cast to satisfy lib.dom's `setInterval` return type when
// @types/node isn't on the path during isolated syntax checks; at runtime
// Node's Timeout object always has .unref().
const _gcTimer = setInterval(() => store.gc(), 60 * 1000) as unknown as { unref?: () => void };
_gcTimer.unref?.();
