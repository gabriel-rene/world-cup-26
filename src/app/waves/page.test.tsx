import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WavesPage from "./page";

describe("/waves gallery", () => {
  it("lists all 4 showcase matches as links", () => {
    render(<WavesPage />);
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/waves/"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/waves/jpn-esp-group",
      "/waves/cro-bra-qf",
      "/waves/ned-arg-qf",
      "/waves/arg-fra-final",
    ]);
  });

  it("shows real scores and shootout results", () => {
    render(<WavesPage />);
    expect(screen.getByText(/Japan v Spain/)).toBeInTheDocument();
    expect(screen.getAllByText(/pens/)).toHaveLength(3);
  });

  it("links to the methodology", () => {
    render(<WavesPage />);
    expect(screen.getByRole("link", { name: /methodology/i })).toHaveAttribute("href", "/about");
  });
});
