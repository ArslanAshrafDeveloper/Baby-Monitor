export type Role = 'child' | 'parent' | 'unset';
export type Platform = 'ios' | 'android';

export interface DeviceInfo {
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

export type SignalEnvelope =
  | { type: 'offer'; payload: RTCSessionDescriptionInit }
  | { type: 'answer'; payload: RTCSessionDescriptionInit }
  | { type: 'ice'; payload: RTCIceCandidateInit }
  | { type: 'bye'; payload?: undefined }
  | { type: 'ping'; payload: { peerOnline: boolean } };

export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export type Sensitivity = 'low' | 'medium' | 'high';
