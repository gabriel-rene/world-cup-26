"use client";

import { SortableTable } from "@/components/SortableTable";
import { variablesForScope } from "@/lib/registry";
import { getTeams } from "@/lib/snapshot";

export default function Teams() {
  const columns = variablesForScope("team");
  const teams = getTeams();
  return (
    <main>
      <h1 className="page-title">Teams</h1>
      <p className="page-sub">Every nation in the snapshot, sortable by any stat.</p>
      <div className="table-scroll">
        <SortableTable rows={teams} columns={columns} />
      </div>
    </main>
  );
}
