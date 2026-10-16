"use client";

import { useRef } from "react";
import {
  CARD_EASE,
  ensureSmoother,
  gsap,
  hoverScramble,
  MENU_EASE,
  prefersReducedMotion,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";

/*
 * How we work, as an After Effects composition. The section pins, and the scroll is the playhead: one
 * master timeline, ten "seconds" long, holds every keyframe — the step words in and out of their masks,
 * the lines, the counter, the dots in the comp viewer re-forming for each step, the layer bars lighting up
 * — and scrubbing it is scrolling. Below the stage sits the timeline panel itself: a ruler, one layer per
 * step with keyframe diamonds at its ends, the playhead, and a timecode at 60 fps.
 */

type Pt = readonly [number, number];

const STEPS: { name: string; body: string; items: string[] }[] = [
  {
    name: "Discover",
    body: "We start with the problem, not a template — your business, the people you serve, and what success has to look like.",
    items: ["Workshops", "Research", "Audit"],
  },
  {
    name: "Define",
    body: "Scope, structure and the system underneath: flows, content and architecture agreed before a pixel is pushed.",
    items: ["Sitemap", "User flows", "Tech plan"],
  },
  {
    name: "Design",
    body: "Every screen shaped around the people who use it — brand, interface and motion speaking one language.",
    items: ["Interface", "Prototypes", "Motion"],
  },
  {
    name: "Develop",
    body: "Built to perform and to scale: clean code, real data and the small details that make a product feel finished.",
    items: ["Front-end", "Back-end", "QA"],
  },
  {
    name: "Launch",
    body: "Shipped, measured, refined. We stay on after launch, because good products keep getting better.",
    items: ["Release", "Analytics", "Care"],
  },
];

const SEC = 2; // composition seconds per step
const COMP = STEPS.length * SEC; // the composition's length
const FPS = 60;
const N = 16; // dots in the comp viewer

// ---- the dots' formation for each step, on a 100 × 100 stage ----
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const scatter: Pt[] = Array.from({ length: N }, (_, i) => [14 + hash(i) * 72, 14 + hash(i + 40) * 72] as const);
const grid: Pt[] = Array.from({ length: N }, (_, i) => [26 + (i % 4) * 16, 26 + Math.floor(i / 4) * 16] as const);
const ring: Pt[] = Array.from(
  { length: N },
  (_, i) => [50 + 30 * Math.sin((i / N) * Math.PI * 2), 50 - 30 * Math.cos((i / N) * Math.PI * 2)] as const,
);
const along = (a: Pt, b: Pt, n: number): Pt[] =>
  Array.from(
    { length: n },
    (_, k) => [a[0] + ((b[0] - a[0]) * k) / (n - 1), a[1] + ((b[1] - a[1]) * k) / (n - 1)] as const,
  );
// </> — two chevrons and a slash
const code: Pt[] = [
  ...along([32, 30], [16, 50], 3),
  ...along([18, 58], [32, 70], 3),
  ...along([58, 26], [42, 74], 4),
  ...along([68, 30], [84, 50], 3),
  ...along([82, 58], [68, 70], 3),
];
// an arrow, up and away
const arrow: Pt[] = [...along([50, 84], [50, 22], 8), ...along([28, 44], [46, 26], 4), ...along([72, 44], [54, 26], 4)];
// rounded, so the server and the browser (whose Math.sin can differ in the last digits) render the same
const r2 = (f: Pt[]): Pt[] => f.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as const);
const FORMATIONS = [scatter, grid, ring, code, arrow].map(r2);

const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-stone md:text-[11px]";
const pad = (n: number) => String(n).padStart(2, "0");
const timecode = (t: number) => {
  const frames = Math.round(t * FPS);
  const f = frames % FPS;
  const s = Math.floor(frames / FPS);
  return `00:00:${pad(s)}:${pad(f)}`;
};

