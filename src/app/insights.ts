import type { Scope } from "@/lib/scopes";
import { VARIABLES } from "@/lib/registry";

export interface Insight {
  title: string;
  scope: Scope;
  xKey: string;
  yKey: string;
}

export const INSIGHTS: Insight[] = [
  { title: "Do richer nations score more?", scope: "team", xKey: "gdpPerCapita", yKey: "goalsFor" },
  { title: "Bigger countries, more goals?", scope: "team", xKey: "population", yKey: "goalsFor" },
  { title: "Does the heat kill possession?", scope: "match", xKey: "temperatureC", yKey: "possession" },
  { title: "More possession, more shots?", scope: "match", xKey: "possession", yKey: "shots" },
  { title: "Bigger country, longer passes?", scope: "team", xKey: "landArea", yKey: "passAccuracy" },
  { title: "Do richer nations play cleaner?", scope: "team", xKey: "gdpPerCapita", yKey: "cards" },
  { title: "Goals gone with the wind?", scope: "match", xKey: "windKph", yKey: "goals" },
  { title: "Sweaty palms, fewer shots?", scope: "match", xKey: "humidity", yKey: "shots" },
];

export function resolveInsight(i: Insight) {
  const xVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.xKey);
  const yVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.yKey);
  if (!xVar || !yVar) throw new Error(`Unknown variable in insight "${i.title}"`);
  return { xVar, yVar };
}
