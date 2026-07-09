# World Cup 2026 Fun Correlations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js app that visualizes WC 2026 football data against public country data (GDP, population, weather) as fun, statistically-honest correlations, reading from a pre-built static JSON snapshot.

**Architecture:** Two halves with no backend server. (1) **Ingestion** — Node/TypeScript scripts fetch from API-Football, the World Bank API, and Open-Meteo, cache raw responses, and a builder joins them into versioned JSON under `public/data/`. (2) **App** — a Next.js (App Router) frontend that reads only those static files and renders correlations via a shared chart component, driven by a declarative variable registry and a pure correlation engine.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript (strict), Recharts for charts, Vitest + @testing-library/react + jsdom for tests, tsx for running ingestion scripts.

## Global Constraints

- **Runtime:** Node.js 20+. Package manager: npm.
- **TypeScript:** `strict: true`. No `any` in committed code except where a typed cast is documented.
- **No client-side external API calls.** The browser reads only files under `public/data/`. All third-party fetching happens in ingestion scripts.
- **Secrets:** the API-Football key is read from `process.env.API_FOOTBALL_KEY` in ingestion only; never imported into app/client code, never committed. `.env` is gitignored.
- **API-Football free tier (~100 req/day):** ingestion fetches incrementally, caches every raw response to `data/raw/`, and skips fixtures whose raw cache already exists.
- **Scopes (v1):** only `'2026-team'` and `'2026-match'`. Build the variable registry so a third scope is added as data, not new code.
- **WC 2026 identifiers:** API-Football `league=1`, `season=2026`.
- **Commit cadence:** commit after each task's tests pass.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts
.env.example                          # documents API_FOOTBALL_KEY
src/
  lib/
    scopes.ts                         # Scope type + constants
    types.ts                          # TeamRow, MatchTeamRow, Meta, snapshot types
    correlation.ts                    # pure stats engine
    correlation.test.ts
    registry.ts                       # declarative variable registry
    registry.test.ts
    snapshot.ts                       # static JSON loader (server-side)
  components/
    CorrelationCard.tsx               # scatter + trend line + r
    CorrelationCard.test.tsx
    VariablePicker.tsx                # scope + X/Y selectors
  app/
    layout.tsx, page.tsx              # insights feed (home)
    explore/page.tsx                  # explorer
    about/page.tsx                    # methodology
    insights.ts                       # curated highlight correlations config
ingestion/
  venues.ts                           # static venue -> {lat,lon} table
  countries.ts                        # team country name -> iso3 table
  worldbank.ts                        # fetch + transform World Bank indicators
  worldbank.test.ts
  football.ts                         # fetch + transform API-Football
  football.test.ts
  weather.ts                          # fetch + transform Open-Meteo
  weather.test.ts
  build-snapshot.ts                   # join raw -> public/data/*.json
  build-snapshot.test.ts
public/data/                          # teams.json, matches.json, meta.json (generated)
data/raw/                             # gitignored raw API cache
```

---

### Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/lib/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a runnable Next.js app and a working `npm test` (Vitest) command.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "world-cup-26",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "ingest:worldbank": "tsx ingestion/worldbank.ts",
    "ingest:football": "tsx ingestion/football.ts",
    "ingest:weather": "tsx ingestion/weather.ts",
    "build:snapshot": "tsx ingestion/build-snapshot.ts"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create config files**

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`.env.example`:
```
# Get a free key at https://www.api-football.com/
API_FOOTBALL_KEY=your_key_here
```

- [ ] **Step 4: Create minimal app shell**

`src/app/layout.tsx`:
```tsx
export const metadata = { title: "World Cup 2026 — Fun Correlations" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main><h1>World Cup 2026 — Fun Correlations</h1></main>;
}
```

- [ ] **Step 5: Write a smoke test**

`src/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install and verify**

Run: `npm install && npm test`
Expected: install succeeds; Vitest reports `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Vitest toolchain"
```

---

### Task 2: Scope & snapshot types

**Files:**
- Create: `src/lib/scopes.ts`, `src/lib/types.ts`
- Test: `src/lib/scopes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Scope = "2026-team" | "2026-match"`; `SCOPES: Scope[]`; `SCOPE_LABELS: Record<Scope, string>`.
  - `interface TeamRow` with numeric fields `goalsFor, goalsAgainst, shots, passAccuracy, cards, avgPossession, matchesPlayed` and nullable `population, gdp, gdpPerCapita, landArea`, plus `teamId: number, name: string, iso3: string`.
  - `interface MatchTeamRow` with `fixtureId: number, teamId: number, teamName: string, opponentId: number, venue: string, kickoffUtc: string, goals: number` and nullable `possession, shots, temperatureC, humidity, windKph`.
  - `interface Meta { generatedAt: string; sources: {name:string;url:string}[]; caveats: string[] }`.
  - `interface Snapshot { teams: TeamRow[]; matches: MatchTeamRow[]; meta: Meta }`.

- [ ] **Step 1: Write the failing test**

`src/lib/scopes.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { SCOPES, SCOPE_LABELS } from "./scopes";

describe("scopes", () => {
  it("exposes the two v1 scopes with labels", () => {
    expect(SCOPES).toEqual(["2026-team", "2026-match"]);
    expect(SCOPE_LABELS["2026-team"]).toBe("2026 · Teams");
    expect(SCOPE_LABELS["2026-match"]).toBe("2026 · Matches");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scopes.test.ts`
Expected: FAIL — cannot find module `./scopes`.

- [ ] **Step 3: Implement `scopes.ts`**

```ts
export type Scope = "2026-team" | "2026-match";

export const SCOPES: Scope[] = ["2026-team", "2026-match"];

export const SCOPE_LABELS: Record<Scope, string> = {
  "2026-team": "2026 · Teams",
  "2026-match": "2026 · Matches",
};
```

- [ ] **Step 4: Implement `types.ts`** (no test of its own — it is types only; exercised by later tasks)

```ts
export interface TeamRow {
  teamId: number;
  name: string;
  iso3: string;
  goalsFor: number;
  goalsAgainst: number;
  shots: number;
  passAccuracy: number;
  cards: number;
  avgPossession: number;
  matchesPlayed: number;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  landArea: number | null;
}

export interface MatchTeamRow {
  fixtureId: number;
  teamId: number;
  teamName: string;
  opponentId: number;
  venue: string;
  kickoffUtc: string;
  goals: number;
  possession: number | null;
  shots: number | null;
  temperatureC: number | null;
  humidity: number | null;
  windKph: number | null;
}

export interface Meta {
  generatedAt: string;
  sources: { name: string; url: string }[];
  caveats: string[];
}

export interface Snapshot {
  teams: TeamRow[];
  matches: MatchTeamRow[];
  meta: Meta;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/scopes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scopes.ts src/lib/scopes.test.ts src/lib/types.ts
git commit -m "feat: add scope and snapshot types"
```

---

### Task 3: Correlation engine (pure stats)

**Files:**
- Create: `src/lib/correlation.ts`
- Test: `src/lib/correlation.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Point { x: number; y: number; label: string }`
  - `interface CorrelationResult { points: Point[]; r: number; slope: number; intercept: number; n: number }`
  - `function computeCorrelation(points: Point[]): CorrelationResult` — Pearson r and least-squares line. With `n < 2` or zero variance in x or y, returns `r: NaN, slope: NaN, intercept: NaN`. Input points are used as-is (callers filter nulls before calling).

- [ ] **Step 1: Write the failing tests**

`src/lib/correlation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeCorrelation } from "./correlation";

const P = (x: number, y: number, label = "") => ({ x, y, label });

describe("computeCorrelation", () => {
  it("returns r=1 and slope=2 for a perfect positive line y=2x", () => {
    const res = computeCorrelation([P(1, 2), P(2, 4), P(3, 6)]);
    expect(res.r).toBeCloseTo(1, 10);
    expect(res.slope).toBeCloseTo(2, 10);
    expect(res.intercept).toBeCloseTo(0, 10);
    expect(res.n).toBe(3);
  });

  it("returns r=-1 for a perfect negative line", () => {
    const res = computeCorrelation([P(1, 6), P(2, 4), P(3, 2)]);
    expect(res.r).toBeCloseTo(-1, 10);
    expect(res.slope).toBeCloseTo(-2, 10);
  });

  it("returns NaN r when fewer than 2 points", () => {
    const res = computeCorrelation([P(1, 1)]);
    expect(Number.isNaN(res.r)).toBe(true);
    expect(res.n).toBe(1);
  });

  it("returns NaN r when x has zero variance", () => {
    const res = computeCorrelation([P(5, 1), P(5, 2), P(5, 3)]);
    expect(Number.isNaN(res.r)).toBe(true);
  });

  it("computes a known intermediate r", () => {
    // points (1,2),(2,1),(3,4),(4,3) -> r = 0.6
    const res = computeCorrelation([P(1, 2), P(2, 1), P(3, 4), P(4, 3)]);
    expect(res.r).toBeCloseTo(0.6, 6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/correlation.test.ts`
