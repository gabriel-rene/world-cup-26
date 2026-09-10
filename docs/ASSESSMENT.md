# Project assessment — 10 September 2026

## Current implementation

The core application now uses the full 2026 World Cup: **48 teams, 104 matches, 208 team-match observations and 104 momentum visualizations**. Home patterns, Explorer, Teams and Waves all read the 2026 snapshots. Original 2022 JSON remains available in the repository as an archive.

The Swiss-inspired interface uses an asymmetric opening, aligned columns, strong typographic hierarchy, flat panels, neutral surfaces and the existing maroon accent. Teams has nation search, football/country views, keyboard-sortable headers and a data download. Waves has nation and stage filters. Every scatter plot exposes coverage and an expandable data table.

## Data pipeline

- **FotMob:** public fixture index and match-page embedded data. Match ID, year, participants, finished status and required statistics are validated before snapshot creation. Reused team-pair URLs fall back to direct match IDs. All 104 games have possession, shots and xG. Goal-event scores are verified; penalty shootouts are separate. Momentum added-time markers are fractional, so added-time goals are placed inside those intervals while retaining their original labels.
- **World Bank:** latest non-null indicator observation from 2020–2025, with observation years stored per team. England uses a UK proxy; Scotland remains null. Unknown indicators are not converted to zero.
- **Open-Meteo:** hourly outdoor reanalysis at 16 stadium coordinates, selecting the kickoff UTC hour. Venue matching fails if coordinates are not close enough. It does not measure conditions beneath roofs or stadium cooling.
- **OpenFootball:** separate group-stage results page and an independent check of the 72 group scores and kickoff times against FotMob.

The configured API-Football free plan was checked and explicitly rejects season 2026. The working implementation uses FotMob, so a paid plan is not required to run these committed snapshots.

## Rebuild

```bash
npm run fetch:2026
npm run enrich:2026
npm run build:2026
npm test
npm run build
```

The fetch/enrichment scripts resume from season-specific `data/raw/2026` caches. The fetcher obtains the 2026 fixture index if it is absent. To refresh a cached source, review and remove that specific cached file before running again. The builder validates the whole tournament before writing `public/data/2026/{teams,matches,meta,waves}.json`; it never writes into the original 2022 snapshots.

The OpenFootball view remains reproducible with `npm run ingest:2026 -- data/reference/2026-cup.txt`.

## Highest-value remaining improvements

1. **Group-stage-only analysis.** Per-match rates reduce progression bias, but group-only comparisons give every nation the same three-match schedule. Extra-time matches still have unequal exposure.
2. **Uncertainty and outliers.** Add optional log scales for population/GDP, Spearman correlation, and explicit outlier inspection. Match rows share opponents and weather, so naive independent-sample significance tests are unsuitable.
3. **Player-level analysis.** FotMob exposes shot events; a future shot map could compare location, xG and finishing. Keep model estimates distinct from recorded outcomes.
4. **Reproducibility and publication.** Record retrieval timestamps and hashes for each source cache, and implement atomic snapshot publication. Provider schemas can change; fixture identity checks must remain mandatory.
5. **Economic proxy policy.** Let users exclude England's UK proxy and require a common indicator year where comparisons need stricter temporal alignment.

## Sources

- [FotMob 2026 World Cup](https://www.fotmob.com/leagues/77/fixtures/world-cup?season=2026)
- [OpenFootball 2026](https://github.com/openfootball/worldcup/tree/master/2026--canada-usa-mexico)
- [World Bank indicator queries](https://datahelpdesk.worldbank.org/knowledgebase/articles/898599-indicator-api-queries)
- [Open-Meteo historical weather](https://open-meteo.com/en/docs/historical-weather-api)
- [API-Football documentation](https://www.api-football.com/documentation-v3)
- [football-data.org coverage](https://www.football-data.org/coverage): an alternative result/standings source; token/season access not tested here.
- [StatsBomb open data](https://github.com/statsbomb/open-data): historical event enrichment; checked index contains 2022, but no 2026 World Cup season.
