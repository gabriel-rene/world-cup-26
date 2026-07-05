"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VariablePicker } from "@/components/VariablePicker";
import { CorrelationCard } from "@/components/CorrelationCard";
import { variablesForScope } from "@/lib/registry";
import { rowsForScope } from "@/lib/snapshot";
import { SCOPE_LABEL_FIELD, type Scope } from "@/lib/scopes";
import { parseExploreParams, serializeExploreParams, type ExploreState } from "@/lib/explore-url";

function Explorer() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ExploreState>(() => parseExploreParams(searchParams));
  const [copied, setCopied] = useState(false);

  // Keep the URL shareable without adding history entries on every tweak.
  useEffect(() => {
    const qs = serializeExploreParams(state);
    window.history.replaceState(null, "", `?${qs}`);
    setCopied(false);
  }, [state]);

  const vars = variablesForScope(state.scope);
  const xVar = vars.find((v) => v.key === state.xKey) ?? vars[0];
  const yVar = vars.find((v) => v.key === state.yKey) ?? vars[1] ?? vars[0];
  const labelKey = SCOPE_LABEL_FIELD[state.scope];

  const onScope = (s: Scope) => {
    const next = variablesForScope(s);
    setState({ scope: s, xKey: next[0].key, yKey: next[1]?.key ?? next[0].key });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  return (
    <>
      <h1 className="page-title">Explorer</h1>
      <p className="page-sub">
        Pick any two variables — the link in your address bar always points at
        what you&apos;re seeing.
      </p>
      <VariablePicker
        scope={state.scope} xKey={xVar.key} yKey={yVar.key}
        onScope={onScope}
        onX={(k) => setState((s) => ({ ...s, xKey: k }))}
        onY={(k) => setState((s) => ({ ...s, yKey: k }))}
      />
      <CorrelationCard rows={rowsForScope(state.scope)} xVar={xVar} yVar={yVar} labelKey={labelKey} />
      <p style={{ marginTop: 14 }}>
        <button type="button" className="button button-quiet" onClick={copyLink}>
          {copied ? "Link copied" : "Copy link to this correlation"}
        </button>
      </p>
    </>
  );
}

export default function ExplorePage() {
  return (
    <main>
      <Suspense>
        <Explorer />
      </Suspense>
    </main>
  );
}
