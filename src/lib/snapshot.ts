import teamsJson from "../../public/data/2026/teams.json";
import matchesJson from "../../public/data/2026/matches.json";
import metaJson from "../../public/data/2026/meta.json";
import type { TeamRow, MatchTeamRow, Meta } from "./types";
import type { Scope } from "./scopes";

const teams = teamsJson as TeamRow[];
const matches = matchesJson as MatchTeamRow[];
const meta = metaJson as Meta;

export function getTeams(): TeamRow[] { return teams; }
export function getMatches(): MatchTeamRow[] { return matches; }
export function getMeta(): Meta { return meta; }

export function rowsForScope(scope: Scope): (TeamRow | MatchTeamRow)[] {
  return scope === "team" ? teams : matches;
}
