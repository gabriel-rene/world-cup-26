import { describe, it, expect } from "vitest";
import { lookupVenue, VENUES } from "./venues";
import { toIso3, COUNTRY_ISO3 } from "./countries";

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

  it("covers at least 48 distinct nations across confederations", () => {
    const distinct = new Set(Object.values(COUNTRY_ISO3));
    expect(distinct.size).toBeGreaterThanOrEqual(48);
  });

  it("resolves the hosts and a sample from each confederation", () => {
    expect(toIso3("USA")).toBe("USA");
    expect(toIso3("Canada")).toBe("CAN");
    expect(toIso3("Mexico")).toBe("MEX");
    expect(toIso3("Brazil")).toBe("BRA");
    expect(toIso3("Japan")).toBe("JPN");
    expect(toIso3("Morocco")).toBe("MAR");
    expect(toIso3("Portugal")).toBe("PRT");
    expect(toIso3("Senegal")).toBe("SEN");
    expect(toIso3("Australia")).toBe("AUS");
  });
});
