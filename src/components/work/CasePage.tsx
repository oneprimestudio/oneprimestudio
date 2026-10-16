"use client";

import Link from "next/link";
import { useRef } from "react";
import { PillLink } from "@/components/Pill";
import { CardMedia, Cover, label, pad, ShotFrame } from "@/components/work/parts";
import { gooHeadings } from "@/lib/goo";
import {
  ensureSmoother,
  gsap,
  hoverScramble,
  liven,
  MENU_EASE,
  prefersReducedMotion,
  PRIME,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { WORK } from "@/lib/work";

/*
 * One project, whole — /projects/[slug]. Set like the globe section: white, small type, the words kept to
 * the corners and the pictures given the room. A label, the name and its paragraph at the top left; the
 * way back and the place opposite; then the cover, aligned to the pictures' column.
 *
 * The body runs on twelve columns:
 *   1–2    names: the facts (client, place, year, discipline, scope, the live site) — held while the
 *          pictures pass
 *   3–6    the pictures: captures of the live work and its screens, each opening through a rising mask
 *   7–12   the information: the case in parts, numbered, and the links — also held while the pictures pass
 * On a phone it stacks: facts, information, pictures. Then the next case, small: its name rolls on hover
 * and its 4:5 card opens through the same mask.
 */

const shown = "play none none none"; // played once, never killed: see the ScrollTrigger `once` gotcha
const host = (url: string) => (url.startsWith("/") ? "oneprimestudio.com" : new URL(url).hostname.replace(/^www\./, ""));

const arrow = (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
  </svg>
);

export default function CasePage({ slug }: { slug: string }) {
  const root = useRef<HTMLElement>(null);
  const i = WORK.findIndex((w) => w.slug === slug);
  const work = WORK[i];
  const n = (i + 1) % WORK.length;
  const next = WORK[n];
  const facts: [string, string][] = [
    ["Client", work.client === "In-house" ? "One Prime Studio" : work.client],
    ...(work.place ? ([["Place", work.place]] as [string, string][]) : []),
    ["Year", work.year],
    ["Discipline", work.tag],
  ];

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

      // a frame opens upward from its foot while its picture settles from a slight zoom
      const open = (mask: Element | null, media: Element | null, vars: gsap.TimelineVars) => {
        if (!mask) return;
        gsap
          .timeline(vars)
          .fromTo(mask, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: PRIME }, 0)
          .from(media, { scale: 1.25, yPercent: 8, duration: 1.8, ease: PRIME }, 0);
      };
      const cover = el.querySelector("[data-cover]");
      open(cover, cover?.querySelector("[data-cover-media]") ?? null, { delay: 0.3 });
      el.querySelectorAll("[data-shot]").forEach((fig) =>
        open(fig.querySelector("[data-shot-mask]"), fig.querySelector("[data-shot-media]"), {
          scrollTrigger: { trigger: fig, start: "top 88%", toggleActions: shown },
        }),
      );
      const card = el.querySelector("[data-next-mask]");
      open(card, card?.querySelector("[data-next-media]") ?? null, {
        scrollTrigger: { trigger: card ?? el, start: "top 90%", toggleActions: shown },
      });

      // the lede rises line by line out of its masks
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
              ease: MENU_EASE,
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
      el.querySelectorAll<HTMLElement>("[data-rule]").forEach((node) =>
        gsap.from(node, {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 1.4,
          ease: PRIME,
          scrollTrigger: { trigger: node, start: "top 94%", toggleActions: shown },
        }),
      );

      // wide screens: the names and the information hold while the pictures pass — each only if it fits
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const shots = el.querySelector<HTMLElement>("[data-shots]");
        if (!shots) return;
        const top = () => (document.querySelector("nav")?.getBoundingClientRect().bottom ?? 80) + 32;
        el.querySelectorAll<HTMLElement>("[data-hold]").forEach((col) => {
          if (col.offsetHeight > window.innerHeight - top() - 40 || col.offsetHeight >= shots.offsetHeight) return;
          ScrollTrigger.create({
            trigger: col,
            pin: true,
            pinSpacing: false,
            start: () => `top ${top()}px`,
            endTrigger: shots,
            end: () => `bottom ${top() + col.offsetHeight}px`,
            invalidateOnRefresh: true,
          });
        });
      });
      cleanups.push(() => mm.revert());
      return done;
    },
    { scope: root },
  );

  return (
    <main ref={root} className="relative bg-white text-ink">
      {/* ---- head: the corners, as the globe's ---- */}
      <section data-nav-message={`Case ${pad(i + 1)}`} className="px-[var(--gutter)] pt-[calc(var(--nav-top)+var(--nav-h)+40px)]">
        <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8">
          <div className="max-w-[40ch] md:col-span-5">
            <p className={`${label} overflow-hidden text-stone`}>
              <span data-rise data-hover-scramble className="block">
                [ Case {pad(i + 1)} ] — {work.kind}
              </span>
            </p>
            <h1 data-reveal className="mt-4 text-[clamp(1.75rem,2.6vw,2.625rem)] font-medium leading-[1.05] tracking-[-0.035em]">
              {work.title}
            </h1>
            <p data-reveal className="mt-4 text-[15px] leading-[1.5] tracking-[-0.005em] text-graphite md:text-[16px]">
              {work.summary}
            </p>
          </div>
          <div className="flex flex-col items-start gap-5 md:col-span-4 md:col-start-9 md:items-end">
            <PillLink href="/projects">
              <span aria-hidden className="mr-1">←</span>All projects
            </PillLink>
            <p className={`${label} overflow-hidden text-stone md:text-right`}>
              <span data-rise className="block">
                {work.place ? `${work.place} · ` : ""}
                {work.year}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ---- the cover, aligned to the pictures' column and running to the right edge ---- */}
      <div className="mt-[22vh] px-[var(--gutter)] md:mt-[34vh] md:grid md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-10 md:col-start-3">
          <div data-cover className="relative aspect-[4/5] overflow-hidden md:aspect-[16/9]" style={{ background: work.canvas }}>
            <div data-cover-media className="absolute inset-0">
              <Cover work={work} />
            </div>
          </div>
          <p className={`${label} mt-3 flex justify-between text-stone`}>
            <span>Fig. 0 — {work.url ? host(work.url) : work.title}</span>
            <span>{work.tag}</span>
          </p>
        </div>
      </div>

      {/* ---- the body: names 1–2, pictures 3–6, information 7–12 ---- */}
      <section data-nav-message="The case" className="px-[var(--gutter)] pb-[34vh] pt-[26vh] md:pt-[34vh]">
        <div className="flex flex-col gap-y-24 md:grid md:grid-cols-12 md:items-start md:gap-x-8 lg:gap-x-12">
          {/* names */}
          <div className="md:col-span-2">
            <dl data-hold className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-1">
              {facts.map(([k, v]) => (
                <div key={k} data-reveal>
                  <dt data-hover-scramble className={`${label} text-stone`}>
                    {k}
                  </dt>
                  <dd className="mt-1.5 text-[14px] leading-[1.4] md:text-[15px]">{v}</dd>
                </div>
              ))}
              <div data-reveal className="col-span-2 md:col-span-1">
                <dt className={`${label} text-stone`}>Scope</dt>
                <dd className="mt-1.5">
                  <ul className="text-[14px] leading-[1.55] md:text-[15px]">
                    {work.scope.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              {work.url && (
                <div data-reveal className="col-span-2 md:col-span-1">
                  <dt className={`${label} text-stone`}>Live</dt>
                  <dd className="mt-1.5">
                    <a
                      href={work.url}
                      {...(work.url.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" })}
                      className="group inline-flex items-center gap-1.5 text-[14px] md:text-[15px]"
                    >
                      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-700 ease-prime group-hover:bg-[length:0%_1px]">
                        {work.url.startsWith("/") ? "You are on it" : "Visit the site"}
                      </span>
                      <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                        {arrow}
                      </span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* pictures */}
          <div data-shots className="order-3 flex flex-col gap-y-[16vh] md:order-none md:col-span-4 md:gap-y-[24vh]">
            {work.shots.length ? (
              work.shots.map((s, k) => <ShotFrame key={s.src} shot={s} n={`${i + 1}.${k + 1}`} canvas={work.canvas} />)
            ) : (
              <figure data-shot>
                <div data-shot-mask className="relative aspect-[4/5] overflow-hidden" style={{ background: work.canvas }}>
                  <div data-shot-media className="absolute inset-0">
                    <CardMedia work={work} />
                  </div>
                </div>
                <figcaption className={`${label} mt-3 text-stone`}>Screens are on their way</figcaption>
              </figure>
            )}
          </div>

          {/* information */}
          <div className="order-2 md:order-none md:col-span-6 lg:pl-[4vw]">
            <div data-hold>
              <p className={`${label} text-stone`}>The case</p>
              <p data-reveal className="mt-5 max-w-[36ch] text-[16px] leading-[1.55] tracking-[-0.01em] text-ink md:text-[18px]">
                {work.line}
              </p>
              <ol className="mt-14 md:mt-20">
                {work.story.map((part, k) => (
                  <li key={part.title} data-reveal className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-ink/10 py-7 last:border-b md:py-9">
                    <span className={`${label} pt-[3px] text-stone`}>{pad(k + 1)}</span>
                    <div>
                      <h2 className="text-[15px] font-medium tracking-[-0.01em] md:text-[16px]">{part.title}</h2>
                      <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.65] text-graphite md:text-[15px]">{part.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div data-reveal className="mt-12 flex flex-wrap gap-2">
                {work.url && !work.url.startsWith("/") && (
                  <PillLink href={work.url} external icon={arrow} active>
                    Visit {host(work.url)}
                  </PillLink>
                )}
                <PillLink href="#contact" icon={arrow}>
                  Start a project
                </PillLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- next case: small, like everything else ---- */}
      <section data-nav-message="Next case" className="px-[var(--gutter)] pb-[24vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/10" />
        <Link href={`/projects/${next.slug}`} className="group mt-10 grid gap-y-10 outline-none md:grid-cols-12 md:items-end md:gap-x-8">
          <div className="md:col-span-5">
            <p className={`${label} text-stone`}>
              Next case — {pad(n + 1)} / {pad(WORK.length)}
            </p>
            {/* the name rolls: it rises away and its copy comes up from below, on the prime curve */}
            <p className="relative mt-4 overflow-hidden text-[clamp(1.5rem,2.2vw,2.25rem)] font-medium leading-[1.1] tracking-[-0.035em]">
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
            <p className="mt-2 text-[14px] text-stone md:text-[15px]">{next.line}</p>
          </div>
          <div className="w-[min(46vw,200px)] md:col-span-2 md:col-start-11 md:w-auto">
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
