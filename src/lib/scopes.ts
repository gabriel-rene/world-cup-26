export type Scope = "2026-team" | "2026-match";

export const SCOPES: Scope[] = ["2026-team", "2026-match"];

export const SCOPE_LABELS: Record<Scope, string> = {
  "2026-team": "2026 · Teams",
  "2026-match": "2026 · Matches",
};
