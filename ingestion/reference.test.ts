import { describe, it, expect } from "vitest";
import { lookupVenue, VENUES } from "./venues";
import { toIso3 } from "./countries";

describe("reference tables", () => {
  it("resolves a known host venue case-insensitively", () => {
    const v = lookupVenue("MetLife Stadium");
    expect(v).not.toBeNull();
    expect(typeof v!.lat).toBe("number");
    expect(typeof v!.lon).toBe("number");
  });

  it("returns null for an unknown venue", () => {
    expect(lookupVenue("Nowhere Arena")).toBeNull();
  });

  it("maps country names to ISO3", () => {
    expect(toIso3("Brazil")).toBe("BRA");
    expect(toIso3("USA")).toBe("USA");
    expect(toIso3("Atlantis")).toBeNull();
  });

  it("covers 16 distinct host stadiums with finite coordinates", () => {
    const distinct = new Set(Object.values(VENUES).map((v) => v.name));
    expect(distinct.size).toBe(16);
    for (const v of Object.values(VENUES)) {
      expect(Number.isFinite(v.lat)).toBe(true);
      expect(Number.isFinite(v.lon)).toBe(true);
    }
  });
});
