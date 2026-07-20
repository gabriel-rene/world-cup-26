# Momentum Waves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An animated, top-down "momentum tide" visualization of 4 showcase WC 2022 matches, driven by FotMob per-minute momentum, at `/waves` in the existing Next.js app.

**Architecture:** Build-time ingestion parses each FotMob match page's `__NEXT_DATA__` embed into a small committed JSON per match under `public/data/waves/`. The app statically imports those files. A WebGL2 fragment shader renders two team-colored waters meeting at a front positioned by the smoothed momentum value at the current playback minute; goals fire ripples. All FotMob fragility is confined to build time.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict, vitest + testing-library (jsdom), raw WebGL2 (no new dependencies), tsx for ingestion scripts.

**Spec:** `docs/superpowers/specs/2026-07-19-momentum-waves-design.md` (read it first).

## Global Constraints

- **No new npm dependencies.** Raw WebGL2, plain SVG, existing tooling only.
- TypeScript `strict: true`; path alias `@/*` → `./src/*` (works in vitest via `vitest.config.ts`).
- Tests are colocated next to sources (`foo.ts` + `foo.test.ts`), vitest environment is jsdom with globals enabled.
- Run tests with `npx vitest run <file>` (or `npm test` for the whole suite).
- Ingestion scripts live in `ingestion/`, run via `tsx`, write raw caches to `data/raw/` (gitignored) and app data to `public/data/` (committed). They never run in the browser.
- Momentum sign convention everywhere: **positive = home team**, values normalized to **[-1, 1]**.
- The 4 showcase matches and their verified FotMob ids (home team first, as FotMob has them): Japan–Spain `3854589`, Croatia–Brazil `3370565`, Netherlands–Argentina `3370566`, Argentina–France `3370572`.
- Commit after every task with the message given in the task. Work happens on branch `feat/v1.3-momentum-waves` (create it in Task 1, Step 0: `git checkout -b feat/v1.3-momentum-waves`).

---

### Task 1: Wave types, showcase config, and FotMob parsers

**Files:**
- Create: `src/lib/waves-types.ts`
- Create: `ingestion/waves-config.ts`
- Create: `ingestion/fotmob.ts` (parse functions only; the fetch script is Task 2)
- Test: `ingestion/fotmob.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `src/lib/waves-types.ts` exports `WaveTeam { name; code; color }`, `MomentumPoint { minute: number; value: number }`, `WaveGoal { minute; side: "home"|"away"; player; scoreAfter: [number, number] }`, `WaveMatch { matchId; fotmobId; stage; kickoff; venue; home: WaveTeam; away: WaveTeam; score: [number, number]; penalties: [number, number] | null; momentum: MomentumPoint[]; goals: WaveGoal[] }`.
  - `ingestion/waves-config.ts` exports `WaveMatchConfig` and `WAVE_MATCHES: WaveMatchConfig[]` (4 entries).
  - `ingestion/fotmob.ts` exports `extractNextData(html: string): unknown` and `parseWaveMatch(nextData: unknown, cfg: WaveMatchConfig): WaveMatch`.

- [ ] **Step 0: Create the feature branch**

```bash
git checkout -b feat/v1.3-momentum-waves
```

- [ ] **Step 1: Write the shared types and config** (data + types have no behavior to TDD; their test comes with the parser tests)

`src/lib/waves-types.ts`:

```ts
export interface WaveTeam {
  name: string;
  code: string; // ISO 3166 alpha-3, feeds flagEmoji()
  color: string; // curated hex, e.g. "#7cc4ff"
}

export interface MomentumPoint {
  minute: number;
  value: number; // [-1, 1], positive = home
}

export interface WaveGoal {
  minute: number;
  side: "home" | "away";
  player: string;
  scoreAfter: [number, number];
}

export interface WaveMatch {
  matchId: string; // our slug, e.g. "arg-fra-final"
  fotmobId: string;
  stage: string;
  kickoff: string; // ISO datetime
  venue: string;
  home: WaveTeam;
  away: WaveTeam;
  score: [number, number]; // after extra time if played
  penalties: [number, number] | null;
  momentum: MomentumPoint[];
  goals: WaveGoal[];
}
```

`ingestion/waves-config.ts`:

```ts
export interface WaveMatchConfig {
  slug: string;
  fotmobId: string;
  pageUrl: string; // path on fotmob.com (server ignores the #fragment)
  stage: string;
  home: { code: string; color: string };
  away: { code: string; color: string };
}

// Curated team colors: one hex per team, picked for contrast against the
// dark water background and against each other within a match.
export const WAVE_MATCHES: WaveMatchConfig[] = [
  {
    slug: "jpn-esp-group",
    fotmobId: "3854589",
    pageUrl: "/matches/japan-vs-spain/1hqney",
    stage: "Group E",
    home: { code: "JPN", color: "#e05568" },
    away: { code: "ESP", color: "#f2c14e" },
  },
  {
    slug: "cro-bra-qf",
    fotmobId: "3370565",
    pageUrl: "/matches/brazil-vs-croatia/2swyz6",
    stage: "Quarter-final",
    home: { code: "HRV", color: "#e8ecf4" },
    away: { code: "BRA", color: "#ffd23f" },
  },
  {
    slug: "ned-arg-qf",
    fotmobId: "3370566",
    pageUrl: "/matches/argentina-vs-netherlands/1hklvd",
    stage: "Quarter-final",
    home: { code: "NLD", color: "#ff8228" },
    away: { code: "ARG", color: "#7cc4ff" },
  },
  {
    slug: "arg-fra-final",
    fotmobId: "3370572",
    pageUrl: "/matches/argentina-vs-france/1hox8a",
    stage: "Final",
    home: { code: "ARG", color: "#7cc4ff" },
    away: { code: "FRA", color: "#3454d1" },
  },
];
```

- [ ] **Step 2: Write the failing parser tests**

`ingestion/fotmob.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractNextData, parseWaveMatch } from "./fotmob";
import { WAVE_MATCHES, type WaveMatchConfig } from "./waves-config";

const cfg: WaveMatchConfig = {
  slug: "test-final", fotmobId: "111", pageUrl: "/matches/a-vs-b/xyz", stage: "Final",
  home: { code: "ARG", color: "#7cc4ff" }, away: { code: "FRA", color: "#3454d1" },
};

// Mirrors the real FotMob __NEXT_DATA__ shape (verified live 2026-07-20).
// Tests mutate the returned object to model malformed payloads.
function fakeNextData() {
  const momentum = Array.from({ length: 95 }, (_, i) => ({
    minute: i, value: Math.round(Math.sin(i / 9) * 80),
  }));
  return {
    props: {
      pageProps: {
        general: {
          matchId: "111",
          homeTeam: { name: "Argentina", id: 6706 },
          awayTeam: { name: "France", id: 6723 },
        },
        header: {
          status: {
            utcTime: "2022-12-18T15:00:00.000Z",
            scoreStr: "3 - 3",
            reason: { short: "Pen", long: "Pen 4 - 2", penalties: [4, 2] },
          },
        },
        content: {
          momentum: { main: { data: momentum } },
          matchFacts: {
            infoBox: { Stadium: { name: "Lusail Iconic Stadium" } },
            events: {
              events: [
                { type: "Goal", time: 23, overloadTime: null, isHome: true, isPenaltyShootoutEvent: false, player: { name: "Lionel Messi" }, newScore: [1, 0] },
                { type: "Goal", time: 36, overloadTime: null, isHome: true, isPenaltyShootoutEvent: false, player: { name: "Angel Di Maria" }, newScore: [2, 0] },
                { type: "Card", time: 40, isHome: false },
                { type: "Half", time: 45 },
                { type: "Goal", time: 80, overloadTime: null, isHome: false, isPenaltyShootoutEvent: false, player: { name: "Kylian Mbappe" }, newScore: [2, 1] },
                { type: "Goal", time: 81, overloadTime: null, isHome: false, isPenaltyShootoutEvent: false, player: { name: "Kylian Mbappe" }, newScore: [2, 2] },
                { type: "Goal", time: 108, overloadTime: null, isHome: true, isPenaltyShootoutEvent: false, player: { name: "Lionel Messi" }, newScore: [3, 2] },
                { type: "Goal", time: 118, overloadTime: null, isHome: false, isPenaltyShootoutEvent: false, player: { name: "Kylian Mbappe" }, newScore: [3, 3] },
              ],
            },
          },
        },
      },
    },
  };
}

