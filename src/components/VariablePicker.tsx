"use client";

import { SCOPES, SCOPE_LABELS, type Scope } from "@/lib/scopes";
import { variablesForScope } from "@/lib/registry";

export interface VariablePickerProps {
  scope: Scope;
  xKey: string;
  yKey: string;
  onScope: (s: Scope) => void;
  onX: (k: string) => void;
  onY: (k: string) => void;
}

export function VariablePicker({ scope, xKey, yKey, onScope, onX, onY }: VariablePickerProps) {
  const vars = variablesForScope(scope);
  return (
    <div className="picker">
      <label>
        Scope
        <select value={scope} onChange={(e) => onScope(e.target.value as Scope)}>
          {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
        </select>
      </label>
      <label>
        X axis
        <select value={xKey} onChange={(e) => onX(e.target.value)}>
          {vars.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
      </label>
      <label>
        Y axis
        <select value={yKey} onChange={(e) => onY(e.target.value)}>
          {vars.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </select>
      </label>
    </div>
  );
}
