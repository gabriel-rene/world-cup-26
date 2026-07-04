import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { parseStats, type RawTeam, type RawFixture, parseTeams, parseFixtures, resolveSeason } from "./football";
import type { CountryStats } from "./worldbank";
import type { WeatherAtKickoff } from "./weather";
import { toIso3 } from "./countries";
import type { TeamRow, MatchTeamRow, Meta, Snapshot } from "../src/lib/types";

export interface RawInputs {
  teams: RawTeam[];
  fixtures: RawFixture[];
  statsByFixture: Record<number, unknown>;
  weather: Record<number, WeatherAtKickoff>;
  worldbank: Record<string, CountryStats>;
}

const NULL_WEATHER: WeatherAtKickoff = { temperatureC: null, humidity: null, windKph: null };

export function buildTeams(inputs: RawInputs): TeamRow[] {
  return inputs.teams.map((t) => {
    const iso3 = toIso3(t.country);
    const wb = iso3 ? inputs.worldbank[iso3] : undefined;
    let goalsFor = 0, goalsAgainst = 0, shots = 0, cards = 0, possSum = 0, matchesPlayed = 0;
    let passAccSum = 0, passAccCount = 0;

    for (const fx of inputs.fixtures) {
      const isHome = fx.homeId === t.teamId;
      const isAway = fx.awayId === t.teamId;
      if (!isHome && !isAway) continue;
      matchesPlayed += 1;
      goalsFor += isHome ? fx.homeGoals : fx.awayGoals;
      goalsAgainst += isHome ? fx.awayGoals : fx.homeGoals;
      const stats = parseStats(inputs.statsByFixture[fx.fixtureId], t.teamId);
      if (stats.possession !== null) possSum += stats.possession;
      if (stats.shots !== null) shots += stats.shots;
      if (stats.cards !== null) cards += stats.cards;
      if (stats.passAccuracy !== null) { passAccSum += stats.passAccuracy; passAccCount += 1; }
    }

    return {
      teamId: t.teamId,
      name: t.name,
      iso3: iso3 ?? "",
      goalsFor, goalsAgainst, shots, cards,
      passAccuracy: passAccCount > 0 ? passAccSum / passAccCount : 0,
      avgPossession: matchesPlayed > 0 ? possSum / matchesPlayed : 0,
      matchesPlayed,
      population: wb?.population ?? null,
      gdp: wb?.gdp ?? null,
      gdpPerCapita: wb?.gdpPerCapita ?? null,
      landArea: wb?.landArea ?? null,
    };
  });
}

export function buildMatches(inputs: RawInputs): MatchTeamRow[] {
  const nameById = new Map(inputs.teams.map((t) => [t.teamId, t.name]));
  const rows: MatchTeamRow[] = [];
  for (const fx of inputs.fixtures) {
    const weather = inputs.weather[fx.fixtureId] ?? NULL_WEATHER;
    for (const side of ["home", "away"] as const) {
      const teamId = side === "home" ? fx.homeId : fx.awayId;
      const opponentId = side === "home" ? fx.awayId : fx.homeId;
      const goals = side === "home" ? fx.homeGoals : fx.awayGoals;
      const { possession, shots } = parseStats(inputs.statsByFixture[fx.fixtureId], teamId);
      rows.push({
        fixtureId: fx.fixtureId,
        teamId,
        teamName: nameById.get(teamId) ?? String(teamId),
        opponentId,
        venue: fx.venue,
        kickoffUtc: fx.kickoffUtc,
        goals,
        possession,
        shots,
        temperatureC: weather.temperatureC,
        humidity: weather.humidity,
        windKph: weather.windKph,
      });
    }
  }
  return rows;
}

export function buildMeta(generatedAt: string, season: number): Meta {
  return {
    generatedAt,
    tournament: `FIFA World Cup ${season}`,
    sources: [
      { name: "API-Football", url: "https://www.api-football.com/" },
      { name: "World Bank", url: "https://data.worldbank.org/" },
      { name: "Open-Meteo", url: "https://open-meteo.com/" },
    ],
    caveats: [
      "Fun correlations only — correlation does not imply causation.",
      "Small sample (one tournament); r values are noisy.",
    ],
  };
}

export function buildSnapshot(inputs: RawInputs, generatedAt: string, season: number): Snapshot {
  return {
    teams: buildTeams(inputs),
    matches: buildMatches(inputs),
    meta: buildMeta(generatedAt, season),
  };
}

function readJson(path: string): unknown {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function main() {
  const teams = parseTeams(readJson("data/raw/teams.json"));
  const fixtures = parseFixtures(readJson("data/raw/fixtures.json"));
  const statsByFixture: Record<number, unknown> = {};
  for (const fx of fixtures) {
    statsByFixture[fx.fixtureId] = readJson(`data/raw/stats-${fx.fixtureId}.json`);
  }
  const weather = (readJson("data/raw/weather.json") as RawInputs["weather"]) ?? {};
  const worldbank = (readJson("data/raw/worldbank.json") as RawInputs["worldbank"]) ?? {};

  const snap = buildSnapshot(
    { teams, fixtures, statsByFixture, weather, worldbank },
    new Date().toISOString(),
    resolveSeason(process.env),
  );

  mkdirSync("public/data", { recursive: true });
  writeFileSync("public/data/teams.json", JSON.stringify(snap.teams, null, 2));
  writeFileSync("public/data/matches.json", JSON.stringify(snap.matches, null, 2));
  writeFileSync("public/data/meta.json", JSON.stringify(snap.meta, null, 2));
  console.log(`snapshot built: ${snap.teams.length} teams, ${snap.matches.length} match-rows`);
}

if (process.argv[1] && process.argv[1].endsWith("build-snapshot.ts")) {
  main();
}
