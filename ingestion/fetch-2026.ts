import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { extractNextData } from "./fotmob";
async function main() {
const dir = "data/raw/2026";
mkdirSync(dir, { recursive: true });
const indexPath = `${dir}/league.json`;
if (!existsSync(indexPath)) {
  const response = await fetch("https://www.fotmob.com/leagues/77/fixtures/world-cup?season=2026");
  if (!response.ok) throw Error(`Fixture index: ${response.status}`);
  const page = extractNextData(await response.text()) as any;
  const leagueData = page.props.pageProps;
  if (leagueData.details?.selectedSeason !== "2026") throw Error("Wrong index season");
  writeFileSync(indexPath, JSON.stringify({details:leagueData.details,fixtures:leagueData.fixtures}));
}
const league = JSON.parse(readFileSync(indexPath, "utf8"));
if (league.details.selectedSeason !== "2026") throw Error("Wrong season");
const fixtures = league.fixtures.allMatches;
console.log(`Fetching ${fixtures.length} fixtures`);
for (const [i, fx] of fixtures.entries()) {
  const path = `${dir}/match-${fx.id}.json`;
  if (existsSync(path)) continue;
  const url = `https://www.fotmob.com${fx.pageUrl.split("#")[0]}`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`${fx.id}: HTTP ${response.status}`);
  const parsed = extractNextData(await response.text()) as any;
  let p = parsed.props.pageProps;
  if (String(p.general?.matchId) !== String(fx.id)) {
    const direct = await fetch(`https://www.fotmob.com/match/${fx.id}`);
    if (!direct.ok) throw Error(`Direct match ${fx.id}: ${direct.status}`);
    p = (extractNextData(await direct.text()) as any).props.pageProps;
  }
  if (String(p.general?.matchId) !== String(fx.id) || !p.general?.finished || !p.general?.matchTimeUTCDate?.startsWith("2026-")) throw Error(`Unexpected match ${fx.id}`);
  // Retain only data used by the reproducible snapshot, not unrelated page payloads.
  writeFileSync(path, JSON.stringify({ general:p.general, header:p.header, content:{stats:p.content.stats, momentum:p.content.momentum, matchFacts:p.content.matchFacts} }));
  console.log(`${i+1}/${fixtures.length}: ${fx.home.name} v ${fx.away.name}`);
  await new Promise(r => setTimeout(r, 1000));
}

}
main().catch(e => { console.error(e); process.exitCode = 1; });
