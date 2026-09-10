# World Cup Fun Correlations

An interactive data story that puts FIFA World Cup performance beside the
economic, geographic, and weather data of the nations competing.

[![Next.js](https://img.shields.io/badge/Next.js-15-111111?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

![World Cup Fun Correlations dashboard](docs/assets/world-cup-correlations-preview.jpg)

## The idea

Do richer nations score more? Does heat affect possession? Are more populous
countries better at finding the net?

This project turns those questions into explorable scatter plots, calculates
real Pearson correlation coefficients, and translates the result into a
plain-language verdict. A second visualization, **Momentum Waves**, renders
iconic matches as two team-colored tides whose moving front follows the shape
of the game and whose goals land as ripples.

> Correlation is not causation. The analysis is intentionally playful,
> descriptive, and based on a small tournament sample.

## Highlights

- **Curated correlation feed** with approachable headlines and statistical
  context
- **Build-your-own explorer** for pairing football and country variables
- **Sortable team profiles** backed by a committed, reproducible snapshot
- **WebGL2 match visualizations** with playback controls and an accessible
  static fallback
- **Shareable URLs** that preserve explorer selections
- **Static-first architecture** with no database, backend, or browser-exposed
  API keys
- **Automated test suite** covering the data pipeline, statistics, routing,
  components, and momentum rendering math

## How it works

```mermaid
flowchart LR
    A["Football data"] --> E["TypeScript ingestion"]
    B["World Bank"] --> E
    C["Open-Meteo"] --> E
    D["FotMob momentum"] --> E
    E --> S["Committed JSON snapshot"]
    S --> N["Next.js application"]
    N --> V["Correlations · Teams · Momentum Waves"]
```

The browser reads only versioned JSON in `public/data`. External APIs are
called by local ingestion scripts, keeping credentials and rate limits out of
the application runtime.

The active snapshot covers **all 104 matches and 48 nations of FIFA World Cup 2026**.
Patterns, Explorer, Teams and Waves all use 2026 data, including xG, shots,
possession, country indicators and kickoff weather. Original 2022 snapshots
remain in the repository as an archive.

## Tech stack

| Layer | Technology |
| --- | --- |
| Application | Next.js 15, React 19, TypeScript |
| Charts | Recharts |
| Match art | WebGL2, GLSL shaders, Canvas fallback |
| Data pipeline | TypeScript, `tsx`, static JSON snapshots |
| Testing | Vitest, Testing Library, jsdom |
| Data | API-Football, World Bank, Open-Meteo, FotMob |

## Run locally

```bash
git clone https://github.com/gabriel-rene/world-cup-26.git
cd world-cup-26
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test       # run the test suite
npm run build  # create a production build
```

The committed snapshot is enough to run the full application. No API key is
required unless you want to rebuild the source data.

## Rebuild the 2026 data

```bash
npm run fetch:2026       # FotMob public fixtures and match statistics
npm run enrich:2026      # World Bank (through 2025) and kickoff weather
npm run build:2026       # validate and produce the complete 2026 snapshots
```

Raw data is cached under `data/raw/2026/`. These steps resume from cache.
No API key is needed. All 104 matches also power the Momentum Waves gallery.
The original API-Football scripts remain for the 2022 archive; the configured
free plan cannot access 2026.

## Data sources

| Source | Used for |
| --- | --- |
| [API-Football](https://www.api-football.com/) | Archived 2022 data only |
| [World Bank](https://data.worldbank.org/) | Population, GDP, GDP per capita, and land area |
| [Open-Meteo](https://open-meteo.com/) | Venue weather at kickoff |
| [FotMob](https://www.fotmob.com/) | 2026 fixtures, match statistics, xG and momentum for all 104 games |
| [Fjelstul World Cup Database](https://github.com/jfjelstul/worldcup) | Historical tournaments for future expansion |

## Project structure

```text
src/app/          Routes and page composition
src/components/   Charts, controls, tables, and WebGL views
src/lib/          Correlation, snapshot, URL, and wave-domain logic
ingestion/        Reproducible data collection and snapshot builders
public/data/      Versioned application data
```

Design decisions and implementation notes live in
[`docs/superpowers`](docs/superpowers).

## 2026 coverage and design assessment

All core views use the full 2026 tournament. The separate `/2026` group-stage
results view retains 72 OpenFootball results as a second source; automated
checks compare their scores and kickoff times against the FotMob snapshot.

See [the project assessment](docs/ASSESSMENT.md) for pipeline details,
statistical limitations and prioritized improvements.
