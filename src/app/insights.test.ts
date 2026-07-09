import { describe, it, expect } from "vitest";
import { INSIGHTS, resolveInsight } from "./insights";

describe("curated insights", () => {
  it("every insight resolves to real variables in its scope", () => {
    expect(INSIGHTS.length).toBeGreaterThan(0);
    for (const i of INSIGHTS) {
      const { xVar, yVar } = resolveInsight(i);
      expect(xVar.scope).toBe(i.scope);
      expect(yVar.scope).toBe(i.scope);
    }
  });
  it("throws on an unknown variable key", () => {
    expect(() => resolveInsight({ title: "x", scope: "2026-team", xKey: "nope", yKey: "goalsFor" }))
      .toThrow();
  });
});
