"use client";

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Line, ComposedChart,
} from "recharts";
import { computeCorrelation, type Point } from "@/lib/correlation";
import type { VariableDef } from "@/lib/registry";
import type { TeamRow, MatchTeamRow } from "@/lib/types";

export interface CorrelationCardProps {
  title?: string;
  rows: (TeamRow | MatchTeamRow)[];
  xVar: VariableDef;
  yVar: VariableDef;
  labelKey: "name" | "teamName";
}

export function buildPoints(
  rows: (TeamRow | MatchTeamRow)[],
  xVar: VariableDef,
  yVar: VariableDef,
  labelKey: "name" | "teamName",
): Point[] {
  const pts: Point[] = [];
  for (const row of rows) {
    const x = xVar.accessor(row);
    const y = yVar.accessor(row);
    if (x === null || y === null) continue;
    // Cast to Record<string, unknown> to read the label key dynamically
    pts.push({ x, y, label: String((row as Record<string, unknown>)[labelKey] ?? "") });
  }
  return pts;
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

  return (
    <section style={{ border: "1px solid #e3e3e3", borderRadius: 12, padding: 16 }}>
      {title && <h3 style={{ margin: "0 0 4px" }}>{title}</h3>}
      <p style={{ margin: "0 0 8px", color: "#555" }}>
        {xVar.label} vs {yVar.label}
        {" · "}
        {Number.isNaN(r) ? "not enough data" : `r = ${r.toFixed(2)} (n = ${n})`}
      </p>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xVar.label}
              tickFormatter={(v) => xVar.format(Number(v))} />
            <YAxis type="number" dataKey="y" name={yVar.label}
              tickFormatter={(v) => yVar.format(Number(v))} />
            <ZAxis range={[60, 60]} />
            <Tooltip
              formatter={(value: number, key: string) =>
                key === "x" ? xVar.format(value) : yVar.format(value)
              }
              labelFormatter={() => ""}
            />
            <Scatter data={points} fill="#2563eb" />
            {line.length === 2 && (
              <Line data={line} dataKey="y" dot={false} stroke="#ef4444"
                strokeWidth={2} isAnimationActive={false} legendType="none" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