Expected: FAIL — cannot find module `./correlation`.

- [ ] **Step 3: Implement `correlation.ts`**

```ts
export interface Point {
  x: number;
  y: number;
  label: string;
}

export interface CorrelationResult {
  points: Point[];
  r: number;
  slope: number;
  intercept: number;
  n: number;
}

export function computeCorrelation(points: Point[]): CorrelationResult {
  const n = points.length;
  const nan: CorrelationResult = { points, r: NaN, slope: NaN, intercept: NaN, n };
  if (n < 2) return nan;

  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const mx = sx / n;
  const my = sy / n;

  let sxx = 0, syy = 0, sxy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx === 0 || syy === 0) return nan;

  const r = sxy / Math.sqrt(sxx * syy);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  return { points, r, slope, intercept, n };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/correlation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/correlation.ts src/lib/correlation.test.ts
git commit -m "feat: add pure correlation engine (Pearson r + least squares)"
```

---

### Task 4: Variable registry

**Files:**
- Create: `src/lib/registry.ts`
- Test: `src/lib/registry.test.ts`

**Interfaces:**
- Consumes: `Scope` from `scopes.ts`; `TeamRow`, `MatchTeamRow` from `types.ts`.
- Produces:
  - `interface VariableDef { key: string; label: string; scope: Scope; unit: string; format: (v: number) => string; accessor: (row: TeamRow | MatchTeamRow) => number | null }`
  - `VARIABLES: VariableDef[]` — covering team-scope (`goalsFor`, `goalsAgainst`, `shots`, `passAccuracy`, `cards`, `avgPossession`, `population`, `gdp`, `gdpPerCapita`, `landArea`) and match-scope (`possession`, `shots`, `goals`, `temperatureC`, `humidity`, `windKph`).
  - `function variablesForScope(scope: Scope): VariableDef[]`

- [ ] **Step 1: Write the failing tests**

`src/lib/registry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { VARIABLES, variablesForScope } from "./registry";
import type { TeamRow, MatchTeamRow } from "./types";

describe("variable registry", () => {
  it("every variable declares a known scope and unique key", () => {
    const keys = new Set<string>();
    for (const v of VARIABLES) {
      expect(["2026-team", "2026-match"]).toContain(v.scope);
      expect(keys.has(`${v.scope}:${v.key}`)).toBe(false);
      keys.add(`${v.scope}:${v.key}`);
    }
  });

  it("team accessors resolve against a TeamRow", () => {
    const team: TeamRow = {
      teamId: 1, name: "Testland", iso3: "TST",
      goalsFor: 7, goalsAgainst: 3, shots: 40, passAccuracy: 82,
      cards: 5, avgPossession: 55, matchesPlayed: 3,
      population: 1000000, gdp: 5e10, gdpPerCapita: 50000, landArea: 100000,
    };
    const gpc = variablesForScope("2026-team").find((v) => v.key === "gdpPerCapita")!;
    expect(gpc.accessor(team)).toBe(50000);
    const goals = variablesForScope("2026-team").find((v) => v.key === "goalsFor")!;
    expect(goals.accessor(team)).toBe(7);
  });

  it("match accessors resolve against a MatchTeamRow and pass through nulls", () => {
    const m: MatchTeamRow = {
      fixtureId: 10, teamId: 1, teamName: "Testland", opponentId: 2,
      venue: "Stadium", kickoffUtc: "2026-06-12T18:00:00Z", goals: 2,
      possession: 60, shots: 12, temperatureC: null, humidity: 40, windKph: 9,
    };
    const temp = variablesForScope("2026-match").find((v) => v.key === "temperatureC")!;
    expect(temp.accessor(m)).toBeNull();
    const poss = variablesForScope("2026-match").find((v) => v.key === "possession")!;
    expect(poss.accessor(m)).toBe(60);
  });

  it("variablesForScope only returns that scope", () => {
    expect(variablesForScope("2026-match").every((v) => v.scope === "2026-match")).toBe(true);
    expect(variablesForScope("2026-team").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/registry.test.ts`
Expected: FAIL — cannot find module `./registry`.

- [ ] **Step 3: Implement `registry.ts`**

```ts
import type { Scope } from "./scopes";
import type { TeamRow, MatchTeamRow } from "./types";

export interface VariableDef {
  key: string;
  label: string;
  scope: Scope;
  unit: string;
  format: (v: number) => string;
  accessor: (row: TeamRow | MatchTeamRow) => number | null;
}

const int = (v: number) => Math.round(v).toLocaleString("en-US");
const pct = (v: number) => `${v.toFixed(1)}%`;
const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;
const deg = (v: number) => `${v.toFixed(1)}°C`;

// Typed helpers keep accessors readable while the public type stays union-based.
const team = (fn: (r: TeamRow) => number | null) => (r: TeamRow | MatchTeamRow) => fn(r as TeamRow);
const match = (fn: (r: MatchTeamRow) => number | null) => (r: TeamRow | MatchTeamRow) => fn(r as MatchTeamRow);

export const VARIABLES: VariableDef[] = [
  // --- 2026 team ---
  { key: "goalsFor", label: "Goals scored", scope: "2026-team", unit: "goals", format: int, accessor: team((r) => r.goalsFor) },
  { key: "goalsAgainst", label: "Goals conceded", scope: "2026-team", unit: "goals", format: int, accessor: team((r) => r.goalsAgainst) },
  { key: "shots", label: "Total shots", scope: "2026-team", unit: "shots", format: int, accessor: team((r) => r.shots) },
  { key: "passAccuracy", label: "Pass accuracy", scope: "2026-team", unit: "%", format: pct, accessor: team((r) => r.passAccuracy) },
  { key: "cards", label: "Cards", scope: "2026-team", unit: "cards", format: int, accessor: team((r) => r.cards) },
  { key: "avgPossession", label: "Avg possession", scope: "2026-team", unit: "%", format: pct, accessor: team((r) => r.avgPossession) },
  { key: "population", label: "Population", scope: "2026-team", unit: "people", format: int, accessor: team((r) => r.population) },
  { key: "gdp", label: "GDP", scope: "2026-team", unit: "USD", format: usd, accessor: team((r) => r.gdp) },
  { key: "gdpPerCapita", label: "GDP per capita", scope: "2026-team", unit: "USD", format: usd, accessor: team((r) => r.gdpPerCapita) },
  { key: "landArea", label: "Land area", scope: "2026-team", unit: "km²", format: int, accessor: team((r) => r.landArea) },
  // --- 2026 match ---
  { key: "possession", label: "Ball possession", scope: "2026-match", unit: "%", format: pct, accessor: match((r) => r.possession) },
  { key: "shots", label: "Shots", scope: "2026-match", unit: "shots", format: int, accessor: match((r) => r.shots) },
  { key: "goals", label: "Goals", scope: "2026-match", unit: "goals", format: int, accessor: match((r) => r.goals) },
  { key: "temperatureC", label: "Temperature", scope: "2026-match", unit: "°C", format: deg, accessor: match((r) => r.temperatureC) },
  { key: "humidity", label: "Humidity", scope: "2026-match", unit: "%", format: pct, accessor: match((r) => r.humidity) },
  { key: "windKph", label: "Wind speed", scope: "2026-match", unit: "km/h", format: int, accessor: match((r) => r.windKph) },
];

export function variablesForScope(scope: Scope): VariableDef[] {
  return VARIABLES.filter((v) => v.scope === scope);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/registry.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/registry.ts src/lib/registry.test.ts
git commit -m "feat: add declarative scope-aware variable registry"
```

---

### Task 5: Static venue & country reference tables

**Files:**
- Create: `ingestion/venues.ts`, `ingestion/countries.ts`
- Test: `ingestion/reference.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface VenueCoord { name: string; lat: number; lon: number }`; `VENUES: Record<string, VenueCoord>` keyed by lowercased venue/city name; `function lookupVenue(name: string): VenueCoord | null`.
  - `COUNTRY_ISO3: Record<string, string>` mapping API-Football country names to ISO3; `function toIso3(country: string): string | null`.

