export interface TeamRow {
  xg?: number | null;
  indicatorYears?: Record<string, number | null>;
  teamId: number;
  name: string;
  iso3: string;
  goalsFor: number;
  goalsAgainst: number;
  shots: number | null;
  passAccuracy: number | null;
  cards: number | null;
  avgPossession: number | null;
  matchesPlayed: number;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  landArea: number | null;
}

export interface MatchTeamRow {
  xg?: number | null;
  stage?: string;
  fixtureId: number;
  teamId: number;
  teamName: string;
  opponentId: number;
  venue: string;
  kickoffUtc: string;
  goals: number;
  possession: number | null;
  shots: number | null;
  temperatureC: number | null;
  humidity: number | null;
  windKph: number | null;
}

export interface Meta {
  generatedAt: string;
  tournament: string;
  sources: { name: string; url: string }[];
  caveats: string[];
}

export interface Snapshot {
  teams: TeamRow[];
  matches: MatchTeamRow[];
  meta: Meta;
}
