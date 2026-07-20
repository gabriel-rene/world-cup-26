import type { MomentumPoint, WaveGoal } from "./waves-types";

export const PLAYBACK_SECONDS = 75; // full match compressed into this
export const STEP_MIN = 0.25; // resampled grid step, in match minutes
export const WAKE_SAMPLES = 16;
export const WAKE_WINDOW_MIN = 10; // the wake looks this far back
export const RIPPLE_SECONDS = 2.5; // goal ripple length, wall-clock

export interface MomentumCurve {
  values: Float32Array; // values[i] = momentum at minute i * stepMin
  stepMin: number;
  totalMinutes: number;
}

// Catmull-Rom through the per-minute points onto a uniform grid, then a
// light box-blur low-pass. The smoothing is an acknowledged interpretation:
// shape faithful, second-by-second jitter removed.
export function resampleMomentum(points: MomentumPoint[], smoothRadius = 3): MomentumCurve {
  if (points.length < 2) throw new Error("need at least 2 momentum points");
  const pts = [...points].sort((a, b) => a.minute - b.minute);
  const totalMinutes = pts[pts.length - 1].minute;
  const n = Math.floor(totalMinutes / STEP_MIN) + 1;
  const values = new Float32Array(n);
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const t = i * STEP_MIN;
    while (seg < pts.length - 2 && pts[seg + 1].minute < t) seg++;
    const p1 = pts[seg];
    const p2 = pts[seg + 1];
    const p0 = pts[Math.max(0, seg - 1)];
    const p3 = pts[Math.min(pts.length - 1, seg + 2)];
    const span = p2.minute - p1.minute || 1;
    const u = Math.min(1, Math.max(0, (t - p1.minute) / span));
    const u2 = u * u;
    const u3 = u2 * u;
    values[i] =
      0.5 *
      (2 * p1.value +
        (-p0.value + p2.value) * u +
        (2 * p0.value - 5 * p1.value + 4 * p2.value - p3.value) * u2 +
        (-p0.value + 3 * p1.value - 3 * p2.value + p3.value) * u3);
  }
  const smoothed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let j = -smoothRadius; j <= smoothRadius; j++) {
      const k = i + j;
      if (k >= 0 && k < n) {
        sum += values[k];
        cnt++;
      }
    }
    smoothed[i] = Math.min(1, Math.max(-1, sum / cnt));
  }
  return { values: smoothed, stepMin: STEP_MIN, totalMinutes };
}

export function sampleCurve(curve: MomentumCurve, minute: number): number {
  const clamped = Math.min(Math.max(minute, 0), curve.totalMinutes);
  const idx = clamped / curve.stepMin;
  const i0 = Math.floor(idx);
  const i1 = Math.min(curve.values.length - 1, i0 + 1);
  const frac = idx - i0;
  return curve.values[i0] * (1 - frac) + curve.values[i1] * frac;
}

/** Match minutes that elapse per wall-clock second of playback. */
export function matchRate(totalMinutes: number): number {
  return totalMinutes / PLAYBACK_SECONDS;
}

export function advance(minute: number, dtSeconds: number, totalMinutes: number): number {
  return Math.min(totalMinutes, minute + dtSeconds * matchRate(totalMinutes));
}

export function scoreAt(goals: WaveGoal[], minute: number): [number, number] {
  let score: [number, number] = [0, 0];
  for (const g of goals) if (g.minute <= minute) score = g.scoreAfter;
  return score;
}

export interface GoalRipple {
  side: 1 | -1; // +1 home, -1 away
  progress: number; // 0 just scored .. 1 faded
}

/** The most recent goal still rippling at `minute` (overlaps: latest wins). */
export function activeGoalRipple(
  goals: WaveGoal[],
  minute: number,
  totalMinutes: number,
): GoalRipple | null {
  const rippleMinutes = RIPPLE_SECONDS * matchRate(totalMinutes);
  let best: GoalRipple | null = null;
  for (const g of goals) {
    const age = minute - g.minute;
    if (age >= 0 && age <= rippleMinutes) {
      best = { side: g.side === "home" ? 1 : -1, progress: age / rippleMinutes };
    }
  }
  return best;
}

/** Trailing momentum window for the shader: [0] oldest .. last = now. */
export function packWake(curve: MomentumCurve, minute: number): Float32Array {
  const out = new Float32Array(WAKE_SAMPLES);
  for (let i = 0; i < WAKE_SAMPLES; i++) {
    const back = WAKE_WINDOW_MIN * (1 - i / (WAKE_SAMPLES - 1));
    out[i] = sampleCurve(curve, minute - back);
  }
  return out;
}

/** Recent momentum trend; advects the water texture toward the attack. */
export function drift(curve: MomentumCurve, minute: number): number {
  return sampleCurve(curve, minute) - sampleCurve(curve, minute - 2);
}

/** Small deterministic seed so each match's water is distinct but replayable. */
export function seedFromString(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h / 100;
}
