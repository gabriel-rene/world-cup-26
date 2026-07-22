import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WavePortrait } from "./WavePortrait";
import { makeWaveMatch } from "./test-fixtures";

describe("WavePortrait", () => {
  it("shows both teams with flags and starts at 0 – 0, paused", () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    expect(screen.getByText(/Argentina/)).toBeInTheDocument();
    expect(screen.getByText(/France/)).toBeInTheDocument();
    expect(screen.getByText("0 – 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("updates the running score when scrubbed past goals", () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    const slider = screen.getByRole("slider", { name: "Match minute" });
    fireEvent.change(slider, { target: { value: "30" } });
    expect(screen.getByText("1 – 0")).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "90" } });
    expect(screen.getByText("2 – 1")).toBeInTheDocument();
  });

  it("shows stage, venue, full-time score, and FotMob attribution", () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    expect(screen.getByText(/Final/)).toBeInTheDocument();
    expect(screen.getByText(/Lusail Iconic Stadium/)).toBeInTheDocument();
    expect(screen.getByText(/Full-time 2–1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /FotMob/ })).toBeInTheDocument();
  });

  it("mentions the shootout when there was one", () => {
    render(<WavePortrait match={makeWaveMatch({ penalties: [4, 2] })} />);
    expect(screen.getByText(/4–2 on penalties/)).toBeInTheDocument();
  });

  it("renders the fallback stage in jsdom (no WebGL2)", async () => {
    render(<WavePortrait match={makeWaveMatch()} />);
    expect(await screen.findByTestId("waves-fallback")).toBeInTheDocument();
  });
});
