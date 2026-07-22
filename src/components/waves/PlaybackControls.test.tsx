import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "./PlaybackControls";
import { makeWaveMatch } from "./test-fixtures";

const goals = makeWaveMatch().goals;

function renderControls(overrides: Partial<Parameters<typeof PlaybackControls>[0]> = {}) {
  const props = {
    minute: 30,
    totalMinutes: 90,
    playing: false,
    ended: false,
    goals,
    onTogglePlay: vi.fn(),
    onScrub: vi.fn(),
    ...overrides,
  };
  const utils = render(<PlaybackControls {...props} />);
  return { ...utils, props };
}

describe("PlaybackControls", () => {
  it("shows Play when paused and calls onTogglePlay", () => {
    const { props } = renderControls();
    const btn = screen.getByRole("button", { name: "Play" });
    fireEvent.click(btn);
    expect(props.onTogglePlay).toHaveBeenCalledOnce();
  });

  it("shows Pause while playing", () => {
    renderControls({ playing: true });
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("shows Replay when ended", () => {
    renderControls({ ended: true });
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
  });

  it("scrubbing reports the minute as a number", () => {
    const { props } = renderControls();
    fireEvent.change(screen.getByRole("slider", { name: "Match minute" }), {
      target: { value: "72.5" },
    });
    expect(props.onScrub).toHaveBeenCalledWith(72.5);
  });

  it("renders one tick per goal and the current minute", () => {
    const { container } = renderControls();
    expect(container.querySelectorAll(".waves-goal-tick")).toHaveLength(goals.length);
    expect(screen.getByText("30′")).toBeInTheDocument();
  });
});
