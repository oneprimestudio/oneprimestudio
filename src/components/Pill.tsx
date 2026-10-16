import type { ReactNode } from "react";

/*
 * The studio's pill: a small rounded button, tight padding, 13px medium type. On hover ink rises into it
 * from the bottom as a rounded fill while its label rolls up and a copy rolls in from below — both on the
 * prime curve (0.87, 0, 0.13, 1) over 0.7s, the "Start a project" hover. CSS transitions, so leaving
 * plays from wherever the move has reached rather than reversing a timeline.
 *
 *   active   filled ink, as a chosen filter
 *   tone     "light" for ink on the page's white, "glass" for white on a picture
 */

type Common = {
  children: ReactNode;
  /** a small superscript after the label: a filter's count */
  count?: number;
  /** a trailing mark (an arrow), turned a quarter on hover */
  icon?: ReactNode;
  active?: boolean;
  tone?: "light" | "glass";
  className?: string;
};

const roll = "block transition-transform duration-700 ease-prime";

function Body({ children, count, icon, active, tone = "light" }: Common) {
  const glass = tone === "glass";
  return (
    <>
      {/* the fill */}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full transition-transform duration-700 ease-prime ${
          glass ? "bg-white" : "bg-ink"
        } ${active ? "translate-y-0" : "translate-y-[101%] group-hover/pill:translate-y-0 group-focus-visible/pill:translate-y-0"}`}
      />
      {/* the label, and its copy waiting below */}
      <span className="relative block overflow-hidden">
        <span className={`${roll} group-hover/pill:-translate-y-full group-focus-visible/pill:-translate-y-full`}>
          {children}
        </span>
        <span
          aria-hidden
          className={`${roll} absolute inset-0 translate-y-full group-hover/pill:translate-y-0 group-focus-visible/pill:translate-y-0`}
        >
          {children}
        </span>
      </span>
      {count !== undefined && (
        <sup className="relative -mr-0.5 ml-0.5 self-start pt-[3px] font-mono text-[8px] leading-none tabular-nums opacity-60">
          {count}
        </sup>
      )}
      {icon && (
        <span aria-hidden className="relative transition-transform duration-700 ease-prime group-hover/pill:rotate-45">
          {icon}
        </span>
      )}
    </>
  );
}

const base = (active: boolean | undefined, tone: Common["tone"] = "light") => {
  const glass = tone === "glass";
  const idle = glass
    ? "bg-white/15 text-white ring-white/30 backdrop-blur-md hover:text-ink focus-visible:text-ink"
    : "text-ink ring-ink/15 hover:text-chalk focus-visible:text-chalk";
  const on = glass ? "text-ink ring-white" : "text-chalk ring-ink";
  return `group/pill relative isolate inline-flex select-none items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-3 py-[5px] text-[13px] font-medium leading-[1.2] tracking-[-0.01em] ring-1 ring-inset outline-none transition-colors duration-700 ease-prime ${
    active ? on : idle
  }`;
};

export function PillButton({
  onClick,
  pressed,
  ...props
}: Common & { onClick?: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`${base(props.active, props.tone)} ${props.className ?? ""}`}
    >
      <Body {...props} />
    </button>
  );
}

export function PillLink({ href, external, ...props }: Common & { href: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`${base(props.active, props.tone)} ${props.className ?? ""}`}
    >
      <Body {...props} />
    </a>
  );
}

/** a pill that isn't a control: the same shape, no hover */
export function PillTag({ children, tone = "light", className = "" }: { children: ReactNode; tone?: "light" | "glass" | "accent"; className?: string }) {
  const look =
    tone === "glass"
      ? "bg-white/15 text-white ring-1 ring-inset ring-white/30 backdrop-blur-md"
      : tone === "accent"
        ? "bg-accent text-white"
        : "text-graphite ring-1 ring-inset ring-ink/15";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-medium leading-[1.2] tracking-[-0.01em] ${look} ${className}`}>
      {children}
    </span>
  );
}
