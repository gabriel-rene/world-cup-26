import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "./Nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/teams" }));

describe("Nav", () => {
  it("renders the wordmark, tournament label, and all section links", () => {
    render(<Nav />);
    expect(screen.getByText("Fun Correlations")).toBeInTheDocument();
    expect(screen.getByText(/FIFA World Cup/)).toBeInTheDocument();
    for (const name of ["Feed", "Explorer", "Teams", "Methodology"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("marks the current section", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: "Teams" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Feed" })).not.toHaveAttribute("aria-current");
  });
});
