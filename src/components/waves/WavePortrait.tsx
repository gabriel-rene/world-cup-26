"use client";

import { useCallback, useEffect, useState } from "react";
import { flagEmoji } from "@/lib/flags";
import { advance, scoreAt } from "@/lib/wave-motion";
import type { WaveMatch } from "@/lib/waves-types";
import { MomentumWaves } from "./MomentumWaves";
import { PitchOverlay } from "./PitchOverlay";
import { PlaybackControls } from "./PlaybackControls";

export function WavePortrait({ match }: { match: WaveMatch }) {
  const totalMinutes = match.momentum[match.momentum.length - 1].minute;
  const [minute, setMinute] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ended = minute >= totalMinutes;

  useEffect(() => {
    if (!playing || ended) return;

    let animationFrame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const elapsedSeconds = (now - last) / 1000;
      last = now;
      setMinute((current) => advance(current, elapsedSeconds, totalMinutes));
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [playing, ended, totalMinutes]);

  const togglePlay = useCallback(() => {
    if (ended) {
      setMinute(0);
      setPlaying(true);
      return;
    }
    setPlaying((current) => !current);
  }, [ended]);

  const score = scoreAt(match.goals, minute);
  const kickoffDate = new Date(match.kickoff).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="waves-portrait">
      <header className="waves-header">
        <span className="waves-team">
          {flagEmoji(match.home.code)} {match.home.name}
        </span>
        <span className="waves-score" aria-live="polite">
          {score[0]} – {score[1]}
        </span>
        <span className="waves-team">
          {match.away.name} {flagEmoji(match.away.code)}
        </span>
      </header>

      <div className="waves-stage-box">
        <MomentumWaves match={match} minute={minute} />
        <PitchOverlay />
      </div>

      <PlaybackControls
        minute={minute}
        totalMinutes={totalMinutes}
        playing={playing}
        ended={ended}
        goals={match.goals}
        onTogglePlay={togglePlay}
        onScrub={(nextMinute) => {
          setMinute(nextMinute);
          setPlaying(false);
        }}
      />

      <footer className="waves-meta">
        <p>
          {match.stage} · {kickoffDate} · {match.venue} · Full-time {match.score[0]}–
          {match.score[1]}
          {match.penalties
            ? ` (${match.penalties[0]}–${match.penalties[1]} on penalties)`
            : ""}
        </p>
        <p className="fine">
          Momentum data via <a href="https://www.fotmob.com">FotMob</a>. The tide is a smoothed
          interpretation of per-minute momentum—the shape of the match, not a literal replay.
        </p>
      </footer>
    </main>
  );
}
