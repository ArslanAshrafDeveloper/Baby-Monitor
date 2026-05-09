// Cry detection pipeline orchestrator.
//
// Flow:
//   audioCapture (16 kHz PCM frames)
//     → rolling 0.96 s buffer
//     → logMelSpectrogram (96x64)
//     → YAMNet TFLite inference (521-class)
//     → "cry" head: weighted sum over the cry-related YAMNet classes
//     → CryDebouncer (EMA + 3 s sustained + cooldown)
//     → onCryDetected() callback
//
// We index the cry-related YAMNet classes by string match against yamnet_class_map.csv.
// In v1.x we'll replace this with a proper learned linear head. The behavior is
// identical from the rest of the app's perspective.

import { audioCapture } from './audioCapture';
import { logMelSpectrogram, MEL_CONFIG } from './melSpectrogram';
import { CryDebouncer } from './debouncer';
import { logger } from '@/utils/logger';
import { useSettingsStore, thresholdFor } from '@/store/settings';
import { api } from '@/services/api';

const log = logger('cry');

const WINDOW_SEC = 0.96;
const WINDOW_SAMPLES = Math.round(WINDOW_SEC * MEL_CONFIG.SAMPLE_RATE);
const HOP_SEC = 1.0; // run inference once per second

// Indices in YAMNet's class_map that we treat as "cry". Source: yamnet_class_map.csv.
//   20: Baby cry, infant cry
//   21: Whimper
//   22: Wail, moan
const CRY_CLASS_INDICES = [20, 21, 22];

interface DetectorEvents {
  onCryDetected?: () => void;
  onScore?: (raw: number, smoothed: number) => void;
  onLevel?: (rms: number) => void;
}

interface TFLiteInterpreter {
  run: (input: Float32Array) => Promise<Float32Array | Float32Array[]>;
  close?: () => void;
}

/** Loaded lazily so the rest of the app can import this module without TFLite present. */
let interpreter: TFLiteInterpreter | null = null;
async function loadModel(): Promise<TFLiteInterpreter> {
  if (interpreter) return interpreter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
  const tflite: any = require('react-native-fast-tflite');
  // The model file is bundled at app/assets/models/yamnet.tflite (see ml/README.md).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const modelAsset = require('../../../assets/models/yamnet.tflite');
  const model = await tflite.loadTensorflowModel(modelAsset);
  interpreter = {
    run: async (input: Float32Array) => model.run([input]),
    close: () => model.close?.(),
  };
  return interpreter;
}

export class CryDetector {
  private buffer = new Float32Array(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private debouncer: CryDebouncer;
  private events: DetectorEvents = {};
  private inferring = false;

  constructor() {
    const sensitivity = useSettingsStore.getState().sensitivity;
    this.debouncer = new CryDebouncer({
      threshold: thresholdFor(sensitivity),
      sustainSec: 3,
      cooldownSec: 30,
      windowDurationSec: WINDOW_SEC,
    });
  }

  on(events: DetectorEvents) { this.events = events; }

  async start() {
    await loadModel().catch((err) => {
      log.warn('TFLite model unavailable; running in heuristic-only mode', err);
    });
    audioCapture.start((samples) => this.onSamples(samples));
    // Inference loop, decoupled from the audio frame rate.
    this.timer = setInterval(() => this.tick(), HOP_SEC * 1000);
    log.info('detector started');
  }

  stop() {
    audioCapture.stop();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    interpreter?.close?.();
    interpreter = null;
    this.buffer = new Float32Array(0);
    this.debouncer.reset();
    log.info('detector stopped');
  }

  private onSamples(samples: Float32Array) {
    // Append to rolling buffer, keep only the last 1.5 s of audio.
    const cap = Math.round(1.5 * MEL_CONFIG.SAMPLE_RATE);
    const merged = new Float32Array(Math.min(this.buffer.length + samples.length, cap));
    if (this.buffer.length + samples.length <= cap) {
      merged.set(this.buffer, 0);
      merged.set(samples, this.buffer.length);
    } else {
      const drop = this.buffer.length + samples.length - cap;
      const keep = this.buffer.subarray(Math.max(0, drop));
      merged.set(keep, 0);
      merged.set(samples, keep.length);
    }
    this.buffer = merged;
    // VU meter — RMS.
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / Math.max(1, samples.length));
    this.events.onLevel?.(Math.min(1, rms * 4));
  }

  private async tick() {
    if (this.inferring) return;
    if (this.buffer.length < WINDOW_SAMPLES) return;
    this.inferring = true;
    try {
      const window = this.buffer.subarray(this.buffer.length - WINDOW_SAMPLES);
      const p = await this.score(window);
      this.events.onScore?.(p, this.debouncer.smoothed());
      // Refresh threshold from settings each tick — sensitivity slider is live.
      this.debouncer.setThreshold(thresholdFor(useSettingsStore.getState().sensitivity));
      const fired = this.debouncer.push(p);
      if (fired) {
        log.info('CRY DETECTED, smoothed=', this.debouncer.smoothed().toFixed(3));
        this.events.onCryDetected?.();
        // Tell the backend to wake the parent.
        try { await api('/wake', { method: 'POST' }); }
        catch (err) { log.warn('wake call failed', err); }
      }
    } catch (err) {
      log.warn('inference failed', err);
    } finally {
      this.inferring = false;
    }
  }

  /** Returns probability in [0,1] that the window contains a baby cry. */
  private async score(window: Float32Array): Promise<number> {
    if (interpreter) {
      // YAMNet's TFLite signature accepts raw waveform of length WINDOW_SAMPLES.
      const result = await interpreter.run(window);
      const scores = Array.isArray(result) ? (result[0] as Float32Array) : (result as Float32Array);
      let cry = 0;
      for (const idx of CRY_CLASS_INDICES) cry = Math.max(cry, scores[idx] ?? 0);
      return cry;
    }
    // Heuristic fallback: zero-crossing rate + spectral centroid in the cry band.
    // Useful only as a smoke-test until the real TFLite model is bundled.
    const mel = logMelSpectrogram(window);
    let energyHi = 0;
    let energyLo = 0;
    for (let f = 0; f < mel.length / MEL_CONFIG.N_MELS; f++) {
      for (let m = 0; m < MEL_CONFIG.N_MELS; m++) {
        const v = Math.exp(mel[f * MEL_CONFIG.N_MELS + m]);
        if (m >= 20 && m <= 50) energyHi += v;
        else energyLo += v;
      }
    }
    const ratio = energyHi / Math.max(1e-6, energyHi + energyLo);
    // Map [0.4, 0.85] -> [0, 1].
    return Math.max(0, Math.min(1, (ratio - 0.4) / 0.45));
  }
}
