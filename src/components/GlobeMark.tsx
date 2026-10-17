/*
 * A small globe, drawn on a 32 × 32 grid in the current colour: the outline, the equator and two
 * parallels, and two meridians that sweep across it on a loop, so it reads as turning.
 *
 * Stand-in for the studio's own globe SVG (same 32 × 32 viewBox): paste its paths in place of the
 * drawing below and keep the <svg> as it is.
 */
export default function GlobeMark({ className = "", weight = 1.25 }: { className?: string; weight?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
    >
      <circle cx="16" cy="16" r="13" />
      <path d="M3 16h26" />
      <path d="M5.2 9.5c3 1.4 6.8 2.1 10.8 2.1s7.8-.7 10.8-2.1M5.2 22.5c3-1.4 6.8-2.1 10.8-2.1s7.8.7 10.8 2.1" />
      {/* the meridians: each narrows to a line and widens again, half a turn apart */}
      <ellipse cx="16" cy="16" rx="6" ry="13">
        <animate attributeName="rx" values="13;0.01;13" dur="7s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="16" cy="16" rx="6" ry="13">
        <animate attributeName="rx" values="0.01;13;0.01" dur="7s" repeatCount="indefinite" />
      </ellipse>
    </svg>
  );
}
