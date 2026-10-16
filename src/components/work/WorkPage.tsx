"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import DitherReveal from "@/components/DitherReveal";
import { Bullet, CardMedia, display, label, pad } from "@/components/work/parts";
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
import { PillButton, PillLink, PillTag } from "@/components/Pill";
import { BRANDS, KINDS, WORK, type Kind, type Work } from "@/lib/work";

/*
 * The work, after orchard.framer.website/works: the index of everything, each project opening into its
 * own case page (/projects/[slug], CasePage).
 *
 *   head      the name set huge and tight, then two quiet rows of pills — Service (filters the work) and
 *             View (grid or list)
 *   featured  4:5 cards, small to medium, that open through a rising mask; or, as a list, the projects
 *             as rows with a preview that follows the cursor and re-dithers to each one
 *   clients   the brands we've built with, names rolling on hover
 *
 * The footer that follows every page carries the call to start a project, so this page doesn't repeat it.
 */


/**
 * A featured card: 4:5, small to medium. It arrives through a mask — the frame opens upward from its
 * foot while the picture settles from a slight zoom, then its caption lines rise (all on the prime curve,
 * see the grid's reveal). On hover the picture eases in and a "View case" pill rises into the corner.
 */
function Card({ work }: { work: Work }) {
  return (
    <li data-card className="group">
      <Link href={`/projects/${work.slug}`} className="block outline-none">
        <div data-mask className="relative aspect-[4/5] overflow-hidden" style={{ background: work.canvas }}>
          <div data-media className="absolute inset-0">
            <div className="absolute inset-0 transition-transform duration-[1200ms] ease-prime group-hover:scale-[1.06] group-focus-visible:scale-[1.06]">
              <CardMedia work={work} />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between">
            <PillTag tone="glass">{work.kind}</PillTag>
            <span className="font-mono text-[10px] tabular-nums tracking-[0.14em] text-white/70">{work.year}</span>
          </div>
          <span className="absolute bottom-3 left-3 translate-y-[calc(100%+14px)] transition-transform duration-700 ease-prime group-hover:translate-y-0 group-focus-visible:translate-y-0">
            <PillTag tone="glass" className="!bg-white !text-ink">
              View case <span aria-hidden className="ml-1">↗</span>
            </PillTag>
          </span>
        </div>
        <div className="mt-3 overflow-hidden">
          <p data-cap className="truncate text-[14px] leading-[1.4] tracking-[0.01em]">
            <span className="text-ink">{work.title}</span>
            <span className="text-stone"> • {work.client === "In-house" ? "One Prime Studio" : work.tag}</span>
          </p>
        </div>
        <div className="overflow-hidden">
          <p data-cap className="truncate text-[14px] leading-[1.4] tracking-[0.01em] text-stone">{work.line}</p>
        </div>
      </Link>
    </li>
  );
}

