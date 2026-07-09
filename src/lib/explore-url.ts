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
// variable that doesn't exist in its scope, and never plots a variable
// against itself when only one axis was specified.
export function parseExploreParams(params: URLSearchParams): ExploreState {
  const rawScope = params.get("scope");
  const scope = SCOPES.includes(rawScope as Scope) ? (rawScope as Scope) : null;
  if (!scope) return { ...EXPLORE_DEFAULTS };

  const vars = variablesForScope(scope);
  const keys = new Set(vars.map((v) => v.key));
  const defaultX = scope === EXPLORE_DEFAULTS.scope ? EXPLORE_DEFAULTS.xKey : vars[0].key;
  const defaultY = scope === EXPLORE_DEFAULTS.scope ? EXPLORE_DEFAULTS.yKey : (vars[1]?.key ?? vars[0].key);

  const rawX = params.get("x");
  const rawY = params.get("y");
  const validX = rawX && keys.has(rawX) ? rawX : null;
  const validY = rawY && keys.has(rawY) ? rawY : null;

  let xKey = validX ?? defaultX;
  let yKey = validY ?? defaultY;
  if (xKey === yKey) {
    // Whichever axis the caller actually specified wins; nudge the
    // defaulted one to the next distinct variable instead of plotting a
    // variable against itself.
    const distinct = vars.find((v) => v.key !== xKey)?.key ?? xKey;
    if (validY === null) yKey = distinct;
    else if (validX === null) xKey = distinct;
    else yKey = distinct; // both explicit and identical: still avoid x === y
  }

  return { scope, xKey, yKey };
}

export function serializeExploreParams(state: ExploreState): string {
  return new URLSearchParams({ scope: state.scope, x: state.xKey, y: state.yKey }).toString();
}
