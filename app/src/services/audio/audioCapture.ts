// Audio capture wrapper for the cry detector.
//
// We use react-native-live-audio-stream because it gives us short PCM frames
// in a callback. Default config:
//   - sampleRate 16 kHz, mono, 16-bit signed PCM (matches YAMNet input)
//   - bufferSize ~1024 samples → ~64 ms per frame
//
// The wrapper exposes start()/stop() and a `onFrame(samples: Float32Array)` callback.

// eslint-disable-next-line import/no-unresolved
import LiveAudioStream from 'react-native-live-audio-stream';
import { Buffer } from 'buffer';
import { logger } from '@/utils/logger';

const log = logger('audio');

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: 16;
  bufferSize: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  bufferSize: 1024,
};

type FrameCb = (samples: Float32Array) => void;

class AudioCaptureImpl {
  private running = false;
  private cb: FrameCb | null = null;

  start(cb: FrameCb, config: AudioConfig = DEFAULT_AUDIO_CONFIG) {
    if (this.running) return;
    this.cb = cb;
    LiveAudioStream.init({
      sampleRate: config.sampleRate,
      channels: config.channels,
      bitsPerSample: config.bitsPerSample,
      audioSource: 6, // VOICE_RECOGNITION on Android; ignored on iOS
      bufferSize: config.bufferSize,
      // wavFile is required by the type but unused for streaming
      wavFile: '',
    });
    LiveAudioStream.on('data', (b64: string) => {
      try {
        const buf = Buffer.from(b64, 'base64');
        const samples = pcm16ToFloat32(buf);
        this.cb?.(samples);
      } catch (err) {
        log.warn('decode frame failed', err);
      }
    });
    LiveAudioStream.start();
    this.running = true;
    log.info('capture started');
  }

  stop() {
    if (!this.running) return;
    LiveAudioStream.stop();
    this.cb = null;
    this.running = false;
    log.info('capture stopped');
  }

  isRunning() { return this.running; }
}

export const audioCapture = new AudioCaptureImpl();

/** Convert little-endian 16-bit PCM to a Float32Array in [-1, 1]. */
export function pcm16ToFloat32(buf: Buffer): Float32Array {
  const out = new Float32Array(buf.length / 2);
  for (let i = 0, j = 0; i < buf.length; i += 2, j++) {
    const lo = buf[i];
    const hi = buf[i + 1];
    let s = (hi << 8) | lo;
    if (s & 0x8000) s = s - 0x10000; // sign-extend
    out[j] = s / 32768;
  }
  return out;
}
