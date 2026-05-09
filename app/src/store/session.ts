// In-memory session state for the live-call screen. Not persisted.

import { create } from 'zustand';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended';

interface SessionState {
  connection: ConnectionState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  remoteStream: any;
  micEnabled: boolean;
  level: number; // 0..1 VU meter
  setConnection: (s: ConnectionState) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRemoteStream: (s: any) => void;
  setMicEnabled: (b: boolean) => void;
  setLevel: (v: number) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  connection: 'idle',
  remoteStream: null,
  micEnabled: false,
  level: 0,
  setConnection: (connection) => set({ connection }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  setLevel: (level) => set({ level: Math.max(0, Math.min(1, level)) }),
  reset: () =>
    set({
      connection: 'idle',
      remoteStream: null,
      micEnabled: false,
      level: 0,
    }),
}));
