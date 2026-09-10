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
  displayMinute?: string;
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
