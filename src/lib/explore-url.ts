import { SCOPES, type Scope } from "./scopes";
import { variablesForScope } from "./registry";

export interface ExploreState {
  scope: Scope;
  xKey: string;
  yKey: string;
}

export const EXPLORE_DEFAULTS: ExploreState = {
  scope: "team",
  xKey: "gdpPerCapita",
  yKey: "goalsFor",
};

// Validates against the registry so a shared link can never select a
// variable that doesn't exist in its scope.
export function parseExploreParams(params: URLSearchParams): ExploreState {
  const rawScope = params.get("scope");
  const scope = SCOPES.includes(rawScope as Scope) ? (rawScope as Scope) : null;
  if (!scope) return { ...EXPLORE_DEFAULTS };

  const keys = new Set(variablesForScope(scope).map((v) => v.key));
  const fallback = scope === EXPLORE_DEFAULTS.scope
    ? EXPLORE_DEFAULTS
    : { xKey: variablesForScope(scope)[0].key, yKey: variablesForScope(scope)[1]?.key ?? variablesForScope(scope)[0].key };

  const x = params.get("x");
  const y = params.get("y");
  return {
    scope,
    xKey: x && keys.has(x) ? x : fallback.xKey,
    yKey: y && keys.has(y) ? y : fallback.yKey,
  };
}

export function serializeExploreParams(state: ExploreState): string {
  return new URLSearchParams({ scope: state.scope, x: state.xKey, y: state.yKey }).toString();
}
