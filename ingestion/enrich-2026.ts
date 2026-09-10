import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { toIso3 } from "./countries";
import { VENUES } from "./venues";
async function main() {
  const dir = "data/raw/2026";
  const league = JSON.parse(readFileSync(`${dir}/league.json`, "utf8"));
  const names = [...new Set<string>(league.fixtures.allMatches.flatMap((f: any) => [f.home.name, f.away.name]))];
  const codes = [...new Set(names.map(toIso3).filter(Boolean))];
  for (const [field, code] of Object.entries({population:"SP.POP.TOTL",gdp:"NY.GDP.MKTP.CD",gdpPerCapita:"NY.GDP.PCAP.CD",landArea:"AG.LND.TOTL.K2"})) {
    const path = `${dir}/wb-${field}.json`;
    if (existsSync(path)) continue;
    const response = await fetch(`https://api.worldbank.org/v2/country/${codes.join(";")}/indicator/${code}?format=json&date=2020:2025&per_page=1000`);
    if (!response.ok) throw Error(`World Bank ${response.status}`);
    const json = await response.json();
    if (!Array.isArray(json?.[1])) throw Error(`Missing World Bank ${field}`);
    writeFileSync(path, JSON.stringify(json)); console.log(`World Bank ${field}: ${json[1].length} observations`);
  }
  const venues = [...new Map(Object.values(VENUES).map(v => [v.name, v])).values()].slice(0,16);
  for (const [i,v] of venues.entries()) {
    const path = `${dir}/weather-${i}.json`;
    if (existsSync(path)) continue;
    const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${v.lat}&longitude=${v.lon}&start_date=2026-06-11&end_date=2026-07-20&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC`);
    if (!response.ok) throw Error(`Open-Meteo ${response.status}`);
    writeFileSync(path, JSON.stringify({venue:v,archive:await response.json()})); console.log(`Weather ${v.name}`);
    await new Promise(r=>setTimeout(r,1000));
  }
}
main().catch(e=>{ console.error(e); process.exitCode=1; });
