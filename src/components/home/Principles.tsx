"use client";

import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import { ensureSmoother, gsap, hoverScramble, MENU_EASE, prefersReducedMotion, SplitText, useGSAP } from "@/lib/gsap";

// The studio's four principles, from its "Why One Prime" post.
const PRINCIPLES = [
  { name: "Purpose", quote: "We think beyond just design or code. Every solution starts with a purpose." },
  { name: "Detail", quote: "We care about the small things — they are what make the big difference." },
  { name: "Growth", quote: "Not just clean visuals. Everything we build is made to grow with your business." },
  { name: "Partnership", quote: "We’re not just a service provider. We’re here for the journey." },
];
const BEAT = 6.5; // seconds each principle holds before the next takes over

const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-stone md:text-[11px]";

/**
 * Why One Prime — a quote block in the manner of a testimonial: one principle at a time, the active
 * one named in a pill, the others waiting as numbered chips. A ring fills around the active chip and
 * hands over to the next; hovering or focusing the block holds it; arrow keys move along the row.
 */
export default function Principles() {
  const root = useRef<HTMLElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [auto, setAuto] = useState(true);

  const go = useCallback((i: number, byUser: boolean) => {
    setActive((i + PRINCIPLES.length) % PRINCIPLES.length);
    if (byUser) setAuto(false); // a visitor who chooses takes over from the timer
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (active + (e.key === "ArrowRight" ? 1 : -1) + PRINCIPLES.length) % PRINCIPLES.length;
    go(next, true);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  // section entrance
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) {
        setAuto(false);
        return unScramble;
      }
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node, i) => {
        gsap.from(node, {
          y: 28,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          delay: i * 0.06,
          scrollTrigger: { trigger: el, start: "top 75%", once: true },
        });
      });
      return unScramble;
    },
    { scope: root },
  );

  // each new principle rises in line by line
  useGSAP(
    () => {
      const quote = quoteRef.current;
      if (!quote || prefersReducedMotion()) return;
      const split = SplitText.create(quote, { type: "lines", mask: "lines", linesClass: "split-line" });
      gsap.from(split.lines, { yPercent: 105, duration: 0.9, ease: MENU_EASE, stagger: 0.06 });
      return () => split.revert();
    },
    { dependencies: [active], scope: root, revertOnUpdate: true },
  );

  const running = auto && !held;

  return (
    <section
      id="principles"
      ref={root}
      data-cursor="light"
      data-nav-message="Why One Prime"
      className="relative z-10 bg-chalk px-[var(--gutter)] pb-28 pt-6 text-ink md:pb-44 md:pt-10"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div className="grid grid-cols-2 items-end border-t border-ink/10 pt-6 md:grid-cols-12 md:gap-x-6">
        <h2
          data-reveal
          className="col-span-2 text-[clamp(2.25rem,4.4vw,4.25rem)] font-medium leading-[0.95] tracking-[-0.045em] md:col-span-7"
        >
          Why One Prime
        </h2>
        <p data-reveal data-hover-scramble className={`${label} mt-4 md:col-span-3 md:col-start-10 md:mt-0 md:justify-self-end`}>
          (005) — Principles
        </p>
      </div>

      <figure className="mt-12 grid md:mt-20 md:grid-cols-12 md:gap-x-6">
        <span
          data-reveal
          aria-hidden
          className="font-sans text-[clamp(4rem,7vw,7rem)] font-medium leading-[0.7] tracking-[-0.06em] text-ink md:col-span-1 md:col-start-3 md:justify-self-end"
        >
          &ldquo;
        </span>

        <div className="mt-4 md:col-span-7 md:col-start-4 md:mt-0">
          <blockquote
            id="principle-panel"
            role="tabpanel"
            aria-live={running ? "off" : "polite"}
            aria-labelledby={`principle-tab-${active}`}
            data-reveal
          >
            <p
              key={active}
              ref={quoteRef}
              className="min-h-[3.6em] text-[clamp(1.375rem,2.4vw,2.375rem)] leading-[1.18] tracking-[-0.025em]"
            >
              {PRINCIPLES[active].quote}
            </p>
          </blockquote>

          <figcaption data-reveal className="mt-10 md:mt-12">
            <div
              ref={tabsRef}
              role="tablist"
              aria-label="Principles"
              onKeyDown={onKey}
              className="flex flex-wrap items-center gap-3"
            >
              {PRINCIPLES.map((p, i) => {
                const on = i === active;
                return (
                  <button
                    key={p.name}
                    id={`principle-tab-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-controls="principle-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => go(i, true)}
                    className={`group flex items-center rounded-full transition-[background-color,padding] duration-500 ease-prime ${
                      on ? "gap-3 bg-accent/10 py-1.5 pl-1.5 pr-5" : "p-0 hover:bg-ink/5"
                    }`}
                  >
                    <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11px] tracking-[0.04em] text-chalk transition-transform duration-500 ease-prime group-hover:scale-105">
                      {String(i + 1).padStart(2, "0")}
                      {/* the beat: a ring that fills around the active chip, then hands over */}
                      {on && (
                        <svg aria-hidden viewBox="0 0 48 48" className="absolute -inset-[3px] h-[50px] w-[50px] -rotate-90">
                          <circle
                            key={`${active}-${auto}`}
                            cx="24"
                            cy="24"
                            r="23"
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth="1.5"
                            pathLength={1}
                            strokeDasharray="1"
                            strokeDashoffset={auto ? undefined : 0}
                            style={
                              auto
                                ? {
                                    animation: `ring-fill ${BEAT}s linear forwards`,
                                    animationPlayState: running ? "running" : "paused",
                                  }
                                : undefined
                            }
                            onAnimationEnd={() => go(active + 1, false)}
                          />
                        </svg>
                      )}
                    </span>
                    {on && (
                      <span className="text-left leading-tight">
                        <span className="block text-[14px] font-medium">{p.name}</span>
                        <span className="hidden text-[12px] text-stone sm:block">
                          Principle {String(i + 1).padStart(2, "0")} · One Prime Studio
                        </span>
                      </span>
                    )}
                    {!on && <span className="sr-only">{p.name}</span>}
                  </button>
                );
              })}
            </div>
          </figcaption>
        </div>
      </figure>
    </section>
  );
}