describe("extractNextData", () => {
  it("parses the __NEXT_DATA__ script tag out of page HTML", () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"x":1}}}</script></body></html>`;
    expect(extractNextData(html)).toEqual({ props: { pageProps: { x: 1 } } });
  });

  it("throws when the tag is missing", () => {
    expect(() => extractNextData("<html><body>nope</body></html>")).toThrow(/__NEXT_DATA__/);
  });
});

describe("parseWaveMatch", () => {
  it("normalizes a full match", () => {
    const m = parseWaveMatch(fakeNextData(), cfg);
    expect(m.matchId).toBe("test-final");
    expect(m.fotmobId).toBe("111");
    expect(m.stage).toBe("Final");
    expect(m.kickoff).toBe("2022-12-18T15:00:00.000Z");
    expect(m.venue).toBe("Lusail Iconic Stadium");
    expect(m.home).toEqual({ name: "Argentina", code: "ARG", color: "#7cc4ff" });
    expect(m.away).toEqual({ name: "France", code: "FRA", color: "#3454d1" });
    expect(m.score).toEqual([3, 3]);
    expect(m.penalties).toEqual([4, 2]);
  });

  it("normalizes momentum to [-1, 1] with positive = home", () => {
    const m = parseWaveMatch(fakeNextData(), cfg);
    expect(m.momentum).toHaveLength(95);
    // sin(14/9)*80 rounded = 80 -> 0.8
    expect(m.momentum[14].value).toBeCloseTo(0.8, 5);
    for (const p of m.momentum) {
      expect(p.value).toBeGreaterThanOrEqual(-1);
      expect(p.value).toBeLessThanOrEqual(1);
    }
  });

  it("keeps only real Goal events, in order, with sides and running score", () => {
    const m = parseWaveMatch(fakeNextData(), cfg);
    expect(m.goals).toHaveLength(6);
    expect(m.goals[0]).toEqual({ minute: 23, side: "home", player: "Lionel Messi", scoreAfter: [1, 0] });
    expect(m.goals[2].side).toBe("away");
    expect(m.goals[5].scoreAfter).toEqual([3, 3]);
  });

  it("adds stoppage time into the goal minute", () => {
    const d = fakeNextData();
    (d.props.pageProps.content.matchFacts.events.events[0] as { time: number; overloadTime: number | null }).overloadTime = 3;
    const m = parseWaveMatch(d, cfg);
    expect(m.goals[0].minute).toBe(26);
  });

  it("returns penalties: null when there was no shootout", () => {
    const d = fakeNextData();
    d.props.pageProps.header.status.scoreStr = "2 - 1";
    (d.props.pageProps.header.status.reason as { penalties?: number[] }).penalties = undefined;
    // drop three goals so the count matches 2-1
    d.props.pageProps.content.matchFacts.events.events =
      d.props.pageProps.content.matchFacts.events.events.filter(
        (e) => e.type !== "Goal" || (e as { time: number }).time <= 80,
      );
    const m = parseWaveMatch(d, cfg);
    expect(m.penalties).toBeNull();
    expect(m.score).toEqual([2, 1]);
  });

  it("throws on a matchId mismatch", () => {
    const d = fakeNextData();
    d.props.pageProps.general.matchId = "999";
    expect(() => parseWaveMatch(d, cfg)).toThrow(/matchId mismatch/);
  });

  it("throws when momentum is missing or too short", () => {
    const missing = fakeNextData();
    (missing.props.pageProps.content as { momentum?: unknown }).momentum = undefined;
    expect(() => parseWaveMatch(missing, cfg)).toThrow(/momentum/);

    const short = fakeNextData();
    short.props.pageProps.content.momentum.main.data =
      short.props.pageProps.content.momentum.main.data.slice(0, 10);
    expect(() => parseWaveMatch(short, cfg)).toThrow(/momentum/);
  });

  it("throws when the scoreline and goal count disagree", () => {
    const d = fakeNextData();
    d.props.pageProps.header.status.scoreStr = "4 - 3";
    expect(() => parseWaveMatch(d, cfg)).toThrow(/goal count/);
  });

  it("throws on an unparseable scoreStr", () => {
    const d = fakeNextData();
    d.props.pageProps.header.status.scoreStr = "";
    expect(() => parseWaveMatch(d, cfg)).toThrow(/scoreStr/);
  });
});

describe("WAVE_MATCHES config", () => {
  it("has 4 matches with unique slugs and ids and valid colors", () => {
    expect(WAVE_MATCHES).toHaveLength(4);
    expect(new Set(WAVE_MATCHES.map((m) => m.slug)).size).toBe(4);
    expect(new Set(WAVE_MATCHES.map((m) => m.fotmobId)).size).toBe(4);
    for (const m of WAVE_MATCHES) {
      expect(m.home.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(m.away.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(m.pageUrl).toMatch(/^\/matches\//);
    }
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run ingestion/fotmob.test.ts`
Expected: FAIL — `Cannot find module './fotmob'` (or missing exports).

- [ ] **Step 4: Write the parsers**

`ingestion/fotmob.ts`:

```ts
import type { WaveMatch, WaveGoal, MomentumPoint } from "../src/lib/waves-types";
import { type WaveMatchConfig } from "./waves-config";

// FotMob's /api/ endpoints require a signed x-mas header, but the public
// match pages embed the full payload as __NEXT_DATA__ JSON. We parse that.
export function extractNextData(html: string): unknown {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  );
  if (!m) throw new Error("__NEXT_DATA__ script tag not found in page HTML");
  return JSON.parse(m[1]);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function parseWaveMatch(nextData: unknown, cfg: WaveMatchConfig): WaveMatch {
  const fail = (msg: string): never => {
    throw new Error(`${cfg.slug}: ${msg}`);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pp = (nextData as any)?.props?.pageProps;
  if (!pp) fail("missing props.pageProps");

  const general = pp.general;
  if (String(general?.matchId) !== cfg.fotmobId) {
    fail(`matchId mismatch: page has ${general?.matchId}, expected ${cfg.fotmobId}`);
  }

  const status = pp.header?.status;
  const scoreMatch = /^(\d+)\s*-\s*(\d+)$/.exec(String(status?.scoreStr ?? ""));
  if (!scoreMatch) fail(`unparseable scoreStr: "${status?.scoreStr}"`);
  const score: [number, number] = [Number(scoreMatch![1]), Number(scoreMatch![2])];

  const pens = status?.reason?.penalties;
  const penalties: [number, number] | null =
    Array.isArray(pens) && pens.length === 2 ? [Number(pens[0]), Number(pens[1])] : null;

  const raw = pp.content?.momentum?.main?.data;
  if (!Array.isArray(raw) || raw.length < 30) {
    fail(`momentum missing or too short (${Array.isArray(raw) ? raw.length : "absent"})`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const momentum: MomentumPoint[] = raw.map((p: any, i: number) => {
    if (!Number.isFinite(p?.minute) || !Number.isFinite(p?.value)) {
      fail(`momentum[${i}] is malformed`);
    }
    return { minute: p.minute, value: clamp(p.value / 100, -1, 1) };
  });

  const events = pp.content?.matchFacts?.events?.events;
  if (!Array.isArray(events)) fail("matchFacts.events.events missing");
  const goals: WaveGoal[] = events
    // Shootout kicks live in a separate penaltyShootoutEvents array upstream;
    // the flag check is belt-and-suspenders.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((e: any) => e.type === "Goal" && !e.isPenaltyShootoutEvent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((e: any, i: number) => {
      if (!Number.isFinite(e.time) || !Array.isArray(e.newScore) || e.newScore.length !== 2) {
        fail(`goal[${i}] is malformed`);
      }
      return {
        minute: e.time + (Number.isFinite(e.overloadTime) ? e.overloadTime : 0),
        side: e.isHome ? ("home" as const) : ("away" as const),
        player: e.player?.name ?? "Unknown",
        scoreAfter: [Number(e.newScore[0]), Number(e.newScore[1])] as [number, number],
      };
    });
  if (goals.length !== score[0] + score[1]) {
    fail(`goal count ${goals.length} != scoreline total ${score[0] + score[1]}`);
  }

  const venue = pp.content?.matchFacts?.infoBox?.Stadium?.name;
  if (typeof venue !== "string" || venue.length === 0) fail("venue missing");
  const kickoff = status?.utcTime;
  if (typeof kickoff !== "string") fail("kickoff (status.utcTime) missing");

  return {
    matchId: cfg.slug,
    fotmobId: cfg.fotmobId,
    stage: cfg.stage,
    kickoff,
    venue,
    home: { name: String(general.homeTeam?.name ?? ""), code: cfg.home.code, color: cfg.home.color },
    away: { name: String(general.awayTeam?.name ?? ""), code: cfg.away.code, color: cfg.away.color },
    score,
    penalties,
    momentum,
    goals,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run ingestion/fotmob.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/waves-types.ts ingestion/waves-config.ts ingestion/fotmob.ts ingestion/fotmob.test.ts
git commit -m "feat: FotMob wave-match parser and showcase config"
```

---

### Task 2: Ingest script + real match data

**Files:**
- Modify: `ingestion/fotmob.ts` (append fetch/main section)
- Modify: `package.json` (add script)
- Create (generated): `public/data/waves/jpn-esp-group.json`, `public/data/waves/cro-bra-qf.json`, `public/data/waves/ned-arg-qf.json`, `public/data/waves/arg-fra-final.json`

**Interfaces:**
- Consumes: `parseWaveMatch`, `extractNextData`, `WAVE_MATCHES` from Task 1.
- Produces: the 4 committed JSON files, each a `WaveMatch`. Later tasks import them by exact filename.

