import { describe, it, expect } from "vitest";
import { parseIndicator, fetchCountryStats } from "./worldbank";

const wbResponse = (value: number | null) => [
  { page: 1, pages: 1 },
  [{ indicator: { id: "SP.POP.TOTL" }, date: "2023", value }],
];

describe("parseIndicator", () => {
  it("returns the value from the most recent non-null row", () => {
    const json = [
      { page: 1, pages: 1 },
      [
        { date: "2023", value: null },
        { date: "2022", value: 42 },
      ],
    ];
    expect(parseIndicator(json)).toBe(42);
  });

  it("returns null when no data rows", () => {
    expect(parseIndicator([{ page: 1, pages: 1 }, []])).toBeNull();
    expect(parseIndicator([{ message: "no data" }])).toBeNull();
  });
});

describe("fetchCountryStats", () => {
  it("collects all four indicators via injected fetch", async () => {
    const fake: typeof fetch = (async (url: string) => {
      const map: Record<string, number> = {
        "SP.POP.TOTL": 1000,
        "NY.GDP.MKTP.CD": 5e9,
        "NY.GDP.PCAP.CD": 5000,
        "AG.LND.TOTL.K2": 12345,
      };
      const ind = Object.keys(map).find((k) => url.includes(k))!;
      return { ok: true, json: async () => wbResponse(map[ind]) } as Response;
    }) as typeof fetch;

    const stats = await fetchCountryStats("BRA", fake);
    expect(stats).toEqual({
      iso3: "BRA",
      population: 1000,
      gdp: 5e9,
      gdpPerCapita: 5000,
      landArea: 12345,
    });
  });
});
