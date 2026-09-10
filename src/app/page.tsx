"use client";

import Link from "next/link";
import { CorrelationCard } from "@/components/CorrelationCard";
import { INSIGHTS, resolveInsight } from "./insights";
import { rowsForScope, getMeta, getTeams, getMatches } from "@/lib/snapshot";
import { SCOPE_LABEL_FIELD } from "@/lib/scopes";

export default function Home() {
  return (
    <main>
      <div className="hero">
        <div>
          <p className="kicker">Football × the world around it</p>
          <h1>Beautiful game.<br />Curious numbers.</h1>
          <p className="intro">Does wealth win matches? Does the weather change the game? Explore the unexpected relationships behind the World Cup.</p>
          <Link className="text-link" href="/explore">Find your own correlation ↗</Link>
        </div>
        <aside className="hero-aside">
          <h2>The whole tournament.</h2>
          <p>48 nations. 104 matches. Follow the patterns in possession, shot quality and scoring — then watch how each match unfolded.</p>
          <Link className="text-link" href="/waves">Watch the momentum waves ↗</Link>
        </aside>
      </div>
      <div className="dataset-strip">
        <strong>{getMeta().tournament} · Complete tournament</strong>
        <span>{getTeams().length} teams / {new Set(getMatches().map(m => m.fixtureId)).size} matches / {INSIGHTS.length} questions</span>
        <Link href="/about">Sources & methodology ↗</Link>
      </div>
      <div className="feed-heading">
        <h2>Patterns worth questioning.</h2>
        <p>2026 data. Correlation ≠ causation.</p>
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