- [ ] **Step 1: Append the fetch/main section to `ingestion/fotmob.ts`**

Append after the existing exports (same file-layout convention as `ingestion/football.ts`):

```ts
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { WAVE_MATCHES } from "./waves-config";
```

(Merge these into the existing imports at the top of the file — `WaveMatchConfig` is already imported from `./waves-config`.)

```ts
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(pageUrl: string, fetchFn: typeof fetch = fetch): Promise<string> {
  const res = await fetchFn(`https://www.fotmob.com${pageUrl}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`FotMob ${pageUrl} -> ${res.status}`);
  return res.text();
}

async function main() {
  mkdirSync("data/raw", { recursive: true });
  mkdirSync("public/data/waves", { recursive: true });
  for (const cfg of WAVE_MATCHES) {
    const rawPath = `data/raw/fotmob-${cfg.fotmobId}.html`;
    let html: string;
    if (existsSync(rawPath)) {
      console.log(`using cached ${rawPath}`);
      html = readFileSync(rawPath, "utf8");
    } else {
      console.log(`fetching ${cfg.pageUrl}`);
      html = await fetchPage(cfg.pageUrl);
      writeFileSync(rawPath, html);
      await sleep(3000); // be polite: one page every 3 s
    }
    const match = parseWaveMatch(extractNextData(html), cfg);
    const outPath = `public/data/waves/${cfg.slug}.json`;
    writeFileSync(outPath, JSON.stringify(match, null, 2));
    console.log(
      `wrote ${outPath} (${match.momentum.length} momentum points, ${match.goals.length} goals)`,
    );
  }
}

