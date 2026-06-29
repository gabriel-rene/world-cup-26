import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CorrelationCard, buildPoints } from "./CorrelationCard";
import { VARIABLES } from "@/lib/registry";
import type { TeamRow } from "@/lib/types";

const teams: TeamRow[] = [
  { teamId: 1, name: "A", iso3: "BRA", goalsFor: 8, goalsAgainst: 1, shots: 50, passAccuracy: 85, cards: 3, avgPossession: 55, matchesPlayed: 3, population: 1e6, gdp: 1e10, gdpPerCapita: 10000, landArea: 1000 },
  { teamId: 2, name: "B", iso3: "FRA", goalsFor: 4, goalsAgainst: 4, shots: 30, passAccuracy: 80, cards: 5, avgPossession: 48, matchesPlayed: 3, population: 2e6, gdp: 8e10, gdpPerCapita: 40000, landArea: 2000 },
];
const xVar = VARIABLES.find((v) => v.key === "gdpPerCapita" && v.scope === "2026-team")!;
const yVar = VARIABLES.find((v) => v.key === "goalsFor" && v.scope === "2026-team")!;

describe("buildPoints", () => {
  it("maps rows to labeled points and drops nulls", () => {
    const rowsWithNull: TeamRow[] = [...teams, { ...teams[0], teamId: 3, name: "C", gdpPerCapita: null }];
    const pts = buildPoints(rowsWithNull, xVar, yVar, "name");
    expect(pts).toHaveLength(2);
    expect(pts[0]).toMatchObject({ label: "A" });
  });

  it("attaches the country flag for team rows and empty for missing iso", () => {
    const pts = buildPoints(teams, xVar, yVar, "name");
    expect(pts[0].flag).toBe("🇧🇷"); // BRA → 🇧🇷
  });
});

describe("CorrelationCard", () => {
  it("renders the title and an r value", () => {
    render(<CorrelationCard title="Goals vs GDP/capita" rows={teams} xVar={xVar} yVar={yVar} labelKey="name" />);
    expect(screen.getByText("Goals vs GDP/capita")).toBeInTheDocument();
    expect(screen.getByText(/r =/)).toBeInTheDocument();
  });
});
