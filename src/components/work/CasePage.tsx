"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PillLink } from "@/components/Pill";
import { CardMedia, Cover, coverSrc, label, pad, ShotFrame, Swap } from "@/components/work/parts";
import { gooHeadings } from "@/lib/goo";
import { setNavPlain } from "@/lib/navPlain";
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
import { WORK, type Shot } from "@/lib/work";

/*
 * One project, whole — /projects/[slug], laid out after obys.agency's case pages: one screen, split.
 *
 *   wide screens  the screen pins. The left half holds still and carries the words: the label at the top,
 *                 the name and its facts across the middle (what it is, what we did, the live site, the
 *                 paragraph), the part of the story that goes with the picture in view below them, and
 *                 along the foot the way back, the picture's caption and the count. The right half runs
 *                 the pictures — the cover, then every shot — in one column against the right edge; the
 *                 scroll carries them up past a "( )" mark at the seam, the one level with it grows a
 *                 little toward the words and takes its colour, the rest wait smaller and grey. It snaps
 *                 picture to picture.
 *   phones        (and still pages) the same, stacked: the words, the cover, the story, the pictures.
 *
 * Then the next case, small: its name rolls on hover and its 4:5 card opens through a rising mask.
 */

const shown = "play none none none"; // played once, never killed: see the ScrollTrigger `once` gotcha
const STEP_VH = 60; // scroll, in % of the screen, that carries one picture to the seam
const host = (url: string) => (url.startsWith("/") ? "oneprimestudio.com" : new URL(url).hostname.replace(/^www\./, ""));

const arrow = (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
  </svg>
);

/** the underline that wipes away on hover, for small text links */
const wipe =
  "bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-700 ease-prime group-hover:bg-[length:0%_1px]";

type Item = { src: string; alt: string; ratio: number; caption: string; video?: string };
const RATIO: Record<Shot["ratio"], number> = { "16/10": 16 / 10, "4/5": 4 / 5, "900/580": 900 / 580 };

