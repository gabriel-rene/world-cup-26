import { describe, it, expect } from "vitest";
import { getTeams, getMatches, rowsForScope } from "./snapshot";

describe("snapshot loader", () => {
  it("loads seed teams and matches", () => {
    expect(getTeams().length).toBeGreaterThan(0);
    expect(getMatches().length).toBeGreaterThan(0);
  });
  it("rowsForScope returns teams for team scope and matches for match scope", () => {
    expect(rowsForScope("2026-team")).toBe(getTeams());
    expect(rowsForScope("2026-match")).toBe(getMatches());
  });
});
