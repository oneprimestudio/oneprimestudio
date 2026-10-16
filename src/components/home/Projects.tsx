"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import DitherReveal from "@/components/DitherReveal";
import { gooHeadings } from "@/lib/goo";
import {
  CARD_EASE,
  ensureSmoother,
  gsap,
  hoverScramble,
  MENU_EASE,
  prefersReducedMotion,
  PRIME,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { WORK, type Work } from "@/lib/work";
import Logo from "../Logo";

/*
 * Selected work, as an index and a stage — the index after Obys, the type and air after the About page.
 * At the left, the four projects as a numbered list; at the right, the active one's shot on a stage
 * framed by corner brackets. Every shot is a dark canvas of its own tint with the work composed on it —
 * never a cropped screenshot under a gradient.
 *
 * The stage moves on by itself while it is seen (a hairline under the active row fills with the time
 * left) and holds while the index is pointed at; hovering or focusing a row puts that project on the
 * stage, which assembles out of the seams' dots again (DitherReveal); a row, or "Read the case", goes to
 * that project's case page (/projects/[slug]). Four facts between hairlines close the section.
 */

type Project = Work & { shot: ReactNode };

const shadow = "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]";

const PROJECTS: Project[] = [
  {
    ...WORK[0],
    shot: (
      <>
        <div data-spread className="absolute left-[7%] top-[9%] w-[46%] opacity-60">
          <Image
            src="/images/work/maera-cal.jpg"
            alt=""
            width={880}
            height={560}
            sizes="(min-width: 768px) 18vw, 40vw"
            className={`h-auto w-full rounded-[6px] ${shadow}`}
          />
        </div>
        <div data-lift className="absolute right-[7%] top-[15%] w-[60%]">
          <Image
            src="/images/work/maera-dash.jpg"
            alt="Maéra's dashboard: today's takings, the chairs in use and the appointments"
            width={860}
            height={560}
            sizes="(min-width: 768px) 24vw, 56vw"
            className={`h-auto w-full rounded-[6px] ${shadow}`}
          />
        </div>
      </>
    ),
  },
  {
    ...WORK[1],
    shot: (
      <div data-lift className="absolute inset-x-0 top-[36%] flex -translate-y-1/2 justify-center text-chalk">
        <Logo markOnly className="text-[clamp(4.5rem,9vw,8.5rem)]" />
      </div>
    ),
  },
  {
    ...WORK[2],
    shot: (
      // the x-ray, inverted: white veins on black, fading out before the copy
      <div data-lift className="absolute inset-0 [mask-image:linear-gradient(to_bottom,#000_45%,transparent_78%)]">
        <Image
          src="/images/hero-bloom-4k.webp"
          alt="The x-ray cosmos from the homepage, inverted"
          fill
          sizes="(min-width: 768px) 38vw, 86vw"
          className="object-cover object-[50%_30%] invert"
        />
      </div>
    ),
  },
  {
    ...WORK[3],
    shot: (
      <div
        data-lift
        className={`absolute left-1/2 top-[9%] aspect-[9/16] h-[56%] -translate-x-1/2 overflow-hidden rounded-[10px] ring-1 ring-white/10 ${shadow}`}
      >
        <video
          src="/videos/oneprime-logo-intro-540.mp4"
          aria-label="The One Prime logo film"
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
    ),
  },
];

// what the studio is, in four facts — true ones, not invented figures
const FACTS = [
  { value: 6, pad: 2, suffix: "", label: "Disciplines" },
  { value: 100, pad: 0, suffix: "%", label: "Designed and built in-house" },
  { value: 60, pad: 0, suffix: " fps", label: "Motion standard" },
  { value: 2026, pad: 0, suffix: "", label: "Established, Hyderabad" },
];

const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-stone md:text-[11px]";
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const DWELL = 5; // s each project holds the stage before the next

export default function Projects() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [replay, setReplay] = useState(0);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  const project = PROJECTS[active];

  const show = (i: number) => {
    if (i === active) return;
    setActive(i);
    setReplay((r) => r + 1);
  };

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      // the stage only plays (and the film only runs) while the section is on screen
      ScrollTrigger.create({
        trigger: el,
        start: "top 75%",
        end: "bottom 25%",
        onToggle: (self) => {
          setInView(self.isActive);
          // the first time it is seen, the stage assembles its first project
          if (self.isActive) setReplay((r) => (r === 0 ? 1 : r));
        },
      });
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
              scrollTrigger: { trigger: node, start: "top 85%", once: true },
            }),
        });
      });
      gsap.from(el.querySelectorAll("[data-reveal]"), {
        y: 20,
        autoAlpha: 0,
        duration: 1,
        ease: MENU_EASE,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
      // the index rows settle one after another, the stage's brackets close in on it
      gsap.from(el.querySelectorAll("[data-row]"), {
        yPercent: 60,
        autoAlpha: 0,
        duration: 1,
        ease: PRIME,
        stagger: 0.08,
        scrollTrigger: { trigger: el.querySelector("[data-index]"), start: "top 85%", once: true },
      });
      gsap.from(el.querySelectorAll("[data-bracket]"), {
        scale: 1.6,
        autoAlpha: 0,
        duration: 1.2,
        ease: PRIME,
        stagger: 0.05,
        scrollTrigger: { trigger: el.querySelector("[data-stage]"), start: "top 85%", once: true },
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
          scrollTrigger: { trigger: node, start: "top 92%", once: true },
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
          scrollTrigger: { trigger: el.querySelector("[data-facts]"), start: "top 92%", once: true },
        },
      );
      return unScramble;
    },
    { scope: root },
  );

  // the stage moves on by itself while it is seen and nobody is pointing at it; the active row's
  // hairline fills with the time left
  useEffect(() => {
    const bar = root.current?.querySelector<HTMLElement>(`[data-progress="${active}"]`);
    if (!bar || !inView || held || prefersReducedMotion()) {
      if (bar) gsap.to(bar, { scaleX: 0, duration: 0.4, ease: "power2.out", overwrite: true });
      return;
    }
    const tween = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: DWELL,
        ease: "none",
        overwrite: true,
        onComplete: () => {
          setActive((a) => (a + 1) % PROJECTS.length);
          setReplay((r) => r + 1);
        },
      },
    );
    return () => {
      tween.kill();
      gsap.set(bar, { scaleX: 0 });
    };
  }, [active, inView, held]);

  // the film plays only while its project is on the stage and the stage is seen
  useEffect(() => {
    root.current?.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (inView && PROJECTS[active].slug === "films" && !prefersReducedMotion()) v.play().catch(() => {});
      else v.pause();
    });
  }, [active, inView]);

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

      {/* ---- the index and the stage ---- */}
      <div className="mt-20 grid gap-y-12 md:mt-28 md:grid-cols-12 md:gap-x-6">
        {/* the index: hover or focus a row to put it on the stage; click to read the case */}
        <ol
          data-index
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          className="order-2 border-t border-ink/12 md:order-1 md:col-span-4 md:self-center"
        >
          {PROJECTS.map((p, i) => {
            const on = i === active;
            return (
              <li key={p.slug} data-row className="relative border-b border-ink/12">
                <Link
                  href={`/projects/${p.slug}`}
                  onPointerEnter={() => show(i)}
                  onFocus={() => {
                    setHeld(true);
                    show(i);
                  }}
                  onBlur={() => setHeld(false)}
                  aria-current={on ? "true" : undefined}
                  className={`group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-3 py-5 transition-colors duration-700 ease-prime md:py-6 ${
                    on ? "text-ink" : "text-ink/35 hover:text-ink"
                  }`}
                >
                  <span className="font-mono text-[11px] tracking-[0.1em]">{pad(i + 1)}</span>
                  <span className="flex items-center gap-3 text-[clamp(1.375rem,2vw,2rem)] font-medium leading-[1.05] tracking-[-0.035em]">
                    <span
                      aria-hidden
                      className={`h-2 w-2 shrink-0 rounded-full bg-accent transition-transform duration-700 ease-prime ${on ? "scale-100" : "scale-0"}`}
                    />
                    <span className="transition-transform duration-700 ease-prime group-hover:translate-x-1">{p.title}</span>
                  </span>
                  <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] lg:block">{p.tag}</span>
                </Link>
                {/* the time left on the stage */}
                <span
                  aria-hidden
                  data-progress={i}
                  className="absolute inset-x-0 -bottom-px block h-px origin-left scale-x-0 bg-accent"
                />
              </li>
            );
          })}
        </ol>

        {/* the stage: the active project's shot in brackets, assembling out of the seams' dots */}
        <div className="order-1 md:order-2 md:col-span-8">
          <div data-stage className="relative p-3 md:p-5">
            {/* brackets at the corners, the way Obys frames its stage */}
            {[
              "left-0 top-0 border-l border-t",
              "right-0 top-0 border-r border-t",
              "bottom-0 left-0 border-b border-l",
              "bottom-0 right-0 border-b border-r",
            ].map((c) => (
              <span key={c} data-bracket aria-hidden className={`absolute h-6 w-6 border-ink md:h-9 md:w-9 ${c}`} />
            ))}
            <DitherReveal className="group aspect-[16/10]" color="#f7f6f2" duration={1} replay={replay}>
              {PROJECTS.map((p, i) => (
                <div
                  key={p.slug}
                  aria-hidden={i !== active}
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{ background: p.canvas, opacity: i === active ? 1 : 0 }}
                >
                  <div className="absolute inset-0 transition-transform duration-1000 ease-prime group-hover:scale-[1.03]">
                    {p.shot}
                  </div>
                  <span className="absolute left-4 top-4 bg-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/85 md:left-6 md:top-6">
                    {p.tag}
                  </span>
                </div>
              ))}
            </DitherReveal>
          </div>

          {/* the caption: what it is, and the way in */}
          <div className="mt-6 grid gap-y-4 md:grid-cols-[1fr_auto] md:items-end md:gap-x-8">
            <div aria-live="polite">
              <p className="text-[clamp(1.375rem,2vw,2rem)] font-medium leading-[1.1] tracking-[-0.035em]">{project.title}</p>
              <p className="mt-1.5 max-w-[46ch] text-[15px] leading-[1.5] text-graphite">{project.line}</p>
            </div>
            <Link
              href={`/projects/${project.slug}`}
              className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink"
            >
              <span className="text-stone">{project.year} ·</span>
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:100%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-700 ease-prime group-hover:bg-[length:0%_1px]">
                Read the case
              </span>
              <span aria-hidden className="transition-transform duration-500 ease-prime group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>

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