/** what the index's preview shows for each project */
function Preview({ work }: { work: Work }) {
  switch (work.slug) {
    case "maera":
      return <Image src="/images/work/maera-dash.jpg" alt="" fill sizes="340px" className="object-cover" />;
    case "identity":
      return <Image src="/images/work/slide-logo.jpg" alt="" fill sizes="340px" className="object-cover" />;
    case "site":
      return <Image src="/images/hero-bloom-4k.webp" alt="" fill sizes="340px" className="bg-black object-cover object-[50%_30%] invert" />;
    default:
      return <Image src="/images/work/film-04.jpg" alt="" fill sizes="340px" className="object-cover" />;
  }
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
            .timeline({ delay: (i % 4) * 0.09, ...at(card) })
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
    <main ref={root} className="relative bg-bloom text-ink">
      {/* ---- head: the page's name, set huge and tight, after the reference ---- */}
      <section
        data-nav-message="The work"
        className="px-[var(--gutter)] pt-[calc(var(--nav-top)+var(--nav-h)+48px)]"
      >
        <div className="grid grid-cols-2 md:grid-cols-12 md:gap-x-6">
          <p data-hover-scramble className={`${label} text-stone md:col-span-3`}>
            [ Work ] — Index
          </p>
          <p className={`${label} justify-self-end text-right text-stone md:col-span-4 md:col-start-9`}>
            ({pad(WORK.length)}) Projects · 2026
          </p>
        </div>

        <h1
          data-goo
          data-lag="0.05"
          className="mt-[14vh] text-[clamp(4.5rem,13.5vw,13rem)] font-medium leading-[0.8] tracking-[-0.075em] md:mt-[18vh]"
        >
          Projects<sup className="ml-[0.06em] align-top font-mono text-[0.1em] font-normal leading-none tracking-normal text-stone">
            ({pad(WORK.length)})
          </sup>
        </h1>

        {/* the controls: what kind of work, and how to see it — each a row of pills */}
        <div className="mt-[10vh] grid gap-y-6 text-[14px] md:mt-[14vh] md:grid-cols-12 md:gap-x-6">
          <div className="grid grid-cols-[5.5rem_1fr] items-start md:col-span-7">
            <p className="pt-[5px] text-stone">Service</p>
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
          <div className="grid grid-cols-[5.5rem_1fr] items-start md:col-span-4 md:col-start-9">
            <p className="pt-[5px] text-stone">View</p>
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

      {/* ---- the work: featured cards, or the index as rows ---- */}
      <section data-index data-nav-message="Featured" className="relative px-[var(--gutter)] pb-[22vh] pt-[6vh]">
        <div ref={grid}>
          {view === "grid" && (
            <ul className="grid grid-cols-2 gap-x-2 gap-y-10 md:grid-cols-3 md:gap-x-3 md:gap-y-14 lg:grid-cols-4">
              {items.map((w) => (
                <Card key={w.slug} work={w} />
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
                    className="group/row grid grid-cols-[2.75rem_1fr_auto] items-baseline gap-x-4 border-t border-ink/10 py-6 transition-colors duration-500 ease-prime group-hover/list:text-ink/30 hover:!text-ink md:grid-cols-[3.5rem_1fr_11rem_4rem_1.5rem] md:py-8"
                  >
                    <span className={`${label} text-stone`}>{pad(i + 1)}</span>
                    <span className={`${display} text-[clamp(1.75rem,3.6vw,3.75rem)] leading-[1] transition-transform duration-700 ease-prime group-hover/row:translate-x-3`}>
                      {w.title}
                    </span>
                    <span className={`${label} hidden text-stone md:block`}>{w.tag}</span>
                    <span className={`${label} hidden text-stone md:block`}>{w.year}</span>
                    <span aria-hidden className="text-[18px] transition-transform duration-700 ease-prime group-hover/row:-translate-y-1 group-hover/row:translate-x-1">
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
          className="pointer-events-none invisible absolute left-0 top-0 z-10 hidden w-[min(24vw,340px)] md:block"
        >
          <DitherReveal className="aspect-[4/3] bg-ink" color="#f9f9f7" duration={0.7} replay={replay}>
            {WORK.map((w, i) => (
              <div key={w.slug} className="absolute inset-0" style={{ opacity: i === shown ? 1 : 0, background: w.canvas }}>
                <Preview work={w} />
              </div>
            ))}
          </DitherReveal>
          <p className={`${label} mt-2 text-ink`}>{WORK[shown].line}</p>
        </div>
      </section>

      {/* ---- the brands we've worked with ---- */}
      <section data-nav-message="Clients" className="px-[var(--gutter)] pb-[22vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/15" />
        <div className="mt-8 grid gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-3">
            <Bullet>Clients</Bullet>
          </div>
          <div className="md:col-span-9">
            <h2 data-goo className={`${display} text-[clamp(2.25rem,5vw,5.5rem)] leading-[0.95]`}>
              Brands we&rsquo;ve
              <br />
              built with.
            </h2>

            <ul className="group/brands mt-[8vh]">
              {BRANDS.map((b, i) => (
                <li
                  key={b.name}
                  data-brand
                  className="group/brand grid grid-cols-[2.75rem_1fr] items-center gap-x-4 gap-y-3 border-t border-ink/10 py-5 transition-colors duration-500 ease-prime last:border-b group-hover/brands:text-ink/30 hover:!text-ink md:grid-cols-[3.5rem_1fr_auto] md:py-7"
                >
                  <span className="overflow-hidden">
                    <span data-brand-line className={`${label} block text-stone`}>
                      ({pad(i + 1)})
                    </span>
                  </span>
                  {/* the name rolls: it rises away and its copy comes up from below, on the prime curve */}
                  <span className="relative block overflow-hidden">
                    <span data-brand-line className="block">
                      <span className={`${display} relative block overflow-hidden text-[clamp(1.5rem,3.4vw,3.25rem)] leading-[1.1]`}>
                        <span className="block transition-transform duration-700 ease-prime group-hover/brand:-translate-y-full">
                          {b.name}
                        </span>
                        <span aria-hidden className="absolute inset-0 block translate-y-full transition-transform duration-700 ease-prime group-hover/brand:translate-y-0">
                          {b.name}
                        </span>
                      </span>
                    </span>
                  </span>
                  <span className="col-start-2 flex gap-1.5 overflow-hidden md:col-start-3">
                    <span data-brand-line className="flex gap-1.5">
                      <PillTag>{b.field}</PillTag>
                      {b.app && <PillTag tone="accent">App</PillTag>}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div data-reveal className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[14px] text-stone">Your brand next?</p>
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
