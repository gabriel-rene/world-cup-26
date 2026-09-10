"use client";

import { useState } from "react";
import Link from "next/link";
import data from "../../../public/data/2026/groups.json";

export default function WorldCup2026() {
  const [group, setGroup] = useState("All");
  const matches = data.matches.filter(match => group === "All" || match.group === group);
  return (
    <main>
      <h1 className="page-title">World Cup 2026.</h1>
      <p className="page-sub">The group stage, match by match. Browse 48 nations across 12 groups in Canada, Mexico and the United States.</p>
      <div className="dataset-strip"><strong>72 results · Group stage only</strong><span>Community dataset / <a href={data.sourceUrl}>OpenFootball ↗</a></span><Link href="/about#2026">Coverage & limitations ↗</Link></div>
      <div className="group-filter" role="group" aria-label="Filter by group">
        {["All", ..."ABCDEFGHIJKL"].map(value => <button key={value} type="button" aria-label={value === "All" ? "All groups" : `Group ${value}`} aria-pressed={group === value} onClick={() => setGroup(value)}>{value}</button>)}
      </div>
      <p aria-live="polite" className="page-sub">{matches.length} matches · {group === "All" ? "All groups" : `Group ${group}`} · Kickoff times in UTC</p>
      <ul className="result-list">
        {matches.map(match => <li className="result-row" key={`${match.group}-${match.home}-${match.away}`}>
          <time dateTime={match.kickoffUtc}>{match.kickoffUtc.slice(5, 10)} · {match.kickoffUtc.slice(11, 16)}<br />Group {match.group}</time>
          <span className="home-team">{match.home}</span><strong aria-label={`${match.homeGoals} to ${match.awayGoals}`}>{match.homeGoals} — {match.awayGoals}</strong><span>{match.away}</span>
        </li>)}
      </ul>
      <p className="page-sub">Results as reported by OpenFootball; not an official FIFA feed. Knockout rounds and detailed match statistics are not included in this view. The <Link href="/explore">correlation explorer</Link> and <Link href="/waves">momentum waves</Link> cover the full 2026 tournament using FotMob statistics.</p>
    </main>
  );
}
