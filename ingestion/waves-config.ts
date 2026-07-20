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
    // NOTE: the original "/matches/brazil-vs-croatia/2swyz6" slug now
    // resolves to an unrelated 2026 friendly (fotmob reused the slug).
    // The direct /match/{id} URL still resolves to the real Dec 9, 2022
    // WC 2022 quarter-final; verified via curl before switching.
    pageUrl: "/match/3370565",
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
