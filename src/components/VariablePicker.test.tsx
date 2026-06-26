import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariablePicker } from "./VariablePicker";

describe("VariablePicker", () => {
  it("renders scope/X/Y selects and fires callbacks", () => {
    const onScope = vi.fn(), onX = vi.fn(), onY = vi.fn();
    render(
      <VariablePicker scope="2026-team" xKey="gdpPerCapita" yKey="goalsFor"
        onScope={onScope} onX={onX} onY={onY} />,
    );
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(3);
    fireEvent.change(selects[1], { target: { value: "population" } });
    expect(onX).toHaveBeenCalledWith("population");
  });
});