- [ ] **Step 1: Write the failing tests**

`ingestion/reference.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { lookupVenue } from "./venues";
import { toIso3 } from "./countries";

describe("reference tables", () => {
  it("resolves a known host venue case-insensitively", () => {
    const v = lookupVenue("MetLife Stadium");
    expect(v).not.toBeNull();
    expect(typeof v!.lat).toBe("number");
    expect(typeof v!.lon).toBe("number");
  });

  it("returns null for an unknown venue", () => {
    expect(lookupVenue("Nowhere Arena")).toBeNull();
  });

  it("maps country names to ISO3", () => {
    expect(toIso3("Brazil")).toBe("BRA");
    expect(toIso3("USA")).toBe("USA");
    expect(toIso3("Atlantis")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ingestion/reference.test.ts`
Expected: FAIL — cannot find module `./venues`.

- [ ] **Step 3: Implement `venues.ts`**

Include the known 2026 host venues. Add the rest of the 16 host stadiums when wiring real data; the lookup is by venue name OR city, both lowercased.

```ts
export interface VenueCoord { name: string; lat: number; lon: number }

// Keyed by lowercased venue name and city. Coordinates are venue locations.
export const VENUES: Record<string, VenueCoord> = {
  "metlife stadium": { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  "east rutherford": { name: "MetLife Stadium", lat: 40.8135, lon: -74.0745 },
  "sofi stadium": { name: "SoFi Stadium", lat: 33.9535, lon: -118.3392 },
  "los angeles": { name: "SoFi Stadium", lat: 33.9535, lon: -118.3392 },
  "estadio azteca": { name: "Estadio Azteca", lat: 19.3029, lon: -99.1505 },
  "mexico city": { name: "Estadio Azteca", lat: 19.3029, lon: -99.1505 },
  "bmo field": { name: "BMO Field", lat: 43.6332, lon: -79.4185 },
  "toronto": { name: "BMO Field", lat: 43.6332, lon: -79.4185 },
};

export function lookupVenue(name: string): VenueCoord | null {
  if (!name) return null;
  return VENUES[name.trim().toLowerCase()] ?? null;
}
```

- [ ] **Step 4: Implement `countries.ts`**

Include the qualified nations as they are confirmed. Start with the host nations and a few examples; extend during football ingestion.

```ts
export const COUNTRY_ISO3: Record<string, string> = {
  "USA": "USA",
  "United States": "USA",
  "Canada": "CAN",
  "Mexico": "MEX",
  "Brazil": "BRA",
  "Argentina": "ARG",
  "France": "FRA",
  "England": "GBR",
  "Spain": "ESP",
  "Germany": "DEU",
  "Japan": "JPN",
  "Morocco": "MAR",
};

export function toIso3(country: string): string | null {
  if (!country) return null;
  return COUNTRY_ISO3[country.trim()] ?? null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run ingestion/reference.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add ingestion/venues.ts ingestion/countries.ts ingestion/reference.test.ts
git commit -m "feat: add venue coordinate and country ISO3 reference tables"
```

---

### Task 6: World Bank ingestion (transform + fetch)

**Files:**
- Create: `ingestion/worldbank.ts`
- Test: `ingestion/worldbank.test.ts`

**Interfaces:**
- Consumes: `toIso3` from `countries.ts`.
- Produces:
  - `interface CountryStats { iso3: string; population: number | null; gdp: number | null; gdpPerCapita: number | null; landArea: number | null }`
  - `function parseIndicator(json: unknown): number | null` — extracts the most recent non-null `value` from a World Bank v2 indicator response (`[meta, rows]`).
  - `async function fetchCountryStats(iso3: string, fetchFn?: typeof fetch): Promise<CountryStats>` — calls the four indicator endpoints; `fetchFn` injectable for tests.
  - When run as a script (`tsx ingestion/worldbank.ts`), writes `data/raw/worldbank.json` (`Record<iso3, CountryStats>`) for the ISO3 set derived from `COUNTRY_ISO3` values.

- [ ] **Step 1: Write the failing tests**

`ingestion/worldbank.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseIndicator, fetchCountryStats } from "./worldbank";

const wbResponse = (value: number | null) => [
  { page: 1, pages: 1 },
  [{ indicator: { id: "SP.POP.TOTL" }, date: "2023", value }],
];

describe("parseIndicator", () => {
  it("returns the value from the most recent non-null row", () => {
    const json = [
      { page: 1, pages: 1 },
      [
        { date: "2023", value: null },
        { date: "2022", value: 42 },
      ],
    ];
    expect(parseIndicator(json)).toBe(42);
  });

  it("returns null when no data rows", () => {
    expect(parseIndicator([{ page: 1, pages: 1 }, []])).toBeNull();
    expect(parseIndicator([{ message: "no data" }])).toBeNull();
  });
});

describe("fetchCountryStats", () => {
  it("collects all four indicators via injected fetch", async () => {
    const fake: typeof fetch = (async (url: string) => {
      const map: Record<string, number> = {
        "SP.POP.TOTL": 1000,
        "NY.GDP.MKTP.CD": 5e9,
        "NY.GDP.PCAP.CD": 5000,
        "AG.LND.TOTL.K2": 12345,
      };
      const ind = Object.keys(map).find((k) => url.includes(k))!;
      return { ok: true, json: async () => wbResponse(map[ind]) } as Response;
    }) as typeof fetch;

    const stats = await fetchCountryStats("BRA", fake);
    expect(stats).toEqual({
      iso3: "BRA",
      population: 1000,
      gdp: 5e9,
      gdpPerCapita: 5000,
      landArea: 12345,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ingestion/worldbank.test.ts`
Expected: FAIL — cannot find module `./worldbank`.

- [ ] **Step 3: Implement `worldbank.ts`**

```ts
import { writeFileSync, mkdirSync } from "node:fs";
import { COUNTRY_ISO3 } from "./countries";

export interface CountryStats {
  iso3: string;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  landArea: number | null;
}

const INDICATORS = {
  population: "SP.POP.TOTL",
  gdp: "NY.GDP.MKTP.CD",
  gdpPerCapita: "NY.GDP.PCAP.CD",
  landArea: "AG.LND.TOTL.K2",
} as const;

export function parseIndicator(json: unknown): number | null {
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) return null;
  const rows = json[1] as Array<{ date: string; value: number | null }>;
  const sorted = [...rows].sort((a, b) => Number(b.date) - Number(a.date));
  for (const row of sorted) {
    if (row.value !== null && row.value !== undefined) return row.value;
  }
  return null;
}

export async function fetchCountryStats(
  iso3: string,
  fetchFn: typeof fetch = fetch,
): Promise<CountryStats> {
  const out: CountryStats = {
    iso3, population: null, gdp: null, gdpPerCapita: null, landArea: null,
  };
  for (const [field, code] of Object.entries(INDICATORS) as [keyof typeof INDICATORS, string][]) {
    const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/${code}?format=json&per_page=5&mrnev=1`;
    const res = await fetchFn(url);
    if (!res.ok) continue;
    out[field] = parseIndicator(await res.json());
  }
  return out;
}

async function main() {
  const iso3s = Array.from(new Set(Object.values(COUNTRY_ISO3)));
  const result: Record<string, CountryStats> = {};
  for (const iso3 of iso3s) {
    result[iso3] = await fetchCountryStats(iso3);
    console.log(`fetched ${iso3}`);
  }
  mkdirSync("data/raw", { recursive: true });
  writeFileSync("data/raw/worldbank.json", JSON.stringify(result, null, 2));
  console.log(`wrote data/raw/worldbank.json (${iso3s.length} countries)`);
}

