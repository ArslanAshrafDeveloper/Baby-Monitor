// Smooths the cry-probability signal and decides when to fire a CRY_DETECTED event.
//
// Rules (from the spec):
//   - Exponential moving average (alpha 0.4) over the raw probability.
//   - Trigger only when smoothed p > threshold for >= 3 seconds continuously.
//   - After firing, enter a cool-down so we don't re-trigger for N seconds.

export interface DebouncerOpts {
  threshold: number;          // 0..1
  sustainSec: number;         // how long the EMA must stay above threshold
  cooldownSec: number;        // ignore further triggers for this long after firing
  windowDurationSec: number;  // how long each window of audio represents
  alpha?: number;             // EMA alpha (0..1)
}

export class CryDebouncer {
  private ema = 0;
  private aboveSince: number | null = null;
  private cooldownUntil = 0;
  private alpha: number;

  constructor(private opts: DebouncerOpts) {
    this.alpha = opts.alpha ?? 0.4;
  }

  setThreshold(threshold: number) { this.opts.threshold = threshold; }

  /**
   * Feed one model output. Returns true exactly once per detection.
   * `now` is the millisecond timestamp; pass Date.now() in production.
   */
  push(p: number, now: number = Date.now()): boolean {
    this.ema = this.alpha * p + (1 - this.alpha) * this.ema;
    if (now < this.cooldownUntil) return false;

    const above = this.ema >= this.opts.threshold;
    if (above) {
      if (this.aboveSince == null) this.aboveSince = now;
      const sustainedMs = now - this.aboveSince;
      if (sustainedMs >= this.opts.sustainSec * 1000) {
        this.aboveSince = null;
        this.cooldownUntil = now + this.opts.cooldownSec * 1000;
        return true;
      }
    } else {
      this.aboveSince = null;
    }
    return false;
  }

  reset() {
    this.ema = 0;
    this.aboveSince = null;
    this.cooldownUntil = 0;
  }

  smoothed() { return this.ema; }
}
