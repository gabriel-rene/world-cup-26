"use client";

import Link from "next/link";
import { SortableTable } from "@/components/SortableTable";
import { variablesForScope } from "@/lib/registry";
import { getTeams } from "@/lib/snapshot";

export default function Teams() {
  const columns = variablesForScope("team");
  const teams = getTeams();
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>Teams</h1>
      <p>
        Every nation in the snapshot, sortable by any stat.{" "}
        <Link href="/">← Home</Link> · <Link href="/explore">Explorer</Link> ·{" "}
        <Link href="/about">Methodology</Link>
      </p>
      <div style={{ overflowX: "auto" }}>
        <SortableTable rows={teams} columns={columns} />
      </div>
    </main>
  );
}
