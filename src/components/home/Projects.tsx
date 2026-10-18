"use client";

import Link from "next/link";
import { type CSSProperties, useRef } from "react";
import { CardMedia } from "@/components/work/parts";
import { gooHeadings } from "@/lib/goo";
import {
  CARD_EASE,
  ensureSmoother,
  gsap,
  hoverScramble,
  MASK_EASE,
  MENU_EASE,
  ONCE,
  prefersReducedMotion,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { WORK } from "@/lib/work";

/*
 * Selected work, as a wall of small cards hung by hand rather than tiled — after the okasa-studio
 * project's gallery. Each card takes its own column, width and drop on a twelve-column grid, so the rows
 * come out ragged and the wall reads as hung. Every card is a 4:5 frame of the project's own composed
 * card (its phone or its posts on its colour); a number in its corner, the name and kind under it.
 *
 * A frame opens from its centre point as it scrolls in: a small rounded window that grows on all four
 * edges until it is the frame, its corners squaring off, while the picture settles from a slight zoom.
 * Inside, the picture drifts against its crop as the page moves. Four facts between hairlines close it.
 */

// six of the work — everything with screens to show — in the wall's order
const PROJECTS = ["jeeva", "netha", "maera", "site", "identity", "films"].map((slug) => WORK.find((w) => w.slug === slug)!);

/* where each card hangs on the wide grid: column start, columns wide, how far it drops down its row (vw).
   Narrow screens alternate the cards between two columns instead, every other one dropped. */
const HUNG = [
  { cs: 1, cw: 3, dy: 0 },
  { cs: 6, cw: 2, dy: 12 },
  { cs: 10, cw: 3, dy: 4 },
  { cs: 3, cw: 2, dy: 8 },
  { cs: 7, cw: 3, dy: 2 },
  { cs: 11, cw: 2, dy: 14 },
];

// the mask's two ends, spelled out in full so all four edges and the radius move together
const MASK_FROM = "inset(35% 35% 35% 35% round 28px)";
const MASK_TO = "inset(0% 0% 0% 0% round 0px)";

// what the studio is, in four facts — true ones, not invented figures
const FACTS = [
  { value: 6, pad: 2, suffix: "", label: "Disciplines" },
  { value: 100, pad: 0, suffix: "%", label: "Designed and built in-house" },
  { value: 60, pad: 0, suffix: " fps", label: "Motion standard" },
  { value: 2026, pad: 0, suffix: "", label: "Established, Hyderabad" },
];

const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-stone md:text-[11px]";
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export default function Projects() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) return unScramble;

      // headings arrive as ink (lib/goo); body copy rises line by line
      gooHeadings(el);
      el.querySelectorAll<HTMLElement>("[data-lines]").forEach((node) => {
        SplitText.create(node, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: MENU_EASE,
              stagger: 0.08,
              scrollTrigger: { trigger: node, start: "top 85%", ...ONCE },
            }),
        });
      });
      gsap.from(el.querySelectorAll("[data-reveal]"), {
        y: 20,
        autoAlpha: 0,
        duration: 1,
        ease: MENU_EASE,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 70%", ...ONCE },
      });

      // ---- the wall: each frame opens from its centre as it comes in, the picture settling inside ----
      el.querySelectorAll<HTMLElement>("[data-card]").forEach((card) => {
        const mask = card.querySelector<HTMLElement>("[data-mask]")!;
        // the bigger the frame, the longer it takes — by the square root, so a big one doesn't crawl
        const duration = 1.25 * Math.min(1.3, Math.max(0.85, Math.sqrt(mask.offsetHeight / 2 / 210)));
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 90%", toggleActions: "play none none none" } })
          .fromTo(mask, { clipPath: MASK_FROM }, { clipPath: MASK_TO, duration, ease: MASK_EASE }, 0)
          .from(card.querySelector("[data-settle]"), { scale: 1.12, duration: duration * 1.2, ease: "expo.out" }, 0)
          .from(card.querySelectorAll("h3, p"), { y: 12, autoAlpha: 0, duration: 0.9, ease: MENU_EASE, stagger: 0.06 }, duration * 0.45);
        // the picture drifts against its crop while the card crosses the screen
        gsap.fromTo(
          card.querySelector("[data-drift]"),
          { yPercent: -6 },
          { yPercent: 6, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });

      // ---- the facts count up, the dividers draw down ----
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        const to = Number(node.dataset.count);
        const width = Number(node.dataset.pad);
        const n = { v: to > 1000 ? to - 26 : 0 }; // a year counts its last stretch, not from zero
        gsap.to(n, {
          v: to,
          duration: 1.6,
          ease: CARD_EASE,
          scrollTrigger: { trigger: node, start: "top 92%", ...ONCE },
          onUpdate: () => {
            node.textContent = pad(Math.round(n.v), width);
          },
        });
      });
      gsap.fromTo(
        el.querySelectorAll("[data-divider]"),
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.1,
          ease: CARD_EASE,
          stagger: 0.08,
          scrollTrigger: { trigger: el.querySelector("[data-facts]"), start: "top 92%", ...ONCE },
        },
      );
      return unScramble;
    },
    { scope: root },
  );

  return (
    <section
      id="work"
      ref={root}
      data-cursor="light"
      data-nav-message="Selected work"
      className="relative z-10 overflow-hidden bg-chalk px-[var(--gutter)] pb-28 pt-6 text-ink md:pb-40 md:pt-10"
    >
      <div className="grid grid-cols-2 border-t border-ink/10 pt-6 md:grid-cols-12 md:gap-x-6">
        <p data-hover-scramble className={`${label} md:col-span-3`}>
          [004] — Selected work
        </p>
        <p className={`${label} justify-self-end text-right md:col-span-4 md:col-start-9`}>
          ({pad(PROJECTS.length)}) Projects · 2026
        </p>
      </div>

      {/* the statement at the left; the lede and the way in at the right, on its baseline */}
      <div className="mt-20 grid items-end gap-y-10 md:mt-28 md:grid-cols-12 md:gap-x-6">
        <h2
          data-goo="blocks"
          className="text-[clamp(2.5rem,5.6vw,6.25rem)] font-medium leading-[0.95] tracking-[-0.05em] md:col-span-7"
        >
          <span className="block">Made in the studio,</span>
          <span className="block pl-[1.2em] text-stone">built to last.</span>
        </h2>
        <div className="md:col-span-4 md:col-start-9">
          <p data-lines className="max-w-[38ch] text-[15px] leading-[1.55] text-graphite">
            Products, identities and films — for clients and for ourselves, each designed and engineered in one place.
          </p>
          <div data-reveal className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href="#contact"
              className="group inline-flex items-center gap-3 rounded-full bg-ink py-1.5 pl-5 pr-1.5 text-[13px] font-medium text-chalk"
            >
              Start a project
              <span className="grid h-7 w-7 place-items-center rounded-full bg-chalk text-ink transition-transform duration-500 ease-prime group-hover:rotate-45">
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
                </svg>
              </span>
            </a>
            {/* the way into the full index, through the seam */}
            <Link href="/projects" className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-700 ease-prime group-hover:bg-[length:0%_1px]">
                All work
              </span>
              <span aria-hidden className="transition-transform duration-500 ease-prime group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ---- the wall: small 4:5 cards, hung by hand rather than tiled ---- */}
      <ul data-wall className="mt-20 grid grid-cols-2 items-start gap-x-4 gap-y-14 md:mt-28 md:grid-cols-6 md:gap-x-6 md:gap-y-20 lg:grid-cols-12 lg:gap-y-[7vw]">
        {PROJECTS.map((p, i) => {
          const slot = HUNG[i % HUNG.length];
          return (
            <li
              key={p.slug}
              data-card
              className={`group ${i % 2 ? "mt-16" : ""} md:col-[var(--ms)/span_3] md:mt-[var(--mdy)] lg:col-[var(--cs)/span_var(--cw)] lg:mt-[var(--dy)]`}
              style={
                {
                  "--cs": slot.cs,
                  "--cw": slot.cw,
                  "--dy": `${slot.dy}vw`,
                  "--ms": i % 2 ? 4 : 1,
                  "--mdy": `${i % 2 ? 10 : 0}vw`,
                } as CSSProperties
              }
            >
              <Link href={`/projects/${p.slug}`} className="block outline-none">
                {/* the frame opens from its centre point; inside it the picture drifts against its crop */}
                <div data-mask className="relative aspect-[4/5] overflow-hidden" style={{ background: p.canvas }}>
                  <div data-drift className="absolute inset-x-0 -top-[8%] h-[116%] will-change-transform">
                    <div data-settle className="absolute inset-0 transition-transform duration-[1200ms] ease-prime group-hover:scale-[1.05] group-focus-visible:scale-[1.05]">
                      <CardMedia work={p} sizes="(min-width: 1024px) 22vw, (min-width: 768px) 46vw, 46vw" />
                    </div>
                  </div>
                  <span className="absolute left-3 top-3 font-mono text-[10px] tracking-[0.14em] text-white/80">{pad(i + 1)}</span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-[14px] font-medium leading-[1.2] tracking-[-0.015em] md:text-[15px]">{p.title}</h3>
                  <span aria-hidden className="text-[13px] transition-transform duration-700 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                    ↗
                  </span>
                </div>
                <p className={`${label} mt-1`}>
                  {p.kind} · {p.year}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* four facts between hairlines */}
      <dl data-facts className="mt-24 grid grid-cols-2 border-y border-ink/10 md:mt-32 md:grid-cols-4">
        {FACTS.map((f, i) => (
          <div key={f.label} className="relative flex flex-col items-center px-3 py-10 text-center md:py-12">
            {i % 2 === 1 && <span data-divider aria-hidden className="absolute inset-y-6 left-0 w-px origin-top bg-ink/10" />}
            {i === 2 && (
              <span data-divider aria-hidden className="absolute inset-y-6 left-0 hidden w-px origin-top bg-ink/10 md:block" />
            )}
            {i === 2 && <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-ink/10 md:hidden" />}
            {i === 3 && <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-ink/10 md:hidden" />}
            <dt className="sr-only">{f.label}</dt>
            <dd className="text-[clamp(2.25rem,3.4vw,3.25rem)] font-medium leading-none tracking-[-0.045em] tabular-nums">
              <span data-count={f.value} data-pad={f.pad}>
                {pad(f.value, f.pad)}
              </span>
              {f.suffix}
            </dd>
            <dd className="mt-3 text-[13px] text-stone">{f.label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
