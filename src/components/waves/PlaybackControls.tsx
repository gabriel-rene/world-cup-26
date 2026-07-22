"use client";

import type { WaveGoal } from "@/lib/waves-types";

interface Props {
  minute: number;
  totalMinutes: number;
  playing: boolean;
  ended: boolean;
  goals: WaveGoal[];
  onTogglePlay: () => void;
  onScrub: (minute: number) => void;
}

export function PlaybackControls({
  minute,
  totalMinutes,
  playing,
  ended,
  goals,
  onTogglePlay,
  onScrub,
}: Props) {
  const action = ended ? "Replay" : playing ? "Pause" : "Play";

  return (
    <div className="waves-controls">
      <button type="button" onClick={onTogglePlay} aria-label={action}>
        <span aria-hidden="true">{ended ? "↻" : playing ? "❚❚" : "▶"}</span>
      </button>
      <div className="waves-scrub">
        <input
          type="range"
          min={0}
          max={totalMinutes}
          step={0.1}
          value={minute}
          aria-label="Match minute"
          onChange={(event) => onScrub(Number(event.target.value))}
        />
        <div className="waves-goal-ticks" aria-hidden="true">
          {goals.map((goal, index) => (
            <span
              key={`${goal.minute}-${goal.side}-${index}`}
              className="waves-goal-tick"
              style={{ left: `${(goal.minute / totalMinutes) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <span className="waves-minute" aria-live="off">
        {Math.floor(minute)}′
      </span>
    </div>
  );
}
