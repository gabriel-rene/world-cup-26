export type Scope = "team" | "match";

export const SCOPES: Scope[] = ["team", "match"];

export const SCOPE_LABELS: Record<Scope, string> = {
  "team": "Teams",
  "match": "Matches",
};

export const SCOPE_LABEL_FIELD: Record<Scope, string> = {
  "team": "name",
  "match": "teamName",
};
