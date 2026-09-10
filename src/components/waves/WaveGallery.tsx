"use client";
import { useState } from "react";
import Link from "next/link";
import { flagEmoji } from "@/lib/flags";
import type { WaveMatch } from "@/lib/waves-types";
export type WaveSummary = Omit<WaveMatch, "momentum" | "goals">;
export function WaveGallery({ matches }: { matches: WaveSummary[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All stages");
  const shown = matches.filter(m => (stage === "All stages" || m.stage === stage) && `${m.home.name} ${m.away.name}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="browse-controls"><label>Find a team<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search nations" /></label><label>Tournament stage<select value={stage} onChange={e=>setStage(e.target.value)}>{["All stages", ...new Set(matches.map(m=>m.stage))].map(s=><option key={s}>{s}</option>)}</select></label></div>
    <p className="page-sub" aria-live="polite">{shown.length} of {matches.length} matches · FIFA World Cup 2026</p>
    {shown.length === 0 && <p>No matches found. Try another nation or stage.</p>}
    <div className="waves-gallery">{shown.map(match => <Link key={match.matchId} href={`/waves/${match.matchId}`} className="waves-card">
      <div className="waves-card-stage">{match.stage} · {new Date(match.kickoff).toLocaleDateString("en-GB", {day:"numeric",month:"short",timeZone:"UTC"})}</div>
      <div className="waves-card-score">{flagEmoji(match.home.code)} {match.score[0]} – {match.score[1]} {flagEmoji(match.away.code)}</div>
      <div>{match.home.name} v {match.away.name}</div>
      <div className="waves-card-stage">{match.penalties ? `${match.penalties[0]}–${match.penalties[1]} pens · ` : ""}Watch momentum ↗</div>
    </Link>)}</div>
  </>;
}
