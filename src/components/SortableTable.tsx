"use client";

import { useState } from "react";
import { flagEmoji } from "@/lib/flags";
import type { VariableDef } from "@/lib/registry";
import type { TeamRow } from "@/lib/types";

export interface SortableTableProps {
  rows: TeamRow[];
  columns: VariableDef[];
}

type SortDir = "asc" | "desc";
const NAME_KEY = "name";

export function SortableTable({ rows, columns }: SortableTableProps) {
  const [sortKey, setSortKey] = useState<string>(NAME_KEY);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const valueFor = (row: TeamRow, key: string): number | string | null => {
    if (key === NAME_KEY) return row.name;
    const col = columns.find((c) => c.key === key);
    return col ? col.accessor(row) : null;
  };

  const sorted = [...rows].sort((a, b) => {
    const av = valueFor(a, sortKey);
    const bv = valueFor(b, sortKey);
    if (av === null && bv === null) return 0;
    if (av === null) return 1; // nulls last, regardless of direction
    if (bv === null) return -1;
    const cmp =
      typeof av === "string"
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const onSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const arrow = (key: string) =>
    key === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <table className="stat-table">
      <thead>
        <tr>
          <th style={{ textAlign: "left" }} onClick={() => onSort(NAME_KEY)}>
            Nation{arrow(NAME_KEY)}
          </th>
          {columns.map((c) => (
            <th key={c.key} className="num" onClick={() => onSort(c.key)}>
              {c.label}
              {arrow(c.key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={row.teamId}>
            <td>
              <span className="flag">{flagEmoji(row.iso3)}</span>
              {row.name}
            </td>
            {columns.map((c) => {
              const v = c.accessor(row);
              return (
                <td key={c.key} className="num">
                  {v === null ? "—" : c.format(v)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
