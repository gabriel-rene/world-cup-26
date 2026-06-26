import Link from "next/link";
import { CorrelationCard } from "@/components/CorrelationCard";
import { INSIGHTS, resolveInsight } from "./insights";
import { rowsForScope } from "@/lib/snapshot";

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>World Cup 2026 — Fun Correlations</h1>
      <p>
        Playful correlations between football data and public country data.{" "}
        <Link href="/explore">Build your own →</Link> · <Link href="/about">Methodology</Link>
      </p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {INSIGHTS.map((insight) => {
          const { xVar, yVar } = resolveInsight(insight);
          const labelKey = insight.scope === "2026-team" ? "name" : "teamName";
          return (
            <CorrelationCard
              key={insight.title}
              title={insight.title}
              rows={rowsForScope(insight.scope)}
              xVar={xVar}
              yVar={yVar}
              labelKey={labelKey}
            />
          );
        })}
      </div>
    </main>
  );
}
