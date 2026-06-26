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
