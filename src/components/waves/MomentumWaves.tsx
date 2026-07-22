"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WaveMatch } from "@/lib/waves-types";
import {
  activeGoalRipple,
  drift,
  packWake,
  resampleMomentum,
  sampleCurve,
  seedFromString,
} from "@/lib/wave-motion";
import { FallbackChart } from "./FallbackChart";
import { createWavesRenderer } from "./renderer";

export function MomentumWaves({ match, minute }: { match: WaveMatch; minute: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minuteRef = useRef(minute);
  const [fallback, setFallback] = useState(false);
  const curve = useMemo(() => resampleMomentum(match.momentum), [match]);

  minuteRef.current = minute;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createWavesRenderer(
      canvas,
      match.home.color,
      match.away.color,
      seedFromString(match.matchId),
    );
    if (!renderer) {
      setFallback(true);
      return;
    }

    let animationFrame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const currentMinute = minuteRef.current;
      const ripple = activeGoalRipple(match.goals, currentMinute, curve.totalMinutes);
      renderer.render({
        time: (now - start) / 1000,
        momentum: sampleCurve(curve, currentMinute),
        wake: packWake(curve, currentMinute),
        drift: drift(curve, currentMinute),
        goalProgress: ripple ? ripple.progress : -1,
        goalSide: ripple ? ripple.side : 0,
      });
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrame);
      renderer.dispose();
    };
  }, [match, curve]);

  if (fallback) return <FallbackChart match={match} />;

  return (
    <canvas
      ref={canvasRef}
      data-testid="waves-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