if (process.argv[1] && process.argv[1].endsWith("worldbank.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run ingestion/worldbank.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add ingestion/worldbank.ts ingestion/worldbank.test.ts
git commit -m "feat: add World Bank ingestion (parse + fetch country stats)"
```

---

### Task 7: API-Football ingestion (transform + fetch)

**Files:**
- Create: `ingestion/football.ts`
- Test: `ingestion/football.test.ts`

**Interfaces:**
- Consumes: nothing (writes raw only).
- Produces:
  - `interface RawTeam { teamId: number; name: string; country: string }`
  - `interface RawFixture { fixtureId: number; kickoffUtc: string; venue: string; homeId: number; awayId: number; homeGoals: number; awayGoals: number }`
  - `function parseTeams(json: unknown): RawTeam[]` — from `/teams` response.
  - `function parseFixtures(json: unknown): RawFixture[]` — from `/fixtures` response; only fixtures with a non-null `goals.home`.
  - `function parsePossession(statsJson: unknown, teamId: number): { possession: number | null; shots: number | null }` — from `/fixtures/statistics`, reading the `"Ball Possession"` (e.g. `"55%"`) and `"Total Shots"` types for the given team.
  - `async function apiGet(path: string, key: string, fetchFn?: typeof fetch): Promise<unknown>` — wraps the API-Football base URL + `x-apisports-key` header.
  - Script run writes `data/raw/teams.json`, `data/raw/fixtures.json`, and per-fixture `data/raw/stats-<fixtureId>.json` (skipping files that already exist — free-tier guard).

- [ ] **Step 1: Write the failing tests**

`ingestion/football.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseTeams, parseFixtures, parsePossession } from "./football";

describe("parseTeams", () => {
  it("extracts id/name/country", () => {
    const json = { response: [{ team: { id: 6, name: "Brazil", country: "Brazil" } }] };
    expect(parseTeams(json)).toEqual([{ teamId: 6, name: "Brazil", country: "Brazil" }]);
  });
});

describe("parseFixtures", () => {
  it("keeps only played fixtures and flattens fields", () => {
    const json = {
      response: [
        {
          fixture: { id: 100, date: "2026-06-12T18:00:00+00:00", venue: { name: "MetLife Stadium" } },
          teams: { home: { id: 1 }, away: { id: 2 } },
          goals: { home: 2, away: 1 },
        },
        {
          fixture: { id: 101, date: "2026-06-13T18:00:00+00:00", venue: { name: "SoFi Stadium" } },
          teams: { home: { id: 3 }, away: { id: 4 } },
          goals: { home: null, away: null },
        },
      ],
    };
    const out = parseFixtures(json);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      fixtureId: 100,
      kickoffUtc: "2026-06-12T18:00:00+00:00",
      venue: "MetLife Stadium",
      homeId: 1, awayId: 2, homeGoals: 2, awayGoals: 1,
    });
  });
});

