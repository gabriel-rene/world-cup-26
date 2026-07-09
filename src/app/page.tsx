"use client";

import Link from "next/link";
import { CorrelationCard } from "@/components/CorrelationCard";
import { INSIGHTS, resolveInsight } from "./insights";
import { rowsForScope, getMeta } from "@/lib/snapshot";
import { SCOPE_LABEL_FIELD } from "@/lib/scopes";

export default function Home() {
  return (
    <main>
      <div className="hero">
        <p className="kicker">{getMeta().tournament}</p>
        <h1>Fun Correlations</h1>
        <p>
          Playful correlations between football data and public country data.
          Correlation ≠ causation — that&apos;s the fun part. Strong ones get a{" "}
          yellow card. <Link href="/explore">Build your own →</Link>
        </p>
      </div>
      <div className="card-grid">
        {INSIGHTS.map((insight) => {
          const { xVar, yVar } = resolveInsight(insight);
          const labelKey = SCOPE_LABEL_FIELD[insight.scope];
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
