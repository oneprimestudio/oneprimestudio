// The "one" mark: a switch whose knob doubles as the "o". `markOnly` drops the "Prime Studio" words.
export default function Logo({ className = "", markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-[0.32em] leading-none ${className}`}>
      <span className="inline-flex items-center">
        <span className="relative inline-block h-[0.9em] w-[1.75em] rounded-full border-[0.11em] border-current">
          {/* the knob throws on when its link is hovered — the same switch as the hero's */}
          <span className="absolute left-[0.12em] top-1/2 h-[0.52em] w-[0.52em] -translate-y-1/2 rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-[0.77em] group-focus-visible:translate-x-[0.77em] motion-reduce:transition-none" />
        </span>
        <span className="-ml-[0.04em] font-medium tracking-[-0.04em]">ne</span>
      </span>
      {!markOnly && <span className="font-medium tracking-[-0.03em]">Prime Studio</span>}
    </span>
  );
}
