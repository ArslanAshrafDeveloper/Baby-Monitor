// Log-mel spectrogram pre-processing for YAMNet.
//
// YAMNet is trained on 0.96 s windows of 16 kHz audio, converted to a
// 96 x 64 log-mel spectrogram (96 frames × 64 mel bins). The model itself
// emits a 521-dim score vector — we wrap that with a tiny linear head to get
// a single "is this a cry?" probability.
//
// This file is intentionally pure JS (no native deps) so the pipeline is
// portable. For production you can re-implement the FFT in C++ via JSI for ~5x
// speedup; YAMNet inference dominates inference time anyway.
//
// Conventions: input `samples` is mono Float32Array at 16 kHz, in [-1, 1].

const SAMPLE_RATE = 16000;
const WINDOW_SAMPLES = Math.round(0.025 * SAMPLE_RATE); // 25 ms = 400
const HOP_SAMPLES = Math.round(0.010 * SAMPLE_RATE);    // 10 ms = 160
const N_FFT = 512;
const N_MELS = 64;
const FMIN = 125;
const FMAX = 7500;

/** Hann window of size N. */
function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

const HANN_WINDOW = hann(WINDOW_SAMPLES);

/** Iterative radix-2 FFT (power-of-two N). Real input r, returns magnitudes (size N/2 + 1). */
function fftMagnitudes(real: Float32Array): Float32Array {
  const N = real.length;
  // Bit-reversal permutation.
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = real[i];
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  const half = N / 2 + 1;
  const out = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    out[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
  return out;
}

/** Mel filterbank: returns N_MELS arrays of length N_FFT/2 + 1. */
function buildMelFilters(): Float32Array[] {
  const hzToMel = (f: number) => 2595 * Math.log10(1 + f / 700);
  const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1);

  const melMin = hzToMel(FMIN);
  const melMax = hzToMel(FMAX);
  const points = new Float32Array(N_MELS + 2);
  for (let i = 0; i < points.length; i++) {
    const m = melMin + ((melMax - melMin) * i) / (points.length - 1);
    points[i] = melToHz(m);
  }
  const bin = new Float32Array(points.length);
  for (let i = 0; i < points.length; i++) {
    bin[i] = Math.floor(((N_FFT + 1) * points[i]) / SAMPLE_RATE);
  }
  const filters: Float32Array[] = [];
  for (let m = 1; m <= N_MELS; m++) {
    const f = new Float32Array(N_FFT / 2 + 1);
    const lo = bin[m - 1];
    const ce = bin[m];
    const hi = bin[m + 1];
    for (let k = lo; k < ce; k++) f[k] = (k - lo) / Math.max(1, ce - lo);
    for (let k = ce; k < hi; k++) f[k] = (hi - k) / Math.max(1, hi - ce);
    filters.push(f);
  }
  return filters;
}

const MEL_FILTERS = buildMelFilters();

/**
 * Compute a log-mel spectrogram of the given samples (mono, 16 kHz).
 * Returns a Float32Array of shape [numFrames, N_MELS], flattened row-major.
 *
 * For YAMNet's 0.96 s window you typically pass 15360 samples and get back a
 * 96x64 = 6144-length array.
 */
export function logMelSpectrogram(samples: Float32Array): Float32Array {
  const numFrames = Math.max(0, Math.floor((samples.length - WINDOW_SAMPLES) / HOP_SAMPLES) + 1);
  const out = new Float32Array(numFrames * N_MELS);
  const padded = new Float32Array(N_FFT);
  for (let f = 0; f < numFrames; f++) {
    // Window + zero-pad to N_FFT.
    const start = f * HOP_SAMPLES;
    for (let i = 0; i < WINDOW_SAMPLES; i++) {
      padded[i] = samples[start + i] * HANN_WINDOW[i];
    }
    for (let i = WINDOW_SAMPLES; i < N_FFT; i++) padded[i] = 0;
    const mags = fftMagnitudes(padded);
    // Mel bands.
    for (let m = 0; m < N_MELS; m++) {
      let sum = 0;
      const filt = MEL_FILTERS[m];
      for (let k = 0; k < filt.length; k++) sum += mags[k] * filt[k];
      out[f * N_MELS + m] = Math.log(sum + 1e-6);
    }
  }
  return out;
}

export const MEL_CONFIG = {
  SAMPLE_RATE,
  WINDOW_SAMPLES,
  HOP_SAMPLES,
  N_FFT,
  N_MELS,
};
