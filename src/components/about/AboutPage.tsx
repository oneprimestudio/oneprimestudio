"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import FounderDrawer from "@/components/about/FounderDrawer";
import GlobeMark from "@/components/GlobeMark";
import WorldSection from "@/components/world/WorldSection";
import { FOUNDERS, type Founder } from "@/lib/founders";
import { gooHeadings } from "@/lib/goo";
import { ensureSmoother, gsap, hoverScramble, MENU_EASE, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";

/*
 * About the studio, laid out after trionn.com/about: large regular-weight headings, small type, and every
 * piece of information in its own place — small uppercase hooks and micro lines at the edges, hairlines
 * between, a great deal of white. Every heading still arrives as ink (lib/goo).
 *
 *   head      the corner labels and a hook line; one centred statement and its hook; a picture cut into
 *             horizontal strips that slide as the pointer crosses them, with a micro line either side; and
 *             "Identity · Leads · Solutions" running across the foot (faster while the page scrolls)
 *   at        "At One Prime," over a mid-size statement; a hairline with a "+"; a bordered badge (the
 *             globe and the year | one claim) at the left, two short paragraphs and the way in at the right
 *   01        what we do: the heading and its lede, then the three pillars as rows — name | what it means
 *   02        why we started: the stepped statement, a micro line, the two paragraphs side by side
 *   03        how we work: a small label, the heading, four steps in columns
 *   04        the founders: the heading at the left; two small cards side by side at the right, each a
 *             portrait (the same 4:5) with the name and role under it in small type; a card opens the drawer
 *   05        where we are: the globe stage shared with the home page (WorldSection)
 */

const label = "font-mono text-[10px] uppercase tracking-tight md:text-[11px]";
/** a small uppercase line that hooks the reader: sans, tight, never more than a few words */
const hook = "text-[11px] font-medium uppercase leading-[1.35] tracking-[0.02em] md:text-[12px]";
/** the section headings: large, regular weight */
const heading = "text-[clamp(2.5rem,5.9vw,6rem)] font-medium  leading-[0.95] tracking-[-0.045em]";
/** a row's title */
const title = "text-[clamp(1.375rem,2.25vw,2rem)] font-medium  leading-[1.1] tracking-[-0.03em]";
const body = "text-[14px] leading-[1.15] text-graphite md:text-[15px]";
const WORDS = ["Identity", "Leads", "Solutions"];

const PILLARS = [
  {
    name: "Identity",
    text: "Logo, type, colour and voice: a brand people recognise at a glance and remember after.",
  },
  {
    name: "Leads",
    text: "Websites and stores built to be found, and to turn visits into enquiries, bookings and orders.",
  },
  {
    name: "Solutions",
    text: "CRMs, ERPs and SaaS products that take the busywork off a team, so the business runs itself.",
  },
];

const STEPS = [
  {
    name: "Discover",
    text: "We start with the problem, not a template: your business, the people you serve, and what success has to look like.",
  },
  {
    name: "Define",
    text: "Scope, structure and the system underneath: flows, content and architecture agreed before a pixel is pushed.",
  },
  {
    name: "Design & build",
    text: "Every screen shaped around the people who use it, then built to perform and to scale, by the same hands.",
  },
  {
    name: "Launch & refine",
    text: "Shipped, measured, refined. We stay on after launch, because good products keep getting better.",
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** a micro line: a "✦" and a few small uppercase words */
function Micro({ children, className = "" }: { children: string; className?: string }) {
  return (
    <p data-reveal className={`${hook} flex gap-2 text-ink ${className}`}>
      <span aria-hidden>✦</span>
      <span>{children}</span>
    </p>
  );
}

/** a heading set as stepped lines, each line an element of its own (data-goo="blocks") */
function Stepped({ lines, className = "" }: { lines: [string, string][]; className?: string }) {
  return (
    <h2 data-goo="blocks" className={className}>
      {lines.map(([text, indent]) => (
        <span key={text} className="block whitespace-nowrap" style={{ paddingLeft: indent }}>
          {text}
        </span>
      ))}
    </h2>
  );
}

const STRIPS = 16;
/** the picture cut into horizontal strips; the page slides the ones the pointer crosses (data-strips) */
function Strips({ src, alt }: { src: string; alt: string }) {
  return (
    <div data-strips role="img" aria-label={alt} className="relative aspect-[4/5] w-full">
      {Array.from({ length: STRIPS }, (_, i) => (
        <div
          key={i}
          data-strip
          aria-hidden
          className="absolute inset-x-0 overflow-hidden will-change-transform"
          style={{ top: `${(i * 100) / STRIPS}%`, height: `calc(${100 / STRIPS}% - 2px)` }}
        >
          <div className="absolute inset-x-0" style={{ top: `${-i * 100}%`, height: `${STRIPS * 100}%` }}>
            {/* the first copy is preloaded; the rest are the same file, so they come from it at once */}
            <Image
              src={src}
              alt=""
              fill
              priority={i === 0}
              loading="eager"
              sizes="(min-width: 768px) 34vw, 70vw"
              className="object-cover object-[50%_70%] grayscale"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const root = useRef<HTMLElement>(null);
  // the founder in the drawer stays set until the drawer has gone, so it can animate out
  const [founder, setFounder] = useState<Founder | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const openFounder = (f: Founder) => {
    setFounder(f);
    setDrawerOpen(true);
  };
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const drawerGone = useCallback(() => setFounder(null), []);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) return unScramble;
      gooHeadings(el);
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) =>
        gsap.from(node, {
          y: 20,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          scrollTrigger: { trigger: node, start: "top 92%", once: true },
        }),
      );
      el.querySelectorAll<HTMLElement>("[data-rule]").forEach((node) =>
        gsap.from(node, {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 1.4,
          ease: MENU_EASE,
          scrollTrigger: { trigger: node, start: "top 94%", once: true },
        }),
      );

      // the words run across the foot of the head on a loop; scrolling pushes them faster, and the way it goes
      const track = el.querySelector<HTMLElement>("[data-marquee]");
      if (track) {
        const run = gsap.to(track, { xPercent: -50, ease: "none", duration: 32, repeat: -1 });
        ScrollTrigger.create({
          trigger: track,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const v = self.getVelocity();
            const dir = v < 0 ? -1 : 1;
            gsap
              .timeline()
              .to(run, { timeScale: dir * (1 + Math.min(Math.abs(v) / 450, 5)), duration: 0.25, ease: "power2.out", overwrite: true })
              .to(run, { timeScale: dir, duration: 1.2, ease: "power2.out" });
          },
        });
      }

      // the strips: the ones near the pointer are pushed the way it moves, and spring back once it stops
      const cleanups: (() => void)[] = [];
      el.querySelectorAll<HTMLElement>("[data-strips]").forEach((box) => {
        const strips = Array.from(box.querySelectorAll<HTMLElement>("[data-strip]"));
        let last: { x: number; t: number } | null = null;
        let settle: gsap.core.Tween | null = null;
        const onMove = contextSafe((e: PointerEvent) => {
          const r = box.getBoundingClientRect();
          const row = ((e.clientY - r.top) / r.height) * STRIPS;
          const now = performance.now();
          const v = last ? (e.clientX - last.x) / Math.max(now - last.t, 1) : 0; // px per ms
          last = { x: e.clientX, t: now };
          const push = gsap.utils.clamp(-70, 70, v * 40);
          strips.forEach((s, i) => {
            const near = Math.exp(-((i + 0.5 - row) ** 2) / 5);
            gsap.to(s, { x: push * near, duration: 0.5, ease: "power3.out", overwrite: true });
          });
          settle?.kill();
          settle = gsap.delayedCall(0.12, () =>
            strips.forEach((s, i) =>
              gsap.to(s, { x: 0, duration: 1.4, ease: "elastic.out(1, 0.35)", delay: i * 0.012, overwrite: true }),
            ),
          );
        });
        const onLeave = () => {
          last = null;
        };
        box.addEventListener("pointermove", onMove);
        box.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          box.removeEventListener("pointermove", onMove);
          box.removeEventListener("pointerleave", onLeave);
        });
      });

      return () => {
        unScramble();
        cleanups.forEach((fn) => fn());
      };
    },
    { scope: root },
  );

  return (
    <main ref={root} className="relative bg-white text-ink">
      {/* ---- head: the corners and a hook line; the statement and its hook; the strips; the words ---- */}
      <section
        data-nav-message="About the studio"
        className="relative overflow-hidden pt-[calc(var(--nav-top)+var(--nav-h)+28px)]"
      >
        <div className="grid grid-cols-2 px-[var(--gutter)] md:grid-cols-12 md:gap-x-6">
          <p data-hover-scramble className={`${label} text-stone md:col-span-3`}>
            [ About ] One Prime Studio
          </p>
          <p className={`${hook} hidden text-center text-ink md:col-span-4 md:col-start-5 md:block`}>
            {WORDS.join(" · ")}
          </p>
          <p className={`${label} justify-self-end text-right text-stone md:col-span-3 md:col-start-10`}>
            Hyderabad, India · Working worldwide
          </p>
        </div>

        <h1
          data-goo
          className="mx-auto mt-[14vh] max-w-[17em] px-[var(--gutter)] text-center text-[clamp(2.125rem,5.2vw,6rem)] font-normal leading-[1.02] tracking-[-0.045em] md:mt-[16vh]"
        >
          We are a design &amp; development studio built on sharp identity, honest craft and software that runs well.
        </h1>
        <p data-reveal className={`${hook} mx-auto mt-10 max-w-[44ch] px-[var(--gutter)] text-center text-ink md:mt-12`}>
          Where the brand, the website and the systems behind them are made as one.
        </p>

        {/* the picture in strips, a micro line either side of it */}
        <div className="mt-[10vh] grid grid-cols-2 items-center gap-y-6 px-[var(--gutter)] md:grid-cols-12 md:gap-x-6">
          <p data-reveal className={`${hook} order-2 max-w-[24ch] text-ink md:order-none md:col-span-3 md:col-start-2`}>
            We design and build identities, websites and systems that last.
          </p>
          <div data-reveal className="col-span-2 mx-auto w-[min(72vw,480px)] md:col-span-4 md:col-start-5 md:w-full">
            <Strips src="/images/about.jpg" alt="A figure resting on a dune under a huge pale moon, in black and white" />
          </div>
          <p
            data-reveal
            className={`${hook} order-3 max-w-[22ch] justify-self-end text-right text-ink md:order-none md:col-span-3 md:col-start-10 md:justify-self-start md:text-left`}
          >
            Move across the picture. The strips answer.
          </p>
        </div>

        {/* the words, running: two copies of the row, so the loop never shows its seam */}
        <div aria-hidden className="mt-[10vh] overflow-hidden pb-[2vh]">
          <div data-marquee className="flex w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {[...WORDS, ...WORDS].map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className="flex items-center whitespace-nowrap text-[clamp(4rem,6vw,8rem)] font-normal font-medium leading-[0.9] tracking-[-0.05em]"
                  >
                    {w}
                    <span className="mx-[0.3em] text-[0.35em] text-stone">·</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- at One Prime: the hook and statement; a hairline with a "+"; the badge, and the facts at the right ---- */}
      <section data-nav-message="At One Prime" className="px-[var(--gutter)] pb-[20vh] pt-[16vh]">
        <div className="md:grid md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-7 md:col-start-2">
            <p data-reveal className={`${hook} text-ink`}>
              At One Prime,
            </p>
            <p
              data-reveal
              className="mt-3 max-w-[30ch] text-[clamp(1.5rem,2.3vw,2.375rem)] leading-[1.016] font-medium tracking-[-0.025em] text-ink"
            >
              we build every project around one small team. The two people who design it are the two who engineer
              it, so nothing is lost between the idea and the build.
            </p>
          </div>
        </div>

        {/* the hairline, with its "+" where the right column begins */}
        <div className="relative mt-[12vh] md:mt-[14vh]">
          <span data-rule aria-hidden className="block h-px bg-ink/12" />
          <span
            aria-hidden
            className="absolute left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-[14px] leading-none text-ink"
          >
            +
          </span>
        </div>

        <div className="mt-[8vh] grid gap-y-14 md:mt-[10vh] md:grid-cols-12 md:gap-x-6">
          {/* the badge: the globe and the year | one claim */}
          <div data-reveal className="md:col-span-4 md:col-start-2">
            <div className="inline-flex items-stretch ring-1 ring-inset ring-ink/25">
              <div className="flex flex-col items-center justify-center gap-2 bg-ink px-5 py-3.5 text-chalk">
                <GlobeMark className="h-7 w-7" />
                <span className={hook}>Estd. 2024</span>
              </div>
              <p className={`${hook} flex max-w-[22ch] items-center px-4 text-ink`}>
                Two founders, every layer of the build.
              </p>
            </div>
          </div>

          {/* the facts, small, and the way in */}
          <div className="md:col-span-4 md:col-start-8">
            <div className={`space-y-5 ${body}`}>
              <p data-reveal>
                One Prime Studio is a design and development studio in Hyderabad, started by two engineers. We give
                businesses and products a sharper identity, the leads that follow it, and the systems that keep it
                all running.
              </p>
              <p data-reveal>
                From a single shop to a growing product, the scope changes, the standard doesn&rsquo;t. We work
                with businesses in Hyderabad and all over the world.
              </p>
            </div>
            <a
              data-reveal
              href="#contact"
              className={`${label} group mt-10 inline-flex w-[min(100%,8rem)] items-center justify-between border-2 border-ink px-2 py-1 rounded-full text-ink`}
            >
              <span data-hover-scramble>Let&rsquo;s connect</span>
              <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ---- 01 what we do: the heading and its lede, then the pillars as rows ---- */}
      <section data-nav-message="What we do" className="px-[var(--gutter)] pb-[20vh]">
        <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-4 md:col-start-2">
            <p data-reveal className={`  ${label}  text-stone`}>
              ( 01 ) What we do
            </p>
            <h2 data-goo className={`${heading} mt-5`}>
              What we do
            </h2>
          </div>
          <p data-reveal className={`${body} max-w-[40ch] self-end md:col-span-4 md:col-start-6`}>
            Identity, leads and solutions, for every business. Three things, made together, so the brand, the
            website and the systems behind them speak one language.
          </p>
        </div>

        <ol className="mt-[10vh] md:grid md:grid-cols-12 md:gap-x-6">
          {PILLARS.map((p, i) => (
            <li
              key={p.name}
              data-reveal
              className="grid gap-y-3 border-t border-ink/12 py- last:border-b md:col-span-7 md:col-start-6 md:grid-cols-7 md:gap-x-6 md:py-4"
            >
              <p className={`${title} flex items-baseline font-medium gap-4 md:col-span-3`}>
                <span className={`${label} text-stone`}>{pad(i + 1)}</span>
                {p.name}
              </p>
              <p className={`${body} max-w-[42ch] md:col-span-4`}>{p.text}</p>
            </li>
          ))}
        </ol>
        <Micro className="mt-10 md:ml-[calc((100%-11*1.5rem)/12*5+5*1.5rem)]">
          From a single shop to a growing product, the scope changes. The standard doesn&rsquo;t.
        </Micro>
      </section>

      {/* ---- 02 why we started: the stepped statement, a micro line, the two paragraphs ---- */}
      <section data-nav-message="Why we started" className="px-[var(--gutter)] pb-[20vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/12" />
        <p data-reveal className={`${label} mt-8 text-stone md:ml-[calc((100%-11*1.5rem)/12+1.5rem)]`}>
          ( 02 ) Why we started
        </p>
        <div className="mt-[8vh] md:pl-[calc((100%-11*1.5rem)/12+1.5rem)]">
          <Stepped
            className="text-[clamp(3rem,10vw,10.5rem)] font-medium  leading-[0.75] tracking-[-0.05em]"
            lines={[
              ["Average", "0"],
              ["was never", "1.6em"],
              ["an option.", "3.4em"],
            ]}
          />
        </div>
        <div className="mt-8 md:pl-[calc((100%-11*1.5rem)/12+1.5rem)]">
          <Micro className="md:ml-[1.6em]">One studio, no hand-offs.</Micro>
        </div>
        <div className="mt-[12vh] grid gap-y-8 md:grid-cols-12 md:gap-x-6">
          <p data-reveal className={`${body} max-w-[40ch] md:col-span-3 md:col-start-6`}>
            Most businesses are offered one of two things: a template that looks like everyone else, or an agency
            that splits design from engineering: the brand goes one way, the website another, the software a third.
          </p>
          <p data-reveal className={`${body} max-w-[40ch] md:col-span-3 md:col-start-10`}>
            We started One Prime to close that gap. One studio where the identity, the website and the systems behind
            them are designed and engineered together, by the people you actually talk to. Nothing average.
          </p>
        </div>
      </section>

      {/* ---- 03 how we work: a label, the heading, the steps in columns ---- */}
      <section data-nav-message="How we work" className="px-[var(--gutter)] pb-[20vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/12" />
        <div className="mt-8 grid gap-y-6 md:grid-cols-12 md:gap-x-6">
          <p data-reveal className={`${label} pt-3 text-stone md:col-span-2`}>
            ( 03 ) Our process
          </p>
          <h2 data-goo className={`${heading} md:col-span-9 md:col-start-3`}>
            How we work
          </h2>
        </div>
        <ol className="mt-[10vh] grid gap-y-12 sm:grid-cols-2 md:grid-cols-12 md:gap-x-6">
          {STEPS.map((s, i) => (
            <li key={s.name} data-reveal className="md:col-span-2 md:first:col-start-3">
              <p className={`${hook} text-stone`}>Step {pad(i + 1)}</p>
              <p className={`${title} mt-4`}>{s.name}</p>
              <p className={`${body} mt-4 max-w-[30ch]`}>{s.text}</p>
            </li>
          ))}
        </ol>
        <Micro className="mt-[8vh] md:ml-[calc((100%-11*1.5rem)/12*2+2*1.5rem)]">
          The same two people, from the first call to the launch.
        </Micro>
      </section>

      {/* ---- 04 the founders: the heading at the left; at the right, two small cards side by side: a
           portrait (the same 4:5) with the name and role under it, in small type; a card opens the drawer ---- */}
      <section data-nav-message="The founders" className="px-[var(--gutter)] pb-[20vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/12" />
        <div className="mt-8 grid gap-y-14 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-4 md:col-start-5">
            <p data-reveal className={`${label} text-stone`}>
              ( 04 ) The founders
            </p>
            <h2 data-goo className={`${heading} mt-5`}>
              Founders
            </h2>
            <p data-reveal className={`${body} mt-6 max-w-[32ch]`}>
              Two engineers, one studio. The same two people design and build every project.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:col-span-6 md:col-start-4 md:gap-x-6">
            {FOUNDERS.map((f, i) => (
              <li key={f.slug} data-reveal>
                <article className="group relative">
                  <div className="relative aspect-[4/5] w-full max-w-[240px] overflow-hidden bg-chalk">
                    <Image
                      src={f.photo}
                      alt={`${f.name}, co-founder of One Prime Studio`}
                      fill
                      sizes="(min-width: 768px) 240px, 45vw"
                      className="object-cover grayscale transition-[filter,transform] duration-[1200ms] ease-prime group-hover:scale-[1.03] group-hover:grayscale-0"
                      style={{ objectPosition: f.focus }}
                    />
                  </div>
                  <div className="mt-3 flex max-w-[240px] items-baseline justify-between gap-3">
                    <h3 className="text-[14px] font-medium leading-[1.3] tracking-[-0.01em] md:text-[21px]">{f.name}</h3>
                  </div>
                  <p className={`text-[11px] md:text-[12px] max-w-[240px] leading-[1.15] text-stone`}>
                    {f.role.replace(/^Co-founder · /, "")}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      openFounder(f);
                    }}
                    aria-haspopup="dialog"
                    className={`${label} mt-4 inline-flex items-center border rounded-full px-2 gap-2 text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline`}
                  >
                    <span className="">
                      More
                    </span>

                  </button>
                </article>
              </li>
            ))}
          </ul>
        </div>
        <FounderDrawer founder={founder} open={drawerOpen} onClose={closeDrawer} onClosed={drawerGone} returnTo={opener} />
      </section>

      {/* ---- 05 where ---- */}
      <WorldSection index="[ 05 ]" />
    </main>
  );
}
