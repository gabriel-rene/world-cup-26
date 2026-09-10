import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { parseGroupResults } from "./openfootball";
import data from "../public/data/2026/groups.json";

describe("OpenFootball group import", () => {
  const source = readFileSync("data/reference/2026-cup.txt", "utf8");
  it("imports the archived source with complete group coverage and UTC conversion", () => {
    const matches = parseGroupResults(source);
    expect(matches).toEqual(data.matches);
    expect(matches[0].kickoffUtc).toBe("2026-06-11T19:00:00.000Z");
    expect(matches).toHaveLength(72);
  });
  it("rejects incomplete or malformed input", () => {
    expect(() => parseGroupResults("")).toThrow();
    expect(() => parseGroupResults(source.replace("2-0 (1-0)", "TBD"))).toThrow();
  });
});
