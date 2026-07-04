import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortableTable } from "./SortableTable";
import { variablesForScope } from "@/lib/registry";
import type { TeamRow } from "@/lib/types";

const columns = variablesForScope("team");

const rows: TeamRow[] = [
  { teamId: 1, name: "Argentina", iso3: "ARG", goalsFor: 8, goalsAgainst: 1, shots: 50, passAccuracy: 85, cards: 3, avgPossession: 55, matchesPlayed: 3, population: 1e6, gdp: 1e10, gdpPerCapita: 10000, landArea: 1000 },
  { teamId: 2, name: "Brazil", iso3: "BRA", goalsFor: 4, goalsAgainst: 4, shots: 30, passAccuracy: 80, cards: 5, avgPossession: 48, matchesPlayed: 3, population: 2e6, gdp: 8e10, gdpPerCapita: 40000, landArea: 2000 },
];

describe("SortableTable", () => {
  it("derives column headers from the registry", () => {
    render(<SortableTable rows={rows} columns={columns} />);
    // "Goals scored" is the registry label for the team goalsFor variable.
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

  it("sorts null values last regardless of sort direction (ascending and descending)", () => {
    // Rows: Alpha (population 2e6), Beta (population 1e6), Nullland (population null)
    const nullTestRows: TeamRow[] = [
      { teamId: 1, name: "Alpha", iso3: "ALP", goalsFor: 10, goalsAgainst: 2, shots: 40, passAccuracy: 82, cards: 2, avgPossession: 52, matchesPlayed: 3, population: 2e6, gdp: 5e10, gdpPerCapita: 25000, landArea: 500 },
      { teamId: 2, name: "Beta", iso3: "BET", goalsFor: 6, goalsAgainst: 3, shots: 35, passAccuracy: 78, cards: 4, avgPossession: 50, matchesPlayed: 3, population: 1e6, gdp: 3e10, gdpPerCapita: 30000, landArea: 800 },
      { teamId: 3, name: "Nullland", iso3: "NUL", goalsFor: 12, goalsAgainst: 1, shots: 45, passAccuracy: 88, cards: 1, avgPossession: 58, matchesPlayed: 3, population: null, gdp: 1e10, gdpPerCapita: 15000, landArea: 200 },
    ];

    render(<SortableTable rows={nullTestRows} columns={columns} />);

    // Click "Population" header for ascending sort
    fireEvent.click(screen.getByRole("columnheader", { name: /Population/ }));
    let bodyRows = screen.getAllByRole("row").slice(1); // drop header row
    // Ascending: Beta (1e6), Alpha (2e6), Nullland (null) — null is LAST
    expect(bodyRows[0]).toHaveTextContent("Beta");
    expect(bodyRows[1]).toHaveTextContent("Alpha");
    expect(bodyRows[2]).toHaveTextContent("Nullland");

    // Click "Population" again for descending sort
    fireEvent.click(screen.getByRole("columnheader", { name: /Population/ }));
    bodyRows = screen.getAllByRole("row").slice(1);
    // Descending: Alpha (2e6), Beta (1e6), Nullland (null) — null is STILL LAST
    expect(bodyRows[0]).toHaveTextContent("Alpha");
    expect(bodyRows[1]).toHaveTextContent("Beta");
    expect(bodyRows[2]).toHaveTextContent("Nullland");
  });
});
