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
