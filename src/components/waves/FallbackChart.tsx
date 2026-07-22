import type { WaveMatch } from "@/lib/waves-types";

/** Static fallback when WebGL2 is unavailable: momentum as a two-color area chart. */
export function FallbackChart({ match }: { match: WaveMatch }) {
  const total = match.momentum[match.momentum.length - 1].minute;
  const width = 100;
  const height = 48;
  const midpoint = height / 2;
  const x = (minute: number) => (minute / total) * width;
  const y = (value: number) => midpoint - value * (midpoint - 4);
  const points = match.momentum
    .map((point) => `${x(point.minute).toFixed(2)},${y(point.value).toFixed(2)}`)
    .join(" ");

  return (
    <div data-testid="waves-fallback">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Match momentum chart"
        style={{ width: "100%", display: "block" }}
      >
        <defs>
          <clipPath id="waves-above">
            <rect x="0" y="0" width={width} height={midpoint} />
          </clipPath>
          <clipPath id="waves-below">
            <rect x="0" y={midpoint} width={width} height={midpoint} />
          </clipPath>
        </defs>
        <polygon
          points={`0,${midpoint} ${points} ${width},${midpoint}`}
          fill={match.home.color}
          clipPath="url(#waves-above)"
        />
        <polygon
          points={`0,${midpoint} ${points} ${width},${midpoint}`}
          fill={match.away.color}
          clipPath="url(#waves-below)"
        />
        <line
          x1="0"
          y1={midpoint}
          x2={width}
          y2={midpoint}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.3"
        />
        {match.goals.map((goal, index) => (
          <circle
            key={index}
            cx={x(goal.minute)}
            cy={goal.side === "home" ? 6 : height - 6}
            r="1.6"
            fill={goal.side === "home" ? match.home.color : match.away.color}
            stroke="white"
            strokeWidth="0.4"
          />
        ))}
      </svg>
      <p className="fine">
        Live wave rendering needs WebGL2; showing the momentum chart instead.
      </p>
    </div>
  );
}
