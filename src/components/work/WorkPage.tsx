"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import DitherReveal from "@/components/DitherReveal";
import { CardMedia, label, pad } from "@/components/work/parts";
import {
  ensureSmoother,
  gsap,
  hoverScramble,
  liven,
  MENU_EASE,
  prefersReducedMotion,
  PRIME,
  useGSAP,
} from "@/lib/gsap";
import { gooHeadings } from "@/lib/goo";
import { PillButton, PillLink } from "@/components/Pill";
import { BRANDS, KINDS, WORK, type Kind, type Work } from "@/lib/work";

/*
 * The work, after orchard.framer.website/works: the index of everything, each project opening into its
 * own case page (/projects/[slug], CasePage).
 *
 * Set like the globe section: white, small type, words kept to the corners and the pictures given room.
 *
 *   head      a label and a small paragraph at the left, the count opposite; far below, two quiet rows of
 *             pills — Service (filters the work) and View (grid or list)
 *   featured  4:5 cards with a small caption, opening through a rising mask; or the projects as rows with
 *             a preview that follows the cursor and re-dithers to each one
 *   clients   the brands we've built with, in small rows: names rolling on hover, each with its live site
 *
 * The footer that follows every page carries the call to start a project, so this page doesn't repeat it.
 */


/**
 * A card: the picture at 4:5 with nothing laid over it, and a small caption under it — number, name and
 * kind on one line, the one-liner under the name. It arrives through a mask (the frame opens upward from
 * its foot while the picture settles from a slight zoom, then the caption lines rise — see the grid's
 * reveal). On hover the picture eases in and the arrow steps out.
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
        <div className="mt-4 grid grid-cols-[2rem_1fr_auto] gap-x-3 leading-[1.45]">
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

export default function WorkPage() {
  const root = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(0);
  const [replay, setReplay] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<Kind | "All">("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const touched = useRef(false); // has the visitor filtered or switched views yet
  const items = kind === "All" ? WORK : WORK.filter((w) => w.kind === kind);

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
          scrollTrigger: { trigger: node, start: "top 92%", once: true },
        }),
      );
      // hairlines draw out from the left
      el.querySelectorAll<HTMLElement>("[data-rule]").forEach((node) =>
        gsap.from(node, {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 1.4,
          ease: PRIME,
          scrollTrigger: { trigger: node, start: "top 94%", once: true },
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
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        // the preview follows the cursor over the index, a little behind it
        const index = el.querySelector<HTMLElement>("[data-index]");
        const preview = el.querySelector<HTMLElement>("[data-preview]");
        if (!index || !preview) return;
        // to the right of the cursor, so the row's own title stays readable
        gsap.set(preview, { autoAlpha: 0, scale: 0.92, xPercent: 12, yPercent: -50 });
        const xTo = gsap.quickTo(preview, "x", { duration: 0.6, ease: "power3.out" });
        const yTo = gsap.quickTo(preview, "y", { duration: 0.6, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = index.getBoundingClientRect();
          xTo(e.clientX - r.left);
          yTo(e.clientY - r.top);
        };
        const onEnter = (e: PointerEvent) => {
          const r = index.getBoundingClientRect();
          gsap.set(preview, { x: e.clientX - r.left, y: e.clientY - r.top });
          gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.6, ease: PRIME, overwrite: "auto" });
        };
        const onLeave = () => gsap.to(preview, { autoAlpha: 0, scale: 0.92, duration: 0.45, ease: PRIME, overwrite: "auto" });
        const list = index.querySelector<HTMLElement>("[data-list]")!;
        list.addEventListener("pointermove", onMove);
        list.addEventListener("pointerenter", onEnter);
        list.addEventListener("pointerleave", onLeave);
        return () => {
          list.removeEventListener("pointermove", onMove);
          list.removeEventListener("pointerenter", onEnter);
          list.removeEventListener("pointerleave", onLeave);
        };
      });
      cleanups.push(() => mm.revert());
      return done;
    },
    { scope: root },
  );

  // the featured cards (or rows) come in through their masks: on the first visit as they scroll into view,
  // and again straight away whenever the filter or the view changes
  useGSAP(
    () => {
      const el = grid.current;
      if (!el || prefersReducedMotion()) return;
      const at = (trigger: Element) =>
        touched.current ? {} : { scrollTrigger: { trigger, start: "top 92%", toggleActions: "play none none none" } };
      if (view === "grid") {
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
      } else {
        const rows = el.querySelectorAll("[data-row]");
        if (rows.length)
          gsap.from(rows, { yPercent: 40, autoAlpha: 0, duration: 1.1, ease: PRIME, stagger: 0.07, ...at(rows[0]) });
      }
    },
    { scope: grid, dependencies: [kind, view], revertOnUpdate: true },
  );

  const choose = (k: Kind | "All") => {
    touched.current = true;
    setKind(k);
  };
  const switchView = (v: "grid" | "list") => {
    touched.current = true;
    setView(v);
  };

  // hovering a row: the preview shows that project, assembling out of the dots again
  const show = (i: number) => {
    if (i === shown && replay > 0) return;
    setShown(i);
    setReplay((r) => r + 1);
  };

  return (
    <main ref={root} className="relative bg-white text-ink">
      {/* ---- head: the corners, as the globe's — a label and a small paragraph, the count opposite ---- */}
      <section data-nav-message="The work" className="px-[var(--gutter)] pt-[calc(var(--nav-top)+var(--nav-h)+28px)]">
        <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-6">
          <div data-reveal className="max-w-[34ch] md:col-span-4">
            <h1 data-hover-scramble className={`${label} text-stone`}>
              [ Work ] — Index
            </h1>
            <p className="mt-4 text-[15px] leading-[1.45] tracking-[-0.005em] text-graphite md:text-[16px]">
              Software, websites, apps and identities — for businesses across Telangana, and for ourselves. Each one
              designed and built end to end, in one place.
            </p>
          </div>
          <p data-reveal className={`${label} text-stone md:col-span-4 md:col-start-9 md:text-right`}>
            ({pad(WORK.length)}) Projects · ({pad(BRANDS.length)}) Clients
            <br />
            Hyderabad · 2026
          </p>
        </div>

        {/* the controls: what kind of work, and how to see it */}
        <div data-reveal className="mt-[22vh] grid gap-y-5 md:mt-[28vh] md:grid-cols-12 md:gap-x-6">
          <div className="grid grid-cols-[5rem_1fr] items-start md:col-span-7">
            <p className={`${label} pt-[7px] text-stone`}>Service</p>
            <div className="flex flex-wrap gap-1.5">
              {(["All", ...KINDS] as const).map((k) => (
                <PillButton
                  key={k}
                  active={kind === k}
                  pressed={kind === k}
                  count={k === "All" ? WORK.length : WORK.filter((w) => w.kind === k).length}
                  onClick={() => choose(k)}
                >
                  {k}
                </PillButton>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[5rem_1fr] items-start md:col-span-3 md:col-start-10">
            <p className={`${label} pt-[7px] text-stone`}>View</p>
            <div className="flex flex-wrap gap-1.5">
              {(["grid", "list"] as const).map((v) => (
                <PillButton key={v} active={view === v} pressed={view === v} onClick={() => switchView(v)}>
                  {v === "grid" ? "Grid" : "List"}
                </PillButton>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- the work: cards with room around them, or the index as rows ---- */}
      <section data-index data-nav-message="Featured" className="relative px-[var(--gutter)] pb-[30vh] pt-[10vh]">
        <div ref={grid}>
          {view === "grid" && (
            <ul className="grid gap-y-20 sm:grid-cols-2 sm:gap-x-6 md:gap-y-28 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-40 lg:[&>li:nth-child(3n+2)]:mt-[18vh]">
              {items.map((w) => (
                <Card key={w.slug} work={w} n={WORK.indexOf(w) + 1} />
              ))}
            </ul>
          )}

          {/* the list stays mounted (the preview's listeners hold on to it) and is only hidden */}
          <ol data-list className={`group/list ${view === "list" ? "" : "hidden"}`}>
            {items.map((w) => {
              const i = WORK.indexOf(w);
              return (
                <li key={w.slug}>
                  <a
                    data-row
                    href={`/projects/${w.slug}`}
                    onPointerEnter={() => show(i)}
                    className="group/row grid grid-cols-[2.75rem_1fr_auto] items-baseline gap-x-4 border-t border-ink/10 py-5 transition-colors duration-500 ease-prime group-hover/list:text-ink/30 hover:!text-ink md:grid-cols-[3.5rem_1fr_12rem_5rem_1.5rem] md:py-6"
                  >
                    <span className={`${label} text-stone`}>{pad(i + 1)}</span>
                    <span className="text-[17px] font-medium tracking-[-0.02em] transition-transform duration-700 ease-prime group-hover/row:translate-x-2 md:text-[20px]">
                      {w.title}
                    </span>
                    <span className={`${label} hidden text-stone md:block`}>{w.tag}</span>
                    <span className={`${label} hidden text-stone md:block`}>{w.kind}</span>
                    <span aria-hidden className="text-[14px] transition-transform duration-700 ease-prime group-hover/row:-translate-y-0.5 group-hover/row:translate-x-0.5">
                      ↗
                    </span>
                  </a>
                </li>
              );
            })}
            <li aria-hidden className="border-t border-ink/10" />
          </ol>
        </div>

        {/* the list's preview: wide screens with a pointer only; it rides over the rows, under the cursor */}
        <div
          data-preview
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 z-10 hidden w-[min(18vw,260px)] md:block"
        >
          <DitherReveal className="aspect-[4/5] bg-ink" color="#ffffff" duration={0.7} replay={replay}>
            {WORK.map((w, i) => (
              <div key={w.slug} className="absolute inset-0" style={{ opacity: i === shown ? 1 : 0, background: w.canvas }}>
                <CardMedia work={w} />
              </div>
            ))}
          </DitherReveal>
          <p className={`${label} mt-2 text-stone`}>{WORK[shown].line}</p>
        </div>
      </section>

      {/* ---- the brands we've built with: small, in rows ---- */}
      <section data-nav-message="Clients" className="px-[var(--gutter)] pb-[28vh]">
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
