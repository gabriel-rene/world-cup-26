import { describe, it, expect } from "vitest";
import { VARIABLES, variablesForScope } from "./registry";
import type { TeamRow, MatchTeamRow } from "./types";

describe("variable registry", () => {
  it("every variable declares a known scope and unique key", () => {
    const keys = new Set<string>();
    for (const v of VARIABLES) {
      expect(["team", "match"]).toContain(v.scope);
      expect(keys.has(`${v.scope}:${v.key}`)).toBe(false);
      keys.add(`${v.scope}:${v.key}`);
    }
  });

  it("team accessors resolve against a TeamRow", () => {
    const team: TeamRow = {
      teamId: 1, name: "Testland", iso3: "TST",
      goalsFor: 7, goalsAgainst: 3, shots: 40, passAccuracy: 82,
      cards: 5, avgPossession: 55, matchesPlayed: 3,
      population: 1000000, gdp: 5e10, gdpPerCapita: 50000, landArea: 100000,
    };
    const gpc = variablesForScope("team").find((v) => v.key === "gdpPerCapita")!;
    expect(gpc.accessor(team)).toBe(50000);
    const goals = variablesForScope("team").find((v) => v.key === "goalsFor")!;
    expect(goals.accessor(team)).toBe(7);
  });

  it("match accessors resolve against a MatchTeamRow and pass through nulls", () => {
    const m: MatchTeamRow = {
      fixtureId: 10, teamId: 1, teamName: "Testland", opponentId: 2,
      venue: "Stadium", kickoffUtc: "2026-06-12T18:00:00Z", goals: 2,
      possession: 60, shots: 12, temperatureC: null, humidity: 40, windKph: 9,
    };
    const temp = variablesForScope("match").find((v) => v.key === "temperatureC")!;
    expect(temp.accessor(m)).toBeNull();
    const poss = variablesForScope("match").find((v) => v.key === "possession")!;
    expect(poss.accessor(m)).toBe(60);
  });

  it("variablesForScope only returns that scope", () => {
    expect(variablesForScope("match").every((v) => v.scope === "match")).toBe(true);
    expect(variablesForScope("team").length).toBeGreaterThan(0);
  });
});