export default function Process() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) return unScramble;

      const frame = el.querySelector<HTMLElement>("[data-pin]")!;
      const tc = el.querySelector<HTMLElement>("[data-timecode]")!;
      const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
      const bodies = Array.from(el.querySelectorAll<HTMLElement>("[data-body]"));
      const lists = Array.from(el.querySelectorAll<HTMLElement>("[data-items]"));
      const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-layer]"));
      const dots = Array.from(el.querySelectorAll<SVGCircleElement>("[data-dot]"));

      // every word and every body is split once; all but the first wait below their masks
      const chars = words.map(
        (w) => SplitText.create(w, { type: "chars", mask: "chars", charsClass: "split-char" }).chars,
      );
      const lines = bodies.map(
        (b) => SplitText.create(b, { type: "lines", mask: "lines", linesClass: "split-line" }).lines,
      );
      chars.slice(1).forEach((c) => gsap.set(c, { yPercent: 110 }));
      lines.slice(1).forEach((l) => gsap.set(l, { yPercent: 110 }));
      lists.slice(1).forEach((l) => gsap.set(l.children, { y: 12, autoAlpha: 0 }));

      // ---- the composition ----
      const comp = gsap.timeline({ paused: true, defaults: { ease: MENU_EASE, immediateRender: false } });
      comp.fromTo(
        el.querySelector("[data-playhead]"),
        { xPercent: 0 },
        { xPercent: 100, ease: "none", duration: COMP },
        0,
      );

      STEPS.forEach((_, i) => {
        const tIn = i * SEC;
        const tOut = tIn + SEC - 0.45;
        const last = i === STEPS.length - 1;
        if (i > 0) {
          comp
            .fromTo(chars[i], { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.035 }, tIn)
            .fromTo(lines[i], { yPercent: 110 }, { yPercent: 0, duration: 0.7, stagger: 0.06 }, tIn + 0.15)
            .fromTo(
              lists[i].children,
              { y: 12, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 },
              tIn + 0.3,
            )
            // the dots leave the last formation for this one, one after another
            .add(
              dots.map((dot, k) =>
                gsap.fromTo(
                  dot,
                  { attr: { cx: FORMATIONS[i - 1][k][0], cy: FORMATIONS[i - 1][k][1] } },
                  {
                    attr: { cx: FORMATIONS[i][k][0], cy: FORMATIONS[i][k][1] },
                    duration: 0.9,
                    ease: CARD_EASE,
                    immediateRender: false,
                  },
                ),
              ),
              tIn - 0.15,
            )
            // the strips hold one row per step: a row is 1/N of their height
            .fromTo(
              el.querySelector("[data-counter]"),
              { yPercent: (-100 * (i - 1)) / STEPS.length },
              { yPercent: (-100 * i) / STEPS.length, duration: 0.6 },
              tIn,
            )
            .fromTo(
              el.querySelector("[data-comp-name]"),
              { yPercent: (-100 * (i - 1)) / STEPS.length },
              { yPercent: (-100 * i) / STEPS.length, duration: 0.6 },
              tIn,
            );
        }
        if (!last) {
          comp
            .fromTo(
              chars[i],
              { yPercent: 0 },
              { yPercent: -110, duration: 0.45, stagger: 0.025, ease: "power2.in" },
              tOut,
            )
            .fromTo(
              lines[i],
              { yPercent: 0 },
              { yPercent: -110, duration: 0.45, stagger: 0.03, ease: "power2.in" },
              tOut,
            )
            .fromTo(lists[i].children, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3 }, tOut);
        }
        // the layer under the playhead lights up, and its keyframes fill as they are passed
        const layer = layers[i];
        comp
          .fromTo(layer.querySelector("[data-fill]"), { scaleX: 0 }, { scaleX: 1, duration: SEC, ease: "none" }, tIn)
          .fromTo(layer.querySelector("[data-name]"), { opacity: 0.4 }, { opacity: 1, duration: 0.2 }, tIn)
          .fromTo(
            layer.querySelectorAll("[data-key]")[0],
            { scale: 1 },
            { scale: 1.35, duration: 0.15, yoyo: true, repeat: 1 },
            tIn,
          );
        if (!last) comp.to(layer.querySelector("[data-name]"), { opacity: 0.4, duration: 0.2 }, tIn + SEC);
      });

      comp.eventCallback("onUpdate", () => {
        tc.textContent = timecode(comp.time());
      });

      ScrollTrigger.create({
        trigger: frame,
        start: "top top",
        end: () => `+=${window.innerHeight * STEPS.length * 0.8}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        refreshPriority: 1,
        animation: comp,
      });

      // the first step arrives as the section does, before the playhead has moved
      gsap.from(chars[0], {
        yPercent: 110,
        duration: 1,
        ease: MENU_EASE,
        stagger: 0.04,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
      gsap.from(lines[0], {
        yPercent: 110,
        duration: 1,
        ease: MENU_EASE,
        stagger: 0.06,
        delay: 0.15,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
      gsap.from(dots, {
        scale: 0,
        transformOrigin: "50% 50%",
        duration: 0.7,
        ease: CARD_EASE,
        stagger: 0.03,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });

      return unScramble;
    },
    { scope: root },
  );

  return (
    <section
      id="process"
      ref={root}
      data-cursor="light"
      data-nav-message="How we work"
      className="relative z-10 bg-chalk text-ink"
    >
      {/* for screen readers and reduced motion, the steps as a plain list */}
      <ol className="sr-only motion-reduce:not-sr-only motion-reduce:grid motion-reduce:gap-8 motion-reduce:px-[var(--gutter)] motion-reduce:py-24">
        {STEPS.map((s, i) => (
          <li key={s.name}>
            <p className={label}>{pad(i + 1)}</p>
            <h3 className="mt-2 text-[clamp(2rem,5vw,4rem)] font-medium leading-none tracking-[-0.04em]">{s.name}</h3>
            <p className="mt-3 max-w-[48ch] text-[16px] leading-[1.5] text-graphite">{s.body}</p>
          </li>
        ))}
      </ol>

      <div
        data-pin
        aria-hidden
        className="flex h-svh min-h-[640px] flex-col px-[var(--gutter)] pb-[max(16px,2.5svh)] pt-[calc(var(--nav-top)+var(--nav-h)+20px)] motion-reduce:hidden"
      >
        <div className="grid grid-cols-2 md:grid-cols-12 md:gap-x-6">
          <p data-hover-scramble className={`${label} md:col-span-3`}>
            [003] — Process
          </p>
          <p className={`${label} justify-self-end text-right md:col-span-4 md:col-start-9`}>How we work · 5 steps</p>
        </div>

        {/* ---- the stage ---- */}
        <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-6 py-5 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-7">
            <p className={`${label} flex items-center gap-2`}>
              <span className="relative inline-block h-[1.2em] overflow-hidden">
                <span data-counter className="block">
                  {STEPS.map((_, i) => (
                    <span key={i} className="block h-[1.2em] leading-[1.2em]">
                      {pad(i + 1)}
                    </span>
                  ))}
                </span>
              </span>
              <span>/ {pad(STEPS.length)}</span>
            </p>
            {/* the words, stacked in one place; only the current one is out of its mask */}
            <div className="relative mt-3 h-[0.9em] text-[clamp(3.5rem,11vw,11rem)] font-medium leading-[0.9] tracking-[-0.055em]">
              {STEPS.map((s, i) => (
                <span key={s.name} data-word className="absolute inset-x-0 top-0 whitespace-nowrap">
                  {s.name}
                  {i === STEPS.length - 1 && <span className="text-accent">.</span>}
                </span>
              ))}
            </div>
            <div className="relative mt-6 grid md:mt-8">
              {STEPS.map((s) => (
                <div key={s.name} className="col-start-1 row-start-1">
                  <p
                    data-body
                    className="max-w-[40ch] text-[clamp(1rem,1.35vw,1.25rem)] font-medium leading-[1.35] tracking-[-0.015em] text-graphite"
                  >
                    {s.body}
                  </p>
                  <ul data-items className="mt-4 flex gap-4">
                    {s.items.map((it) => (
                      <li key={it} className={label}>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* the comp viewer: safe areas, a crosshair, and the dots re-forming for each step */}
          <div className="hidden md:col-span-5 md:block">
            <div className="relative aspect-[4/3] w-full border border-ink/10 bg-paper">
              <div className="absolute inset-[8%] border border-dashed border-ink/10" />
              <div className="absolute inset-[16%] border border-dashed border-ink/[0.07]" />
              <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-ink/20" />
              <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-ink/20" />
              <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto h-[78%] w-[78%] overflow-visible">
                {FORMATIONS[0].map(([cx, cy], k) => (
                  <circle
                    key={k}
                    data-dot
                    cx={cx}
                    cy={cy}
                    r={2.4}
                    fill={k === 0 ? "var(--color-accent)" : "var(--color-ink)"}
                  />
                ))}
              </svg>
              <div className="absolute inset-x-3 top-2.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-stone">
                <span className="flex gap-1.5">
                  Comp ·
                  <span className="relative inline-block h-[1.2em] overflow-hidden">
                    <span data-comp-name className="block">
                      {STEPS.map((s) => (
                        <span key={s.name} className="block h-[1.2em] leading-[1.2em]">
                          {s.name}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
                <span>1920 × 1080 · {FPS} fps</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- the timeline panel ---- */}
        <div className="overflow-hidden border border-ink/10 bg-paper/70 font-mono text-[10px] uppercase tracking-[0.1em] text-stone md:text-[11px]">
          <div className="flex items-center justify-between border-b border-ink/10 px-3 py-2">
            <span>Timeline · How we work</span>
            <span data-timecode className="text-[13px] tabular-nums tracking-[0.06em] text-accent md:text-[15px]">
              00:00:00:00
            </span>
          </div>
          <div className="relative grid grid-cols-[88px_1fr] md:grid-cols-[180px_1fr]">
            {/* the ruler */}
            <div className="border-b border-r border-ink/10 px-3 py-1.5">Layer</div>
            <div className="relative border-b border-ink/10">
              <div className="flex h-full">
                {Array.from({ length: COMP }, (_, s) => (
                  <div key={s} className="relative flex-1 border-l border-ink/10 pl-1 py-1.5">
                    <span className="hidden sm:inline">{pad(s)}s</span>
                    <span className="absolute bottom-0 left-1/2 h-1.5 w-px bg-ink/10" />
                  </div>
                ))}
              </div>
            </div>

            {/* one layer per step */}
            {STEPS.map((s, i) => (
              <div key={s.name} data-layer className="contents">
                <div
                  data-name
                  className="flex items-center gap-2 border-r border-ink/10 px-3 py-1.5 text-ink opacity-40"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="hidden text-stone md:inline">{i + 1}</span>
                  <span className="truncate">{s.name}</span>
                </div>
                <div className="relative py-1.5">
                  <div
                    className="absolute inset-y-1 rounded-[2px] border border-ink/15 bg-ink/[0.04]"
                    style={{ left: `${(i * SEC * 100) / COMP}%`, width: `${(SEC * 100) / COMP}%` }}
                  >
                    {/* the part of the layer the playhead has played */}
                    <span data-fill className="absolute inset-0 origin-left scale-x-0 bg-accent/80" />
                    <span data-key className="absolute -left-[4px] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-ink" />
                    <span
                      data-key
                      className="absolute -right-[4px] top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-ink bg-paper"
                    />
                  </div>
                  <span className="invisible">.</span>
                </div>
              </div>
            ))}

            {/* the playhead: a layer as wide as the tracks, moved across by its own width */}
            <div className="pointer-events-none absolute inset-y-0 left-[88px] right-0 md:left-[180px]">
              <div data-playhead className="absolute inset-0">
                <span className="absolute inset-y-0 left-0 w-px bg-accent" />
                <span className="absolute -left-[5px] top-0 h-3 w-[11px] bg-accent [clip-path:polygon(0_0,100%_0,100%_55%,50%_100%,0_55%)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
