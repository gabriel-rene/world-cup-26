import { describe, it, expect } from "vitest";
import {
  resampleMomentum, sampleCurve, matchRate, advance, scoreAt,
  activeGoalRipple, packWake, drift, seedFromString,
  PLAYBACK_SECONDS, STEP_MIN, WAKE_SAMPLES, RIPPLE_SECONDS,
} from "./wave-motion";
import type { WaveGoal } from "./waves-types";

const ramp = Array.from({ length: 91 }, (_, i) => ({ minute: i, value: i / 90 }));
const flat = Array.from({ length: 91 }, (_, i) => ({ minute: i, value: 0.5 }));
const spiky = Array.from({ length: 91 }, (_, i) => ({ minute: i, value: i % 2 === 0 ? 1 : -1 }));

describe("resampleMomentum", () => {
  it("spans the full match on a uniform grid", () => {
    const c = resampleMomentum(ramp);
    expect(c.totalMinutes).toBe(90);
    expect(c.stepMin).toBe(STEP_MIN);
    expect(c.values.length).toBe(Math.floor(90 / STEP_MIN) + 1);
  });

  it("preserves a flat signal exactly", () => {
    const c = resampleMomentum(flat);
    for (const v of c.values) expect(v).toBeCloseTo(0.5, 5);
  });

  it("follows the shape of a ramp", () => {
    const c = resampleMomentum(ramp);
    expect(sampleCurve(c, 45)).toBeCloseTo(0.5, 1);
    expect(sampleCurve(c, 90)).toBeGreaterThan(sampleCurve(c, 45));
  });

  it("stays within [-1, 1] even when Catmull-Rom would overshoot", () => {
    const c = resampleMomentum(spiky);
    for (const v of c.values) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("throws on fewer than 2 points", () => {
    expect(() => resampleMomentum([{ minute: 0, value: 0 }])).toThrow();
  });
});

describe("sampleCurve", () => {
  it("clamps out-of-range minutes", () => {
    const c = resampleMomentum(ramp);
    expect(sampleCurve(c, -5)).toBeCloseTo(sampleCurve(c, 0), 5);
    expect(sampleCurve(c, 500)).toBeCloseTo(sampleCurve(c, 90), 5);
  });
});

describe("playback clock", () => {
  it("plays a 90-minute match in PLAYBACK_SECONDS", () => {
    expect(advance(0, PLAYBACK_SECONDS, 90)).toBe(90);
    expect(matchRate(90)).toBeCloseTo(90 / PLAYBACK_SECONDS, 5);
  });

  it("caps at full time", () => {
    expect(advance(89, 60, 90)).toBe(90);
  });
});

const goals: WaveGoal[] = [
  { minute: 23, side: "home", player: "A", scoreAfter: [1, 0] },
  { minute: 80, side: "away", player: "B", scoreAfter: [1, 1] },
];

describe("scoreAt", () => {
  it("walks the running score", () => {
    expect(scoreAt(goals, 0)).toEqual([0, 0]);
    expect(scoreAt(goals, 23)).toEqual([1, 0]);
    expect(scoreAt(goals, 79.9)).toEqual([1, 0]);
    expect(scoreAt(goals, 90)).toEqual([1, 1]);
  });
});

describe("activeGoalRipple", () => {
  it("is null away from goals", () => {
    expect(activeGoalRipple(goals, 10, 90)).toBeNull();
    expect(activeGoalRipple(goals, 50, 90)).toBeNull();
  });

  it("ripples just after a goal with the right side and progress", () => {
    const r = activeGoalRipple(goals, 23.1, 90)!;
    expect(r.side).toBe(1);
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(0.1);
    const away = activeGoalRipple(goals, 80.5, 90)!;
    expect(away.side).toBe(-1);
  });

  it("expires after RIPPLE_SECONDS of playback", () => {
    const rippleMinutes = RIPPLE_SECONDS * matchRate(90);
    expect(activeGoalRipple(goals, 23 + rippleMinutes + 0.01, 90)).toBeNull();
  });
});

describe("packWake", () => {
  it("packs WAKE_SAMPLES trailing samples ending at now", () => {
    const c = resampleMomentum(ramp);
    const wake = packWake(c, 45);
    expect(wake.length).toBe(WAKE_SAMPLES);
    expect(wake[WAKE_SAMPLES - 1]).toBeCloseTo(sampleCurve(c, 45), 5);
    expect(wake[0]).toBeCloseTo(sampleCurve(c, 35), 5); // WAKE_WINDOW_MIN back
    expect(wake[0]).toBeLessThan(wake[WAKE_SAMPLES - 1]); // ramp rises
  });
});

describe("drift", () => {
  it("is positive when momentum is rising", () => {
    const c = resampleMomentum(ramp);
    expect(drift(c, 45)).toBeGreaterThan(0);
  });
  it("is ~0 on a flat signal", () => {
    const c = resampleMomentum(flat);
    expect(Math.abs(drift(c, 45))).toBeLessThan(0.01);
  });
});

describe("seedFromString", () => {
  it("is deterministic and distinguishes slugs", () => {
    expect(seedFromString("arg-fra-final")).toBe(seedFromString("arg-fra-final"));
    expect(seedFromString("arg-fra-final")).not.toBe(seedFromString("jpn-esp-group"));
  });
});
