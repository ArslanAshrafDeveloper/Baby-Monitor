// Persistent app state. Backed by AsyncStorage so the role/pair survive restarts.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Pair, Role, Sensitivity } from '@/types';

interface SettingsState {
  hydrated: boolean;
  hasOnboarded: boolean;
  token: string | null;
  deviceId: string | null;
  userId: string | null;
  role: Role;
  pair: Pair | null;
  sensitivity: Sensitivity;
  autoAnswer: boolean;
  doNotDisturb: boolean;

  hydrate: () => Promise<void>;
  setOnboarded: () => void;
  setAuth: (token: string, deviceId: string, userId: string) => void;
  setRole: (role: Role) => void;
  setPair: (pair: Pair) => void;
  clearPair: () => void;
  setSensitivity: (s: Sensitivity) => void;
  setAutoAnswer: (b: boolean) => void;
  setDoNotDisturb: (b: boolean) => void;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'babymonitor.settings.v1';

interface Persisted {
  hasOnboarded: boolean;
  token: string | null;
  deviceId: string | null;
  userId: string | null;
  role: Role;
  pair: Pair | null;
  sensitivity: Sensitivity;
  autoAnswer: boolean;
  doNotDisturb: boolean;
}

async function persist(state: Persisted) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* ignore */ }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  hasOnboarded: false,
  token: null,
  deviceId: null,
  userId: null,
  role: 'unset',
  pair: null,
  sensitivity: 'medium',
  autoAnswer: false,
  doNotDisturb: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>;
        set({
          hasOnboarded: !!p.hasOnboarded,
          token: p.token ?? null,
          deviceId: p.deviceId ?? null,
          userId: p.userId ?? null,
          role: (p.role as Role) ?? 'unset',
          pair: p.pair ?? null,
          sensitivity: (p.sensitivity as Sensitivity) ?? 'medium',
          autoAnswer: !!p.autoAnswer,
          doNotDisturb: !!p.doNotDisturb,
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },

  setOnboarded: () => {
    set({ hasOnboarded: true });
    void persist(snapshot(get()));
  },

  setAuth: (token, deviceId, userId) => {
    set({ token, deviceId, userId });
    void persist(snapshot(get()));
  },

  setRole: (role) => {
    set({ role });
    void persist(snapshot(get()));
  },

  setPair: (pair) => {
    set({ pair });
    void persist(snapshot(get()));
  },

  clearPair: () => {
    set({ pair: null });
    void persist(snapshot(get()));
  },

  setSensitivity: (sensitivity) => {
    set({ sensitivity });
    void persist(snapshot(get()));
  },

  setAutoAnswer: (autoAnswer) => {
    set({ autoAnswer });
    void persist(snapshot(get()));
  },

  setDoNotDisturb: (doNotDisturb) => {
    set({ doNotDisturb });
    void persist(snapshot(get()));
  },

  signOut: async () => {
    set({
      token: null,
      deviceId: null,
      userId: null,
      role: 'unset',
      pair: null,
      hasOnboarded: false,
    });
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  },
}));

function snapshot(s: SettingsState): Persisted {
  return {
    hasOnboarded: s.hasOnboarded,
    token: s.token,
    deviceId: s.deviceId,
    userId: s.userId,
    role: s.role,
    pair: s.pair,
    sensitivity: s.sensitivity,
    autoAnswer: s.autoAnswer,
    doNotDisturb: s.doNotDisturb,
  };
}

export function thresholdFor(s: Sensitivity): number {
  // High sensitivity = lower threshold (triggers easier).
  return s === 'high' ? 0.55 : s === 'low' ? 0.85 : 0.7;
}
