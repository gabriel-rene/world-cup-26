import { writeFileSync, mkdirSync } from "node:fs";
import { COUNTRY_ISO3 } from "./countries";

export interface CountryStats {
  iso3: string;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  landArea: number | null;
}

const INDICATORS = {
  population: "SP.POP.TOTL",
  gdp: "NY.GDP.MKTP.CD",
  gdpPerCapita: "NY.GDP.PCAP.CD",
  landArea: "AG.LND.TOTL.K2",
} as const;

export function parseIndicator(json: unknown): number | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
  const rows = json[1] as Array<{ date: string; value: number | null }>;
  const sorted = [...rows].sort((a, b) => Number(b.date) - Number(a.date));
  for (const row of sorted) {
    if (row.value !== null && row.value !== undefined) return row.value;
  }
  return null;
}

export async function fetchCountryStats(
  iso3: string,
  fetchFn: typeof fetch = fetch,
): Promise<CountryStats> {
  const out: CountryStats = {
    iso3, population: null, gdp: null, gdpPerCapita: null, landArea: null,
  };
  for (const [field, code] of Object.entries(INDICATORS) as [keyof typeof INDICATORS, string][]) {
    const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=5&mrnev=1`;
    const res = await fetchFn(url);
    if (!res.ok) continue;
    out[field] = parseIndicator(await res.json());
  }
  return out;
}

async function main() {
  const iso3s = Array.from(new Set(Object.values(COUNTRY_ISO3)));
  const result: Record<string, CountryStats> = {};
  for (const iso3 of iso3s) {
    result[iso3] = await fetchCountryStats(iso3);
    console.log(`fetched ${iso3}`);
  }
  mkdirSync("data/raw", { recursive: true });
  writeFileSync("data/raw/worldbank.json", JSON.stringify(result, null, 2));
  console.log(`wrote data/raw/worldbank.json (${iso3s.length} countries)`);
}

if (process.argv[1] && process.argv[1].endsWith("worldbank.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
