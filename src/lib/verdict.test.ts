import { describe, it, expect } from "vitest";
import { interpretR } from "./verdict";

describe("interpretR", () => {
  it("calls out a tiny sample before judging the correlation", () => {
    expect(interpretR(0.9, 5)).toEqual({ label: "tiny sample — anything correlates", tone: "muted" });
  });

  it("labels weak correlations as noise", () => {
    expect(interpretR(0.05, 32)).toEqual({ label: "basically noise", tone: "muted" });
    expect(interpretR(-0.1, 32)).toEqual({ label: "basically noise", tone: "muted" });
  });

  it("labels moderate correlations as a mild trend", () => {
    expect(interpretR(0.35, 32)).toEqual({ label: "mild trend", tone: "pitch" });
    expect(interpretR(-0.45, 32)).toEqual({ label: "mild trend", tone: "pitch" });
  });

  it("shows strong correlations a yellow card for suspected spuriousness", () => {
    expect(interpretR(0.75, 32)).toEqual({ label: "suspiciously strong", tone: "yellow" });
    expect(interpretR(-0.92, 128)).toEqual({ label: "suspiciously strong", tone: "yellow" });
  });

  it("handles the not-enough-data case", () => {
    expect(interpretR(Number.NaN, 0)).toEqual({ label: "not enough data", tone: "muted" });
  });
});
