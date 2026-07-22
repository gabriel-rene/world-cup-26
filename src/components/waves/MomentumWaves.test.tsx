import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MomentumWaves } from "./MomentumWaves";
import { FallbackChart } from "./FallbackChart";
import { makeWaveMatch } from "./test-fixtures";

describe("MomentumWaves", () => {
  it("falls back to the static chart when WebGL2 is unavailable (jsdom)", async () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);
    render(<MomentumWaves match={makeWaveMatch()} minute={45} />);
    expect(await screen.findByTestId("waves-fallback")).toBeInTheDocument();
    getContext.mockRestore();
  });
});

describe("FallbackChart", () => {
  it("renders the momentum chart with one marker per goal", () => {
    const match = makeWaveMatch();
    const { container } = render(<FallbackChart match={match} />);
    expect(screen.getByRole("img", { name: /momentum/i })).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(match.goals.length);
    expect(screen.getByText(/WebGL2/)).toBeInTheDocument();
  });
});
