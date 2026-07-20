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
