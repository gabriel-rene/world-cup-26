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
  // --- 2026 team ---
  { key: "goalsFor", label: "Goals scored", scope: "2026-team", unit: "goals", format: int, accessor: team((r) => r.goalsFor) },
  { key: "goalsAgainst", label: "Goals conceded", scope: "2026-team", unit: "goals", format: int, accessor: team((r) => r.goalsAgainst) },
  { key: "shots", label: "Total shots", scope: "2026-team", unit: "shots", format: int, accessor: team((r) => r.shots) },
  { key: "passAccuracy", label: "Pass accuracy", scope: "2026-team", unit: "%", format: pct, accessor: team((r) => r.passAccuracy) },
  { key: "cards", label: "Cards", scope: "2026-team", unit: "cards", format: int, accessor: team((r) => r.cards) },
  { key: "avgPossession", label: "Avg possession", scope: "2026-team", unit: "%", format: pct, accessor: team((r) => r.avgPossession) },
  { key: "population", label: "Population", scope: "2026-team", unit: "people", format: int, accessor: team((r) => r.population) },
  { key: "gdp", label: "GDP", scope: "2026-team", unit: "USD", format: usd, accessor: team((r) => r.gdp) },
  { key: "gdpPerCapita", label: "GDP per capita", scope: "2026-team", unit: "USD", format: usd, accessor: team((r) => r.gdpPerCapita) },
  { key: "landArea", label: "Land area", scope: "2026-team", unit: "km²", format: int, accessor: team((r) => r.landArea) },
  // --- 2026 match ---
  { key: "possession", label: "Ball possession", scope: "2026-match", unit: "%", format: pct, accessor: match((r) => r.possession) },
  { key: "shots", label: "Shots", scope: "2026-match", unit: "shots", format: int, accessor: match((r) => r.shots) },
  { key: "goals", label: "Goals", scope: "2026-match", unit: "goals", format: int, accessor: match((r) => r.goals) },
  { key: "temperatureC", label: "Temperature", scope: "2026-match", unit: "°C", format: deg, accessor: match((r) => r.temperatureC) },
  { key: "humidity", label: "Humidity", scope: "2026-match", unit: "%", format: pct, accessor: match((r) => r.humidity) },
  { key: "windKph", label: "Wind speed", scope: "2026-match", unit: "km/h", format: int, accessor: match((r) => r.windKph) },
];

export function variablesForScope(scope: Scope): VariableDef[] {
  return VARIABLES.filter((v) => v.scope === scope);
}
