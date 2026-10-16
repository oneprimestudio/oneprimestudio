"use client";

import Link from "next/link";
import { useRef } from "react";
import { PillLink, PillTag } from "@/components/Pill";
import { Bullet, CardMedia, Cover, Figures, label, pad } from "@/components/work/parts";
import { gooHeadings } from "@/lib/goo";
import { ensureSmoother, gsap, hoverScramble, liven, MENU_EASE, prefersReducedMotion, PRIME, SplitText, useGSAP } from "@/lib/gsap";
import { WORK } from "@/lib/work";

/*
 * One project, whole — /projects/[slug]. The index's language carried through: the name huge and tight,
 * pills for what it is, then the matter in a spec sheet's order.
 *
 *   head      back to the index, the case's number, the name, its one line and its tags
 *   cover     the project at full width, opening upward through a mask while the picture settles
 *   facts     client, year, discipline, scope — four hairline columns
 *   overview  the case in one paragraph, rising line by line
 *   story     the parts of the work, numbered: what each one is and why it is there
 *   figures   the spec-sheet figures, measured and dithered in as they arrive
 *   next      the next case: its name rolls on hover, its 4:5 card opens through the same mask
 */

const shown = "play none none none"; // played once, never killed: see the ScrollTrigger `once` gotcha

export default function CasePage({ slug }: { slug: string }) {
  const root = useRef<HTMLElement>(null);
  const i = WORK.findIndex((w) => w.slug === slug);
  const work = WORK[i];
  const n = (i + 1) % WORK.length;
  const next = WORK[n];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const cleanups: (() => void)[] = [hoverScramble(el)];
      const done = () => cleanups.forEach((fn) => fn());

      // the films play only while they can be seen
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            const v = e.target as HTMLVideoElement;
            if (e.isIntersecting && !prefersReducedMotion()) v.play().catch(() => {});
            else v.pause();
          }),
        { threshold: 0.25 },
      );
      el.querySelectorAll("video").forEach((v) => io.observe(v));
      cleanups.push(() => io.disconnect());

      if (prefersReducedMotion()) return done;
      cleanups.push(liven(el));
      gooHeadings(el);

      // the head's small lines rise as the page arrives
      gsap.from(el.querySelectorAll("[data-rise]"), { yPercent: 110, duration: 1.2, ease: PRIME, stagger: 0.06, delay: 0.15 });

      // the cover: its frame opens upward from the foot while the picture settles from a slight zoom
      const cover = el.querySelector("[data-cover]");
      if (cover)
        gsap
          .timeline({ delay: 0.3 })
          .fromTo(cover, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: PRIME }, 0)
          .from(cover.querySelector("[data-cover-media]"), { scale: 1.25, yPercent: 8, duration: 1.9, ease: PRIME }, 0);

      // paragraphs rise line by line out of their masks
      el.querySelectorAll<HTMLElement>("[data-lines]").forEach((node) => {
        SplitText.create(node, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.2,
              ease: PRIME,
              stagger: 0.08,
              scrollTrigger: { trigger: node, start: "top 88%", toggleActions: shown },
            }),
        });
      });
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) =>
        gsap.from(node, {
          y: 22,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          scrollTrigger: { trigger: node, start: "top 92%", toggleActions: shown },
        }),
      );
      // hairlines and rulers draw out from the left
      el.querySelectorAll<HTMLElement>("[data-rule], [data-ruler]").forEach((node) =>
        gsap.from(node, {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 1.4,
          ease: PRIME,
          scrollTrigger: { trigger: node, start: "top 94%", toggleActions: shown },
        }),
      );
      // the curve draws itself when its figure arrives
      const curve = el.querySelector("[data-curve]");
      if (curve)
        gsap.fromTo(
          curve,
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 1.8, ease: PRIME, delay: 0.6, scrollTrigger: { trigger: curve, start: "top 85%", toggleActions: shown } },
        );
      // the next case's card opens through the cover's mask
      const card = el.querySelector("[data-next-mask]");
      if (card)
        gsap
          .timeline({ scrollTrigger: { trigger: card, start: "top 90%", toggleActions: shown } })
          .fromTo(card, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: PRIME }, 0)
          .from(card.querySelector("[data-next-media]"), { scale: 1.3, yPercent: 10, duration: 1.6, ease: PRIME }, 0);
      return done;
    },
    { scope: root },
  );

  return (
    <main ref={root} className="relative bg-bloom text-ink">
      {/* ---- head ---- */}
      <section data-nav-message={work.title} className="px-[var(--gutter)] pt-[calc(var(--nav-top)+var(--nav-h)+40px)]">
        <div className="flex items-center justify-between gap-4">
          <PillLink href="/projects">
            <span aria-hidden className="mr-1">←</span>All projects
          </PillLink>
          <p className={`${label} overflow-hidden text-stone`}>
            <span data-rise className="block">
              Case {pad(i + 1)} / {pad(WORK.length)}
            </span>
          </p>
        </div>

        <h1
          data-goo
          data-lag="0.05"
          className="mt-[12vh] max-w-[14ch] text-[clamp(3rem,9vw,9.5rem)] font-medium leading-[0.86] tracking-[-0.065em] md:mt-[16vh]"
        >
          {work.title}
        </h1>

        <div className="mt-10 grid gap-y-6 md:mt-14 md:grid-cols-12 md:items-end md:gap-x-6">
          <p className="overflow-hidden text-[18px] leading-[1.4] tracking-[-0.01em] text-graphite md:col-span-6 md:text-[21px]">
            <span data-rise className="block max-w-[34ch]">
              {work.line}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5 md:col-span-6 md:justify-end">
            <PillTag tone={work.kind === "App" ? "accent" : "light"}>{work.kind}</PillTag>
            {work.scope.map((s) => (
              <PillTag key={s}>{s}</PillTag>
            ))}
          </div>
        </div>
      </section>

      {/* ---- cover ---- */}
      <div className="mt-[7vh] px-[var(--gutter)]">
        <div data-cover className="relative aspect-[4/5] overflow-hidden md:aspect-[16/9]" style={{ background: work.canvas }}>
          <div data-cover-media className="absolute inset-0">
            <Cover work={work} />
          </div>
          {/* difference-blended, so it reads over the dark canvas and over a white screen alike */}
          <div className={`${label} pointer-events-none absolute inset-x-4 bottom-4 z-10 flex justify-between text-white mix-blend-difference`}>
            <span>Fig. 0 — {work.title}</span>
            <span className="tabular-nums">{work.year}</span>
          </div>
        </div>
      </div>

      {/* ---- facts ---- */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 px-[var(--gutter)] md:grid-cols-4">
        {[
          ["Client", work.client === "In-house" ? "One Prime Studio" : work.client],
          ["Year", work.year],
          ["Discipline", work.tag],
          ["Scope", work.scope.join(", ")],
        ].map(([k, v]) => (
          <div key={k} data-reveal className="border-t border-ink/15 pb-6 pt-3">
            <dt className={`${label} text-stone`}>{k}</dt>
            <dd className="mt-2 text-[15px] leading-[1.4]">{v}</dd>
          </div>
        ))}
      </dl>

      {/* ---- overview ---- */}
      <section data-nav-message="Overview" className="px-[var(--gutter)] pb-[16vh] pt-[16vh]">
        <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-6">
          <Bullet className="md:col-span-3">Overview</Bullet>
          <p
            data-lines
            className="max-w-[30ch] text-[clamp(1.5rem,2.6vw,2.625rem)] leading-[1.18] tracking-[-0.025em] md:col-span-9"
          >
            {work.summary}
          </p>
        </div>
      </section>

      {/* ---- story ---- */}
      <section data-nav-message="The work" className="px-[var(--gutter)] pb-[18vh]">
        {work.story.map((part, k) => (
          <div
            key={part.title}
            data-reveal
            className="grid gap-y-4 border-t border-ink/12 py-10 last:border-b md:grid-cols-12 md:gap-x-6 md:py-14"
          >
            <p className={`${label} text-stone md:col-span-3`}>({pad(k + 1)})</p>
            <h2 className="text-[clamp(1.5rem,2.4vw,2.5rem)] font-medium leading-[1] tracking-[-0.04em] md:col-span-4">
              {part.title}
            </h2>
            <p className="max-w-[42ch] text-[16px] leading-[1.5] text-graphite md:col-span-5 md:text-[18px]">{part.text}</p>
          </div>
        ))}
      </section>

      {/* ---- figures ---- */}
      <section data-nav-message="Figures" className="px-[var(--gutter)] pb-[22vh]">
        <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-6">
          <Bullet className="md:col-span-3">Figures</Bullet>
          <div className="md:col-span-9">
            <Figures work={work} n={i + 1} />
          </div>
        </div>
      </section>

      {/* ---- next case ---- */}
      <section data-nav-message="Next case" className="px-[var(--gutter)] pb-[16vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/15" />
        <Link href={`/projects/${next.slug}`} className="group mt-8 grid gap-y-8 outline-none md:grid-cols-12 md:items-end md:gap-x-6">
          <div className="md:col-span-8">
            <p className={`${label} text-stone`}>
              Next case — {pad(n + 1)} / {pad(WORK.length)}
            </p>
            {/* the name rolls: it rises away and its copy comes up from below, on the prime curve */}
            <p className="relative mt-6 overflow-hidden text-[clamp(2.5rem,7vw,7.5rem)] font-medium leading-[0.92] tracking-[-0.06em]">
              <span className="block transition-transform duration-700 ease-prime group-hover:-translate-y-full group-focus-visible:-translate-y-full">
                {next.title}
              </span>
              <span
                aria-hidden
                className="absolute inset-0 block translate-y-full transition-transform duration-700 ease-prime group-hover:translate-y-0 group-focus-visible:translate-y-0"
              >
                {next.title}
              </span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-1.5">
              <PillTag tone={next.kind === "App" ? "accent" : "light"}>{next.kind}</PillTag>
              <PillTag>{next.tag}</PillTag>
              <span aria-hidden className="ml-2 text-[18px] transition-transform duration-700 ease-prime group-hover:translate-x-2">
                →
              </span>
            </div>
          </div>
          <div className="w-[min(60vw,280px)] md:col-span-3 md:col-start-10 md:w-auto">
            <div data-next-mask className="relative aspect-[4/5] overflow-hidden" style={{ background: next.canvas }}>
              <div data-next-media className="absolute inset-0">
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-prime group-hover:scale-[1.06]">
                  <CardMedia work={next} />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>
    </main>
  );
}