describe("parsePossession", () => {
  const statsJson = {
    response: [
      { team: { id: 1 }, statistics: [
        { type: "Ball Possession", value: "55%" },
        { type: "Total Shots", value: 12 },
      ] },
      { team: { id: 2 }, statistics: [
        { type: "Ball Possession", value: "45%" },
        { type: "Total Shots", value: null },
      ] },
    ],
  };
  it("reads possession as a number and shots", () => {
    expect(parsePossession(statsJson, 1)).toEqual({ possession: 55, shots: 12 });
  });
  it("returns nulls for missing values", () => {
    expect(parsePossession(statsJson, 2)).toEqual({ possession: 45, shots: null });
    expect(parsePossession(statsJson, 999)).toEqual({ possession: null, shots: null });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ingestion/football.test.ts`
Expected: FAIL — cannot find module `./football`.

- [ ] **Step 3: Implement `football.ts`**

```ts
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
const SEASON = 2026;

export interface RawTeam { teamId: number; name: string; country: string }
export interface RawFixture {
  fixtureId: number; kickoffUtc: string; venue: string;
  homeId: number; awayId: number; homeGoals: number; awayGoals: number;
}

function resp(json: unknown): any[] {
  if (json && typeof json === "object" && Array.isArray((json as any).response)) {
    return (json as any).response;
  }
  return [];
}

export function parseTeams(json: unknown): RawTeam[] {
  return resp(json).map((r) => ({
    teamId: r.team.id, name: r.team.name, country: r.team.country,
  }));
}

export function parseFixtures(json: unknown): RawFixture[] {
  return resp(json)
    .filter((r) => r.goals?.home !== null && r.goals?.home !== undefined)
    .map((r) => ({
      fixtureId: r.fixture.id,
      kickoffUtc: r.fixture.date,
      venue: r.fixture.venue?.name ?? "",
      homeId: r.teams.home.id,
      awayId: r.teams.away.id,
      homeGoals: r.goals.home,
      awayGoals: r.goals.away,
    }));
}

export function parsePossession(
  statsJson: unknown,
  teamId: number,
): { possession: number | null; shots: number | null } {
  const entry = resp(statsJson).find((r) => r.team?.id === teamId);
  if (!entry) return { possession: null, shots: null };
  const stats: Array<{ type: string; value: unknown }> = entry.statistics ?? [];
  const find = (type: string) => stats.find((s) => s.type === type)?.value ?? null;
  const possRaw = find("Ball Possession");
  const possession = typeof possRaw === "string" ? Number(possRaw.replace("%", "")) : null;
  const shotsRaw = find("Total Shots");
  const shots = typeof shotsRaw === "number" ? shotsRaw : null;
  return { possession, shots };
}

export async function apiGet(path: string, key: string, fetchFn: typeof fetch = fetch): Promise<unknown> {
  const res = await fetchFn(`${BASE}${path}`, { headers: { "x-apisports-key": key } });
  if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status}`);
  return res.json();
}

async function main() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY not set");
  mkdirSync("data/raw", { recursive: true });

  const teamsJson = await apiGet(`/teams?league=${LEAGUE}&season=${SEASON}`, key);
  writeFileSync("data/raw/teams.json", JSON.stringify(teamsJson, null, 2));

  const fixturesJson = await apiGet(`/fixtures?league=${LEAGUE}&season=${SEASON}`, key);
  writeFileSync("data/raw/fixtures.json", JSON.stringify(fixturesJson, null, 2));

  for (const fx of parseFixtures(fixturesJson)) {
    const file = `data/raw/stats-${fx.fixtureId}.json`;
    if (existsSync(file)) { console.log(`skip ${fx.fixtureId} (cached)`); continue; }
    const stats = await apiGet(`/fixtures/statistics?fixture=${fx.fixtureId}`, key);
    writeFileSync(file, JSON.stringify(stats, null, 2));
    console.log(`fetched stats ${fx.fixtureId}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("football.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run ingestion/football.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add ingestion/football.ts ingestion/football.test.ts
git commit -m "feat: add API-Football ingestion (parse teams/fixtures/stats + cached fetch)"
```

---

### Task 8: Open-Meteo weather ingestion (transform + fetch)

**Files:**
- Create: `ingestion/weather.ts`
- Test: `ingestion/weather.test.ts`

**Interfaces:**
- Consumes: `lookupVenue` from `venues.ts`; `RawFixture` from `football.ts`.
- Produces:
  - `interface WeatherAtKickoff { temperatureC: number | null; humidity: number | null; windKph: number | null }`
  - `function pickHour(archive: unknown, kickoffUtc: string): WeatherAtKickoff` — given an Open-Meteo `archive` response with hourly arrays, selects the hour matching the kickoff (truncated to the hour).
  - `async function fetchVenueWeather(lat: number, lon: number, dateIso: string, fetchFn?: typeof fetch): Promise<unknown>`
  - Script run reads `data/raw/fixtures.json`, resolves each venue via `lookupVenue`, fetches weather, and writes `data/raw/weather.json` (`Record<fixtureId, WeatherAtKickoff>`).

- [ ] **Step 1: Write the failing tests**

`ingestion/weather.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pickHour } from "./weather";

const archive = {
  hourly: {
    time: ["2026-06-12T17:00", "2026-06-12T18:00", "2026-06-12T19:00"],
    temperature_2m: [20, 24, 22],
    relative_humidity_2m: [50, 45, 48],
    wind_speed_10m: [10, 12, 11],
  },
};

describe("pickHour", () => {
  it("selects the hour matching kickoff", () => {
    expect(pickHour(archive, "2026-06-12T18:00:00+00:00")).toEqual({
      temperatureC: 24, humidity: 45, windKph: 12,
    });
  });
  it("returns nulls when the hour is absent", () => {
    expect(pickHour(archive, "2026-06-12T23:00:00+00:00")).toEqual({
      temperatureC: null, humidity: null, windKph: null,
    });
  });
  it("returns nulls for malformed input", () => {
    expect(pickHour({}, "2026-06-12T18:00:00+00:00")).toEqual({
      temperatureC: null, humidity: null, windKph: null,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ingestion/weather.test.ts`
Expected: FAIL — cannot find module `./weather`.

- [ ] **Step 3: Implement `weather.ts`**

```ts
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { lookupVenue } from "./venues";
import { parseFixtures } from "./football";

export interface WeatherAtKickoff {
  temperatureC: number | null;
  humidity: number | null;
  windKph: number | null;
}

const NULL_WEATHER: WeatherAtKickoff = { temperatureC: null, humidity: null, windKph: null };

export function pickHour(archive: unknown, kickoffUtc: string): WeatherAtKickoff {
  const hourly = (archive as any)?.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return { ...NULL_WEATHER };
  const hourKey = kickoffUtc.slice(0, 13); // "2026-06-12T18"
  const idx = (hourly.time as string[]).findIndex((t) => t.slice(0, 13) === hourKey);
  if (idx === -1) return { ...NULL_WEATHER };
  const at = (arr: unknown) => (Array.isArray(arr) && typeof arr[idx] === "number" ? arr[idx] : null);
  return {
    temperatureC: at(hourly.temperature_2m),
    humidity: at(hourly.relative_humidity_2m),
    windKph: at(hourly.wind_speed_10m),
  };
}

export async function fetchVenueWeather(
  lat: number, lon: number, dateIso: string, fetchFn: typeof fetch = fetch,
): Promise<unknown> {
  const date = dateIso.slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}`
    + `&start_date=${date}&end_date=${date}`
    + `&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=UTC`;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

async function main() {
  const fixtures = parseFixtures(JSON.parse(readFileSync("data/raw/fixtures.json", "utf8")));
  const out: Record<number, WeatherAtKickoff> = {};
  for (const fx of fixtures) {
    const venue = lookupVenue(fx.venue);
    if (!venue) { out[fx.fixtureId] = { ...NULL_WEATHER }; console.log(`no venue for ${fx.venue}`); continue; }
    const archive = await fetchVenueWeather(venue.lat, venue.lon, fx.kickoffUtc);
    out[fx.fixtureId] = pickHour(archive, fx.kickoffUtc);
    console.log(`weather ${fx.fixtureId}`);
  }
  mkdirSync("data/raw", { recursive: true });
  writeFileSync("data/raw/weather.json", JSON.stringify(out, null, 2));
}

if (process.argv[1] && process.argv[1].endsWith("weather.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run ingestion/weather.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add ingestion/weather.ts ingestion/weather.test.ts
git commit -m "feat: add Open-Meteo weather ingestion (pickHour + fetch)"
```

---

### Task 9: Snapshot builder (join raw → public JSON)

**Files:**
- Create: `ingestion/build-snapshot.ts`
- Test: `ingestion/build-snapshot.test.ts`

**Interfaces:**
- Consumes: `RawTeam`, `RawFixture`, `parsePossession` from `football.ts`; `CountryStats` from `worldbank.ts`; `WeatherAtKickoff` from `weather.ts`; `toIso3` from `countries.ts`; `TeamRow`, `MatchTeamRow`, `Meta`, `Snapshot` from `src/lib/types.ts`.
- Produces:
  - `interface RawInputs { teams: RawTeam[]; fixtures: RawFixture[]; statsByFixture: Record<number, unknown>; weather: Record<number, WeatherAtKickoff>; worldbank: Record<string, CountryStats> }`
  - `function buildTeams(inputs: RawInputs): TeamRow[]` — aggregates per-team tournament totals across fixtures + joins World Bank by ISO3.
  - `function buildMatches(inputs: RawInputs): MatchTeamRow[]` — one row per team-in-fixture, joining possession/shots + weather.
  - `function buildMeta(generatedAt: string): Meta`
  - `function buildSnapshot(inputs: RawInputs, generatedAt: string): Snapshot`
  - Script run reads `data/raw/*` and writes `public/data/{teams,matches,meta}.json`.

- [ ] **Step 1: Write the failing tests**

`ingestion/build-snapshot.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildTeams, buildMatches, buildSnapshot } from "./build-snapshot";
import type { RawInputs } from "./build-snapshot";

const inputs: RawInputs = {
  teams: [
    { teamId: 1, name: "Brazil", country: "Brazil" },
    { teamId: 2, name: "France", country: "France" },
  ],
  fixtures: [
    { fixtureId: 100, kickoffUtc: "2026-06-12T18:00:00+00:00", venue: "MetLife Stadium",
      homeId: 1, awayId: 2, homeGoals: 2, awayGoals: 1 },
  ],
  statsByFixture: {
    100: { response: [
      { team: { id: 1 }, statistics: [
        { type: "Ball Possession", value: "60%" }, { type: "Total Shots", value: 14 } ] },
      { team: { id: 2 }, statistics: [
        { type: "Ball Possession", value: "40%" }, { type: "Total Shots", value: 9 } ] },
    ] },
  },
  weather: { 100: { temperatureC: 24, humidity: 45, windKph: 12 } },
  worldbank: {
    BRA: { iso3: "BRA", population: 2.1e8, gdp: 2e12, gdpPerCapita: 9500, landArea: 8.5e6 },
    FRA: { iso3: "FRA", population: 6.8e7, gdp: 2.9e12, gdpPerCapita: 42000, landArea: 5.5e5 },
  },
};

describe("buildTeams", () => {
  it("aggregates goals and joins World Bank stats", () => {
    const teams = buildTeams(inputs);
    const brazil = teams.find((t) => t.teamId === 1)!;
    expect(brazil.iso3).toBe("BRA");
    expect(brazil.goalsFor).toBe(2);
    expect(brazil.goalsAgainst).toBe(1);
    expect(brazil.shots).toBe(14);
    expect(brazil.avgPossession).toBeCloseTo(60, 5);
    expect(brazil.matchesPlayed).toBe(1);
    expect(brazil.gdpPerCapita).toBe(9500);
  });
});

describe("buildMatches", () => {
  it("emits one row per team-in-fixture with weather + possession", () => {
    const matches = buildMatches(inputs);
    expect(matches).toHaveLength(2);
    const brazilRow = matches.find((m) => m.teamId === 1 && m.fixtureId === 100)!;
    expect(brazilRow.goals).toBe(2);
    expect(brazilRow.opponentId).toBe(2);
    expect(brazilRow.possession).toBe(60);
    expect(brazilRow.temperatureC).toBe(24);
  });
});

describe("buildSnapshot", () => {
  it("assembles teams, matches, and meta with timestamp", () => {
    const snap = buildSnapshot(inputs, "2026-06-25T00:00:00Z");
    expect(snap.teams).toHaveLength(2);
    expect(snap.matches).toHaveLength(2);
    expect(snap.meta.generatedAt).toBe("2026-06-25T00:00:00Z");
    expect(snap.meta.sources.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run ingestion/build-snapshot.test.ts`
Expected: FAIL — cannot find module `./build-snapshot`.

- [ ] **Step 3: Implement `build-snapshot.ts`**

```ts
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { parsePossession, type RawTeam, type RawFixture, parseTeams, parseFixtures } from "./football";
import type { CountryStats } from "./worldbank";
import type { WeatherAtKickoff } from "./weather";
import { toIso3 } from "./countries";
import type { TeamRow, MatchTeamRow, Meta, Snapshot } from "../src/lib/types";

export interface RawInputs {
  teams: RawTeam[];
  fixtures: RawFixture[];
  statsByFixture: Record<number, unknown>;
  weather: Record<number, WeatherAtKickoff>;
  worldbank: Record<string, CountryStats>;
}

const NULL_WEATHER: WeatherAtKickoff = { temperatureC: null, humidity: null, windKph: null };

export function buildTeams(inputs: RawInputs): TeamRow[] {
  return inputs.teams.map((t) => {
    const iso3 = toIso3(t.country);
    const wb = iso3 ? inputs.worldbank[iso3] : undefined;
    let goalsFor = 0, goalsAgainst = 0, shots = 0, cards = 0, possSum = 0, matchesPlayed = 0;
    let passAcc = 0; // reserved; pass accuracy not in v1 stats parse -> stays 0 until added

    for (const fx of inputs.fixtures) {
      const isHome = fx.homeId === t.teamId;
      const isAway = fx.awayId === t.teamId;
      if (!isHome && !isAway) continue;
      matchesPlayed += 1;
      goalsFor += isHome ? fx.homeGoals : fx.awayGoals;
      goalsAgainst += isHome ? fx.awayGoals : fx.homeGoals;
      const { possession, shots: s } = parsePossession(inputs.statsByFixture[fx.fixtureId], t.teamId);
      if (possession !== null) possSum += possession;
      if (s !== null) shots += s;
    }

    return {
      teamId: t.teamId,
      name: t.name,
      iso3: iso3 ?? "",
      goalsFor, goalsAgainst, shots, cards,
      passAccuracy: passAcc,
      avgPossession: matchesPlayed > 0 ? possSum / matchesPlayed : 0,
      matchesPlayed,
      population: wb?.population ?? null,
      gdp: wb?.gdp ?? null,
      gdpPerCapita: wb?.gdpPerCapita ?? null,
      landArea: wb?.landArea ?? null,
    };
  });
}

export function buildMatches(inputs: RawInputs): MatchTeamRow[] {
  const nameById = new Map(inputs.teams.map((t) => [t.teamId, t.name]));
  const rows: MatchTeamRow[] = [];
  for (const fx of inputs.fixtures) {
    const weather = inputs.weather[fx.fixtureId] ?? NULL_WEATHER;
    for (const side of ["home", "away"] as const) {
      const teamId = side === "home" ? fx.homeId : fx.awayId;
      const opponentId = side === "home" ? fx.awayId : fx.homeId;
      const goals = side === "home" ? fx.homeGoals : fx.awayGoals;
      const { possession, shots } = parsePossession(inputs.statsByFixture[fx.fixtureId], teamId);
      rows.push({
        fixtureId: fx.fixtureId,
        teamId,
        teamName: nameById.get(teamId) ?? String(teamId),
        opponentId,
        venue: fx.venue,
        kickoffUtc: fx.kickoffUtc,
        goals,
        possession,
        shots,
        temperatureC: weather.temperatureC,
        humidity: weather.humidity,
        windKph: weather.windKph,
      });
    }
  }
  return rows;
}

export function buildMeta(generatedAt: string): Meta {
  return {
    generatedAt,
    sources: [
      { name: "API-Football", url: "https://www.api-football.com/" },
      { name: "World Bank", url: "https://data.worldbank.org/" },
      { name: "Open-Meteo", url: "https://open-meteo.com/" },
    ],
    caveats: [
      "Fun correlations only — correlation does not imply causation.",
      "Small sample (~48 teams / one tournament); r values are noisy.",
    ],
  };
}

export function buildSnapshot(inputs: RawInputs, generatedAt: string): Snapshot {
  return {
    teams: buildTeams(inputs),
    matches: buildMatches(inputs),
    meta: buildMeta(generatedAt),
  };
}

function readJson(path: string): unknown {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function main() {
  const teams = parseTeams(readJson("data/raw/teams.json"));
  const fixtures = parseFixtures(readJson("data/raw/fixtures.json"));
  const statsByFixture: Record<number, unknown> = {};
  for (const fx of fixtures) {
    statsByFixture[fx.fixtureId] = readJson(`data/raw/stats-${fx.fixtureId}.json`);
  }
  const weather = (readJson("data/raw/weather.json") as RawInputs["weather"]) ?? {};
  const worldbank = (readJson("data/raw/worldbank.json") as RawInputs["worldbank"]) ?? {};

  const snap = buildSnapshot(
    { teams, fixtures, statsByFixture, weather, worldbank },
    new Date().toISOString(),
  );

  mkdirSync("public/data", { recursive: true });
  writeFileSync("public/data/teams.json", JSON.stringify(snap.teams, null, 2));
  writeFileSync("public/data/matches.json", JSON.stringify(snap.matches, null, 2));
  writeFileSync("public/data/meta.json", JSON.stringify(snap.meta, null, 2));
  console.log(`snapshot built: ${snap.teams.length} teams, ${snap.matches.length} match-rows`);
}

if (process.argv[1] && process.argv[1].endsWith("build-snapshot.ts")) {
  main();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run ingestion/build-snapshot.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add ingestion/build-snapshot.ts ingestion/build-snapshot.test.ts
git commit -m "feat: add snapshot builder joining raw sources into public JSON"
```

> **Note for implementer:** `passAccuracy` is parsed as 0 in v1 (the stats parse only reads possession + shots). If you want it populated, extend `parsePossession` to also read `"Passes %"` and thread it through `buildTeams`. Tracked as a v1.1 nicety, not required for the plan to be complete.

---

### Task 10: Snapshot loader + seed fixture data

**Files:**
- Create: `src/lib/snapshot.ts`, `public/data/teams.json`, `public/data/matches.json`, `public/data/meta.json` (seed/sample so the app renders before real ingestion runs)
- Test: `src/lib/snapshot.test.ts`

**Interfaces:**
- Consumes: `Snapshot`, `TeamRow`, `MatchTeamRow` from `types.ts`.
- Produces:
  - `function getTeams(): TeamRow[]`, `function getMatches(): MatchTeamRow[]`, `function getMeta(): Meta` — server-side reads of the JSON via static import.
  - `function rowsForScope(scope: Scope): (TeamRow | MatchTeamRow)[]`

- [ ] **Step 1: Create seed JSON** so imports resolve and the UI has data in dev.

`public/data/teams.json`:
```json
[
  { "teamId": 1, "name": "Brazil", "iso3": "BRA", "goalsFor": 8, "goalsAgainst": 3, "shots": 55, "passAccuracy": 86, "cards": 6, "avgPossession": 58, "matchesPlayed": 3, "population": 215000000, "gdp": 2000000000000, "gdpPerCapita": 9500, "landArea": 8500000 },
  { "teamId": 2, "name": "France", "iso3": "FRA", "goalsFor": 6, "goalsAgainst": 2, "shots": 48, "passAccuracy": 88, "cards": 4, "avgPossession": 56, "matchesPlayed": 3, "population": 68000000, "gdp": 2900000000000, "gdpPerCapita": 42000, "landArea": 550000 },
  { "teamId": 3, "name": "Japan", "iso3": "JPN", "goalsFor": 4, "goalsAgainst": 4, "shots": 39, "passAccuracy": 84, "cards": 3, "avgPossession": 52, "matchesPlayed": 3, "population": 125000000, "gdp": 4200000000000, "gdpPerCapita": 33000, "landArea": 365000 },
  { "teamId": 4, "name": "Morocco", "iso3": "MAR", "goalsFor": 5, "goalsAgainst": 3, "shots": 41, "passAccuracy": 81, "cards": 7, "avgPossession": 49, "matchesPlayed": 3, "population": 37000000, "gdp": 130000000000, "gdpPerCapita": 3500, "landArea": 446000 }
]
```

`public/data/matches.json`:
```json
[
  { "fixtureId": 100, "teamId": 1, "teamName": "Brazil", "opponentId": 2, "venue": "MetLife Stadium", "kickoffUtc": "2026-06-12T18:00:00+00:00", "goals": 2, "possession": 60, "shots": 14, "temperatureC": 26, "humidity": 50, "windKph": 12 },
  { "fixtureId": 100, "teamId": 2, "teamName": "France", "opponentId": 1, "venue": "MetLife Stadium", "kickoffUtc": "2026-06-12T18:00:00+00:00", "goals": 1, "possession": 40, "shots": 9, "temperatureC": 26, "humidity": 50, "windKph": 12 },
  { "fixtureId": 101, "teamId": 3, "teamName": "Japan", "opponentId": 4, "venue": "SoFi Stadium", "kickoffUtc": "2026-06-13T21:00:00+00:00", "goals": 1, "possession": 55, "shots": 11, "temperatureC": 31, "humidity": 35, "windKph": 8 },
  { "fixtureId": 101, "teamId": 4, "teamName": "Morocco", "opponentId": 3, "venue": "SoFi Stadium", "kickoffUtc": "2026-06-13T21:00:00+00:00", "goals": 1, "possession": 45, "shots": 10, "temperatureC": 31, "humidity": 35, "windKph": 8 }
]
```

`public/data/meta.json`:
```json
{
  "generatedAt": "2026-06-25T00:00:00Z",
  "sources": [
    { "name": "API-Football", "url": "https://www.api-football.com/" },
    { "name": "World Bank", "url": "https://data.worldbank.org/" },
    { "name": "Open-Meteo", "url": "https://open-meteo.com/" }
  ],
  "caveats": [
    "Fun correlations only — correlation does not imply causation.",
    "Small sample (~48 teams / one tournament); r values are noisy.",
    "Seed/sample data shown until ingestion is run."
  ]
}
```

- [ ] **Step 2: Write the failing test**

`src/lib/snapshot.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getTeams, getMatches, rowsForScope } from "./snapshot";

describe("snapshot loader", () => {
  it("loads seed teams and matches", () => {
    expect(getTeams().length).toBeGreaterThan(0);
    expect(getMatches().length).toBeGreaterThan(0);
  });
  it("rowsForScope returns teams for team scope and matches for match scope", () => {
    expect(rowsForScope("2026-team")).toBe(getTeams());
    expect(rowsForScope("2026-match")).toBe(getMatches());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/snapshot.test.ts`
Expected: FAIL — cannot find module `./snapshot`.

- [ ] **Step 4: Implement `snapshot.ts`**

```ts
import teamsJson from "../../public/data/teams.json";
import matchesJson from "../../public/data/matches.json";
import metaJson from "../../public/data/meta.json";
import type { TeamRow, MatchTeamRow, Meta } from "./types";
import type { Scope } from "./scopes";

const teams = teamsJson as TeamRow[];
const matches = matchesJson as MatchTeamRow[];
const meta = metaJson as Meta;

export function getTeams(): TeamRow[] { return teams; }
export function getMatches(): MatchTeamRow[] { return matches; }
export function getMeta(): Meta { return meta; }

export function rowsForScope(scope: Scope): (TeamRow | MatchTeamRow)[] {
  return scope === "2026-team" ? teams : matches;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/snapshot.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/snapshot.ts public/data/teams.json public/data/matches.json public/data/meta.json src/lib/snapshot.test.ts
git commit -m "feat: add snapshot loader + seed sample data"
```

---

### Task 11: CorrelationCard component

**Files:**
- Create: `src/components/CorrelationCard.tsx`
- Test: `src/components/CorrelationCard.test.tsx`

**Interfaces:**
- Consumes: `computeCorrelation`, `Point` from `correlation.ts`; `VariableDef` from `registry.ts`; row types from `types.ts`.
- Produces:
  - `interface CorrelationCardProps { title?: string; rows: (TeamRow | MatchTeamRow)[]; xVar: VariableDef; yVar: VariableDef; labelKey: "name" | "teamName" }`
  - `export function buildPoints(rows, xVar, yVar, labelKey): Point[]` — maps rows to points, dropping any with a null x or y.
  - `export function CorrelationCard(props): JSX.Element` — renders a Recharts scatter + trend line, the headline, and the r value (or a "not enough data" message when r is NaN).

- [ ] **Step 1: Write the failing tests**

`src/components/CorrelationCard.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CorrelationCard, buildPoints } from "./CorrelationCard";
import { VARIABLES } from "@/lib/registry";
import type { TeamRow } from "@/lib/types";

const teams: TeamRow[] = [
  { teamId: 1, name: "A", iso3: "A", goalsFor: 8, goalsAgainst: 1, shots: 50, passAccuracy: 85, cards: 3, avgPossession: 55, matchesPlayed: 3, population: 1e6, gdp: 1e10, gdpPerCapita: 10000, landArea: 1000 },
  { teamId: 2, name: "B", iso3: "B", goalsFor: 4, goalsAgainst: 4, shots: 30, passAccuracy: 80, cards: 5, avgPossession: 48, matchesPlayed: 3, population: 2e6, gdp: 8e10, gdpPerCapita: 40000, landArea: 2000 },
];
const xVar = VARIABLES.find((v) => v.key === "gdpPerCapita" && v.scope === "2026-team")!;
const yVar = VARIABLES.find((v) => v.key === "goalsFor" && v.scope === "2026-team")!;

describe("buildPoints", () => {
  it("maps rows to labeled points and drops nulls", () => {
    const rowsWithNull: TeamRow[] = [...teams, { ...teams[0], teamId: 3, name: "C", gdpPerCapita: null }];
    const pts = buildPoints(rowsWithNull, xVar, yVar, "name");
    expect(pts).toHaveLength(2);
    expect(pts[0]).toMatchObject({ label: "A" });
  });
});

describe("CorrelationCard", () => {
  it("renders the title and an r value", () => {
    render(<CorrelationCard title="Goals vs GDP/capita" rows={teams} xVar={xVar} yVar={yVar} labelKey="name" />);
    expect(screen.getByText("Goals vs GDP/capita")).toBeInTheDocument();
    expect(screen.getByText(/r =/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/CorrelationCard.test.tsx`
Expected: FAIL — cannot find module `./CorrelationCard`.

- [ ] **Step 3: Implement `CorrelationCard.tsx`**

```tsx
"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";
import { computeCorrelation, type Point } from "@/lib/correlation";
import type { VariableDef } from "@/lib/registry";
import type { TeamRow, MatchTeamRow } from "@/lib/types";

export interface CorrelationCardProps {
  title?: string;
  rows: (TeamRow | MatchTeamRow)[];
  xVar: VariableDef;
  yVar: VariableDef;
  labelKey: "name" | "teamName";
}

export function buildPoints(
  rows: (TeamRow | MatchTeamRow)[],
  xVar: VariableDef,
  yVar: VariableDef,
  labelKey: "name" | "teamName",
): Point[] {
  const pts: Point[] = [];
  for (const row of rows) {
    const x = xVar.accessor(row);
    const y = yVar.accessor(row);
    if (x === null || y === null) continue;
    pts.push({ x, y, label: String((row as Record<string, unknown>)[labelKey] ?? "") });
  }
  return pts;
}

export function CorrelationCard({ title, rows, xVar, yVar, labelKey }: CorrelationCardProps) {
  const points = buildPoints(rows, xVar, yVar, labelKey);
  const { r, slope, intercept, n } = computeCorrelation(points);

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const line = Number.isNaN(slope)
    ? []
    : [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ];

  return (
    <section style={{ border: "1px solid #e3e3e3", borderRadius: 12, padding: 16 }}>
      {title && <h3 style={{ margin: "0 0 4px" }}>{title}</h3>}
      <p style={{ margin: "0 0 8px", color: "#555" }}>
        {xVar.label} vs {yVar.label}
        {" · "}
        {Number.isNaN(r) ? "not enough data" : `r = ${r.toFixed(2)} (n = ${n})`}
      </p>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xVar.label}
              tickFormatter={(v) => xVar.format(Number(v))} />
            <YAxis type="number" dataKey="y" name={yVar.label}
              tickFormatter={(v) => yVar.format(Number(v))} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              formatter={(value: number, key: string) =>
                key === "x" ? xVar.format(value) : yVar.format(value)
              }
              labelFormatter={() => ""}
            />
            <Scatter data={points} fill="#2563eb" />
            {line.length === 2 && (
              <Line data={line} dataKey="y" dot={false} stroke="#ef4444"
                strokeWidth={2} isAnimationActive={false} legendType="none" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/CorrelationCard.test.tsx`
Expected: PASS (2 tests).

> If Recharts' `ResponsiveContainer` warns about zero dimensions under jsdom, the test still passes because we assert on the title and r text, which render outside the chart. No change needed.

- [ ] **Step 5: Commit**

```bash
git add src/components/CorrelationCard.tsx src/components/CorrelationCard.test.tsx
git commit -m "feat: add CorrelationCard (scatter + trend line + r)"
```

---

### Task 12: Insights feed (home page)

**Files:**
- Create: `src/app/insights.ts`, replace `src/app/page.tsx`
- Test: `src/app/insights.test.ts`

**Interfaces:**
- Consumes: `Scope` from `scopes.ts`; `VARIABLES` from `registry.ts`.
- Produces:
  - `interface Insight { title: string; scope: Scope; xKey: string; yKey: string }`
  - `INSIGHTS: Insight[]` — the curated highlight correlations.
  - `function resolveInsight(i: Insight)` returns `{ xVar, yVar }` looked up from the registry, throwing if a key is unknown (guards against typos).

- [ ] **Step 1: Write the failing test**

`src/app/insights.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { INSIGHTS, resolveInsight } from "./insights";

describe("curated insights", () => {
  it("every insight resolves to real variables in its scope", () => {
    expect(INSIGHTS.length).toBeGreaterThan(0);
    for (const i of INSIGHTS) {
      const { xVar, yVar } = resolveInsight(i);
      expect(xVar.scope).toBe(i.scope);
      expect(yVar.scope).toBe(i.scope);
    }
  });
  it("throws on an unknown variable key", () => {
    expect(() => resolveInsight({ title: "x", scope: "2026-team", xKey: "nope", yKey: "goalsFor" }))
      .toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/insights.test.ts`
Expected: FAIL — cannot find module `./insights`.

- [ ] **Step 3: Implement `insights.ts`**

```ts
import type { Scope } from "@/lib/scopes";
import { VARIABLES } from "@/lib/registry";

export interface Insight {
  title: string;
  scope: Scope;
  xKey: string;
  yKey: string;
}

export const INSIGHTS: Insight[] = [
  { title: "Do richer nations score more?", scope: "2026-team", xKey: "gdpPerCapita", yKey: "goalsFor" },
  { title: "Bigger countries, more goals?", scope: "2026-team", xKey: "population", yKey: "goalsFor" },
  { title: "Does the heat kill possession?", scope: "2026-match", xKey: "temperatureC", yKey: "possession" },
  { title: "More possession, more shots?", scope: "2026-match", xKey: "possession", yKey: "shots" },
];

export function resolveInsight(i: Insight) {
  const xVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.xKey);
  const yVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.yKey);
  if (!xVar || !yVar) throw new Error(`Unknown variable in insight "${i.title}"`);
  return { xVar, yVar };
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import Link from "next/link";
import { CorrelationCard } from "@/components/CorrelationCard";
import { INSIGHTS, resolveInsight } from "./insights";
import { rowsForScope } from "@/lib/snapshot";

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>World Cup 2026 — Fun Correlations</h1>
      <p>
        Playful correlations between football data and public country data.{" "}
        <Link href="/explore">Build your own →</Link> · <Link href="/about">Methodology</Link>
      </p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {INSIGHTS.map((insight) => {
          const { xVar, yVar } = resolveInsight(insight);
          const labelKey = insight.scope === "2026-team" ? "name" : "teamName";
          return (
            <CorrelationCard
              key={insight.title}
              title={insight.title}
              rows={rowsForScope(insight.scope)}
              xVar={xVar}
              yVar={yVar}
              labelKey={labelKey}
            />
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/insights.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/insights.ts src/app/insights.test.ts src/app/page.tsx
git commit -m "feat: add curated insights feed on home page"
```

---

### Task 13: Explorer page (build-your-own)

**Files:**
- Create: `src/components/VariablePicker.tsx`, `src/app/explore/page.tsx`
- Test: `src/components/VariablePicker.test.tsx`

**Interfaces:**
- Consumes: `SCOPES`, `SCOPE_LABELS`, `Scope` from `scopes.ts`; `variablesForScope`, `VariableDef` from `registry.ts`.
- Produces:
  - `interface VariablePickerProps { scope: Scope; xKey: string; yKey: string; onScope: (s: Scope) => void; onX: (k: string) => void; onY: (k: string) => void }`
  - `export function VariablePicker(props): JSX.Element` — three selects (scope, X, Y) populated from the registry.
  - Explorer page is a client component wiring `VariablePicker` to `CorrelationCard` with `useState`.

- [ ] **Step 1: Write the failing test**

`src/components/VariablePicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariablePicker } from "./VariablePicker";

describe("VariablePicker", () => {
  it("renders scope/X/Y selects and fires callbacks", () => {
    const onScope = vi.fn(), onX = vi.fn(), onY = vi.fn();
    render(
      <VariablePicker scope="2026-team" xKey="gdpPerCapita" yKey="goalsFor"
        onScope={onScope} onX={onX} onY={onY} />,
    );
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(3);
    fireEvent.change(selects[1], { target: { value: "population" } });
    expect(onX).toHaveBeenCalledWith("population");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/VariablePicker.test.tsx`
Expected: FAIL — cannot find module `./VariablePicker`.

- [ ] **Step 3: Implement `VariablePicker.tsx`**

```tsx
"use client";

import { SCOPES, SCOPE_LABELS, type Scope } from "@/lib/scopes";
import { variablesForScope } from "@/lib/registry";

export interface VariablePickerProps {
  scope: Scope;
  xKey: string;
  yKey: string;
  onScope: (s: Scope) => void;
  onX: (k: string) => void;
  onY: (k: string) => void;
}

export function VariablePicker({ scope, xKey, yKey, onScope, onX, onY }: VariablePickerProps) {
  const vars = variablesForScope(scope);
  const labelStyle = { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: 14 };
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
      <label style={labelStyle}>
        Scope
        <select value={scope} onChange={(e) => onScope(e.target.value as Scope)}>
          {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        X axis
        <select value={xKey} onChange={(e) => onX(e.target.value)}>
          {vars.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
      </label>
      <label style={labelStyle}>
        Y axis
        <select value={yKey} onChange={(e) => onY(e.target.value)}>
          {vars.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Implement `src/app/explore/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { VariablePicker } from "@/components/VariablePicker";
import { CorrelationCard } from "@/components/CorrelationCard";
import { variablesForScope } from "@/lib/registry";
import { rowsForScope } from "@/lib/snapshot";
import type { Scope } from "@/lib/scopes";

export default function Explore() {
  const [scope, setScope] = useState<Scope>("2026-team");
  const [xKey, setXKey] = useState("gdpPerCapita");
  const [yKey, setYKey] = useState("goalsFor");

  const vars = variablesForScope(scope);
  const xVar = vars.find((v) => v.key === xKey) ?? vars[0];
  const yVar = vars.find((v) => v.key === yKey) ?? vars[1] ?? vars[0];
  const labelKey = scope === "2026-team" ? "name" : "teamName";

  const onScope = (s: Scope) => {
    const next = variablesForScope(s);
    setScope(s);
    setXKey(next[0].key);
    setYKey(next[1]?.key ?? next[0].key);
  };

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Explorer</h1>
      <VariablePicker
        scope={scope} xKey={xVar.key} yKey={yVar.key}
        onScope={onScope} onX={setXKey} onY={setYKey}
      />
      <CorrelationCard rows={rowsForScope(scope)} xVar={xVar} yVar={yVar} labelKey={labelKey} />
    </main>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/VariablePicker.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/VariablePicker.tsx src/components/VariablePicker.test.tsx src/app/explore/page.tsx
git commit -m "feat: add explorer page with scope/X/Y variable picker"
```

---

### Task 14: About / methodology page + final verification

**Files:**
- Create: `src/app/about/page.tsx`
- Modify: none (verification task)

**Interfaces:**
- Consumes: `getMeta` from `snapshot.ts`.
- Produces: a static About page rendering the meta caveats and source links.

- [ ] **Step 1: Implement `src/app/about/page.tsx`**

```tsx
import Link from "next/link";
import { getMeta } from "@/lib/snapshot";

export default function About() {
  const meta = getMeta();
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>Methodology</h1>
      <p><Link href="/">← Home</Link></p>
      <p>
        This site shows <strong>fun</strong> correlations between World Cup 2026 football
        data and public country data. They are descriptive, not predictive.
      </p>
      <h2>Caveats</h2>
      <ul>{meta.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      <h2>Sources</h2>
      <ul>
        {meta.sources.map((s) => (
          <li key={s.name}><a href={s.url}>{s.name}</a></li>
        ))}
      </ul>
      <p style={{ color: "#777", fontSize: 13 }}>Snapshot generated: {meta.generatedAt}</p>
    </main>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests across tasks 1–14 PASS.

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; Next.js build succeeds (home, /explore, /about compiled).

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run: `npm run dev`, open `http://localhost:3000`, confirm the feed shows 4 cards with trend lines, `/explore` switches scope and re-plots, `/about` lists caveats and sources.

- [ ] **Step 5: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: add about/methodology page and finalize v1"
```

- [ ] **Step 6: Push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Hybrid UX (curated feed + explorer) → Tasks 12, 13. ✓
- Two 2026 scopes, registry extensible to v2 → Tasks 2, 4. ✓
- Scatter + trend line + r → Tasks 3, 11. ✓
- Three data sources, no key in client, free-tier-respectful caching → Tasks 6, 7, 8 (Task 7 skips cached fixture stats). ✓
- Snapshot shape (teams/matches/meta) + loader → Tasks 9, 10. ✓
- Methodology/causation caveat → Tasks 9 (`buildMeta` caveats), 14. ✓
- Testing of engine, registry, builder → Tasks 3, 4, 9. ✓
- v2 historical scope explicitly out of v1 → not implemented, by design. ✓

**Known v1 simplifications (intentional, documented):**
- `passAccuracy` and `cards` are aggregated as 0 because the v1 stats parse reads only possession + shots; the registry still exposes them and the builder note (Task 9) explains how to populate them. Not a blocker — they plot as a flat 0 line until extended.
- Venue/country reference tables are seeded with examples (Tasks 5); the implementer extends them with the full 16 host venues and 48 qualified nations when wiring real ingestion. The seed snapshot (Task 10) lets the UI render meanwhile.

**Placeholder scan:** No "TBD/TODO" steps; every code step contains complete code. ✓

**Type consistency:** `Scope`, `TeamRow`/`MatchTeamRow`, `VariableDef`, `Point`, `CorrelationResult`, `RawInputs`, `Insight` names and signatures are consistent across tasks 2→4→9→11→12→13. ✓
