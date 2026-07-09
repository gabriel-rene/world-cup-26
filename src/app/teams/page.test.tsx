import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Teams from "./page";

describe("/teams page", () => {
  it("renders the heading and the sortable table headers", () => {
    render(<Teams />);
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Nation/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Goals scored/ })).toBeInTheDocument();
  });
});
