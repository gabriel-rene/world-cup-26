import { describe, it, expect } from "vitest";
import { computeCorrelation } from "./correlation";

const P = (x: number, y: number, label = "") => ({ x, y, label });

describe("computeCorrelation", () => {
  it("returns r=1 and slope=2 for a perfect positive line y=2x", () => {
    const res = computeCorrelation([P(1, 2), P(2, 4), P(3, 6)]);
    expect(res.r).toBeCloseTo(1, 10);
    expect(res.slope).toBeCloseTo(2, 10);
    expect(res.intercept).toBeCloseTo(0, 10);
    expect(res.n).toBe(3);
  });

  it("returns r=-1 for a perfect negative line", () => {
    const res = computeCorrelation([P(1, 6), P(2, 4), P(3, 2)]);
    expect(res.r).toBeCloseTo(-1, 10);
    expect(res.slope).toBeCloseTo(-2, 10);
  });

  it("returns NaN r when fewer than 2 points", () => {
    const res = computeCorrelation([P(1, 1)]);
    expect(Number.isNaN(res.r)).toBe(true);
    expect(res.n).toBe(1);
  });

  it("returns NaN r when x has zero variance", () => {
    const res = computeCorrelation([P(5, 1), P(5, 2), P(5, 3)]);
    expect(Number.isNaN(res.r)).toBe(true);
  });

  it("computes a known intermediate r", () => {
    // points (1,2),(2,1),(3,4),(4,3) -> r = 0.6
    const res = computeCorrelation([P(1, 2), P(2, 1), P(3, 4), P(4, 3)]);
    expect(res.r).toBeCloseTo(0.6, 6);
  });
});
