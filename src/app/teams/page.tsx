"use client";
import { useState } from "react";
import { SortableTable } from "@/components/SortableTable";
import { variablesForScope } from "@/lib/registry";
import { getTeams } from "@/lib/snapshot";
const COUNTRY = new Set(["population", "gdp", "gdpPerCapita", "landArea"]);
export default function Teams() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("Football");
  const teams = getTeams().filter(t=>t.name.toLowerCase().includes(query.toLowerCase()));
  const columns = variablesForScope("team").filter(v=>view === "Country context" ? COUNTRY.has(v.key) : !COUNTRY.has(v.key));
  return <main>
    <h1 className="page-title">Teams</h1><p className="page-sub">All 48 nations at the 2026 World Cup. Compare tournament totals, per-match rates and country context. Goals exclude shootout kicks.</p>
    <div className="browse-controls"><label>Find a nation<input type="search" placeholder="Search nations" value={query} onChange={e=>setQuery(e.target.value)} /></label><label>Compare<select value={view} onChange={e=>setView(e.target.value)}><option>Football</option><option>Country context</option></select></label><a href="/data/2026/teams.json" download>Download team data ↗</a></div>
    <p className="page-sub" aria-live="polite">{teams.length} of 48 nations · {view === "Football" ? "FotMob · Complete tournament" : "World Bank · Latest available observations through 2025"}</p>
    {teams.length ? <div className="table-scroll"><SortableTable rows={teams} columns={columns} /></div> : <p>No nations found. Try another name.</p>}
    <p className="data-note">Per-match rates include extra time. Country observation years are recorded in the download. England uses a UK economic proxy; Scotland has no country indicators. Missing values appear as —.</p>
  </main>;
}