export default function CasePage({ slug }: { slug: string }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLElement>(null);
  const pinRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const i = WORK.findIndex((w) => w.slug === slug);
  const work = WORK[i];
  const n = (i + 1) % WORK.length;
  const next = WORK[n];
  const live = work.url && !work.url.startsWith("/") ? work.url : undefined;

  // the pictures on the right: the cover first, then the shots
  const items: Item[] = [
    { src: coverSrc(work), alt: `${work.title}: ${work.tag}`, ratio: 16 / 9, caption: work.url ? host(work.url) : work.title },
    ...work.shots.map((s) => ({ src: s.src, alt: s.alt, ratio: RATIO[s.ratio], caption: s.caption, video: s.video })),
  ];
  const M = items.length;
  const P = work.story.length;
  // the part of the story that goes with each picture: the parts spread evenly down the pictures
  const partOf = (k: number) => Math.min(P - 1, Math.floor((k * P) / M));
  const part = partOf(active);
  const fig = (k: number) => (k === 0 ? `Fig. ${pad(i + 1)}` : `Fig. ${pad(i + 1)}.${k}`);

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

      // a frame opens upward from its foot while its picture settles from a slight zoom
      const open = (mask: Element | null, media: Element | null, vars: gsap.TimelineVars) => {
        if (!mask) return;
        gsap
          .timeline(vars)
          .fromTo(mask, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: PRIME }, 0)
          .from(media, { scale: 1.25, yPercent: 8, duration: 1.8, ease: PRIME }, 0);
      };
      // phones: the stacked page's pieces arrive as they scroll in
      const flat = el.querySelector<HTMLElement>("[data-flat]");
      if (flat && flat.offsetParent) {
        gsap.from(flat.querySelectorAll("[data-rise]"), { yPercent: 110, duration: 1.2, ease: PRIME, stagger: 0.06, delay: 0.15 });
        const cover = flat.querySelector("[data-cover]");
        open(cover, cover?.querySelector("[data-cover-media]") ?? null, { delay: 0.3 });
        flat.querySelectorAll("[data-shot]").forEach((f) =>
          open(f.querySelector("[data-shot-mask]"), f.querySelector("[data-shot-media]"), {
            scrollTrigger: { trigger: f, start: "top 88%", toggleActions: shown },
          }),
        );
      }
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
        if (!node.offsetParent) return;
        gsap.from(node, {
          y: 22,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          scrollTrigger: { trigger: node, start: "top 92%", toggleActions: shown },
        });
      });
      el.querySelectorAll<HTMLElement>("[data-rule]").forEach((node) =>
        gsap.from(node, {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 1.4,
          ease: PRIME,
          scrollTrigger: { trigger: node, start: "top 94%", toggleActions: shown },
        }),
      );
      const card = el.querySelector("[data-next-mask]");
      open(card, card?.querySelector("[data-next-media]") ?? null, {
        scrollTrigger: { trigger: card ?? el, start: "top 90%", toggleActions: shown },
      });
      return done;
    },
    { scope: root },
  );

  // ---- wide screens: the split screen pins and the scroll runs the pictures past the seam ----
  useGSAP(
    () => {
      const el = stage.current;
      if (!el || prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const col = el.querySelector<HTMLElement>("[data-col]")!;
        const frames = Array.from(el.querySelectorAll<HTMLElement>("[data-item]"));
        let centers: number[] = [];
        const measure = () => {
          centers = frames.map((f) => f.offsetTop + f.offsetHeight / 2);
        };
        measure();
        let last = -1;
        // where the column stands: the picture level with the seam a little larger and in colour
        const place = (p: number) => {
          const at = p * Math.max(M - 1, 0);
          const k = Math.min(Math.floor(at), M - 1);
          const t = at - k;
          const c = centers[k] + ((centers[k + 1] ?? centers[k]) - centers[k]) * t;
          gsap.set(col, { y: el.offsetHeight / 2 - c });
          frames.forEach((f, j) => {
            const d = Math.min(Math.abs(j - at), 1);
            gsap.set(f, { scale: 1.08 - d * 0.14, opacity: 1 - d * 0.4, filter: `grayscale(${d})` });
          });
          const now = Math.round(at);
          if (now !== last) {
            last = now;
            setActive(now);
          }
        };
        const pin = ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: () => `+=${Math.max(M - 1, 0.01) * STEP_VH}%`,
          pin: true,
          refreshPriority: 1,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            measure();
            place(self.progress);
            setNavPlain(self.isActive);
          },
          onUpdate: (self) => place(self.progress),
          // while the screen is held, nothing passes under the navbar: it can drop its sheet
          onToggle: (self) => setNavPlain(self.isActive),
          ...(M > 1 && {
            snap: { snapTo: 1 / (M - 1), duration: { min: 0.35, max: 0.9 }, delay: 0.08, ease: "power2.inOut" },
          }),
        });
        pinRef.current = pin;
        setNavPlain(pin.isActive);
        place(pin.progress);

        // the page arrives: the mark closes in, the pictures open upward, the words rise
        gsap
          .timeline({ defaults: { ease: PRIME } })
          .from(el.querySelectorAll("[data-paren]"), { scale: 1.6, autoAlpha: 0, duration: 1.2, stagger: 0.06 }, 0.15)
          .fromTo(
            frames.map((f) => f.firstElementChild),
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, stagger: 0.07 },
            0,
          )
          .from(el.querySelectorAll("[data-rise]"), { yPercent: 110, duration: 1.1, stagger: 0.04 }, 0.25)
          .from(el.querySelectorAll("[data-corner]"), { y: 16, autoAlpha: 0, duration: 1, ease: MENU_EASE, stagger: 0.06 }, 0.4);
        return () => {
          pinRef.current = null;
          setNavPlain(false);
        };
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  // on each new picture the mark breathes and the words that go with it roll over
  useEffect(() => {
    const el = stage.current;
    if (!el || prefersReducedMotion()) return;
    gsap.fromTo(el.querySelectorAll("[data-swap]"), { yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: PRIME, stagger: 0.03 });
    gsap.fromTo(el.querySelectorAll("[data-breathe]"), { scale: 1.12 }, { scale: 1, duration: 0.9, ease: PRIME, overwrite: true });
  }, [active]);

  // a picture that isn't level with the seam travels there first
  const go = (k: number) => {
    const pin = pinRef.current;
    if (!pin || M < 2) return;
    const y = pin.start + (k / (M - 1)) * (pin.end - pin.start);
    const smoother = ScrollSmoother.get();
    if (smoother) smoother.scrollTo(y, true);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const facts = (
    <>
      <p className="text-ink">{work.tag}</p>
      <p className="mt-1 text-stone">{work.scope.join(", ")}</p>
      {work.url && (
        <a
          href={work.url}
          {...(live ? { target: "_blank", rel: "noreferrer" } : {})}
          className="group mt-4 inline-flex items-center gap-1.5 text-ink"
        >
          <span className={wipe}>{live ? "Live website" : "You are on it"}</span>
          <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
            {arrow}
          </span>
        </a>
      )}
    </>
  );

  return (
    <main ref={root} className="relative bg-white text-ink">
      {/* ================= wide screens: the split screen ================= */}
      <section
        ref={stage}
        data-nav-message={`Case ${pad(i + 1)}`}
        className="relative hidden h-[100svh] min-h-[640px] overflow-hidden bg-white md:block motion-reduce:md:hidden"
      >
        {/* the pictures, against the right edge — cut at the navbar's foot, so none passes behind it */}
        <div className="pointer-events-none absolute inset-0 [clip-path:inset(calc(var(--nav-top)+var(--nav-h)+12px)_0_0_0)]">
          <div data-col className="absolute right-0 top-0 flex w-[44vw] flex-col items-end gap-[9svh] will-change-transform [&>*]:pointer-events-auto">
            {items.map((it, k) => (
              <button
                key={it.src + k}
                type="button"
                data-item
                tabIndex={-1}
                onClick={() => go(k)}
                aria-label={`${fig(k)} — ${it.caption}`}
                className="block origin-right will-change-transform"
                style={{ width: `min(44vw, ${Math.round(68 * it.ratio)}svh)`, aspectRatio: String(it.ratio) }}
              >
                <span className="relative block h-full w-full overflow-hidden" style={{ background: work.canvas }}>
                  {it.video ? (
                    <video
                      src={it.video}
                      poster={it.src}
                      aria-label={it.alt}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Image src={it.src} alt={it.alt} fill priority={k === 0} sizes="48vw" className="object-cover object-top" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* the mark at the seam: "( )", drawn over whatever passes under it */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-5 mix-blend-difference">
          {["M22 2C8 18 4 34 4 48s4 30 18 46", "M2 2c14 16 18 32 18 46S16 78 2 94"].map((d) => (
            <span key={d} data-breathe className="block">
              <svg data-paren viewBox="0 0 24 96" className="block h-24 w-6 text-white">
                <path d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
              </svg>
            </span>
          ))}
        </div>

        {/* the label, top left */}
        <p className={`${label} absolute left-[var(--gutter)] top-[calc(var(--nav-top)+var(--nav-h)+28px)] overflow-hidden text-stone`}>
          <span data-rise data-hover-scramble className="block">
            [ Case {pad(i + 1)} ] — {work.kind}
          </span>
        </p>

        {/* the name and its facts, across the middle of the left half */}
        <div className="absolute left-[var(--gutter)] top-1/2 grid w-[calc(46vw-var(--gutter))] -translate-y-1/2 grid-cols-[minmax(0,15vw)_minmax(0,1fr)] gap-x-[3vw] text-[13px] leading-[1.4] tracking-[-0.005em]">
          <div>
            <h1 className="overflow-hidden text-[clamp(1.125rem,1.5vw,1.5rem)] font-medium leading-[1.15] tracking-[-0.025em]">
              <span data-rise className="block">
                {work.title}
              </span>
            </h1>
            <p className={`${label} mt-2 overflow-hidden text-stone`}>
              <span data-rise className="block">
                {work.place ? `${work.place} · ` : ""}
                {work.year}
              </span>
            </p>
          </div>
          <div>
            <div data-corner>{facts}</div>
            <p data-corner className="mt-8 max-w-[44ch] text-[14px] leading-[1.55] text-graphite lg:text-[15px]">
              {work.summary}
            </p>
          </div>
        </div>

        {/* the part of the story that goes with the picture in view */}
        <div
          aria-live="polite"
          className="absolute bottom-[calc(var(--gutter)+64px)] left-[calc(var(--gutter)+15vw+3vw)] w-[calc(46vw-var(--gutter)-18vw)] text-[13px] leading-[1.5]"
        >
          <Swap id={`p${part}`} className={`${label} text-stone`}>
            {pad(part + 1)} / {pad(P)}
          </Swap>
          <Swap id={`t${part}`} className="mt-2 font-medium text-ink">
            {work.story[part].title}
          </Swap>
          <Swap id={`x${part}`} className="mt-1 max-w-[44ch] text-graphite">
            {work.story[part].text}
          </Swap>
        </div>

        {/* the foot: the way back, the caption, the count */}
        <div data-corner className="absolute bottom-[var(--gutter)] left-[var(--gutter)]">
          <Link href="/projects" className="group inline-flex items-center gap-2 text-[13px] text-ink">
            <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:-translate-x-1">
              ←
            </span>
            <span className={wipe}>All projects</span>
          </Link>
        </div>
        <div
          data-corner
          className={`${label} absolute bottom-[var(--gutter)] left-[calc(var(--gutter)+18vw)] flex w-[calc(46vw-var(--gutter)-18vw)] justify-between gap-6 text-stone`}
        >
          <Swap id={`f${active}`} className="min-w-0 whitespace-nowrap [&>span]:truncate">
            {fig(active)} — {items[active].caption}
          </Swap>
          <Swap id={`c${active}`} className="shrink-0 text-ink">
            {pad(active + 1)} / {pad(M)}
          </Swap>
        </div>
      </section>

      {/* ================= phones and still pages: stacked ================= */}
      <div data-flat className="md:hidden motion-reduce:md:block">
        <section data-nav-message={`Case ${pad(i + 1)}`} className="px-[var(--gutter)] pt-[calc(var(--nav-top)+var(--nav-h)+40px)]">
          <p className={`${label} overflow-hidden text-stone`}>
            <span data-rise className="block">
              [ Case {pad(i + 1)} ] — {work.kind}
            </span>
          </p>
          <h2 className="mt-4 overflow-hidden text-[24px] font-medium leading-[1.1] tracking-[-0.03em]">
            <span data-rise className="block">
              {work.title}
            </span>
          </h2>
          <p className={`${label} mt-2 text-stone`}>
            {work.place ? `${work.place} · ` : ""}
            {work.year}
          </p>
          <div data-reveal className="mt-8 text-[14px] leading-[1.45]">
            {facts}
          </div>
          <p data-reveal className="mt-8 text-[15px] leading-[1.55] text-graphite">
            {work.summary}
          </p>
        </section>

        <div className="mt-[12vh] px-[var(--gutter)]">
          <div data-cover className="relative aspect-[4/5] overflow-hidden md:aspect-[16/9]" style={{ background: work.canvas }}>
            <div data-cover-media className="absolute inset-0">
              <Cover work={work} priority />
            </div>
          </div>
          <p className={`${label} mt-3 flex justify-between text-stone`}>
            <span>{fig(0)}</span>
            <span>{items[0].caption}</span>
          </p>
        </div>

        <section data-nav-message="The case" className="px-[var(--gutter)] pt-[14vh]">
          <ol>
            {work.story.map((s, k) => (
              <li key={s.title} data-reveal className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-ink/10 py-7 last:border-b">
                <span className={`${label} pt-[3px] text-stone`}>{pad(k + 1)}</span>
                <div>
                  <h3 className="text-[15px] font-medium tracking-[-0.01em]">{s.title}</h3>
                  <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.65] text-graphite">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-[12vh] flex flex-col gap-y-[10vh] md:mx-auto md:max-w-[640px]">
            {work.shots.map((s, k) => (
              <ShotFrame key={s.src} shot={s} n={`${i + 1}.${k + 1}`} canvas={work.canvas} />
            ))}
          </div>
          <div data-reveal className="mt-14 flex flex-wrap gap-2">
            <PillLink href="/projects">
              <span aria-hidden className="mr-1">←</span>All projects
            </PillLink>
            {live && (
              <PillLink href={live} external icon={arrow} active>
                Visit {host(live)}
              </PillLink>
            )}
          </div>
        </section>
      </div>

      {/* ---- next case: small, like everything else ---- */}
      <section data-nav-message="Next case" className="px-[var(--gutter)] pb-[24vh] pt-[18vh] md:pt-[22vh]">
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
          <div className="w-[min(46vw,220px)] md:col-span-2 md:col-start-11 md:w-auto">
            <div data-next-mask className="relative aspect-[4/5] overflow-hidden" style={{ background: next.canvas }}>
              <div data-next-media className="absolute inset-0">
                <div className="absolute inset-0 transition-transform duration-[1200ms] ease-prime group-hover:scale-[1.06]">
                  <CardMedia work={next} sizes="(min-width: 768px) 16vw, 46vw" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>
    </main>
  );
}
