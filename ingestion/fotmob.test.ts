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
      // Usually "/matches/{slug}/{hash}"; fotmob can reuse a slug/hash for a
      // later fixture between the same teams, in which case we fall back to
      // the stable "/match/{id}" URL (see cro-bra-qf in waves-config.ts).
      expect(m.pageUrl).toMatch(/^\/match(es)?\//);
    }
  });
});
