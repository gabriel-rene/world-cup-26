import { getMeta } from "@/lib/snapshot";
import Link from "next/link";
export default function About() {
  const meta = getMeta();
  return <main className="prose">
    <h1>Methodology</h1>
    <p>Patterns, the explorer, teams and momentum waves all use <strong>{meta.tournament}</strong>: 48 nations and all 104 matches, including the knockout rounds.</p>
    <h2 id="2026">What is measured</h2>
    <p>Football statistics and match momentum come from FotMob’s public match pages. The importer validates match IDs, season, participants and completed status. Expected goals (xG) describes the quality of chances; it is a model estimate, not a goal count.</p>
    <p>Team totals sum matches in the tournament. Possession and pass accuracy are arithmetic averages across measured matches. Per-match rates divide totals by matches played. Shootout kicks do not count toward goals; extra-time play is included.</p>
    <h2>Country & weather context</h2>
    <p>World Bank indicators use the most recent available observation in 2020–2025, with each indicator’s year retained in the <a href="/data/2026/teams.json" download>team data download</a>. England uses the United Kingdom as an economic proxy; Scotland’s indicators remain missing.</p>
    <p>Open-Meteo provides hourly outdoor weather reanalysis at each stadium’s coordinates. The UTC kickoff hour is selected. This estimates outdoor conditions, including for venues with roofs or cooling; it does not measure pitch-level conditions.</p>
    <h2>Reading the patterns</h2>
    <p>Each chart calculates Pearson’s r from observations where both variables are available. The sample size and coverage appear above the plot. Expand “Inspect the data” to read the underlying values. A strong coefficient describes an association; it does not establish causation.</p>
    <ul>{meta.caveats.map(c=><li key={c}>{c}</li>)}</ul>
    <h2>Momentum Waves</h2>
    <p>All 104 matches have their own <Link href="/waves">momentum visualization</Link>. The moving boundary interprets FotMob’s per-minute momentum values, scaled to −1…1 and smoothed by the renderer. Goals are separate recorded events. Added time is compressed into fractional intervals; the expandable goal timeline retains labels such as 90+4.</p>
    <h2>Sources</h2>
    <ul>{meta.sources.map(source=><li key={source.name}><a href={source.url}>{source.name}</a></li>)}</ul>
    <p>The separate <Link href="/2026">group-stage results</Link> view uses <a href="https://github.com/openfootball/worldcup/tree/master/2026--canada-usa-mexico">OpenFootball</a>, a community dataset. Its 72 scores are checked against the FotMob group fixtures during verification. The original 2022 snapshots remain in the repository for reference; they do not power the current charts.</p>
    <h2>Further enrichment</h2>
    <p>Player-level shot maps and group-stage-only comparisons are useful next additions. API-Football’s configured free plan was checked and rejects season 2026. No paid plan is required for the committed snapshots.</p>
    <p className="fine">Snapshot generated: {meta.generatedAt}</p>
  </main>;
}
