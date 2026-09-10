import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WavesPage from "./page";

describe("/waves gallery", () => {
  it("lists all 104 2026 matches and filters by team", () => {
    render(<WavesPage />);
    const links = () => screen.getAllByRole("link").filter(link => link.getAttribute("href")?.startsWith("/waves/"));
    expect(links()).toHaveLength(104);
    fireEvent.change(screen.getByLabelText("Find a team"), { target: { value: "Mexico" } });
    expect(links().length).toBeGreaterThanOrEqual(3);
    expect(links().every(link => link.textContent?.includes("Mexico"))).toBe(true);
    fireEvent.change(screen.getByLabelText("Tournament stage"), { target: { value: "Final" } });
    expect(screen.getByText(/No matches found/)).toBeInTheDocument();
  });

  it("filters to the actual 2026 final", () => {
    render(<WavesPage />);
    fireEvent.change(screen.getByLabelText("Tournament stage"), { target: { value: "Final" } });
    expect(screen.getByText("Spain v Argentina")).toBeInTheDocument();
    expect(screen.getByText(/1 of 104 matches/)).toBeInTheDocument();
  });

  it("links to the methodology", () => {
    render(<WavesPage />);
    expect(screen.getByRole("link", { name: /methodology/i })).toHaveAttribute("href", "/about");
  });
});
