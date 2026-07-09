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

  it("accepts API-Football's hyphenated country names", () => {
    expect(toIso3("South-Korea")).toBe("KOR");
    expect(toIso3("Saudi-Arabia")).toBe("SAU");
    expect(toIso3("Costa-Rica")).toBe("CRI");
  });

  it("does not conflate UK constituent nations with GBR-level World Bank stats", () => {
    // World Bank only publishes UK-aggregate indicators. Attributing them to
    // Wales/Scotland would show every one of their stats as England's.
    expect(toIso3("England")).toBe("GBR");
    expect(toIso3("Wales")).toBeNull();
    expect(toIso3("Scotland")).toBeNull();
  });

  it("covers 24 distinct host stadiums (16 for 2026 + 8 for Qatar 2022) with finite coordinates", () => {
    const distinct = new Set(Object.values(VENUES).map((v) => v.name));
    expect(distinct.size).toBe(24);
    for (const v of Object.values(VENUES)) {
      expect(Number.isFinite(v.lat)).toBe(true);
      expect(Number.isFinite(v.lon)).toBe(true);
    }
  });

  it("resolves the Qatar 2022 stadiums, including the Lusail naming variants", () => {
    for (const name of [
      "Lusail Stadium", "Lusail Iconic Stadium", "Al Bayt Stadium", "Stadium 974",
      "Al Thumama Stadium", "Khalifa International Stadium", "Education City Stadium",
      "Ahmad Bin Ali Stadium", "Al Janoub Stadium",
    ]) {
      expect(lookupVenue(name), name).not.toBeNull();
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
