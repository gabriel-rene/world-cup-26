import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { lookupVenue } from "./venues";
import { parseFixtures } from "./football";

export interface WeatherAtKickoff {
  temperatureC: number | null;
  humidity: number | null;
  windKph: number | null;
}

const NULL_WEATHER: WeatherAtKickoff = { temperatureC: null, humidity: null, windKph: null };

export function pickHour(archive: unknown, kickoffUtc: string): WeatherAtKickoff {
  const hourly = (archive as any)?.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return { ...NULL_WEATHER };
  const hourKey = kickoffUtc.slice(0, 13); // "2026-06-12T18"
  const idx = (hourly.time as string[]).findIndex((t) => t.slice(0, 13) === hourKey);
  if (idx === -1) return { ...NULL_WEATHER };
  const at = (arr: unknown) => (Array.isArray(arr) && typeof arr[idx] === "number" ? arr[idx] : null);
  return {
    temperatureC: at(hourly.temperature_2m),
    humidity: at(hourly.relative_humidity_2m),
    windKph: at(hourly.wind_speed_10m),
  };
}

export async function fetchVenueWeather(
  lat: number, lon: number, dateIso: string, fetchFn: typeof fetch = fetch,
): Promise<unknown> {
  const date = dateIso.slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
    + `&start_date=${date}&end_date=${date}`
    + `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC`;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

async function main() {
  const fixtures = parseFixtures(JSON.parse(readFileSync("data/raw/fixtures.json", "utf8")));
  const out: Record<number, WeatherAtKickoff> = {};
  for (const fx of fixtures) {
    const venue = lookupVenue(fx.venue);
    if (!venue) { out[fx.fixtureId] = { ...NULL_WEATHER }; console.log(`no venue for ${fx.venue}`); continue; }
    const archive = await fetchVenueWeather(venue.lat, venue.lon, fx.kickoffUtc);
    out[fx.fixtureId] = pickHour(archive, fx.kickoffUtc);
    console.log(`weather ${fx.fixtureId}`);
  }
  mkdirSync("data/raw", { recursive: true });
  writeFileSync("data/raw/weather.json", JSON.stringify(out, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith("weather.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
