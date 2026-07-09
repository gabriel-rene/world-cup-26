export type VerdictTone = "muted" | "pitch" | "yellow";

export interface Verdict {
  label: string;
  tone: VerdictTone;
}

// Plain-language reading of a correlation, tuned for honesty over drama:
// strong r on observational tournament data is grounds for suspicion (a
// referee's yellow card), not celebration.
export function interpretR(r: number, n: number): Verdict {
  if (Number.isNaN(r) || n === 0) return { label: "not enough data", tone: "muted" };
  if (n < 10) return { label: "tiny sample — anything correlates", tone: "muted" };
  const abs = Math.abs(r);
  if (abs < 0.2) return { label: "basically noise", tone: "muted" };
  if (abs < 0.6) return { label: "mild trend", tone: "pitch" };
  return { label: "suspiciously strong", tone: "yellow" };
}
