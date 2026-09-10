import type { Scope } from "@/lib/scopes";
import { VARIABLES } from "@/lib/registry";

export interface Insight {
  title: string;
  scope: Scope;
  xKey: string;
  yKey: string;
}

export const INSIGHTS: Insight[] = [
  { title: "Do better chances become goals?", scope: "match", xKey: "xg", yKey: "goals" },
  { title: "Does possession produce more shots?", scope: "match", xKey: "possession", yKey: "shots" },
  { title: "Do richer nations score more per match?", scope: "team", xKey: "gdpPerCapita", yKey: "goalsPerMatch" },
  { title: "More people, better chances?", scope: "team", xKey: "population", yKey: "xgPerMatch" },
  { title: "Does heat change shot volume?", scope: "match", xKey: "temperatureC", yKey: "shots" },
  { title: "Accurate passes, more shots?", scope: "team", xKey: "passAccuracy", yKey: "shotsPerMatch" },
  { title: "Goals gone with the wind?", scope: "match", xKey: "windKph", yKey: "goals" },
  { title: "Does humidity change scoring?", scope: "match", xKey: "humidity", yKey: "goals" },
];

export function resolveInsight(i: Insight) {
  const xVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.xKey);
  const yVar = VARIABLES.find((v) => v.scope === i.scope && v.key === i.yKey);
  if (!xVar || !yVar) throw new Error(`Unknown variable in insight "${i.title}"`);
  return { xVar, yVar };
}
