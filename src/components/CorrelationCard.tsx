"use client";

import {
  Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, ComposedChart, LabelList,
} from "recharts";
import { computeCorrelation, type Point } from "@/lib/correlation";
import { interpretR } from "@/lib/verdict";
import { flagEmoji } from "@/lib/flags";
import type { VariableDef } from "@/lib/registry";
import type { TeamRow, MatchTeamRow } from "@/lib/types";

export interface CorrelationCardProps {
  title?: string;
  rows: (TeamRow | MatchTeamRow)[];
  xVar: VariableDef;
  yVar: VariableDef;
  labelKey: string;
}

export function buildPoints(
  rows: (TeamRow | MatchTeamRow)[],
  xVar: VariableDef,
  yVar: VariableDef,
  labelKey: string,
): Point[] {
  const pts: Point[] = [];
  for (const row of rows) {
    const x = xVar.accessor(row);
    const y = yVar.accessor(row);
    if (x === null || y === null) continue;
    // Read the label key and iso3 dynamically; match rows have no iso3.
    const record = row as unknown as Record<string, unknown>;
    const iso3 = typeof record.iso3 === "string" ? (record.iso3 as string) : "";
    pts.push({
      x,
      y,
      label: String(record[labelKey] ?? ""),
      flag: iso3 ? flagEmoji(iso3) : "",
    });
  }
  return pts;
}

// Recharts' Tooltip content prop types payload entries' inner payload as optional
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload?: Point }[];
}

export function CorrelationCard({ title, rows, xVar, yVar, labelKey }: CorrelationCardProps) {
  const points = buildPoints(rows, xVar, yVar, labelKey);
  const { r, slope, intercept, n } = computeCorrelation(points);

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const line = Number.isNaN(slope)
    ? []
    : [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept },
      ];

  const renderTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload;
    if (!p) return null;
    return (
      <div className="chart-tooltip">
        <div className="tooltip-label">{p.flag ? `${p.flag} ` : ""}{p.label}</div>
        <div>{xVar.label}: {xVar.format(p.x)}</div>
        <div>{yVar.label}: {yVar.format(p.y)}</div>
      </div>
    );
  };

  const verdict = interpretR(r, n);
  const tick = { fill: "var(--muted)", fontSize: 11.5, fontFamily: "var(--font-mono), monospace" };

  return (
    <section className="corr-card">
      {title && <h3>{title}</h3>}
      <p className="corr-meta">
        <span>{xVar.label} vs {yVar.label}</span>
        {!Number.isNaN(r) && <span className="stat">r = {r.toFixed(2)} · n = {n}</span>}
        <span>{n} of {rows.length} observations</span>
        <span className={`verdict verdict-${verdict.tone}`}>{verdict.label}</span>
      </p>
      <div className="chart-box">
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis type="number" dataKey="x" name={xVar.label} tick={tick}
              stroke="var(--line)" tickFormatter={(v) => Math.abs(Number(v)) >= 10000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(v)) : xVar.format(Number(v))} />
            <YAxis type="number" dataKey="y" name={yVar.label} tick={tick}
              stroke="var(--line)" tickFormatter={(v) => Math.abs(Number(v)) >= 10000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(v)) : yVar.format(Number(v))} />
            <ZAxis range={[60, 60]} />
            <Tooltip content={renderTooltip} />
            <Scatter isAnimationActive={false} data={points} fill="var(--chart-dot)">
              <LabelList dataKey="flag" position="top" style={{ fontSize: 14 }} />
            </Scatter>
            {line.length === 2 && (
              <Line data={line} dataKey="y" dot={false} stroke="var(--chart-line)"
                strokeWidth={2} isAnimationActive={false} legendType="none" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data"><summary>Inspect the data</summary><div className="table-scroll"><table className="stat-table"><thead><tr><th>Observation</th><th>{xVar.label}</th><th>{yVar.label}</th></tr></thead><tbody>{points.map((point, i) => <tr key={i}><td>{point.label}</td><td>{xVar.format(point.x)}</td><td>{yVar.format(point.y)}</td></tr>)}</tbody></table></div></details>
      <div className="chart-caption"><span>Horizontal: {xVar.label}</span><span>Vertical: {yVar.label}</span></div>
    </section>
  );
}
