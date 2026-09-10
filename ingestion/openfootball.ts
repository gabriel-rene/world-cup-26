import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

export interface GroupResult {
  group: string;
  kickoffUtc: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  venue: string;
}

/** Parse scored group fixtures only; fail closed on unrecognized fixture lines. */
export function parseGroupResults(text: string): GroupResult[] {
  let group = "", day = "";
  const results: GroupResult[] = [];
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^▪ Group ([A-L])$/);
    if (heading) { group = heading[1]; day = ""; continue; }
    const date = line.match(/^\w{3} June (\d{1,2})$/);
    if (date) { day = date[1].padStart(2, "0"); continue; }
    if (!/^\s+\d{1,2}:\d{2}\s+UTC/.test(line)) continue;
    const match = line.match(/^\s+(\d{1,2}:\d{2}) UTC([+-]\d+)\s+(.+?)\s+(\d+)-(\d+)\s+\(\d+-\d+\)\s+(.+?)\s+@\s+(.+)$/);
    if (!group || !day || !match) throw new Error(`Unrecognized scored fixture: ${line}`);
    const [, time, offset, home, hg, ag, away, venue] = match;
    const zone = `${offset.startsWith("-") ? "-" : "+"}${String(Math.abs(Number(offset))).padStart(2, "0")}:00`;
    results.push({ group, kickoffUtc: new Date(`2026-06-${day}T${time.padStart(5, "0")}:00${zone}`).toISOString(), home: home.trim(), away: away.trim(), homeGoals: Number(hg), awayGoals: Number(ag), venue: venue.trim() });
  }
  if (results.length !== 72 || new Set(results.flatMap(r => [r.home, r.away])).size !== 48) {
    throw new Error("Expected 72 group matches and 48 teams; snapshot not written.");
  }
  for (const group of "ABCDEFGHIJKL") {
    if (results.filter(r => r.group === group).length !== 6) throw new Error(`Incomplete group ${group}`);
  }
  return results.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc));
}

if (process.argv[1]?.endsWith("openfootball.ts")) {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: npm run ingest:2026 -- /path/to/cup.txt");
  const source = readFileSync(path, "utf8");
  const matches = parseGroupResults(source);
  mkdirSync("public/data/2026", { recursive: true });
  writeFileSync("public/data/2026/groups.json", JSON.stringify({
    tournament: "FIFA World Cup 2026", coverage: "Group stage only",
    source: "OpenFootball", sourceUrl: "https://github.com/openfootball/worldcup/blob/master/2026--canada-usa-mexico/cup.txt",
    retrievedAt: new Date().toISOString(), sourceSha256: createHash("sha256").update(source).digest("hex"), matches,
  }, null, 2));
  console.log(`Imported ${matches.length} group-stage results.`);
}
