# World Cup — Fun Correlations

Visualize FIFA World Cup data alongside public country data (population,
GDP, GDP per capita, weather) and explore playful correlations — *which nation
scored more goals per GDP per capita?*, *how does temperature affect ball
possession?* — as scatter plots with real correlation coefficients and a fun
headline.

The committed snapshot covers **FIFA World Cup 2022 (Qatar)** — the most
recent complete tournament the free data tier can reach. The pipeline is
season-parameterized (`WC_SEASON`) and switches to 2026 as soon as a data
plan that covers it is available.

> Correlation ≠ causation. These are descriptive, for-fun correlations over a
> small sample. See the in-app methodology note.

## How it works

- An **ingestion** step pulls data from free sources (API-Football, the World
  Bank API, and Open-Meteo) and builds a static JSON snapshot.
- The **Next.js app** reads only that committed snapshot — no backend, no
  database, no API keys in the browser.
- A **hybrid** UX: a curated feed of highlight correlations plus a
  build-your-own explorer.

## Status

Live with real WC 2022 data. Design specs:
[`docs/superpowers/specs/`](docs/superpowers/specs/)

## Data sources

| Source | Used for |
|---|---|
| [API-Football](https://www.api-football.com/) | World Cup teams, fixtures, per-match statistics |
| [World Bank API](https://data.worldbank.org/) | population, GDP, GDP per capita, land area |
| [Open-Meteo](https://open-meteo.com/) | per-match weather at venue + kickoff |
| [Fjelstul World Cup Database](https://github.com/jfjelstul/worldcup) | historical tournaments (1930–2022), *v2* |

## Ingesting real data

The committed snapshot is built from real data. To rebuild it you supply your
own free [API-Football](https://www.api-football.com/) key. The key is read
**only** by the ingestion scripts (build time) and is never sent to the
browser.

1. Create a `.env` file in the project root (it is git-ignored):

   ```
   API_FOOTBALL_KEY=your_key_here
   ```

2. Run the ingestion steps in order:

   ```bash
   npm run ingest:football    # teams, fixtures, per-fixture stats -> data/raw/
   npm run ingest:worldbank   # population, GDP, land area -> data/raw/worldbank.json
   npm run ingest:weather     # kickoff weather per fixture -> data/raw/weather.json
   npm run build:snapshot     # combine raw caches -> public/data/{teams,matches,meta}.json
   ```

3. Restart the dev server (`npm run dev`) to see the new snapshot.

**Which season?**

- Ingestion defaults to `WC_SEASON=2022` (Qatar). The **free** API-Football
  tier only serves seasons 2022–2024; requesting 2026 on a free plan returns
  an in-body plan error (which the ingestion now fails loudly on, instead of
  caching it).
- On a paid plan, `WC_SEASON=2026 npm run ingest:football` switches the whole
  pipeline — the snapshot's tournament label, page titles, and venue weather
  follow automatically.

**Notes**

- The free tier allows ~10 requests/minute; `ingest:football` throttles
  itself and caches each fixture's stats to `data/raw/stats-<id>.json`,
  skipping files it has already fetched, so an interrupted run resumes where
  it left off.
- `data/raw/` is git-ignored (large and regenerable); only the built
  `public/data/*.json` snapshot is committed.
- Pass accuracy and cards come from the API-Football statistics payload. If
  a stat is omitted for a fixture, that fixture simply contributes nothing to
  the average/sum rather than breaking the build.
