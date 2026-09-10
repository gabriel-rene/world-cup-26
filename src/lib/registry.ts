import type { Scope } from "./scopes";
import type { TeamRow, MatchTeamRow } from "./types";

export interface VariableDef {
  key: string;
  label: string;
  scope: Scope;
  unit: string;
  format: (v: number) => string;
  accessor: (row: TeamRow | MatchTeamRow) => number | null;
}

const int = (v: number) => Math.round(v).toLocaleString("en-US");
const pct = (v: number) => `${v.toFixed(1)}%`;
const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
const deg = (v: number) => `${v.toFixed(1)}°C`;

// Typed helpers keep accessors readable while the public type stays union-based.
const team = (fn: (r: TeamRow) => number | null) => (r: TeamRow | MatchTeamRow) => fn(r as TeamRow);
const match = (fn: (r: MatchTeamRow) => number | null) => (r: TeamRow | MatchTeamRow) => fn(r as MatchTeamRow);

export const VARIABLES: VariableDef[] = [
  // --- team scope ---
  { key: "matchesPlayed", label: "Matches played", scope: "team", unit: "matches", format: int, accessor: team(r => r.matchesPlayed) },
  { key: "goalsPerMatch", label: "Goals per match", scope: "team", unit: "goals/match", format: v => v.toFixed(2), accessor: team(r => r.matchesPlayed ? r.goalsFor / r.matchesPlayed : null) },
  { key: "shotsPerMatch", label: "Shots per match", scope: "team", unit: "shots/match", format: v => v.toFixed(2), accessor: team(r => r.matchesPlayed && r.shots !== null ? r.shots / r.matchesPlayed : null) },
  { key: "xgPerMatch", label: "xG per match", scope: "team", unit: "xG/match", format: v => v.toFixed(2), accessor: team(r => r.matchesPlayed && r.xg != null ? r.xg / r.matchesPlayed : null) },
  { key: "xg", label: "Expected goals", scope: "team", unit: "xG", format: v => v.toFixed(2), accessor: team(r => r.xg ?? null) },
  { key: "goalsFor", label: "Goals scored", scope: "team", unit: "goals", format: int, accessor: team((r) => r.goalsFor) },
  { key: "goalsAgainst", label: "Goals conceded", scope: "team", unit: "goals", format: int, accessor: team((r) => r.goalsAgainst) },
  { key: "shots", label: "Total shots", scope: "team", unit: "shots", format: int, accessor: team((r) => r.shots) },
  { key: "passAccuracy", label: "Pass accuracy", scope: "team", unit: "%", format: pct, accessor: team((r) => r.passAccuracy) },
  { key: "cards", label: "Cards", scope: "team", unit: "cards", format: int, accessor: team((r) => r.cards) },
  { key: "avgPossession", label: "Avg possession", scope: "team", unit: "%", format: pct, accessor: team((r) => r.avgPossession) },
  { key: "population", label: "Population", scope: "team", unit: "people", format: int, accessor: team((r) => r.population) },
  { key: "gdp", label: "GDP", scope: "team", unit: "USD", format: usd, accessor: team((r) => r.gdp) },
  { key: "gdpPerCapita", label: "GDP per capita", scope: "team", unit: "USD", format: usd, accessor: team((r) => r.gdpPerCapita) },
  { key: "landArea", label: "Land area", scope: "team", unit: "km²", format: int, accessor: team((r) => r.landArea) },
  // --- match scope ---
  { key: "xg", label: "Expected goals", scope: "match", unit: "xG", format: v => v.toFixed(2), accessor: match(r => r.xg ?? null) },
  { key: "possession", label: "Ball possession", scope: "match", unit: "%", format: pct, accessor: match((r) => r.possession) },
  { key: "shots", label: "Shots", scope: "match", unit: "shots", format: int, accessor: match((r) => r.shots) },
  { key: "goals", label: "Goals", scope: "match", unit: "goals", format: int, accessor: match((r) => r.goals) },
  { key: "temperatureC", label: "Temperature", scope: "match", unit: "°C", format: deg, accessor: match((r) => r.temperatureC) },
  { key: "humidity", label: "Humidity", scope: "match", unit: "%", format: pct, accessor: match((r) => r.humidity) },
  { key: "windKph", label: "Wind speed", scope: "match", unit: "km/h", format: int, accessor: match((r) => r.windKph) },
];

export function variablesForScope(scope: Scope): VariableDef[] {
  return VARIABLES.filter((v) => v.scope === scope);
}
