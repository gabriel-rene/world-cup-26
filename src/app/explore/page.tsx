"use client";

import { useState } from "react";
import Link from "next/link";
import { VariablePicker } from "@/components/VariablePicker";
import { CorrelationCard } from "@/components/CorrelationCard";
import { variablesForScope } from "@/lib/registry";
import { rowsForScope } from "@/lib/snapshot";
import { SCOPE_LABEL_FIELD, type Scope } from "@/lib/scopes";

export default function Explore() {
  const [scope, setScope] = useState<Scope>("2026-team");
  const [xKey, setXKey] = useState("gdpPerCapita");
  const [yKey, setYKey] = useState("goalsFor");

  const vars = variablesForScope(scope);
  const xVar = vars.find((v) => v.key === xKey) ?? vars[0];
  const yVar = vars.find((v) => v.key === yKey) ?? vars[1] ?? vars[0];
  const labelKey = SCOPE_LABEL_FIELD[scope];

  const onScope = (s: Scope) => {
    const next = variablesForScope(s);
    setScope(s);
    setXKey(next[0].key);
    setYKey(next[1]?.key ?? next[0].key);
  };

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1>Explorer</h1>
      <p style={{ marginTop: -8 }}>
        <Link href="/">← Home</Link> · <Link href="/teams">Teams</Link> ·{" "}
        <Link href="/about">Methodology</Link>
      </p>
      <VariablePicker
        scope={scope} xKey={xVar.key} yKey={yVar.key}
        onScope={onScope} onX={setXKey} onY={setYKey}
      />
      <CorrelationCard rows={rowsForScope(scope)} xVar={xVar} yVar={yVar} labelKey={labelKey} />
    </main>
  );
}
