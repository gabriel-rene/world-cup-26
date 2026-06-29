import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortableTable } from "./SortableTable";
import { variablesForScope } from "@/lib/registry";
import type { TeamRow } from "@/lib/types";

const columns = variablesForScope("2026-team");

const rows: TeamRow[] = [
  { teamId: 1, name: "Argentina", iso3: "ARG", goalsFor: 8, goalsAgainst: 1, shots: 50, passAccuracy: 85, cards: 3, avgPossession: 55, matchesPlayed: 3, population: 1e6, gdp: 1e10, gdpPerCapita: 10000, landArea: 1000 },
  { teamId: 2, name: "Brazil", iso3: "BRA", goalsFor: 4, goalsAgainst: 4, shots: 30, passAccuracy: 80, cards: 5, avgPossession: 48, matchesPlayed: 3, population: 2e6, gdp: 8e10, gdpPerCapita: 40000, landArea: 2000 },
];

describe("SortableTable", () => {
  it("derives column headers from the registry", () => {
    render(<SortableTable rows={rows} columns={columns} />);
    // "Goals scored" is the registry label for the 2026-team goalsFor variable.
    expect(screen.getByRole("columnheader", { name: /Goals scored/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Nation/ })).toBeInTheDocument();
  });

  it("sorts by a stat column when its header is clicked", () => {
    render(<SortableTable rows={rows} columns={columns} />);
    // Default: name ascending -> Argentina before Brazil.
    let bodyRows = screen.getAllByRole("row").slice(1); // drop header row
    expect(bodyRows[0]).toHaveTextContent("Argentina");

    // Click "Goals scored" -> ascending by goalsFor -> Brazil (4) before Argentina (8).
    fireEvent.click(screen.getByRole("columnheader", { name: /Goals scored/ }));
    bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows[0]).toHaveTextContent("Brazil");
  });
});
