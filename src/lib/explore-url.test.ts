import { describe, it, expect } from "vitest";
import { parseExploreParams, serializeExploreParams, EXPLORE_DEFAULTS } from "./explore-url";

describe("parseExploreParams", () => {
  it("round-trips a valid scope/x/y triple", () => {
    const p = new URLSearchParams("scope=match&x=temperatureC&y=possession");
    expect(parseExploreParams(p)).toEqual({ scope: "match", xKey: "temperatureC", yKey: "possession" });
  });

  it("falls back to defaults when params are missing", () => {
    expect(parseExploreParams(new URLSearchParams())).toEqual(EXPLORE_DEFAULTS);
  });

  it("rejects variables that do not exist in the requested scope", () => {
    // temperatureC is a match-scope variable; in team scope it must fall back.
    const p = new URLSearchParams("scope=team&x=temperatureC&y=goalsFor");
    const out = parseExploreParams(p);
    expect(out.scope).toBe("team");
    expect(out.xKey).toBe(EXPLORE_DEFAULTS.xKey);
    expect(out.yKey).toBe("goalsFor");
  });

  it("rejects an unknown scope entirely", () => {
    const p = new URLSearchParams("scope=stadium&x=goals&y=shots");
    expect(parseExploreParams(p)).toEqual(EXPLORE_DEFAULTS);
  });
});

describe("serializeExploreParams", () => {
  it("produces a query string parseExploreParams accepts", () => {
    const qs = serializeExploreParams({ scope: "match", xKey: "windKph", yKey: "goals" });
    expect(parseExploreParams(new URLSearchParams(qs))).toEqual({
      scope: "match", xKey: "windKph", yKey: "goals",
    });
  });
});
