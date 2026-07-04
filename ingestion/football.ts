import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;

// The API-Football free tier only serves seasons 2022-2024, so the latest
// World Cup it can reach is 2022 (Qatar). Override with WC_SEASON once on a
// plan that covers 2026.
export function resolveSeason(env: Record<string, string | undefined>): number {
  return Number(env.WC_SEASON ?? "2022");
}

export interface RawTeam { teamId: number; name: string; country: string }
export interface RawFixture {
  fixtureId: number; kickoffUtc: string; venue: string;
  homeId: number; awayId: number; homeGoals: number; awayGoals: number;
}

function resp(json: unknown): any[] {
  if (json && typeof json === "object" && Array.isArray((json as any).response)) {
    return (json as any).response;
  }
  return [];
}

export function parseTeams(json: unknown): RawTeam[] {
  return resp(json).map((r) => ({
    teamId: r.team.id, name: r.team.name, country: r.team.country,
  }));
}

export function parseFixtures(json: unknown): RawFixture[] {
  return resp(json)
    .filter((r) => r.goals?.home !== null && r.goals?.home !== undefined)
    .map((r) => ({
      fixtureId: r.fixture.id,
      kickoffUtc: r.fixture.date,
      venue: r.fixture.venue?.name ?? "",
      homeId: r.teams.home.id,
      awayId: r.teams.away.id,
      homeGoals: r.goals.home,
      awayGoals: r.goals.away,
    }));
}

export function parseStats(
  statsJson: unknown,
  teamId: number,
): {
  possession: number | null;
  shots: number | null;
  passAccuracy: number | null;
  cards: number | null;
} {
  const entry = resp(statsJson).find((r) => r.team?.id === teamId);
  if (!entry) return { possession: null, shots: null, passAccuracy: null, cards: null };
  const stats: Array<{ type: string; value: unknown }> = entry.statistics ?? [];
  const find = (type: string) => stats.find((s) => s.type === type)?.value ?? null;

  const pct = (raw: unknown) =>
    typeof raw === "string" ? Number(raw.replace("%", "")) : null;
  const num = (raw: unknown) => (typeof raw === "number" ? raw : null);

  const possession = pct(find("Ball Possession"));
  const shots = num(find("Total Shots"));
  const passAccuracy = pct(find("Passes %"));

  const yellow = num(find("Yellow Cards"));
  const red = num(find("Red Cards"));
  const cards = yellow === null && red === null ? null : (yellow ?? 0) + (red ?? 0);

  return { possession, shots, passAccuracy, cards };
}

export async function apiGet(path: string, key: string, fetchFn: typeof fetch = fetch): Promise<unknown> {
  const res = await fetchFn(`${BASE}${path}`, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status}`);
  const json = await res.json();
  // API-Football reports plan/rate-limit failures as 200 with an `errors`
  // object; treat those as failures so they are never cached as data.
  const errors = (json as { errors?: unknown })?.errors;
  const messages = Array.isArray(errors)
    ? errors.map(String)
    : errors && typeof errors === "object"
      ? Object.values(errors as Record<string, unknown>).map(String)
      : [];
  if (messages.length > 0) {
    throw new Error(`API-Football ${path} -> ${messages.join("; ")}`);
  }
  return json;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY not set");
  const season = resolveSeason(process.env);
  mkdirSync("data/raw", { recursive: true });

  const teamsJson = await apiGet(`/teams?league=${LEAGUE}&season=${season}`, key);
  writeFileSync("data/raw/teams.json", JSON.stringify(teamsJson, null, 2));

  const fixturesJson = await apiGet(`/fixtures?league=${LEAGUE}&season=${season}`, key);
  writeFileSync("data/raw/fixtures.json", JSON.stringify(fixturesJson, null, 2));

  for (const fx of parseFixtures(fixturesJson)) {
    const file = `data/raw/stats-${fx.fixtureId}.json`;
    if (existsSync(file)) { console.log(`skip ${fx.fixtureId} (cached)`); continue; }
    const stats = await apiGet(`/fixtures/statistics?fixture=${fx.fixtureId}`, key);
    writeFileSync(file, JSON.stringify(stats, null, 2));
    console.log(`fetched stats ${fx.fixtureId}`);
    await sleep(6500); // free tier allows 10 requests/minute
  }
}

if (process.argv[1] && process.argv[1].endsWith("football.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
