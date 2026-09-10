import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { toIso3 } from "./countries";
import { parseWaveMatch } from "./fotmob";
import { pickHour } from "./weather";
import type { TeamRow, MatchTeamRow, Meta } from "../src/lib/types";
import type { WaveMatch } from "../src/lib/waves-types";

// Provider boundary: only selected, validated fields enter the public snapshot.
export function parseFotmobStats(content: any, side: number) {
  const stats = (content?.stats?.Periods?.All?.stats ?? []).flatMap((s: any) => s.stats ?? []);
  const raw = (key: string) => stats.find((s: any) => s.key === key && s.type !== "title")?.stats?.[side];
  const num = (key: string) => {
    const value = raw(key);
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const passes = String(raw("accurate_passes") ?? "").match(/\((\d+(?:\.\d+)?)%\)/);
  const yellow = num("yellow_cards"), red = num("red_cards");
  return { possession: num("BallPossesion"), shots: num("total_shots"), xg: num("expected_goals"),
    passAccuracy: passes ? Number(passes[1]) : null,
    cards: yellow === null && red === null ? null : (yellow ?? 0) + (red ?? 0) };
}

export function countryObservation(rows: any[], iso3: string) {
  const row = rows.filter(r => r.countryiso3code === iso3 && Number(r.date) <= 2025 && Number.isFinite(r.value))
    .sort((a,b) => Number(b.date) - Number(a.date))[0];
  return row ? { value: row.value as number, year: Number(row.date) } : { value: null, year: null };
}

/** FotMob momentum uses fractional minute markers for added time. */
export function alignGoalMinutes(wave: WaveMatch, events: any[]): WaveMatch {
  const goals = events.filter(e => e.type === "Goal" && !e.isPenaltyShootoutEvent);
  const addedByPeriod = new Map<number, number>();
  for (const event of events) {
    if (Number.isFinite(event.time) && Number.isFinite(event.overloadTime)) {
      addedByPeriod.set(event.time, Math.max(addedByPeriod.get(event.time) ?? 0, event.overloadTime));
    }
  }
  wave.goals = wave.goals.map((goal, i) => {
    const event = goals[i];
    const added = event.overloadTime ?? 0;
    return { ...goal, minute: event.time + (added > 0 ? .5 * added / ((addedByPeriod.get(event.time) ?? added) + 1) : 0),
      displayMinute: added > 0 ? `${event.time}+${added}` : String(event.time) };
  }).sort((a,b) => a.minute - b.minute);
  return wave;
}

function main() {
  const dir = "data/raw/2026";
  const read = (file: string) => JSON.parse(readFileSync(`${dir}/${file}`, "utf8"));
  const league = read("league.json");
  if (league.details.selectedSeason !== "2026" || league.fixtures.allMatches.length !== 104) throw Error("Expected complete 2026 fixture index");
  const weather = readdirSync(dir).filter(f=>f.startsWith("weather-")).map(read);
  if (weather.length !== 16) throw Error("Expected 16 venue weather archives");
  const fields = ["population", "gdp", "gdpPerCapita", "landArea"] as const;
  const indicators = Object.fromEntries(fields.map(field => [field, read(`wb-${field}.json`)[1]]));
  const teams = new Map<number, TeamRow>();
  const matches: MatchTeamRow[] = [];
  const waves: WaveMatch[] = [];
  const observations = new Map<number, ReturnType<typeof parseFotmobStats>[]>();
  for (const fx of league.fixtures.allMatches) {
    const p = read(`match-${fx.id}.json`);
    const g = p.general;
    if (String(g.matchId) !== String(fx.id) || !g.finished || !g.matchTimeUTCDate.startsWith("2026-") || Number(g.homeTeam.id) !== Number(fx.home.id) || Number(g.awayTeam.id) !== Number(fx.away.id)) throw Error(`Invalid fixture ${fx.id}`);
    const score = p.header.status.scoreStr.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!score) throw Error(`Invalid score ${fx.id}`);
    const stadium = p.content.matchFacts.infoBox.Stadium;
    const closest = weather.map(w => ({...w,distance:Math.hypot(w.venue.lat - stadium.lat,w.venue.lon - stadium.long)})).sort((a,b)=>a.distance-b.distance)[0];
    if (!closest || closest.distance > .1) throw Error(`Unknown venue ${stadium.name}`);
    const conditions = pickHour(closest.archive, g.matchTimeUTCDate);
    const stage = fx.group ? `Group ${fx.group}` : String(fx.roundName);
    const code = (name: string) => name === "England" ? "ENG" : name === "Scotland" ? "SCO" : toIso3(name) ?? "";
    const slug = `2026-${fx.id}`;
    const wave = parseWaveMatch({props:{pageProps:p}}, {slug, fotmobId:String(fx.id), pageUrl:fx.pageUrl,
      stage, home:{code:code(g.homeTeam.name), color:g.teamColors.darkMode.home}, away:{code:code(g.awayTeam.name),color:g.teamColors.darkMode.away}});
    alignGoalMinutes(wave, p.content.matchFacts.events.events);
    if (wave.goals.some(goal=>goal.minute > wave.momentum.at(-1)!.minute)) throw Error(`Goal outside timeline ${fx.id}`);
    waves.push(wave);
    for (const side of [0,1]) {
      const team = side === 0 ? g.homeTeam : g.awayTeam;
      const opponent = side === 0 ? g.awayTeam : g.homeTeam;
      const stats = parseFotmobStats(p.content, side);
      if (stats.possession === null || stats.shots === null || stats.xg === null) throw Error(`Missing core statistics ${fx.id}`);
      if (!teams.has(team.id)) {
        const iso3 = toIso3(team.name) ?? "";
        const country = Object.fromEntries(fields.map(field=>[field,countryObservation(indicators[field],iso3).value]));
        const indicatorYears = Object.fromEntries(fields.map(field=>[field,countryObservation(indicators[field],iso3).year]));
        teams.set(team.id, { teamId:team.id,name:team.name,iso3:code(team.name),goalsFor:0,goalsAgainst:0,matchesPlayed:0,
          shots:null,passAccuracy:null,cards:null,avgPossession:null,xg:null,population:null,gdp:null,gdpPerCapita:null,landArea:null,...country,indicatorYears });
        observations.set(team.id, []);
      }
      const row = teams.get(team.id)!;
      row.goalsFor += Number(score[side+1]); row.goalsAgainst += Number(score[2-side]); row.matchesPlayed++;
      observations.get(team.id)!.push(stats);
      matches.push({ fixtureId:Number(fx.id),teamId:team.id,teamName:team.name,opponentId:opponent.id,venue:stadium.name,
        kickoffUtc:g.matchTimeUTCDate,stage,goals:Number(score[side+1]),possession:stats.possession,shots:stats.shots,xg:stats.xg,...conditions });
    }
  }
  const aggregate = (values: (number|null)[], average = false) => {
    const present = values.filter((v): v is number => v !== null);
    // Totals should not silently become partial totals.
    if (!present.length || (!average && present.length !== values.length)) return null;
    return present.reduce((a,b)=>a+b,0) / (average ? present.length : 1);
  };
  for (const team of teams.values()) {
    const stats = observations.get(team.teamId)!;
    team.shots = aggregate(stats.map(s=>s.shots)); team.cards = aggregate(stats.map(s=>s.cards));
    team.xg = aggregate(stats.map(s=>s.xg)); team.avgPossession = aggregate(stats.map(s=>s.possession),true);
    team.passAccuracy = aggregate(stats.map(s=>s.passAccuracy),true);
  }
  if (teams.size !== 48 || matches.length !== 208 || waves.length !== 104) throw Error("Incomplete tournament");
  const meta: Meta = {generatedAt:new Date().toISOString(),tournament:"FIFA World Cup 2026",sources:[
    {name:"FotMob — 2026 fixtures, statistics and momentum",url:"https://www.fotmob.com/leagues/77/fixtures/world-cup?season=2026"},
    {name:"World Bank — latest available observation through 2025",url:"https://data.worldbank.org/"},
    {name:"Open-Meteo — hourly venue weather reanalysis",url:"https://open-meteo.com/en/docs/historical-weather-api"}],caveats:[
      "Full 2026 tournament: 48 teams, 104 matches. Football statistics include extra time; shootout kicks are excluded from goals.",
      "Correlation does not imply causation. Team-match rows share opponents and weather and are not independent observations.",
      "Per-match rates reduce progression bias, but extra-time matches are longer than regulation matches.",
      "Economic indicators use the latest available observation from 2020–2025; each team's observation years are recorded in the downloadable data.",
      "England's economic indicators use a United Kingdom proxy. Scotland's economic indicators are unavailable and left null.",
      "Weather is an outdoor reanalysis estimate at kickoff, not a measurement inside the stadium.",
      "Waves use FotMob momentum. Added-time goals are positioned within the provider's fractional added-time intervals; goal labels retain the original minute."
    ]};
  mkdirSync("public/data/2026",{recursive:true});
  for (const [name,data] of Object.entries({teams:[...teams.values()].sort((a,b)=>a.name.localeCompare(b.name)),matches,meta,waves})) {
    writeFileSync(`public/data/2026/${name}.json`,JSON.stringify(data,null,2));
  }
  console.log(`Built ${teams.size} teams, ${matches.length} team-match rows, ${waves.length} waves.`);
}
if (process.argv[1]?.endsWith("build-2026.ts")) main();
