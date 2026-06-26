import { describe, it, expect } from "vitest";
import { buildTeams, buildMatches, buildSnapshot } from "./build-snapshot";
import type { RawInputs } from "./build-snapshot";

const inputs: RawInputs = {
  teams: [
    { teamId: 1, name: "Brazil", country: "Brazil" },
    { teamId: 2, name: "France", country: "France" },
  ],
  fixtures: [
    { fixtureId: 100, kickoffUtc: "2026-06-12T18:00:00+00:00", venue: "MetLife Stadium",
      homeId: 1, awayId: 2, homeGoals: 2, awayGoals: 1 },
  ],
  statsByFixture: {
    100: { response: [
      { team: { id: 1 }, statistics: [
        { type: "Ball Possession", value: "60%" }, { type: "Total Shots", value: 14 } ] },
      { team: { id: 2 }, statistics: [
        { type: "Ball Possession", value: "40%" }, { type: "Total Shots", value: 9 } ] },
    ] },
  },
  weather: { 100: { temperatureC: 24, humidity: 45, windKph: 12 } },
  worldbank: {
    BRA: { iso3: "BRA", population: 2.1e8, gdp: 2e12, gdpPerCapita: 9500, landArea: 8.5e6 },
    FRA: { iso3: "FRA", population: 6.8e7, gdp: 2.9e12, gdpPerCapita: 42000, landArea: 5.5e5 },
  },
};

describe("buildTeams", () => {
  it("aggregates goals and joins World Bank stats", () => {
    const teams = buildTeams(inputs);
    const brazil = teams.find((t) => t.teamId === 1)!;
    expect(brazil.iso3).toBe("BRA");
    expect(brazil.goalsFor).toBe(2);
    expect(brazil.goalsAgainst).toBe(1);
    expect(brazil.shots).toBe(14);
    expect(brazil.avgPossession).toBeCloseTo(60, 5);
    expect(brazil.matchesPlayed).toBe(1);
    expect(brazil.gdpPerCapita).toBe(9500);
  });
});

describe("buildMatches", () => {
  it("emits one row per team-in-fixture with weather + possession", () => {
    const matches = buildMatches(inputs);
    expect(matches).toHaveLength(2);
    const brazilRow = matches.find((m) => m.teamId === 1 && m.fixtureId === 100)!;
    expect(brazilRow.goals).toBe(2);
    expect(brazilRow.opponentId).toBe(2);
    expect(brazilRow.possession).toBe(60);
    expect(brazilRow.temperatureC).toBe(24);
  });
});

describe("buildSnapshot", () => {
  it("assembles teams, matches, and meta with timestamp", () => {
    const snap = buildSnapshot(inputs, "2026-06-25T00:00:00Z");
    expect(snap.teams).toHaveLength(2);
    expect(snap.matches).toHaveLength(2);
    expect(snap.meta.generatedAt).toBe("2026-06-25T00:00:00Z");
    expect(snap.meta.sources.length).toBeGreaterThan(0);
  });
});
