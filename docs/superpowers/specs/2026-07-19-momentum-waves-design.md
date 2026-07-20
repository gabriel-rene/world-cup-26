# Momentum Waves — Design

**Date:** 2026-07-19
**Status:** Approved (pending spec review)

## Summary

A new section of the world-cup-26 app: an animated, top-down ("cenital")
data-portrait of a football match, where per-minute **momentum** drives a
fluid, two-colored tide across the pitch. Each team owns one color of the
liquid; the front where the colors meet is the momentum tide line. Goals
punctuate as ripples and a color wash. Inspired by wc26.bogachev.fr, but
deliberately narrower: momentum + goals only.

V1 covers **4 showcase matches from FIFA World Cup 2022**:

1. Argentina–France (final)
2. Argentina–Netherlands (quarter-final)
3. Brazil–Croatia (quarter-final)
4. Spain–Japan (group stage)

Match IDs are parameterized — adding matches later is just adding IDs.

## Data ingestion & snapshot

New module `ingestion/fotmob.ts`, following the existing ingestion pattern
(fetch → validate → normalize → committed static JSON, fixture-based tests).

- **Source:** FotMob's unofficial match-details endpoint
  (`https://www.fotmob.com/api/matchDetails?matchId=<id>`), fetched once per
  showcase match by a manual build-time script: `npm run ingest:waves`.
  No API key. Polite delay between requests and a descriptive User-Agent.
- **Extracted:** per-minute momentum trace, goals (minute, scorer, side,
  running score), team names/codes, final score, stage, kickoff.
- **Normalized schema** (the app never sees FotMob's shape):

  ```ts
  {
    matchId: string,            // our slug, e.g. "arg-fra-final"
    stage: string,
    kickoff: string,            // ISO datetime
    home: { name: string, code: string, color: string },
    away: { name: string, code: string, color: string },
    score: [number, number],
    momentum: Array<{ minute: number, value: number }>, // value ∈ [-1, 1], + = home
    goals: Array<{
      minute: number,
      side: 'home' | 'away',
      player: string,
      scoreAfter: [number, number],
    }>,
  }
  ```

- **Storage:** one small JSON file per match under `data/waves/`, committed.
  Read statically by the app — no backend, no runtime keys, consistent with
  the existing architecture.
- **Team colors:** our own curated palette (defined in the ingestion config,
  one primary color per team), chosen for on-pitch contrast. FotMob's colors
  are inconsistent and are not used.
- **Validation:** strict schema check at ingest time. FotMob schema drift
  fails the build loudly; the browser only ever receives validated JSON.
- **Attribution:** the UI credits FotMob as the momentum source, in the
  existing methodology-note style.

## Routes & UI

Two new routes in the existing Next.js app:

### `/waves` — gallery

- One card per showcase match: flags (reusing existing flag components),
  team names, final score, stage.
- Short intro line ("each match rendered as a tide of momentum") and a link
  to the methodology note.
- Nav gains a "Waves" entry.

### `/waves/[matchId]` — the portrait

- **Canvas:** a wide, pitch-proportioned (~105:68) canvas sized to the
  viewport, showing the top-down fluid. Faint pitch markings (halfway line,
  center circle, penalty boxes) are an SVG overlay above the canvas — not
  drawn in the shader.
- **Header:** team names + flags at their respective ends; running score
  that updates as playback passes each goal; current match minute.
- **Playback controls:** play/pause, replay, and a scrub bar spanning
  0'–full time with goal markers ticked on it. Full match plays in ~75
  seconds, **linearly** compressed (no dramatic-time warping).
- **Metadata footer:** stage, date, venue, final score, FotMob attribution.
- Permalink slugs (e.g. `/waves/arg-fra-final`), consistent with the
  explorer's permalink style. Unknown slug → Next `notFound()` (404).

All client-side over committed JSON; no runtime fetching.

## Renderer

`MomentumWaves` component: one `<canvas>` with a WebGL2 fragment shader on a
full-screen quad, plus a small TypeScript driver. No three.js; GLSL is
~150–200 lines.

### Driver (TypeScript, unit-testable)

- Loads match JSON; resamples the momentum trace into a smooth curve
  (Catmull-Rom through per-minute points, then a light low-pass). The
  smoothing is an acknowledged interpretation — shape faithful, jitter
  removed.
- Runs the playback clock: play/pause/scrub map wall time → match time `t`
  under the ~75 s linear compression.
- Per frame, uploads uniforms:
  - current momentum `m(t)`;
  - a trailing window of recent momentum packed as a small float array,
    giving the fluid a visible *wake*;
  - both team colors;
  - for each goal within the last few seconds of playback: age and side.

### Shader (GLSL)

- The pitch is a liquid surface. The **front** between the two team colors
  sits at `x = 0.5 + 0.5·m(t)` along the pitch's long axis — momentum
  literally is the tide line.
- Layered fBm noise displaces the front so it laps and fingers like a
  shoreline. Noise is **seeded by matchId** → deterministic replays: the
  same match always renders the same way.
- Noise is advected toward the attacking direction, so the dominant tide
  visibly flows forward.
- A bright **foam band** marks the front; each side is depth-graded team
  color with subtle caustic shimmer.
- A **goal** fires a radial ripple from the scoring team's attacking end
  plus a brief full-field wash of their color, decaying over ~2 s of real
  time.

### Fallback

If a WebGL2 context cannot be created, render a static 2D momentum
area-chart in team colors with a short note. The data still shows; nothing
breaks.

## Testing

Vitest, matching the existing setup:

- **Ingestion:** fixture-based tests for `fotmob.ts` — momentum
  normalization to [-1, 1], goal extraction, loud failure on
  malformed/drifted responses.
- **Driver:** unit tests for the resampler (interpolation passes through
  source points, smoothing bounded), the playback clock
  (scrub/pause/compression math), and goal-event windowing.
- **Shader:** no automated pixel tests; verified visually in the browser
  during development. The WebGL-context-failure path is unit-tested.

## Error handling

- All FotMob fragility is confined to build time (strict ingest validation).
- Unknown match slug → 404.
- WebGL unavailable → static fallback chart.

## Non-goals (v1)

- No shots/xG/cards layer — momentum + goals only.
- No dramatic-time warping — linear compressed playback.
- No live or 2026 data — WC 2022 showcase matches only.
- No audio, no social-share image generation.

## Decisions log

| Decision | Choice |
|---|---|
| Momentum source | FotMob (unofficial endpoint, build-time only) |
| Placement | New section of existing app (`/waves`) |
| Time model | Animated playback, ~75 s, linear compression |
| Event layer | Momentum + goals only |
| Match scope | 4 showcase WC 2022 matches |
| Rendering | Procedural WebGL2 fragment shader (approach A) |
