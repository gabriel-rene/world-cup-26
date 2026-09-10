import { describe, it, expect } from "vitest";
import { getWaveMatches, getWaveMatch } from "./waves";
import { flagEmoji } from "./flags";

describe("getWaveMatches", () => {
  it("returns all 104 matches from 2026 in chronological order", () => {
    const ms = getWaveMatches();
    expect(ms).toHaveLength(104);
    expect(ms.every(m => m.kickoff.startsWith("2026-") && m.matchId.startsWith("2026-"))).toBe(true);
    expect(ms.at(-1)?.stage).toBe("Final");
    const times = ms.map((m) => new Date(m.kickoff).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("every match has sane momentum", () => {
    for (const m of getWaveMatches()) {
      expect(m.momentum.length).toBeGreaterThanOrEqual(90);
      let prev = -Infinity;
      for (const p of m.momentum) {
        expect(p.value).toBeGreaterThanOrEqual(-1);
        expect(p.value).toBeLessThanOrEqual(1);
        expect(p.minute).toBeGreaterThanOrEqual(prev);
        prev = p.minute;
      }
    }
  });

  it("goals are ordered and consistent with the final score", () => {
    for (const m of getWaveMatches()) {
      expect(m.goals.length).toBe(m.score[0] + m.score[1]);
      let prev = 0;
      for (const g of m.goals) {
        expect(g.minute).toBeGreaterThanOrEqual(prev);
        prev = g.minute;
      }
      if (m.goals.length > 0) {
        expect(m.goals[m.goals.length - 1].scoreAfter).toEqual(m.score);
      }
    }
  });

  it("every team code resolves to a real flag", () => {
    for (const m of getWaveMatches()) {
      expect(flagEmoji(m.home.code)).not.toBe("🏳️");
      expect(flagEmoji(m.away.code)).not.toBe("🏳️");
    }
  });
});

describe("getWaveMatch", () => {
  it("resolves a known slug", () => {
    const final = getWaveMatch("arg-fra-final");
    expect(final?.fotmobId).toBe("3370572");
    expect(final?.penalties).toEqual([4, 2]);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getWaveMatch("not-a-match")).toBeUndefined();
  });
});
