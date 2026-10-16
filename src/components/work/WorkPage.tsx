"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardMedia, label, pad, Swap } from "@/components/work/parts";
import {
  ensureSmoother,
  gsap,
  hoverScramble,
  liven,
  MENU_EASE,
  prefersReducedMotion,
  PRIME,
  ScrollSmoother,
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";
import { gooHeadings } from "@/lib/goo";
import { setNavPlain } from "@/lib/navPlain";
import { PillLink } from "@/components/Pill";
import WorkWheel, { type WheelPos } from "@/components/work/WorkWheel";
import { BRANDS, WORK, type Work } from "@/lib/work";

/*
 * The work, laid out after obys.agency's index: one screen, held still while the scroll runs the pictures
 * through it.
 *
 *   index   (wide screens) the screen pins. Down its middle turns a wheel (WorkWheel, three.js): the
 *           projects' 4:5 cards bent onto a drum; a bracket frame stays fixed at the centre and whichever
 *           card faces you in it is the active project — in full colour, square to you, while the ones
 *           before and after curve away over the top and under the foot, smaller and grey. Around the frame, kept to the edges: the names as an index at
 *           the left (the active one in ink; click one to travel there), what it is just left of the frame,
 *           what we did just right of it, the count at the far right. Corners: who we are, the totals, the
 *           view switch, and the way into the active case. The scroll snaps project to project.
 *   grid    the same work as roomy 4:5 cards, opening through a rising mask (phones always see this)
 *   clients the brands we've built with, in small rows: names rolling on hover, each with its live site
 *
 * The footer that follows every page carries the call to start a project, so this page doesn't repeat it.
 */

const N = WORK.length;
const STEP_VH = 65; // scroll, in % of the screen, that carries one project into the frame

/**
 * A grid card: the picture at 4:5 with nothing laid over it, and a small caption under it — number, name
 * and kind on one line, the one-liner under the name. It arrives through a mask (see the grid's reveal).
 */
function Card({ work, n }: { work: Work; n: number }) {
  return (
    <li data-card className="group">
      <Link href={`/projects/${work.slug}`} className="block outline-none">
        <div data-mask className="relative aspect-[4/5] overflow-hidden" style={{ background: work.canvas }}>
          <div data-media className="absolute inset-0">
            <div className="absolute inset-0 transition-transform duration-[1200ms] ease-prime group-hover:scale-[1.04] group-focus-visible:scale-[1.04]">
              <CardMedia work={work} />
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[2rem_1fr_auto] gap-x-3 leading-[1.45]">
          <span className="overflow-hidden">
            <span data-cap className={`${label} block pt-[3px] text-stone`}>
              {pad(n)}
            </span>
          </span>
          <span className="overflow-hidden">
            <span data-cap className="block text-[14px] font-medium tracking-[-0.01em] md:text-[15px]">
              {work.title}
            </span>
          </span>
          <span className="overflow-hidden">
            <span data-cap className={`${label} flex items-center gap-1.5 pt-[3px] text-stone`}>
              {work.kind}
              <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
              </span>
            </span>
          </span>
          <span className="col-span-2 col-start-2 overflow-hidden">
            <span data-cap className="block line-clamp-2 text-[14px] text-stone md:text-[15px]">
              {work.line}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

/** the Obys switch: plain words, comma-separated, the chosen one underlined */
function ViewSwitch({ view, onChange }: { view: "index" | "grid"; onChange: (v: "index" | "grid") => void }) {
  return (
    <p className="flex items-baseline gap-1 text-[13px] tracking-[-0.005em]">
      {(["index", "grid"] as const).map((v, i) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={`bg-[linear-gradient(currentColor,currentColor)] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size,color] duration-700 ease-prime ${
            view === v ? "bg-[length:100%_1px] text-ink" : "bg-[length:0%_1px] text-stone hover:bg-[length:100%_1px] hover:text-ink"
          }`}
        >
          {v === "index" ? "Index" : "Grid"}
          {i === 0 && <span className="text-stone">,</span>}
        </button>
      ))}
    </p>
  );
}

export default function WorkPage() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const pinRef = useRef<ScrollTrigger | null>(null);
  const wheel = useRef<WheelPos>({ at: 0, hover: 0 });
  const [view, setView] = useState<"index" | "grid">("index");
  const [wide, setWide] = useState(false); // the wheel is drawn only where the index is shown
  const [active, setActive] = useState(0);
  // no WebGL: the cards will do
  const noWheel = useCallback(() => setView("grid"), []);
  const touched = useRef(false); // has the visitor switched views yet
  const work = WORK[active];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const cleanups: (() => void)[] = [hoverScramble(el)];
      const done = () => cleanups.forEach((fn) => fn());

      if (prefersReducedMotion()) return done;
      cleanups.push(liven(el));

      // headings arrive as ink: blobs that firm up into letters (lib/goo)
      gooHeadings(el);
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) =>
        gsap.from(node, {
          y: 22,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          scrollTrigger: { trigger: node, start: "top 92%", toggleActions: "play none none none" },
        }),
      );
      // the clients' names rise out of their masks, one row after another
      el.querySelectorAll<HTMLElement>("[data-brand]").forEach((row, i) =>
        gsap.from(row.querySelectorAll("[data-brand-line]"), {
          yPercent: 110,
          duration: 1.2,
          ease: PRIME,
          delay: i * 0.08,
          scrollTrigger: { trigger: row, start: "top 92%", toggleActions: "play none none none" },
        }),
      );
      return done;
    },
    { scope: root },
  );

  // ---- the index: the screen pins and the scroll runs the column through the frame ----
  useGSAP(
    () => {
      const el = stage.current;
      if (!el || view !== "index" || prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        setWide(true);
        let last = -1;
        // where the wheel stands: the project in front, as a fraction
        const place = (p: number) => {
          const at = p * (N - 1);
          wheel.current.at = at;
          const i = Math.round(at);
          if (i !== last) {
            last = i;
            setActive(i);
          }
        };
        const pin = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: () => `+=${(N - 1) * STEP_VH}%`,
          pin: true,
          // the navbar's section triggers exist before this pin: its spacer has to be laid out first
          refreshPriority: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            place(self.progress);
            setNavPlain(self.isActive);
          },
          onUpdate: (self) => place(self.progress),
          // while the screen is held, nothing passes under the navbar: it can drop its sheet
          onToggle: (self) => setNavPlain(self.isActive),
          // it comes to rest with a project in the frame, never between two
          snap: { snapTo: 1 / (N - 1), duration: { min: 0.35, max: 0.9 }, delay: 0.08, ease: "power2.inOut" },
        });
        pinRef.current = pin;
        setNavPlain(pin.isActive);
        place(pin.progress);

        // the corners, the index and the frame close in once
        const intro = gsap.timeline({ defaults: { ease: PRIME } });
        intro
          .from(el.querySelectorAll("[data-bracket]"), { scale: 1.5, autoAlpha: 0, duration: 1.2, stagger: 0.05 }, 0.1)
          .from(el.querySelectorAll("[data-name]"), { yPercent: 110, duration: 1, stagger: 0.04 }, 0.3)
          .from(el.querySelectorAll("[data-corner]"), { y: 16, autoAlpha: 0, duration: 1, ease: MENU_EASE, stagger: 0.06 }, 0.4);
        return () => {
          pinRef.current = null;
          setNavPlain(false);
          setWide(false);
        };
      });
      return () => mm.revert();
    },
    { scope: stage, dependencies: [view], revertOnUpdate: true },
  );

  // on each new project the frame breathes in and the words around it roll over
  useEffect(() => {
    const el = stage.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(el.querySelectorAll("[data-swap]"), { yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: PRIME, stagger: 0.03 });
    gsap.fromTo(el.querySelectorAll("[data-breathe]"), { scale: 1.08 }, { scale: 1, duration: 0.9, ease: PRIME, overwrite: true });
  }, [active]);

  // the grid's cards come in through their masks: as they scroll into view, or at once after a switch
  useGSAP(
    () => {
      const el = grid.current;
      if (!el || prefersReducedMotion()) return;
      const at = (trigger: Element) =>
        touched.current ? {} : { scrollTrigger: { trigger, start: "top 92%", toggleActions: "play none none none" } };
      el.querySelectorAll<HTMLElement>("[data-card]").forEach((card, i) => {
        gsap
          .timeline({ delay: (i % 3) * 0.1, ...at(card) })
          .fromTo(
            card.querySelector("[data-mask]"),
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: PRIME },
            0,
          )
          .from(card.querySelector("[data-media]"), { scale: 1.3, yPercent: 10, duration: 1.6, ease: PRIME }, 0)
          .from(card.querySelectorAll("[data-cap]"), { yPercent: 110, duration: 1, ease: PRIME, stagger: 0.07 }, 0.4);
      });
    },
    { scope: grid, dependencies: [view], revertOnUpdate: true },
  );

  const switchView = (v: "index" | "grid") => {
    if (v === view) return;
    touched.current = true;
    ScrollSmoother.get()?.scrollTo(0, false);
    window.scrollTo(0, 0);
    setView(v);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  // travel to a project: the scroll position that puts it in the frame
  const go = (i: number) => {
    const pin = pinRef.current;
    if (!pin) return;
    const y = pin.start + (i / (N - 1)) * (pin.end - pin.start);
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.scrollTo(y, true);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const intro = (
    <>
      <h1 data-hover-scramble className={`${label} text-stone`}>
        [ Work ] — Index
      </h1>
      <p className="mt-4 text-[15px] leading-[1.45] tracking-[-0.005em] text-graphite md:text-[16px]">
        Software, websites, apps and identities — for businesses across Telangana, and for ourselves. Each one
        designed and built end to end, in one place.
      </p>
    </>
  );
  const totals = (
    <>
      ({pad(N)}) Projects · ({pad(BRANDS.length)}) Clients
      <br />
      Hyderabad · 2026
    </>
  );

  return (
    <main ref={root} className="relative bg-white text-ink">
      {/* ---- the index: one held screen (wide screens only — phones get the grid). Always mounted, only
           hidden: a pinned section sits inside GSAP's spacer, and React can't take it out from there ---- */}
      <section
        ref={stage}
        data-nav-message="The work"
        aria-hidden={view !== "index"}
        className={`relative hidden h-[100svh] min-h-[640px] overflow-hidden [--w:min(24vw,46svh)] ${view === "index" ? "md:block motion-reduce:md:hidden" : ""}`}
      >
        {/* the wheel, and over it the ways in: the card in the frame opens its case; above or below it,
            the card before or after turns to the front */}
        {/* cut at the navbar's foot, so no card turns up behind it */}
        <div className="pointer-events-none absolute inset-0 [clip-path:inset(calc(var(--nav-top)+var(--nav-h)+12px)_0_0_0)]">
          {view === "index" && wide && <WorkWheel pos={wheel} onFail={noWheel} />}
        </div>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => go(Math.max(0, active - 1))}
          className="absolute left-[calc(50%-var(--w)/2)] top-0 h-[calc(50%-var(--w)*0.625)] w-[var(--w)] cursor-n-resize"
        />
        <Link
          href={`/projects/${work.slug}`}
          tabIndex={-1}
          aria-hidden
          onPointerEnter={() => (wheel.current.hover = 1)}
          onPointerLeave={() => (wheel.current.hover = 0)}
          className="absolute left-[calc(50%-var(--w)/2)] top-[calc(50%-var(--w)*0.625)] h-[calc(var(--w)*1.25)] w-[var(--w)]"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => go(Math.min(N - 1, active + 1))}
          className="absolute bottom-0 left-[calc(50%-var(--w)/2)] h-[calc(50%-var(--w)*0.625)] w-[var(--w)] cursor-s-resize"
        />

        {/* the frame, fixed at the centre, a little wider than the picture it holds */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[calc(var(--w)*1.25+48px)] w-[calc(var(--w)+48px)] -translate-x-1/2 -translate-y-1/2"
        >
          {/* each bracket breathes on its outer span and arrives on its inner one, so neither move cuts the other */}
          {[
            ["left-0 top-0", "border-l-2 border-t-2"],
            ["right-0 top-0", "border-r-2 border-t-2"],
            ["bottom-0 left-0", "border-b-2 border-l-2"],
            ["bottom-0 right-0", "border-b-2 border-r-2"],
          ].map(([at, edges]) => (
            <span key={at} data-breathe className={`absolute h-10 w-10 ${at}`}>
              <span data-bracket className={`absolute inset-0 border-ink ${edges}`} />
            </span>
          ))}
        </div>

        {/* the index of names, at the left, held to the middle of the screen */}
        <ol className="absolute left-[var(--gutter)] top-1/2 w-[min(18vw,240px)] -translate-y-1/2">
          {WORK.map((w, i) => (
            <li key={w.slug} className="overflow-hidden">
              <button
                type="button"
                data-name
                onClick={() => go(i)}
                aria-current={i === active ? "true" : undefined}
                className={`group/name flex w-full items-baseline gap-3 py-[3px] text-left text-[13px] leading-[1.35] tracking-[-0.005em] transition-colors duration-500 ease-prime ${
                  i === active ? "text-ink" : "text-ink/30 hover:text-ink/70"
                }`}
              >
                <span className="w-5 shrink-0 font-mono text-[10px] tracking-[0.08em]">{pad(i + 1)}</span>
                <span className="truncate transition-transform duration-700 ease-prime group-hover/name:translate-x-1">
                  {w.title}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* what it is, just left of the frame; what we did, just right of it; the count at the far right */}
        <div className="pointer-events-none absolute right-[calc(50%+var(--w)/2+64px)] top-1/2 w-[min(14vw,200px)] -translate-y-1/2 text-right text-[13px] leading-[1.35]">
          <Swap id={`k${active}`} className={`${label} text-stone`}>
            {work.kind}
          </Swap>
          <Swap id={`t${active}`} className="mt-1.5 text-ink">
            {work.tag}
          </Swap>
        </div>
        <div className="pointer-events-none absolute left-[calc(50%+var(--w)/2+64px)] top-1/2 w-[min(16vw,230px)] -translate-y-1/2 text-[13px] leading-[1.35]">
          <Swap id={`y${active}`} className={`${label} text-stone`}>
            {work.year} · {work.place ?? work.client}
          </Swap>
          <Swap id={`s${active}`} className="mt-1.5 text-ink">
            {work.scope.join(", ")}
          </Swap>
        </div>
        <div className="pointer-events-none absolute right-[var(--gutter)] top-1/2 -translate-y-1/2 text-right font-mono text-[11px] tracking-[0.08em] tabular-nums">
          <Swap id={`n${active}`} className="text-ink">
            {pad(active + 1)}
          </Swap>
          <span className="block text-stone">/{pad(N)}</span>
        </div>

        {/* the corners */}
        <div
          data-corner
          className="absolute left-[var(--gutter)] top-[calc(var(--nav-top)+var(--nav-h)+28px)] max-w-[34ch]"
        >
          {intro}
        </div>
        <p
          data-corner
          className={`${label} absolute right-[var(--gutter)] top-[calc(var(--nav-top)+var(--nav-h)+28px)] text-right text-stone`}
        >
          {totals}
        </p>
        <div data-corner className="absolute bottom-[var(--gutter)] left-[var(--gutter)]">
          <ViewSwitch view={view} onChange={switchView} />
        </div>
        <div data-corner className="absolute bottom-[var(--gutter)] right-[var(--gutter)] text-right">
          <Link
            href={`/projects/${work.slug}`}
            className="group inline-flex items-baseline gap-3 text-[13px] tracking-[-0.005em]"
          >
            <Swap id={`o${active}`} className="text-stone">
              {work.title}
            </Swap>
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-700 ease-prime group-hover:bg-[length:0%_1px]">
              View case
            </span>
            <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              ↗
            </span>
          </Link>
        </div>
      </section>

      {/* ---- the grid: the head in its corners, then the cards with room around them ---- */}
      {/* a still page has nothing to scroll through: it always gets the cards */}
      <div className={view === "index" ? "md:hidden motion-reduce:md:block" : ""}>
        <section data-nav-message="The work" className="px-[var(--gutter)] pt-[calc(var(--nav-top)+var(--nav-h)+28px)]">
          <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-6">
            <div data-reveal className="max-w-[34ch] md:col-span-4">
              {intro}
            </div>
            <p data-reveal className={`${label} text-stone md:col-span-4 md:col-start-9 md:text-right`}>
              {totals}
            </p>
          </div>
          <div data-reveal className="mt-[18vh] hidden md:block motion-reduce:md:hidden">
            <ViewSwitch view={view} onChange={switchView} />
          </div>
        </section>

        <section data-nav-message="Featured" className="px-[var(--gutter)] pb-[30vh] pt-[14vh] md:pt-[8vh]">
          <div ref={grid}>
            <ul className="grid gap-y-20 sm:grid-cols-2 sm:gap-x-6 md:gap-y-28 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-40 lg:[&>li:nth-child(3n+2)]:mt-[18vh]">
              {WORK.map((w, i) => (
                <Card key={w.slug} work={w} n={i + 1} />
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ---- the brands we've built with: small, in rows ---- */}
      <section
        data-nav-message="Clients"
        className={`px-[var(--gutter)] pb-[28vh] ${view === "index" ? "md:pt-[24vh]" : ""}`}
      >
        <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div data-reveal className="max-w-[30ch] md:col-span-4">
            <h2 data-hover-scramble className={`${label} text-stone`}>
              [ Clients ] — {pad(BRANDS.length)}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.45] text-graphite md:text-[16px]">
              Brands we&rsquo;ve built with — a hospital, a studio and academy, and handloom weavers.
            </p>
          </div>

          <div className="md:col-span-7 md:col-start-6">
            <ul className="group/brands">
              {BRANDS.map((b, i) => (
                <li
                  key={b.name}
                  data-brand
                  className="group/brand grid grid-cols-[2.75rem_1fr] items-center gap-x-4 gap-y-2 border-t border-ink/10 py-5 transition-colors duration-500 ease-prime last:border-b group-hover/brands:text-ink/30 hover:!text-ink md:grid-cols-[3rem_1fr_auto] md:py-6"
                >
                  <span className="overflow-hidden">
                    <span data-brand-line className={`${label} block text-stone`}>
                      {pad(i + 1)}
                    </span>
                  </span>
                  {/* the name rolls: it rises away and its copy comes up from below, on the prime curve */}
                  <Link href={`/projects/${b.slug}`} className="relative block overflow-hidden outline-none">
                    <span data-brand-line className="block">
                      <span className="relative block overflow-hidden text-[17px] font-medium leading-[1.25] tracking-[-0.02em] md:text-[20px]">
                        <span className="block transition-transform duration-700 ease-prime group-hover/brand:-translate-y-full">
                          {b.name}
                        </span>
                        <span aria-hidden className="absolute inset-0 block translate-y-full transition-transform duration-700 ease-prime group-hover/brand:translate-y-0">
                          {b.name}
                        </span>
                      </span>
                    </span>
                  </Link>
                  <span className="col-start-2 flex overflow-hidden md:col-start-3">
                    <span data-brand-line className="flex items-center gap-4">
                      <span className={`${label} text-stone`}>
                        {b.field}
                        {b.app && " · App"}
                      </span>
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`${label} inline-flex items-center gap-1 text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink`}
                      >
                        Site <span aria-hidden>↗</span>
                      </a>
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div data-reveal className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <p className={`${label} text-stone`}>Your brand next?</p>
              <PillLink
                href="#contact"
                icon={
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
                  </svg>
                }
              >
                Start a project
              </PillLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