if (process.argv[1] && process.argv[1].endsWith("fotmob.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
```

- [ ] **Step 2: Add the npm script**

In `package.json`, after `"ingest:weather"`:

```json
"ingest:waves": "tsx ingestion/fotmob.ts",
```

- [ ] **Step 3: Run the ingestion for real**

Run: `npm run ingest:waves`
Expected output (order matters, ~3 s between fetches):

```
fetching /matches/japan-vs-spain/1hqney
wrote public/data/waves/jpn-esp-group.json (… momentum points, 3 goals)
fetching /matches/brazil-vs-croatia/2swyz6
wrote public/data/waves/cro-bra-qf.json (… momentum points, 2 goals)
fetching /matches/argentina-vs-netherlands/1hklvd
wrote public/data/waves/ned-arg-qf.json (… momentum points, 4 goals)
fetching /matches/argentina-vs-france/1hox8a
wrote public/data/waves/arg-fra-final.json (… momentum points, 6 goals)
```

**If a fetch is blocked** (403/timeout): fetch the page manually with curl into the raw cache and re-run — the script picks up the cache:

```bash
curl -s -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" \
  "https://www.fotmob.com/matches/japan-vs-spain/1hqney" -o data/raw/fotmob-3854589.html
```

(Repeat per pageUrl/id from `ingestion/waves-config.ts`, then `npm run ingest:waves`.)

- [ ] **Step 4: Sanity-check the generated data**

```bash
for f in public/data/waves/*.json; do
  echo "$f: $(jq -r '.home.name + " " + (.score[0]|tostring) + "-" + (.score[1]|tostring) + " " + .away.name + " pens=" + (.penalties|tostring) + " momentum=" + (.momentum|length|tostring) + " goals=" + (.goals|length|tostring)' "$f")"
done
```

Expected:

```
public/data/waves/arg-fra-final.json: Argentina 3-3 France pens=[4,2] momentum=126 goals=6
public/data/waves/cro-bra-qf.json: Croatia 1-1 Brazil pens=[4,2] momentum=~126 goals=2
public/data/waves/jpn-esp-group.json: Japan 2-1 Spain pens=null momentum=~95 goals=3
public/data/waves/ned-arg-qf.json: Netherlands 2-2 Argentina pens=[3,4] momentum=~126 goals=4
```

(Exact momentum counts vary slightly; anything ≥ 90 is fine. Scores and penalties must match exactly — these are the real results.)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS (nothing regressed).

- [ ] **Step 6: Commit**

```bash
git add ingestion/fotmob.ts package.json public/data/waves/
git commit -m "feat: ingest FotMob momentum for 4 showcase WC 2022 matches"
```

---

### Task 3: Wave match loader (`src/lib/waves.ts`)

**Files:**
- Create: `src/lib/waves.ts`
- Test: `src/lib/waves.test.ts`

**Interfaces:**
- Consumes: the 4 JSON files from Task 2; `WaveMatch` from `./waves-types`; `flagEmoji` from `./flags` (test only).
- Produces: `getWaveMatches(): WaveMatch[]` (chronological) and `getWaveMatch(slug: string): WaveMatch | undefined`. All UI tasks use these two functions.

- [ ] **Step 1: Write the failing tests**

`src/lib/waves.test.ts` — these run against the real committed data, so they double as data-integrity checks:

```ts
import { describe, it, expect } from "vitest";
import { getWaveMatches, getWaveMatch } from "./waves";
import { flagEmoji } from "./flags";

describe("getWaveMatches", () => {
  it("returns the 4 showcase matches in chronological order", () => {
    const ms = getWaveMatches();
    expect(ms).toHaveLength(4);
    expect(ms.map((m) => m.matchId)).toEqual([
      "jpn-esp-group", "cro-bra-qf", "ned-arg-qf", "arg-fra-final",
    ]);
    const times = ms.map((m) => new Date(m.kickoff).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("every match has sane momentum", () => {
    for (const m of getWaveMatches()) {
      expect(m.momentum.length).toBeGreaterThanOrEqual(90);
      let prev = -Infinity;
      for (const p of m.momentum) {
        expect(p.value).toBeGreaterThanOrEqual(-1);
        expect(p.value).toBeLessThanOrEqual(1);
        expect(p.minute).toBeGreaterThanOrEqual(prev);
        prev = p.minute;
      }
    }
  });

  it("goals are ordered and consistent with the final score", () => {
    for (const m of getWaveMatches()) {
      expect(m.goals.length).toBe(m.score[0] + m.score[1]);
      let prev = 0;
      for (const g of m.goals) {
        expect(g.minute).toBeGreaterThanOrEqual(prev);
        prev = g.minute;
      }
      if (m.goals.length > 0) {
        expect(m.goals[m.goals.length - 1].scoreAfter).toEqual(m.score);
      }
    }
  });

  it("every team code resolves to a real flag", () => {
    for (const m of getWaveMatches()) {
      expect(flagEmoji(m.home.code)).not.toBe("🏳️");
      expect(flagEmoji(m.away.code)).not.toBe("🏳️");
    }
  });
});

describe("getWaveMatch", () => {
  it("resolves a known slug", () => {
    const final = getWaveMatch("arg-fra-final");
    expect(final?.fotmobId).toBe("3370572");
    expect(final?.penalties).toEqual([4, 2]);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getWaveMatch("not-a-match")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/waves.test.ts`
Expected: FAIL — `Cannot find module './waves'`.

- [ ] **Step 3: Write the loader**

`src/lib/waves.ts` (same static-import pattern as `src/lib/snapshot.ts`):

```ts
import type { WaveMatch } from "./waves-types";
import jpnEsp from "../../public/data/waves/jpn-esp-group.json";
import croBra from "../../public/data/waves/cro-bra-qf.json";
import nedArg from "../../public/data/waves/ned-arg-qf.json";
import argFra from "../../public/data/waves/arg-fra-final.json";

// Chronological. The double cast is needed because JSON imports widen
// literal fields like side: "home" to string.
const MATCHES = [jpnEsp, croBra, nedArg, argFra] as unknown as WaveMatch[];

export function getWaveMatches(): WaveMatch[] {
  return MATCHES;
}

export function getWaveMatch(slug: string): WaveMatch | undefined {
  return MATCHES.find((m) => m.matchId === slug);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/waves.test.ts`
Expected: PASS. (If the ordering test fails, fix the import order in `waves.ts`, not the data.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/waves.ts src/lib/waves.test.ts
git commit -m "feat: static loader for wave match snapshots"
```

---

### Task 4: Motion math (`src/lib/wave-motion.ts`)

**Files:**
- Create: `src/lib/wave-motion.ts`
- Test: `src/lib/wave-motion.test.ts`

**Interfaces:**
- Consumes: `MomentumPoint`, `WaveGoal` from `./waves-types`.
- Produces (all consumed by Tasks 5–8):
  - constants `PLAYBACK_SECONDS = 75`, `STEP_MIN = 0.25`, `WAKE_SAMPLES = 16`, `WAKE_WINDOW_MIN = 10`, `RIPPLE_SECONDS = 2.5`
  - `interface MomentumCurve { values: Float32Array; stepMin: number; totalMinutes: number }`
  - `resampleMomentum(points: MomentumPoint[], smoothRadius?: number): MomentumCurve`
  - `sampleCurve(curve: MomentumCurve, minute: number): number`
  - `matchRate(totalMinutes: number): number` — match-minutes per wall-second
  - `advance(minute: number, dtSeconds: number, totalMinutes: number): number`
  - `scoreAt(goals: WaveGoal[], minute: number): [number, number]`
  - `interface GoalRipple { side: 1 | -1; progress: number }`
  - `activeGoalRipple(goals: WaveGoal[], minute: number, totalMinutes: number): GoalRipple | null`
  - `packWake(curve: MomentumCurve, minute: number): Float32Array` — length `WAKE_SAMPLES`, `[0]` oldest, last = now
  - `drift(curve: MomentumCurve, minute: number): number`
  - `seedFromString(s: string): number`

- [ ] **Step 1: Write the failing tests**

`src/lib/wave-motion.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  resampleMomentum, sampleCurve, matchRate, advance, scoreAt,
  activeGoalRipple, packWake, drift, seedFromString,
  PLAYBACK_SECONDS, STEP_MIN, WAKE_SAMPLES, RIPPLE_SECONDS,
} from "./wave-motion";
import type { WaveGoal } from "./waves-types";

const ramp = Array.from({ length: 91 }, (_, i) => ({ minute: i, value: i / 90 }));
const flat = Array.from({ length: 91 }, (_, i) => ({ minute: i, value: 0.5 }));
const spiky = Array.from({ length: 91 }, (_, i) => ({ minute: i, value: i % 2 === 0 ? 1 : -1 }));

describe("resampleMomentum", () => {
  it("spans the full match on a uniform grid", () => {
    const c = resampleMomentum(ramp);
    expect(c.totalMinutes).toBe(90);
    expect(c.stepMin).toBe(STEP_MIN);
    expect(c.values.length).toBe(Math.floor(90 / STEP_MIN) + 1);
  });

  it("preserves a flat signal exactly", () => {
    const c = resampleMomentum(flat);
    for (const v of c.values) expect(v).toBeCloseTo(0.5, 5);
  });

  it("follows the shape of a ramp", () => {
    const c = resampleMomentum(ramp);
    expect(sampleCurve(c, 45)).toBeCloseTo(0.5, 1);
    expect(sampleCurve(c, 90)).toBeGreaterThan(sampleCurve(c, 45));
  });

  it("stays within [-1, 1] even when Catmull-Rom would overshoot", () => {
    const c = resampleMomentum(spiky);
    for (const v of c.values) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("throws on fewer than 2 points", () => {
    expect(() => resampleMomentum([{ minute: 0, value: 0 }])).toThrow();
  });
});

describe("sampleCurve", () => {
  it("clamps out-of-range minutes", () => {
    const c = resampleMomentum(ramp);
    expect(sampleCurve(c, -5)).toBeCloseTo(sampleCurve(c, 0), 5);
    expect(sampleCurve(c, 500)).toBeCloseTo(sampleCurve(c, 90), 5);
  });
});

describe("playback clock", () => {
  it("plays a 90-minute match in PLAYBACK_SECONDS", () => {
    expect(advance(0, PLAYBACK_SECONDS, 90)).toBe(90);
    expect(matchRate(90)).toBeCloseTo(90 / PLAYBACK_SECONDS, 5);
  });

  it("caps at full time", () => {
    expect(advance(89, 60, 90)).toBe(90);
  });
});

const goals: WaveGoal[] = [
  { minute: 23, side: "home", player: "A", scoreAfter: [1, 0] },
  { minute: 80, side: "away", player: "B", scoreAfter: [1, 1] },
];

describe("scoreAt", () => {
  it("walks the running score", () => {
    expect(scoreAt(goals, 0)).toEqual([0, 0]);
    expect(scoreAt(goals, 23)).toEqual([1, 0]);
    expect(scoreAt(goals, 79.9)).toEqual([1, 0]);
    expect(scoreAt(goals, 90)).toEqual([1, 1]);
  });
});

describe("activeGoalRipple", () => {
  it("is null away from goals", () => {
    expect(activeGoalRipple(goals, 10, 90)).toBeNull();
    expect(activeGoalRipple(goals, 50, 90)).toBeNull();
  });

  it("ripples just after a goal with the right side and progress", () => {
    const r = activeGoalRipple(goals, 23.1, 90)!;
    expect(r.side).toBe(1);
    expect(r.progress).toBeGreaterThan(0);
    expect(r.progress).toBeLessThan(0.1);
    const away = activeGoalRipple(goals, 80.5, 90)!;
    expect(away.side).toBe(-1);
  });

  it("expires after RIPPLE_SECONDS of playback", () => {
    const rippleMinutes = RIPPLE_SECONDS * matchRate(90);
    expect(activeGoalRipple(goals, 23 + rippleMinutes + 0.01, 90)).toBeNull();
  });
});

describe("packWake", () => {
  it("packs WAKE_SAMPLES trailing samples ending at now", () => {
    const c = resampleMomentum(ramp);
    const wake = packWake(c, 45);
    expect(wake.length).toBe(WAKE_SAMPLES);
    expect(wake[WAKE_SAMPLES - 1]).toBeCloseTo(sampleCurve(c, 45), 5);
    expect(wake[0]).toBeCloseTo(sampleCurve(c, 35), 5); // WAKE_WINDOW_MIN back
    expect(wake[0]).toBeLessThan(wake[WAKE_SAMPLES - 1]); // ramp rises
  });
});

describe("drift", () => {
  it("is positive when momentum is rising", () => {
    const c = resampleMomentum(ramp);
    expect(drift(c, 45)).toBeGreaterThan(0);
  });
  it("is ~0 on a flat signal", () => {
    const c = resampleMomentum(flat);
    expect(Math.abs(drift(c, 45))).toBeLessThan(0.01);
  });
});

describe("seedFromString", () => {
  it("is deterministic and distinguishes slugs", () => {
    expect(seedFromString("arg-fra-final")).toBe(seedFromString("arg-fra-final"));
    expect(seedFromString("arg-fra-final")).not.toBe(seedFromString("jpn-esp-group"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/wave-motion.test.ts`
Expected: FAIL — `Cannot find module './wave-motion'`.

- [ ] **Step 3: Implement**

`src/lib/wave-motion.ts`:

```ts
import type { MomentumPoint, WaveGoal } from "./waves-types";

export const PLAYBACK_SECONDS = 75; // full match compressed into this
export const STEP_MIN = 0.25; // resampled grid step, in match minutes
export const WAKE_SAMPLES = 16;
export const WAKE_WINDOW_MIN = 10; // the wake looks this far back
export const RIPPLE_SECONDS = 2.5; // goal ripple length, wall-clock

export interface MomentumCurve {
  values: Float32Array; // values[i] = momentum at minute i * stepMin
  stepMin: number;
  totalMinutes: number;
}

// Catmull-Rom through the per-minute points onto a uniform grid, then a
// light box-blur low-pass. The smoothing is an acknowledged interpretation:
// shape faithful, second-by-second jitter removed.
export function resampleMomentum(points: MomentumPoint[], smoothRadius = 3): MomentumCurve {
  if (points.length < 2) throw new Error("need at least 2 momentum points");
  const pts = [...points].sort((a, b) => a.minute - b.minute);
  const totalMinutes = pts[pts.length - 1].minute;
  const n = Math.floor(totalMinutes / STEP_MIN) + 1;
  const values = new Float32Array(n);
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const t = i * STEP_MIN;
    while (seg < pts.length - 2 && pts[seg + 1].minute < t) seg++;
    const p1 = pts[seg];
    const p2 = pts[seg + 1];
    const p0 = pts[Math.max(0, seg - 1)];
    const p3 = pts[Math.min(pts.length - 1, seg + 2)];
    const span = p2.minute - p1.minute || 1;
    const u = Math.min(1, Math.max(0, (t - p1.minute) / span));
    const u2 = u * u;
    const u3 = u2 * u;
    values[i] =
      0.5 *
      (2 * p1.value +
        (-p0.value + p2.value) * u +
        (2 * p0.value - 5 * p1.value + 4 * p2.value - p3.value) * u2 +
        (-p0.value + 3 * p1.value - 3 * p2.value + p3.value) * u3);
  }
  const smoothed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let j = -smoothRadius; j <= smoothRadius; j++) {
      const k = i + j;
      if (k >= 0 && k < n) {
        sum += values[k];
        cnt++;
      }
    }
    smoothed[i] = Math.min(1, Math.max(-1, sum / cnt));
  }
  return { values: smoothed, stepMin: STEP_MIN, totalMinutes };
}

export function sampleCurve(curve: MomentumCurve, minute: number): number {
  const clamped = Math.min(Math.max(minute, 0), curve.totalMinutes);
  const idx = clamped / curve.stepMin;
  const i0 = Math.floor(idx);
  const i1 = Math.min(curve.values.length - 1, i0 + 1);
  const frac = idx - i0;
  return curve.values[i0] * (1 - frac) + curve.values[i1] * frac;
}

/** Match minutes that elapse per wall-clock second of playback. */
export function matchRate(totalMinutes: number): number {
  return totalMinutes / PLAYBACK_SECONDS;
}

export function advance(minute: number, dtSeconds: number, totalMinutes: number): number {
  return Math.min(totalMinutes, minute + dtSeconds * matchRate(totalMinutes));
}

export function scoreAt(goals: WaveGoal[], minute: number): [number, number] {
  let score: [number, number] = [0, 0];
  for (const g of goals) if (g.minute <= minute) score = g.scoreAfter;
  return score;
}

export interface GoalRipple {
  side: 1 | -1; // +1 home, -1 away
  progress: number; // 0 just scored .. 1 faded
}

/** The most recent goal still rippling at `minute` (overlaps: latest wins). */
export function activeGoalRipple(
  goals: WaveGoal[],
  minute: number,
  totalMinutes: number,
): GoalRipple | null {
  const rippleMinutes = RIPPLE_SECONDS * matchRate(totalMinutes);
  let best: GoalRipple | null = null;
  for (const g of goals) {
    const age = minute - g.minute;
    if (age >= 0 && age <= rippleMinutes) {
      best = { side: g.side === "home" ? 1 : -1, progress: age / rippleMinutes };
    }
  }
  return best;
}

/** Trailing momentum window for the shader: [0] oldest .. last = now. */
export function packWake(curve: MomentumCurve, minute: number): Float32Array {
  const out = new Float32Array(WAKE_SAMPLES);
  for (let i = 0; i < WAKE_SAMPLES; i++) {
    const back = WAKE_WINDOW_MIN * (1 - i / (WAKE_SAMPLES - 1));
    out[i] = sampleCurve(curve, minute - back);
  }
  return out;
}

/** Recent momentum trend; advects the water texture toward the attack. */
export function drift(curve: MomentumCurve, minute: number): number {
  return sampleCurve(curve, minute) - sampleCurve(curve, minute - 2);
}

/** Small deterministic seed so each match's water is distinct but replayable. */
export function seedFromString(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h / 100;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/wave-motion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wave-motion.ts src/lib/wave-motion.test.ts
git commit -m "feat: momentum resampling, playback clock, and goal-ripple math"
```

---

### Task 5: Shaders and WebGL renderer

**Files:**
- Create: `src/components/waves/shaders.ts`
- Create: `src/components/waves/renderer.ts`
- Test: `src/components/waves/renderer.test.ts`

**Interfaces:**
- Consumes: `WAKE_SAMPLES` from `@/lib/wave-motion`.
- Produces:
  - `interface WaveFrame { time: number; momentum: number; wake: Float32Array; drift: number; goalProgress: number; goalSide: number }` (`goalProgress: -1` = no active ripple)
  - `interface WavesRenderer { render(frame: WaveFrame): void; dispose(): void }`
  - `createWavesRenderer(canvas: HTMLCanvasElement, homeColor: string, awayColor: string, seed: number): WavesRenderer | null` — **null** when WebGL2 is unavailable or shaders fail; callers fall back.
  - `hexToRgb(hex: string): [number, number, number]`

- [ ] **Step 1: Write the failing tests**

`src/components/waves/renderer.test.ts` (jsdom's `canvas.getContext` returns null, which is exactly the fallback path):

```ts
import { describe, it, expect } from "vitest";
import { createWavesRenderer, hexToRgb } from "./renderer";

describe("hexToRgb", () => {
  it("converts 6-digit hex to unit floats", () => {
    expect(hexToRgb("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#ff0000")).toEqual([1, 0, 0]);
    const [r, g, b] = hexToRgb("#7cc4ff");
    expect(r).toBeCloseTo(0x7c / 255, 5);
    expect(g).toBeCloseTo(0xc4 / 255, 5);
    expect(b).toBeCloseTo(1, 5);
  });

  it("falls back to white on malformed input", () => {
    expect(hexToRgb("blue")).toEqual([1, 1, 1]);
    expect(hexToRgb("#fff")).toEqual([1, 1, 1]);
  });
});

describe("createWavesRenderer", () => {
  it("returns null when WebGL2 is unavailable (jsdom)", () => {
    const canvas = document.createElement("canvas");
    expect(createWavesRenderer(canvas, "#7cc4ff", "#3454d1", 1.23)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/waves/renderer.test.ts`
Expected: FAIL — `Cannot find module './renderer'`.

- [ ] **Step 3: Write the shaders**

`src/components/waves/shaders.ts`:

```ts
export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// A single scene: two team-colored waters over the pitch meeting at a front
// whose x-position IS the momentum value. Everything else (lapping, foam,
// shimmer, wake, goal ripples) is presentation of that one honest signal.
export const FRAG = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform float uTime;         // wall-clock seconds, drives the water texture
uniform float uSeed;         // per-match seed: deterministic replays
uniform float uMomentum;     // current momentum in [-1, 1], + = home (left)
uniform float uWake[16];     // trailing momentum, [0] oldest .. [15] now
uniform float uDrift;        // recent momentum trend, advects the noise
uniform vec3 uHomeColor;
uniform vec3 uAwayColor;
uniform float uGoalProgress; // 0..1 through the ripple, or -1 when none
uniform float uGoalSide;     // +1 home, -1 away

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345) + uSeed);
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p = p * 2.03 + 17.7;
    amp *= 0.5;
  }
  return v;
}

const float GAIN = 0.425; // momentum -> front displacement; keeps both waters visible

float frontAt(float m, float rippleShift) {
  return 0.5 + GAIN * m + rippleShift;
}

void main() {
  // shoreline wobble: the front laps and fingers over time
  float rip = (fbm(vec2(vUv.y * 3.0, uTime * 0.14)) - 0.5) * 0.10;
  float fingers = (fbm(vec2(vUv.y * 9.0 + 31.7, uTime * 0.31)) - 0.5) * 0.05;
  float front = frontAt(uMomentum, rip + fingers);
  float d = vUv.x - front; // > 0 : away side of the front

  // which water
  float edge = 0.018 + 0.03 * fbm(vec2(vUv.y * 7.0 + 91.3, uTime * 0.2));
  float side = smoothstep(-edge, edge, d);
  vec3 col = mix(uHomeColor, uAwayColor, side);

  // water shimmer, advected toward the attacking direction
  vec2 flow = vec2(uTime * (0.03 + 0.25 * uDrift), uTime * 0.045);
  float shimmer = fbm(vUv * vec2(6.0, 4.0) + flow);
  col *= 0.72 + 0.5 * shimmer;

  // depth grading: bright at the contested front, deeper further away
  float depth = clamp(abs(d) * 1.7, 0.0, 1.0);
  col *= mix(1.18, 0.62, depth);

  // foam along the front
  float foam = exp(-pow(d / (edge * 1.8), 2.0));
  col += vec3(0.9, 0.95, 1.0) * foam * 0.4;

  // wake: faint contours where the front recently was
  for (int i = 0; i < 15; i++) {
    float w = float(i) / 15.0; // 0 oldest .. ~1 newest
    float fw = frontAt(uWake[i], rip * 0.6);
    float trail = exp(-pow((vUv.x - fw) / 0.012, 2.0));
    col += vec3(0.85, 0.92, 1.0) * trail * w * w * 0.10;
  }

  // goal: radial ripple from the scoring end + a wash of the scorer's color
  if (uGoalProgress >= 0.0) {
    vec2 origin = vec2(uGoalSide > 0.0 ? 0.94 : 0.06, 0.5);
    vec2 ar = vec2(1.0, 0.6476); // pitch aspect 68/105
    float r = length((vUv - origin) * ar);
    float ring = exp(-pow((r - uGoalProgress * 1.35) * 16.0, 2.0)) * (1.0 - uGoalProgress);
    vec3 washColor = uGoalSide > 0.0 ? uHomeColor : uAwayColor;
    float wash = pow(1.0 - uGoalProgress, 2.0) * 0.5;
    col = mix(col, washColor * 1.2, wash);
    col += vec3(1.0) * ring * 0.55;
  }

  outColor = vec4(col, 1.0);
}`;
```

(Home defends the left end and attacks right, so a home goal's ripple originates at `x = 0.94` — the goal they scored into.)

- [ ] **Step 4: Write the renderer**

`src/components/waves/renderer.ts`:

```ts
import { VERT, FRAG } from "./shaders";
import { WAKE_SAMPLES } from "@/lib/wave-motion";

export interface WaveFrame {
  time: number;
  momentum: number;
  wake: Float32Array; // WAKE_SAMPLES values
  drift: number;
  goalProgress: number; // -1 when no active ripple
  goalSide: number; // +1 home, -1 away, 0 none
}

export interface WavesRenderer {
  render(frame: WaveFrame): void;
  dispose(): void;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [1, 1, 1];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("waves shader compile failed:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** Returns null when WebGL2 is unavailable or setup fails: callers fall back. */
export function createWavesRenderer(
  canvas: HTMLCanvasElement,
  homeColor: string,
  awayColor: string,
  seed: number,
): WavesRenderer | null {
  const gl = canvas.getContext("webgl2");
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("waves program link failed:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  // one clipping-space triangle that covers the viewport
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform3fv(u("uHomeColor"), hexToRgb(homeColor));
  gl.uniform3fv(u("uAwayColor"), hexToRgb(awayColor));
  gl.uniform1f(u("uSeed"), seed);
  const uTime = u("uTime");
  const uMomentum = u("uMomentum");
  const uWake = u("uWake");
  const uDrift = u("uDrift");
  const uGoalProgress = u("uGoalProgress");
  const uGoalSide = u("uGoalSide");

  return {
    render(f: WaveFrame) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, f.time);
      gl.uniform1f(uMomentum, f.momentum);
      gl.uniform1fv(uWake, f.wake.length === WAKE_SAMPLES ? f.wake : new Float32Array(WAKE_SAMPLES));
      gl.uniform1f(uDrift, f.drift);
      gl.uniform1f(uGoalProgress, f.goalProgress);
      gl.uniform1f(uGoalSide, f.goalSide);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/waves/renderer.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/waves/shaders.ts src/components/waves/renderer.ts src/components/waves/renderer.test.ts
git commit -m "feat: WebGL2 momentum-tide shader and renderer"
```

---

### Task 6: MomentumWaves component + fallback chart

**Files:**
- Create: `src/components/waves/test-fixtures.ts`
- Create: `src/components/waves/FallbackChart.tsx`
- Create: `src/components/waves/MomentumWaves.tsx`
- Test: `src/components/waves/MomentumWaves.test.tsx`

**Interfaces:**
- Consumes: `createWavesRenderer` (Task 5); `resampleMomentum`, `sampleCurve`, `packWake`, `drift`, `activeGoalRipple`, `seedFromString` (Task 4); `WaveMatch` types.
- Produces:
  - `MomentumWaves({ match, minute }: { match: WaveMatch; minute: number })` — fills its parent (which must be `position: relative` with a fixed aspect); shows `FallbackChart` when WebGL2 is unavailable.
  - `FallbackChart({ match }: { match: WaveMatch })`
  - `makeWaveMatch(overrides?: Partial<WaveMatch>): WaveMatch` test factory (used again in Tasks 7–9).

- [ ] **Step 1: Write the test factory**

`src/components/waves/test-fixtures.ts`:

```ts
import type { WaveMatch } from "@/lib/waves-types";

export function makeWaveMatch(overrides: Partial<WaveMatch> = {}): WaveMatch {
  return {
    matchId: "test-match",
    fotmobId: "111",
    stage: "Final",
    kickoff: "2022-12-18T15:00:00.000Z",
    venue: "Lusail Iconic Stadium",
    home: { name: "Argentina", code: "ARG", color: "#7cc4ff" },
    away: { name: "France", code: "FRA", color: "#3454d1" },
    score: [2, 1],
    penalties: null,
    momentum: Array.from({ length: 91 }, (_, i) => ({
      minute: i,
      value: Math.sin(i / 10) * 0.7,
    })),
    goals: [
      { minute: 23, side: "home", player: "Messi", scoreAfter: [1, 0] },
      { minute: 60, side: "away", player: "Mbappe", scoreAfter: [1, 1] },
      { minute: 85, side: "home", player: "Messi", scoreAfter: [2, 1] },
    ],
    ...overrides,
  };
}
```

- [ ] **Step 2: Write the failing tests**

`src/components/waves/MomentumWaves.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentumWaves } from "./MomentumWaves";
import { FallbackChart } from "./FallbackChart";
import { makeWaveMatch } from "./test-fixtures";

describe("MomentumWaves", () => {
  it("falls back to the static chart when WebGL2 is unavailable (jsdom)", async () => {
    render(<MomentumWaves match={makeWaveMatch()} minute={45} />);
    expect(await screen.findByTestId("waves-fallback")).toBeInTheDocument();
  });
});

describe("FallbackChart", () => {
  it("renders the momentum chart with one marker per goal", () => {
    const match = makeWaveMatch();
    const { container } = render(<FallbackChart match={match} />);
    expect(screen.getByRole("img", { name: /momentum/i })).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(match.goals.length);
    expect(screen.getByText(/WebGL2/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/waves/MomentumWaves.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement the fallback chart**

`src/components/waves/FallbackChart.tsx`:

```tsx
import type { WaveMatch } from "@/lib/waves-types";

/** Static fallback when WebGL2 is unavailable: momentum as a two-color area chart. */
export function FallbackChart({ match }: { match: WaveMatch }) {
  const total = match.momentum[match.momentum.length - 1].minute;
  const W = 100;
  const H = 48;
  const mid = H / 2;
  const x = (min: number) => (min / total) * W;
  const y = (v: number) => mid - v * (mid - 4);
  const pts = match.momentum
    .map((p) => `${x(p.minute).toFixed(2)},${y(p.value).toFixed(2)}`)
    .join(" ");
  return (
    <div data-testid="waves-fallback">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Match momentum chart"
        style={{ width: "100%", display: "block" }}
      >
        <defs>
          <clipPath id="waves-above">
            <rect x="0" y="0" width={W} height={mid} />
          </clipPath>
          <clipPath id="waves-below">
            <rect x="0" y={mid} width={W} height={mid} />
          </clipPath>
        </defs>
        <polygon points={`0,${mid} ${pts} ${W},${mid}`} fill={match.home.color} clipPath="url(#waves-above)" />
        <polygon points={`0,${mid} ${pts} ${W},${mid}`} fill={match.away.color} clipPath="url(#waves-below)" />
        <line x1="0" y1={mid} x2={W} y2={mid} stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" />
        {match.goals.map((g, i) => (
          <circle
            key={i}
            cx={x(g.minute)}
            cy={g.side === "home" ? 6 : H - 6}
            r="1.6"
            fill={g.side === "home" ? match.home.color : match.away.color}
            stroke="white"
            strokeWidth="0.4"
          />
        ))}
      </svg>
      <p className="fine">Live wave rendering needs WebGL2; showing the momentum chart instead.</p>
    </div>
  );
}
```

- [ ] **Step 5: Implement the canvas component**

`src/components/waves/MomentumWaves.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WaveMatch } from "@/lib/waves-types";
import {
  resampleMomentum, sampleCurve, packWake, drift, activeGoalRipple, seedFromString,
} from "@/lib/wave-motion";
import { createWavesRenderer } from "./renderer";
import { FallbackChart } from "./FallbackChart";

export function MomentumWaves({ match, minute }: { match: WaveMatch; minute: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minuteRef = useRef(minute);
  minuteRef.current = minute;
  const [fallback, setFallback] = useState(false);
  const curve = useMemo(() => resampleMomentum(match.momentum), [match]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createWavesRenderer(
      canvas, match.home.color, match.away.color, seedFromString(match.matchId),
    );
    if (!renderer) {
      setFallback(true);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const m = minuteRef.current;
      const ripple = activeGoalRipple(match.goals, m, curve.totalMinutes);
      renderer.render({
        time: (now - start) / 1000,
        momentum: sampleCurve(curve, m),
        wake: packWake(curve, m),
        drift: drift(curve, m),
        goalProgress: ripple ? ripple.progress : -1,
        goalSide: ripple ? ripple.side : 0,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, [match, curve]);

  if (fallback) return <FallbackChart match={match} />;
  return (
    <canvas
      ref={canvasRef}
      data-testid="waves-canvas"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/waves/MomentumWaves.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/waves/test-fixtures.ts src/components/waves/FallbackChart.tsx src/components/waves/MomentumWaves.tsx src/components/waves/MomentumWaves.test.tsx
git commit -m "feat: MomentumWaves canvas component with static fallback"
```

---

### Task 7: Pitch overlay + playback controls

**Files:**
- Create: `src/components/waves/PitchOverlay.tsx`
- Create: `src/components/waves/PlaybackControls.tsx`
- Test: `src/components/waves/PlaybackControls.test.tsx`
- Modify: `src/app/globals.css` (append the waves styles)

**Interfaces:**
- Consumes: `WaveGoal` from `@/lib/waves-types`.
- Produces:
  - `PitchOverlay()` — absolutely-positioned faint SVG pitch markings; parent must be `position: relative`.
  - `PlaybackControls({ minute, totalMinutes, playing, ended, goals, onTogglePlay, onScrub })` where `onTogglePlay: () => void` and `onScrub: (minute: number) => void`. Button aria-label is `"Replay"` when `ended`, else `"Pause"`/`"Play"`; the range input has aria-label `"Match minute"`.

- [ ] **Step 1: Write the failing tests**

`src/components/waves/PlaybackControls.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "./PlaybackControls";
import { makeWaveMatch } from "./test-fixtures";

const goals = makeWaveMatch().goals;

function renderControls(overrides: Partial<Parameters<typeof PlaybackControls>[0]> = {}) {
  const props = {
    minute: 30, totalMinutes: 90, playing: false, ended: false, goals,
    onTogglePlay: vi.fn(), onScrub: vi.fn(),
    ...overrides,
  };
  const utils = render(<PlaybackControls {...props} />);
  return { ...utils, props };
}

describe("PlaybackControls", () => {
  it("shows Play when paused and calls onTogglePlay", () => {
    const { props } = renderControls();
    const btn = screen.getByRole("button", { name: "Play" });
    fireEvent.click(btn);
    expect(props.onTogglePlay).toHaveBeenCalledOnce();
  });

  it("shows Pause while playing and Replay when ended", () => {
    renderControls({ playing: true });
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("shows Replay when ended", () => {
    renderControls({ ended: true });
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
  });

  it("scrubbing reports the minute as a number", () => {
    const { props } = renderControls();
    fireEvent.change(screen.getByRole("slider", { name: "Match minute" }), {
      target: { value: "72.5" },
    });
    expect(props.onScrub).toHaveBeenCalledWith(72.5);
  });

  it("renders one tick per goal and the current minute", () => {
    const { container } = renderControls();
    expect(container.querySelectorAll(".waves-goal-tick")).toHaveLength(goals.length);
    expect(screen.getByText("30′")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/waves/PlaybackControls.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement both components**

`src/components/waves/PitchOverlay.tsx` (viewBox in meters, 105×68):

```tsx
/** Faint pitch markings drawn over the water. Parent must be position:relative. */
export function PitchOverlay() {
  const s = { fill: "none", stroke: "rgba(255,255,255,0.28)", strokeWidth: 0.35 } as const;
  return (
    <svg
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="pitch-overlay"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <rect x="0.5" y="0.5" width="104" height="67" {...s} />
      <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" {...s} />
      <circle cx="52.5" cy="34" r="9.15" {...s} />
      <rect x="0.5" y="13.84" width="16.5" height="40.32" {...s} />
      <rect x="88" y="13.84" width="16.5" height="40.32" {...s} />
      <rect x="0.5" y="24.84" width="5.5" height="18.32" {...s} />
      <rect x="99" y="24.84" width="5.5" height="18.32" {...s} />
      <circle cx="11.5" cy="34" r="0.5" fill="rgba(255,255,255,0.28)" stroke="none" />
      <circle cx="93.5" cy="34" r="0.5" fill="rgba(255,255,255,0.28)" stroke="none" />
    </svg>
  );
}
```

`src/components/waves/PlaybackControls.tsx`:

```tsx
"use client";

import type { WaveGoal } from "@/lib/waves-types";

interface Props {
  minute: number;
  totalMinutes: number;
  playing: boolean;
  ended: boolean;
  goals: WaveGoal[];
  onTogglePlay: () => void;
  onScrub: (minute: number) => void;
}

export function PlaybackControls({
  minute, totalMinutes, playing, ended, goals, onTogglePlay, onScrub,
}: Props) {
  return (
    <div className="waves-controls">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={ended ? "Replay" : playing ? "Pause" : "Play"}
      >
        {ended ? "↻" : playing ? "❚❚" : "▶"}
      </button>
      <div className="waves-scrub">
        <input
          type="range"
          min={0}
          max={totalMinutes}
          step={0.1}
          value={minute}
          aria-label="Match minute"
          onChange={(e) => onScrub(Number(e.target.value))}
        />
        <div className="waves-goal-ticks" aria-hidden="true">
          {goals.map((g, i) => (
            <span
              key={i}
              className="waves-goal-tick"
              style={{ left: `${(g.minute / totalMinutes) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <span className="waves-minute">{Math.floor(minute)}′</span>
    </div>
  );
}
```

- [ ] **Step 4: Append the waves styles to `src/app/globals.css`**

```css
/* --- Momentum waves ------------------------------------------------- */
.waves-portrait { max-width: 980px; margin: 0 auto; padding: 1rem; }
.waves-header {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 1rem; margin-bottom: 0.75rem;
}
.waves-score { font-size: 1.6rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.waves-team { font-size: 1.05rem; font-weight: 600; }
.waves-stage-box {
  position: relative; aspect-ratio: 105 / 68;
  border-radius: 8px; overflow: hidden; background: #06131f;
}
.waves-controls { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; }
.waves-controls button {
  font-size: 1rem; line-height: 1; padding: 0.45rem 0.7rem; cursor: pointer;
}
.waves-scrub { position: relative; flex: 1; }
.waves-scrub input[type="range"] { width: 100%; display: block; }
.waves-goal-ticks { position: absolute; left: 0; right: 0; top: -4px; height: 4px; }
.waves-goal-tick { position: absolute; width: 2px; height: 4px; background: currentColor; opacity: 0.7; }
.waves-minute { min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums; }
.waves-meta { margin-top: 0.75rem; }
.waves-gallery {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem; margin-top: 1rem;
}
.waves-card {
  display: block; padding: 1rem; border: 1px solid rgba(127, 127, 127, 0.3);
  border-radius: 8px; text-decoration: none;
}
.waves-card-score { font-size: 1.3rem; font-weight: 700; }
.waves-card-stage { opacity: 0.7; font-size: 0.9rem; }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/waves/PlaybackControls.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/waves/PitchOverlay.tsx src/components/waves/PlaybackControls.tsx src/components/waves/PlaybackControls.test.tsx src/app/globals.css
git commit -m "feat: pitch overlay, playback controls, and waves styles"
```

---

### Task 8: WavePortrait orchestrator

**Files:**
- Create: `src/components/waves/WavePortrait.tsx`
- Test: `src/components/waves/WavePortrait.test.tsx`

**Interfaces:**
- Consumes: `MomentumWaves`, `PitchOverlay`, `PlaybackControls` (Tasks 6–7); `advance`, `scoreAt` (Task 4); `flagEmoji` from `@/lib/flags`; `makeWaveMatch` (Task 6).
- Produces: `WavePortrait({ match }: { match: WaveMatch })` — the full client page body used by the route in Task 9. Starts **paused at minute 0**; pressing Play starts the ~75 s run; scrubbing pauses.

- [ ] **Step 1: Write the failing tests**

`src/components/waves/WavePortrait.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WavePortrait } from "./WavePortrait";
import { makeWaveMatch } from "./test-fixtures";

describe("WavePortrait", () => {
  it("shows both teams with flags and starts at 0 – 0, paused", () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    expect(screen.getByText(/Argentina/)).toBeInTheDocument();
    expect(screen.getByText(/France/)).toBeInTheDocument();
    expect(screen.getByText("0 – 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("updates the running score when scrubbed past goals", () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    const slider = screen.getByRole("slider", { name: "Match minute" });
    fireEvent.change(slider, { target: { value: "30" } });
    expect(screen.getByText("1 – 0")).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "90" } });
    expect(screen.getByText("2 – 1")).toBeInTheDocument();
  });

  it("shows stage, venue, full-time score, and FotMob attribution", () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    expect(screen.getByText(/Final/)).toBeInTheDocument();
    expect(screen.getByText(/Lusail Iconic Stadium/)).toBeInTheDocument();
    expect(screen.getByText(/Full-time 2–1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /FotMob/ })).toBeInTheDocument();
  });

  it("mentions the shootout when there was one", () => {
    render(<WavePortrait match={makeWaveMatch({ penalties: [4, 2] })} />);
    expect(screen.getByText(/4–2 on penalties/)).toBeInTheDocument();
  });

  it("renders the fallback stage in jsdom (no WebGL2)", async () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    expect(await screen.findByTestId("waves-fallback")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/waves/WavePortrait.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/components/waves/WavePortrait.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { WaveMatch } from "@/lib/waves-types";
import { advance, scoreAt } from "@/lib/wave-motion";
import { flagEmoji } from "@/lib/flags";
import { MomentumWaves } from "./MomentumWaves";
import { PitchOverlay } from "./PitchOverlay";
import { PlaybackControls } from "./PlaybackControls";

export function WavePortrait({ match }: { match: WaveMatch }) {
  const totalMinutes = match.momentum[match.momentum.length - 1].minute;
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ended = minute >= totalMinutes;

  useEffect(() => {
    if (!playing || ended) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setMinute((m) => advance(m, dt, totalMinutes));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ended, totalMinutes]);

  const togglePlay = useCallback(() => {
    if (ended) {
      setMinute(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [ended]);

  const score = scoreAt(match.goals, minute);
  const kickoffDate = new Date(match.kickoff).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="waves-portrait">
      <header className="waves-header">
        <span className="waves-team">{flagEmoji(match.home.code)} {match.home.name}</span>
        <span className="waves-score" aria-live="polite">{score[0]} – {score[1]}</span>
        <span className="waves-team">{match.away.name} {flagEmoji(match.away.code)}</span>
      </header>
      <div className="waves-stage-box">
        <MomentumWaves match={match} minute={minute} />
        <PitchOverlay />
      </div>
      <PlaybackControls
        minute={minute}
        totalMinutes={totalMinutes}
        playing={playing}
        ended={ended}
        goals={match.goals}
        onTogglePlay={togglePlay}
        onScrub={(m) => {
          setMinute(m);
          setPlaying(false);
        }}
      />
      <footer className="waves-meta">
        <p>
          {match.stage} · {kickoffDate} · {match.venue} · Full-time {match.score[0]}–{match.score[1]}
          {match.penalties ? ` (${match.penalties[0]}–${match.penalties[1]} on penalties)` : ""}
        </p>
        <p className="fine">
          Momentum data via <a href="https://www.fotmob.com">FotMob</a>. The tide is a smoothed
          interpretation of per-minute momentum — the shape of the match, not a literal replay.
        </p>
      </footer>
    </main>
  );
}
```

Note: when the fallback chart is showing (no WebGL2), `PitchOverlay` still renders on top of it inside `waves-stage-box`; that is fine visually (faint lines over the chart) and keeps the DOM simple.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/waves/WavePortrait.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/waves/WavePortrait.tsx src/components/waves/WavePortrait.test.tsx
git commit -m "feat: WavePortrait page body with clock, score, and metadata"
```

---

### Task 9: Routes, nav, and methodology attribution

**Files:**
- Create: `src/app/waves/page.tsx`
- Create: `src/app/waves/[matchId]/page.tsx`
- Test: `src/app/waves/page.test.tsx`
- Modify: `src/components/Nav.tsx` (add link)
- Modify: `src/components/Nav.test.tsx` (expect the new link)
- Modify: `src/app/about/page.tsx` (FotMob attribution)

**Interfaces:**
- Consumes: `getWaveMatches` / `getWaveMatch` (Task 3), `WavePortrait` (Task 8), `flagEmoji`.
- Produces: routes `/waves` and `/waves/[matchId]`; nav entry "Waves".

- [ ] **Step 1: Write the failing gallery test**

`src/app/waves/page.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WavesPage from "./page";

describe("/waves gallery", () => {
  it("lists all 4 showcase matches as links", () => {
    render(<WavesPage />);
    const links = screen.getAllByRole("link").filter((a) =>
      a.getAttribute("href")?.startsWith("/waves/"),
    );
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/waves/jpn-esp-group", "/waves/cro-bra-qf", "/waves/ned-arg-qf", "/waves/arg-fra-final",
    ]);
  });

  it("shows real scores and shootout results", () => {
    render(<WavesPage />);
    expect(screen.getByText(/Japan v Spain/)).toBeInTheDocument();
    // three of the four showcase matches went to penalties
    expect(screen.getAllByText(/pens/)).toHaveLength(3);
  });

  it("links to the methodology", () => {
    render(<WavesPage />);
    expect(screen.getByRole("link", { name: /methodology/i })).toHaveAttribute("href", "/about");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/waves/page.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the gallery page**

`src/app/waves/page.tsx`:

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import { getWaveMatches } from "@/lib/waves";
import { flagEmoji } from "@/lib/flags";

export const metadata: Metadata = { title: "Momentum Waves" };

export default function WavesPage() {
  return (
    <main className="prose">
      <h1>Momentum Waves</h1>
      <p>
        Each match rendered as a tide of momentum: two team-colored waters meet along a
        moving front, and goals land as ripples. Data via FotMob — see the{" "}
        <Link href="/about">methodology</Link>.
      </p>
      <div className="waves-gallery">
        {getWaveMatches().map((m) => (
          <Link key={m.matchId} href={`/waves/${m.matchId}`} className="waves-card">
            <div className="waves-card-score">
              {flagEmoji(m.home.code)} {m.score[0]} – {m.score[1]} {flagEmoji(m.away.code)}
            </div>
            <div>{m.home.name} v {m.away.name}</div>
            <div className="waves-card-stage">
              {m.stage}
              {m.penalties ? ` · ${m.penalties[0]}–${m.penalties[1]} pens` : ""}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Implement the match page**

`src/app/waves/[matchId]/page.tsx` (Next 15: `params` is a Promise):

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWaveMatch, getWaveMatches } from "@/lib/waves";
import { WavePortrait } from "@/components/waves/WavePortrait";

export function generateStaticParams() {
  return getWaveMatches().map((m) => ({ matchId: m.matchId }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ matchId: string }> },
): Promise<Metadata> {
  const { matchId } = await params;
  const match = getWaveMatch(matchId);
  return {
    title: match
      ? `${match.home.name} v ${match.away.name} — Momentum Waves`
      : "Momentum Waves",
  };
}

export default async function WaveMatchPage(
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const match = getWaveMatch(matchId);
  if (!match) notFound();
  return <WavePortrait match={match} />;
}
```

- [ ] **Step 5: Add the nav link and update its test**

In `src/components/Nav.tsx`, change the `LINKS` array to:

```tsx
const LINKS = [
  { href: "/", label: "Feed" },
  { href: "/explore", label: "Explorer" },
  { href: "/teams", label: "Teams" },
  { href: "/waves", label: "Waves" },
  { href: "/about", label: "Methodology" },
] as const;
```

In `src/components/Nav.test.tsx`, update the link-name list:

```tsx
    for (const name of ["Feed", "Explorer", "Teams", "Waves", "Methodology"]) {
```

- [ ] **Step 6: Add FotMob attribution to the methodology page**

In `src/app/about/page.tsx`, insert after the sources `</ul>` (before the `fine` paragraph):

```tsx
      <p>
        The <a href="/waves">Momentum Waves</a> visualizations additionally use per-minute
        match momentum from <a href="https://www.fotmob.com">FotMob</a>, smoothed for
        readability. The waves are an impression of each match, not a literal replay.
      </p>
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — including the updated `Nav.test.tsx` and the new gallery test.

- [ ] **Step 8: Verify the production build**

Run: `npm run build`
Expected: build succeeds; the route list includes `/waves` and 4 static `/waves/[matchId]` pages.

- [ ] **Step 9: Commit**

```bash
git add src/app/waves/ src/components/Nav.tsx src/components/Nav.test.tsx src/app/about/page.tsx
git commit -m "feat: /waves gallery and match routes, nav entry, FotMob attribution"
```

---

### Task 10: Visual verification and shader tuning

**Files:**
- Possibly modify: `src/components/waves/shaders.ts` (tuning constants only)
- Create (if absent): `.claude/launch.json` (dev-server config for the preview browser)

**Interfaces:**
- Consumes: everything above, running in a real browser.
- Produces: screenshot evidence that the piece looks right; tuned shader constants.

This task is judgment, not TDD. Use the in-app preview browser (`preview_start` with a launch config named `dev` running `npm run dev` on port 3000), not a bare Bash dev server.

- [ ] **Step 1: Start the dev server and open `/waves`**

`.claude/launch.json` if missing:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }
  ]
}
```

Open `/waves`: 4 cards with flags and real scores. Check the browser console for errors — expect none.

- [ ] **Step 2: Open `/waves/arg-fra-final` and verify the static state**

Expect: header `🇦🇷 Argentina 0 – 0 France 🇫🇷`, dark pitch-shaped canvas with two colored waters and faint pitch markings, controls beneath, footer with `Final · 18 December 2022 · Lusail Iconic Stadium · Full-time 3–3 (4–2 on penalties)` and FotMob attribution. **Check the console for WebGL errors** — a shader compile error logs `waves shader compile failed` and shows the fallback chart instead; if that happens, fix the GLSL until the canvas renders.

- [ ] **Step 3: Press Play and watch the full ~75 s playback**

Verify, scrubbing back as needed:
- The front visibly tracks the match story (France barely in it for 80 minutes, then surging).
- Each of the 6 goals fires a ripple + color wash, and the header score updates in sync.
- The clock reaches 120.75′ and the button becomes Replay; Replay restarts from 0.
- Scrubbing pauses playback and the water follows the slider.

- [ ] **Step 4: Tune if needed**

If the piece reads poorly, adjust only these shader constants and re-check:
- `GAIN` (0.425): front excursion — raise if the tide barely moves, lower if a team's water vanishes.
- Shimmer multiplier (`0.72 + 0.5 * shimmer`): overall texture contrast.
- Foam strength (`0.4`) and wake strength (`0.10`): legibility of the front and its history.
- Ripple ring width (`* 16.0`) and wash strength (`0.5`): goal drama.

- [ ] **Step 5: Check the other three matches and responsive behavior**

Open each remaining match; verify distinct water character (different seeds) and correct scores/penalties. Resize to mobile width (375px): canvas keeps the 105:68 aspect, controls wrap sanely, gallery stacks to one column.

- [ ] **Step 6: Capture proof**

Take a screenshot of `/waves/arg-fra-final` mid-playback (ideally just after a goal ripple) and one of `/waves`. Share them in the task report.

- [ ] **Step 7: Final full-suite run and commit any tuning**

```bash
npm test && npm run build
git add -A src/components/waves/ .claude/launch.json
git commit -m "polish: tune wave shader constants after visual review"
```

(Skip the commit if nothing was tuned and no launch.json was created.)

---

## Post-plan checklist (for the executor)

- All 10 tasks committed on `feat/v1.3-momentum-waves`.
- `npm test` and `npm run build` green.
- Use superpowers:finishing-a-development-branch to merge/PR (project convention: PR to `main`, like PRs #1–#3).
