# World Cup 2026 — Fun Correlations

Visualize FIFA World Cup 2026 data alongside public country data (population,
GDP, GDP per capita, weather) and explore playful correlations — *which nation
scored more goals per GDP per capita?*, *how does temperature affect ball
possession?* — as scatter plots with real correlation coefficients and a fun
headline.

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

Design phase. See the full design spec:
[`docs/superpowers/specs/2026-06-25-worldcup-correlations-design.md`](docs/superpowers/specs/2026-06-25-worldcup-correlations-design.md)

## Data sources

| Source | Used for |
|---|---|
| [API-Football](https://www.api-football.com/) | WC 2026 teams, fixtures, per-match statistics |
| [World Bank API](https://data.worldbank.org/) | population, GDP, GDP per capita, land area |
| [Open-Meteo](https://open-meteo.com/) | per-match weather at venue + kickoff |
| [Fjelstul World Cup Database](https://github.com/jfjelstul/worldcup) | historical tournaments (1930–2022), *v2* |

## Ingesting real data

The app ships with a small seed snapshot. To replace it with real data you
supply your own free [API-Football](https://www.api-football.com/) key. The
key is read **only** by the ingestion scripts (build time) and is never sent
to the browser.

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

**Notes**

- The free tier rate-limits requests. `ingest:football` caches each fixture's
  stats to `data/raw/stats-<id>.json` and skips files it has already fetched,
  so you can re-run it across several sessions until every fixture is cached.
- `data/raw/` is git-ignored (large and regenerable); only the built
  `public/data/*.json` snapshot is committed.
- Pass accuracy and cards come from the API-Football statistics payload. If
  the free tier omits a stat for a fixture, that fixture simply contributes
  nothing to the average/sum rather than breaking the build.
