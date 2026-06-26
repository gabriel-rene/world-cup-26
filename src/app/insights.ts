import type { Scope } from "@/lib/scopes";
import { VARIABLES } from "@/lib/registry";

export interface Insight {
  title: string;
  scope: Scope;
  xKey: string;
  yKey: string;
}

export const INSIGHTS: Insight[] = [
  { title: "Do richer nations score more?", scope: "2026-team", xKey: "gdpPerCapita", yKey: "goalsFor" },
  { title: "Bigger countries, more goals?", scope: "2026-team", xKey: "population", yKey: "goalsFor" },
  { title: "Does the heat kill possession?", scope: "2026-match", xKey: "temperatureC", yKey: "possession" },
  { title: "More possession, more shots?", scope: "2026-match", xKey: "possession", yKey: "shots" },
];

export function resolveInsight(i: Insight) {
  const xVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.xKey);
  const yVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.yKey);
  if (!xVar || !yVar) throw new Error(`Unknown variable in insight "${i.title}"`);
  return { xVar, yVar };
}
