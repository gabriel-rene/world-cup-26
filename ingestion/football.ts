import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;

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

export function parsePossession(
  statsJson: unknown,
  teamId: number,
): { possession: number | null; shots: number | null } {
  const entry = resp(statsJson).find((r) => r.team?.id === teamId);
  if (!entry) return { possession: null, shots: null };
  const stats: Array<{ type: string; value: unknown }> = entry.statistics ?? [];
  const find = (type: string) => stats.find((s) => s.type === type)?.value ?? null;
  const possRaw = find("Ball Possession");
  const possession = typeof possRaw === "string" ? Number(possRaw.replace("%", "")) : null;
  const shotsRaw = find("Total Shots");
  const shots = typeof shotsRaw === "number" ? shotsRaw : null;
  return { possession, shots };
}

export async function apiGet(path: string, key: string, fetchFn: typeof fetch = fetch): Promise<unknown> {
  const res = await fetchFn(`${BASE}${path}`, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status}`);
  return res.json();
}

async function main() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY not set");
  mkdirSync("data/raw", { recursive: true });

  const teamsJson = await apiGet(`/teams?league=${LEAGUE}&season=${SEASON}`, key);
  writeFileSync("data/raw/teams.json", JSON.stringify(teamsJson, null, 2));

  const fixturesJson = await apiGet(`/fixtures?league=${LEAGUE}&season=${SEASON}`, key);
  writeFileSync("data/raw/fixtures.json", JSON.stringify(fixturesJson, null, 2));

  for (const fx of parseFixtures(fixturesJson)) {
    const file = `data/raw/stats-${fx.fixtureId}.json`;
    if (existsSync(file)) { console.log(`skip ${fx.fixtureId} (cached)`); continue; }
    const stats = await apiGet(`/fixtures/statistics?fixture=${fx.fixtureId}`, key);
    writeFileSync(file, JSON.stringify(stats, null, 2));
    console.log(`fetched stats ${fx.fixtureId}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("football.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
