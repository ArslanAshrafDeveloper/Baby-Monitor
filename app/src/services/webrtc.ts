// WebRTC wrapper. Handles peer connection lifecycle for both Child (callee) and
// Parent (caller) roles. Audio-only.
//
// Notes on react-native-webrtc:
//   - mediaDevices.getUserMedia({ audio: true }) returns a MediaStream you must
//     attach via pc.addTrack(track, stream).
//   - The remote stream is delivered via the 'track' event; the platform handles
//     audio routing automatically (we additionally use react-native-incall-manager
//     to force speakerphone on the parent side).

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  // eslint-disable-next-line import/no-unresolved
} from 'react-native-webrtc';
// eslint-disable-next-line import/no-unresolved
import InCallManager from 'react-native-incall-manager';

import { signaling } from './signaling';
import { api } from './api';
import { logger } from '@/utils/logger';
import type { IceServerConfig, SignalEnvelope } from '@/types';

const log = logger('rtc');

export type CallRole = 'child' | 'parent';

interface StartArgs {
  role: CallRole;
  /** Whether this side initiates the offer. Parent initiates after receiving wake-on-cry. */
  initiator: boolean;
  /** Called when remote audio track arrives (so the UI can show "connected"). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRemoteStream?: (stream: any) => void;
  /** Called when the connection ends for any reason. */
  onClosed?: () => void;
}

export class WebRTCSession {
  private pc: RTCPeerConnection | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private localStream: any = null;
  private offSignaling: (() => void) | null = null;
  private muted = true; // mic muted by default; push-to-talk un-mutes.

  async start({ role, initiator, onRemoteStream, onClosed }: StartArgs) {
    log.info('start', { role, initiator });

    const ice = await api<{ iceServers: IceServerConfig[] }>('/ice/credentials');

    this.pc = new RTCPeerConnection({
      iceServers: ice.iceServers,
      // RN-WebRTC honors these defaults.
    });

    // Capture local mic stream.
    this.localStream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    for (const track of this.localStream.getAudioTracks()) {
      // Default: muted on the parent, live on the child (so the parent can hear).
      // Push-to-talk un-mutes the parent's track temporarily.
      track.enabled = role === 'child';
      this.muted = role !== 'child';
      this.pc.addTrack(track, this.localStream);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.pc as any).addEventListener('track', (ev: any) => {
      if (ev.streams && ev.streams[0]) onRemoteStream?.(ev.streams[0]);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.pc as any).addEventListener('icecandidate', (ev: any) => {
      if (ev.candidate) {
        signaling.send({ type: 'ice', payload: ev.candidate.toJSON() });
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.pc as any).addEventListener('connectionstatechange', () => {
      const state = (this.pc as any)?.connectionState;
      log.info('state', state);
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        this.cleanup();
        onClosed?.();
      }
    });

    // Speakerphone on the parent side so the room audio is audible.
    if (role === 'parent') {
      try { InCallManager.start({ media: 'audio' }); InCallManager.setForceSpeakerphoneOn(true); }
      catch { /* InCallManager is optional in dev */ }
    }

    // Subscribe to signaling envelopes.
    this.offSignaling = signaling.on(async (env: SignalEnvelope) => {
      if (!this.pc) return;
      if (env.type === 'offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(env.payload));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        signaling.send({ type: 'answer', payload: answer });
      } else if (env.type === 'answer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(env.payload));
      } else if (env.type === 'ice') {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(env.payload));
        } catch (err) {
          log.warn('addIceCandidate failed', err);
        }
      } else if (env.type === 'bye') {
        this.cleanup();
        onClosed?.();
      }
    });

    if (initiator) {
      const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
      await this.pc.setLocalDescription(offer);
      signaling.send({ type: 'offer', payload: offer });
    }
  }

  /** Push-to-talk: enable / disable the local mic track. */
  setMicEnabled(enabled: boolean) {
    if (!this.localStream) return;
    for (const t of this.localStream.getAudioTracks()) t.enabled = enabled;
    this.muted = !enabled;
  }
  isMuted() { return this.muted; }

  end() {
    try { signaling.send({ type: 'bye' }); } catch { /* ignore */ }
    this.cleanup();
  }

  private cleanup() {
    try { InCallManager.stop(); } catch { /* ignore */ }
    if (this.localStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of this.localStream.getTracks()) (t as any).stop?.();
      this.localStream = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch { /* ignore */ }
      this.pc = null;
    }
    this.offSignaling?.();
    this.offSignaling = null;
  }
}
