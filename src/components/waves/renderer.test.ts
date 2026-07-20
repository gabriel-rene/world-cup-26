import { describe, it, expect } from "vitest";
import { createWavesRenderer, hexToRgb } from "./renderer";

describe("hexToRgb", () => {
  it("converts 6-digit hex to unit floats", () => {
    expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    const [r, g, b] = hexToRgb("#7cc4ff");
    expect(r).toBeCloseTo(0x7c / 255, 5);
    expect(g).toBeCloseTo(0xc4 / 255, 5);
    expect(b).toBeCloseTo(1, 5);
  });

  it("falls back to white on malformed input", () => {
    expect(hexToRgb("blue")).toEqual([1, 1, 1]);
    expect(hexToRgb("#fff")).toEqual([1, 1, 1]);
  });
});

describe("createWavesRenderer", () => {
  it("returns null when WebGL2 is unavailable (jsdom)", () => {
    const canvas = document.createElement("canvas");
    expect(createWavesRenderer(canvas, "#7cc4ff", "#3454d1", 1.23)).toBeNull();
  });
});
