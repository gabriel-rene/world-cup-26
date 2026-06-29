import { describe, it, expect } from "vitest";
import { parseTeams, parseFixtures, parseStats } from "./football";

describe("parseTeams", () => {
  it("extracts id/name/country", () => {
    const json = { response: [{ team: { id: 6, name: "Brazil", country: "Brazil" } }] };
    expect(parseTeams(json)).toEqual([{ teamId: 6, name: "Brazil", country: "Brazil" }]);
  });
});

describe("parseFixtures", () => {
  it("keeps only played fixtures and flattens fields", () => {
    const json = {
      response: [
        {
          fixture: { id: 100, date: "2026-06-12T18:00:00+00:00", venue: { name: "MetLife Stadium" } },
          teams: { home: { id: 1 }, away: { id: 2 } },
          goals: { home: 2, away: 1 },
        },
        {
          fixture: { id: 101, date: "2026-06-13T18:00:00+00:00", venue: { name: "SoFi Stadium" } },
          teams: { home: { id: 3 }, away: { id: 4 } },
          goals: { home: null, away: null },
        },
      ],
    };
    const out = parseFixtures(json);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      fixtureId: 100,
      kickoffUtc: "2026-06-12T18:00:00+00:00",
      venue: "MetLife Stadium",
      homeId: 1, awayId: 2, homeGoals: 2, awayGoals: 1,
    });
  });
});

describe("parseStats", () => {
  const statsJson = {
    response: [
      { team: { id: 1 }, statistics: [
        { type: "Ball Possession", value: "55%" },
        { type: "Total Shots", value: 12 },
        { type: "Passes %", value: "88%" },
        { type: "Yellow Cards", value: 2 },
        { type: "Red Cards", value: 1 },
      ] },
      { team: { id: 2 }, statistics: [
        { type: "Ball Possession", value: "45%" },
        { type: "Total Shots", value: null },
        { type: "Passes %", value: null },
        { type: "Yellow Cards", value: null },
      ] },
    ],
  };
  it("reads possession, shots, pass accuracy, and total cards", () => {
    expect(parseStats(statsJson, 1)).toEqual({
      possession: 55, shots: 12, passAccuracy: 88, cards: 3,
    });
  });
  it("returns nulls for missing values; cards is null when both card types absent", () => {
    expect(parseStats(statsJson, 2)).toEqual({
      possession: 45, shots: null, passAccuracy: null, cards: null,
    });
    expect(parseStats(statsJson, 999)).toEqual({
      possession: null, shots: null, passAccuracy: null, cards: null,
    });
  });
});
