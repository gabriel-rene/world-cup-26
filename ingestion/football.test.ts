import { describe, it, expect } from "vitest";
import { parseTeams, parseFixtures, parseStats, apiGet, resolveSeason } from "./football";

function fakeFetch(payload: unknown): typeof fetch {
  return (async () => ({ ok: true, json: async () => payload })) as unknown as typeof fetch;
}

describe("apiGet", () => {
  it("throws when the body carries an API error (200 + errors.plan)", async () => {
    const payload = {
      errors: { plan: "Free plans do not have access to this season, try from 2022 to 2024." },
      response: [],
    };
    await expect(apiGet("/teams?league=1&season=2026", "k", fakeFetch(payload)))
      .rejects.toThrow(/Free plans do not have access/);
  });

  it("throws when the body carries a rate-limit error (200 + errors.requests)", async () => {
    const payload = {
      errors: { requests: "You have reached the request limit for the day." },
      response: [],
    };
    await expect(apiGet("/fixtures?league=1&season=2022", "k", fakeFetch(payload)))
      .rejects.toThrow(/request limit/);
  });

  it("returns the payload when errors is an empty array or object", async () => {
    const ok = { errors: [], response: [{ team: { id: 1 } }] };
    await expect(apiGet("/teams", "k", fakeFetch(ok))).resolves.toEqual(ok);
    const okObj = { errors: {}, response: [] };
    await expect(apiGet("/teams", "k", fakeFetch(okObj))).resolves.toEqual(okObj);
  });
});

describe("resolveSeason", () => {
  it("defaults to 2022 (the latest World Cup the free tier can access)", () => {
    expect(resolveSeason({})).toBe(2022);
  });
  it("honors a WC_SEASON override", () => {
    expect(resolveSeason({ WC_SEASON: "2026" })).toBe(2026);
  });
});

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
