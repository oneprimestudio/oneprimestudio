/*
 * The "one" mark: a switch that stands in for the "o". It is drawn as that letter would be in Neue Montreal
 * Medium, so it sits level with "ne": as tall as a round lowercase letter (x-height 0.516em plus the 0.016em
 * overshoot above and below — 0.547em), on the baseline (dipping 0.016em below it, as an "o" does), its
 * outline as thick as the letters' stems (0.0975em), and spaced from the "n" by the same ink gap as "n" is
 * from "e". `markOnly` drops the "Prime Studio" words.
 *
 *   switch   0.547em × 1.064em (the original 1 : 1.94 proportion), outline 0.0975em
 *   knob     0.272em, 0.04em inside the outline; it travels 1.064 − 2 × 0.0975 − 2 × 0.04 − 0.272 = 0.517em
 */
export default function Logo({ className = "", markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.32em] leading-none ${className}`}>
      <span className="inline-flex items-baseline">
        <span className="relative top-[0.016em] inline-block h-[0.547em] w-[1.064em]">
          {/* the outline is a stroke, not a border: borders snap down to whole device pixels and would
              come out lighter than the letters */}
          <svg aria-hidden viewBox="0 0 1064 547" className="absolute inset-0 h-full w-full overflow-visible">
            <rect x="48.75" y="48.75" width="966.5" height="449.5" rx="224.75" fill="none" stroke="currentColor" strokeWidth="97.5" />
          </svg>
          {/* the knob throws on when its link is hovered */}
          <span className="absolute left-[0.1375em] top-1/2 h-[0.272em] w-[0.272em] -translate-y-1/2 rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-[0.517em] group-focus-visible:translate-x-[0.517em] motion-reduce:transition-none" />
        </span>
        <span className="-ml-[0.027em] font-medium tracking-[-0.04em]">ne</span>
      </span>
      {!markOnly && <span className="font-medium tracking-[-0.03em]">Prime Studio</span>}
    </span>
  );
}
