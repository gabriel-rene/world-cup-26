# World Cup 2026 Fun Correlations — Design

**Date:** 2026-06-25
**Status:** Approved (v1 scope)

## Summary

A web app that visualizes FIFA World Cup data alongside public country data
(population, GDP, GDP per capita, weather) so users can explore playful
correlations like *"which nation scored more goals per GDP per capita"* or
*"how does temperature affect ball possession."* Each correlation is shown as a
scatter plot with a fitted trend line and a real correlation coefficient (r),
paired with a fun headline. Correlation ≠ causation is stated honestly.

The experience is **hybrid**: a curated feed of highlight correlations as the
entry point, plus a build-your-own explorer for mixing variables.

## Goals

- Make exploring "fun correlations" visually delightful and shareable.
- Be honest about statistics (small samples, r values shown, causation caveat).
- Zero rate-limit anxiety in the running app — it reads a pre-built snapshot.
- Free/cheap to host (no backend server, no database).

## Non-Goals (v1)

- Live, second-by-second match updates.
- User accounts, saved queries, or social features.
- The all-time historical scope (1930–2022) — deferred to v2 (see below).
- Advanced predictive modeling. These are descriptive, fun correlations only.

## The Core Data Model: Correlation Scopes

A variable is only meaningful at one "level / scope." The explorer is
scope-aware and only offers compatible variables within a scope.

| Scope | Unit (one point = ) | Variables | Example correlation |
|---|---|---|---|
| **2026 — team** | one nation (~48 pts) | tournament aggregates (goals for/against, shots, pass accuracy, cards, avg possession %) + World Bank (population, GDP, GDP per capita, land area) | goals vs GDP per capita |
| **2026 — match** | one team-in-a-match (hundreds of pts) | per-match possession %, shots, goals + Open-Meteo weather (temperature, humidity, wind at kickoff) | temperature vs possession |
| **All-time — team** *(v2)* | one nation across 92 yrs | Fjelstul historical outcomes (all-time goals, wins, hosts, appearances) + GDP/population | all-time wins vs population |

v1 ships the two **2026** scopes. The data model and the variable registry are
built so the historical scope is added later as data/config, not new code.

## Data Sources

| Source | Cost | Used for |
|---|---|---|
| API-Football | Free tier (~100 req/day) | WC 2026 teams, fixtures, per-match statistics |
| World Bank API | Free, no key | population, GDP, GDP per capita, land area |
| Open-Meteo (historical) | Free, no key | per-match weather at venue coords + kickoff time |
| Fjelstul World Cup DB (v2) | Free static files | all 22 men's tournaments (1930–2022) outcomes |

**Important caveat:** Fjelstul has results/goals/cards but **no possession or
shot stats** — those exist only in API-Football (2026). The sources therefore
do not merge into one table; they remain separate per-scope datasets.

## Architecture

No backend server. Two halves:

### Ingestion (build-time scripts, run manually/periodically)

- `ingest:football` — WC 2026 teams, fixtures, per-match statistics from
  API-Football. Fetches incrementally and caches raw responses to stay within
  the free-tier limit. API key read from env, never shipped to the client.
- `ingest:worldbank` — population, GDP, GDP per capita, land area for qualified
  nations.
- `ingest:weather` — for each played fixture, Open-Meteo historical weather at
  the venue coords + kickoff time.
- `build:snapshot` — joins raw data into the app-facing JSON and stamps a
  version + generated-at timestamp.

### App (Next.js, reads static JSON only)

The browser never calls an external API. It reads the committed snapshot under
`/public/data/`. Fast, free to host (e.g. Vercel), and no API key exposure.

### Snapshot shape (`/public/data/`)

- `teams.json` — one row per nation: 2026 tournament aggregates + World Bank stats.
- `matches.json` — one row per team-in-match: possession/shots + joined weather.
- `meta.json` — generated-at timestamp, source attributions, data caveats.

## App Surface

- **Insights feed (home)** — curated highlight correlations as cards, each a
  scatter + fun headline + r value. The "wow" entry point.
- **Explorer** — choose scope (2026-team / 2026-match), then X and Y from the
  compatible variable menu; renders a live scatter, fitted trend line,
  correlation coefficient, and an auto-generated shareable headline.
- **Correlation card** — shared component used by feed and explorer: scatter,
  fitted line, r, point labels (country flags), hover tooltips.
- **Methodology / about** — honest note: fun correlations, small sample
  (~48 teams / one tournament), correlation ≠ causation, plus source credits.

## Key Components & Boundaries

- **Variable registry** — a single declarative config describing every
  plottable variable: key, label, scope, unit, formatter, accessor. Adding a
  variable (or the v2 historical scope) is data, not code.
- **Correlation engine** — pure functions: given two variable accessors over a
  dataset, compute paired points, Pearson r, and a linear fit. Independently
  testable, no UI or fetching.
- **Snapshot loader** — typed access to the static JSON; the only thing that
  knows the file layout.
- **Ingestion scripts** — each one source, each writing a raw cache; the
  builder is the only thing that joins across sources.

## Testing

- Correlation engine: unit tests against known datasets (known r values, edge
  cases — n<2, zero variance, missing values).
- Variable registry: validation test that every variable resolves against the
  snapshot schema and declares a valid scope.
- Snapshot builder: test the join logic with small fixtures.

## Risks / Open Questions

- API-Football free-tier limit (~100 req/day) means ingestion must be
  incremental and cached; full-tournament fetch may span multiple runs.
- Venue coordinates + exact kickoff (UTC) needed for accurate weather joins;
  confirm API-Football provides these or maintain a small venue table.
- Small-n statistics: r values on ~48 points are noisy — the UI must frame
  these as fun, not authoritative.
