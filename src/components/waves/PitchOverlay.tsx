/** Faint pitch markings drawn over the water. Parent must be position: relative. */
export function PitchOverlay() {
  const markings = {
    fill: "none",
    stroke: "rgba(255,255,255,0.28)",
    strokeWidth: 0.35,
  } as const;

  return (
    <svg
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="pitch-overlay"
      className="waves-pitch-overlay"
    >
      <rect x="0.5" y="0.5" width="104" height="67" {...markings} />
      <line x1="52.5" y1="0.5" x2="52.5" y2="67.5" {...markings} />
      <circle cx="52.5" cy="34" r="9.15" {...markings} />
      <rect x="0.5" y="13.84" width="16.5" height="40.32" {...markings} />
      <rect x="88" y="13.84" width="16.5" height="40.32" {...markings} />
      <rect x="0.5" y="24.84" width="5.5" height="18.32" {...markings} />
      <rect x="99" y="24.84" width="5.5" height="18.32" {...markings} />
      <circle cx="11.5" cy="34" r="0.5" fill="rgba(255,255,255,0.28)" stroke="none" />
      <circle cx="93.5" cy="34" r="0.5" fill="rgba(255,255,255,0.28)" stroke="none" />
    </svg>
  );
}
