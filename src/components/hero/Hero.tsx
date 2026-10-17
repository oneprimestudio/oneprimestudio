"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PillLink } from "@/components/Pill";
import { ensureSmoother, gsap, HOVER_EASE, MENU_EASE, prefersReducedMotion, PRIME, SplitText, useGSAP } from "@/lib/gsap";
import { gooIn } from "@/lib/goo";
import HeroBloom from "./HeroBloom";
import Text from "../Text";

/*
 * The hero: two flowers on an open ground — the large one at the right, a small mirrored one rising from
 * the foot at the left — both swaying in the same looping wind (HeroBloom); everything else in pills.
 *
 *   top        two quiet pills in the corners under the navbar: the studio is open for new projects at the
 *              left, Hyderabad's time ticking at the right
 *   middle     the headline across two lines — the first at the left, the second at the right — and
 *              between them a hairline carrying three fact pills (2024©, the name, the city) justified edge
 *              to edge. Pills around it: what we make above the first line and under the second (wide
 *              screens; each a way down to Services), and beside the second line the description with the
 *              two call-to-action pills under it. Phones: the same order, stacked at the foot
 *
 * The headline arrives as ink, as the Intro's headings do (lib/goo): each line starts as a few liquid blobs
 * that pull together into crisp letters, the second line just after the first. Hovering a letter then
 * "switches" it: its box becomes a window onto a short reel of glyphs that spins and lands on it again. The pills open from their middles, the hairline draws
 * out from the left, the description rises line by line (through <Text>, which keeps its indent), all on
 * one clock: everything starts when the fonts are in.
 *
 * The photograph (an x-ray cosmos, 9:16) is a 2160 × 3840 master whose ground was flattened to exactly
 * `bloom` (#f9f9f7), so its edges vanish into the section and it never has to cover the screen. It is
 * drawn in a box of its own aspect, never larger than it was made and never through a transform:
 *   desktop  the screen's full height, its stem leaving the bottom edge, the bloom's centre at 68% of
 *            the width: left = max(68vw − 28.125svh, 54vw − 2.8svh). The small one is 44% of the height,
 *            drawn mirrored, its stem leaving the bottom edge at 34vw (its root is at 95% of its box)
 *   phones   the screen's full width from the top (the bloom clears the navbar); the stem fades out
 *            behind the type, which sits on a soft fade of the ground. No small flower — no room for it
 */

const SERVICES = ["Custom UI/UX", "Custom Shopify", "E-Commerce", "CRM & ERP Systems", "SaaS Products", "Brand & Logo Identity"];
const FACTS = ["2024©", "One Prime Studio", "Hyderabad"];
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PHOTO = "/images/hero-bloom-4k.webp";

/** a pill that isn't a control — the site's pill (--pill-h, as the navbar's), frosted to read over the petals */
const pill =
  "inline-flex h-[var(--pill-h)] items-center gap-2 whitespace-nowrap rounded-full  px-3.5 text-[13px] font-medium normal-case leading-none tracking-[-0.01em] text-ink ring-1 ring-inset ring-ink/15 backdrop-blur-sm md:text-[14px]";
/** the shared control pill (Pill.tsx), at the same size as the hero's tags */
const big = "h-[var(--pill-h)] px-3.5! py-0! leading-none! md:text-[14px]!";

const arrow = (
  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
  </svg>
);

/** Hyderabad's time, ticking; a placeholder on the server, so hydration matches */
function HydTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="tabular-nums">{time ?? "--:--:--"}</span>;
}

/** what we make, as pills — each a way down to Services */
function Services({ from, to, className }: { from: number; to?: number; className: string }) {
  return (
    <ul data-intro className={className}>
      {SERVICES.slice(from, to).map((s) => (
        <li key={s} data-hero-pill>
          <PillLink href="#services" className={`${big} bg-bloom/80 backdrop-blur-sm`}>
            {s}
          </PillLink>
        </li>
      ))}
    </ul>
  );
}

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/** fills a letter's box with a reel of glyphs, top to bottom; returns the reel */
function reel(char: HTMLElement, glyphs: string[]) {
  const r = document.createElement("span");
  r.className = "hero-reel";
  for (const g of glyphs) {
    const s = document.createElement("span");
    s.textContent = g;
    r.append(s);
  }
  char.replaceChildren(r);
  return r;
}

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const hero = root.current;
      if (!hero || !contextSafe) return;
      ensureSmoother();
      if (prefersReducedMotion()) return;
      const ease = MENU_EASE;

      // pinned while the next section slides over it; the type drifts up and fades on the way out
      gsap
        .timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", pin: true, pinSpacing: false, scrub: true },
        })
        .to("[data-hero-copy]", { yPercent: -10, opacity: 0, ease: "none" }, 0);

      const title = hero.querySelector<HTMLElement>("[data-hero-title]");
      const busy = new WeakSet<Element>();
      let ready = false;

      // a letter switches again when the cursor crosses it (once the intro has landed)
      const onOver = contextSafe((e: PointerEvent) => {
        const char = (e.target as Element | null)?.closest?.<HTMLElement>(".hero-char");
        if (!ready || !char || busy.has(char)) return;
        const own = char.dataset.char ?? "";
        busy.add(char);
        const r = reel(char, [own, randomGlyph(), randomGlyph(), own]);
        gsap.fromTo(
          r,
          { yPercent: 0 },
          {
            yPercent: -75,
            duration: 0.75,
            ease: HOVER_EASE,
            onComplete: () => {
              char.textContent = own;
              busy.delete(char);
            },
          },
        );
      });
      title?.addEventListener("pointerover", onOver);

      let alive = true;
      const splits: SplitText[] = [];
      const intro = contextSafe(() => {
        const rule = hero.querySelector<HTMLElement>("[data-hero-rule]");
        const blooms = Array.from(hero.querySelectorAll<HTMLElement>("[data-hero-bloom]"));
        if (!alive || !title || !rule || !blooms.length) return;

        // the flowers are uncovered from the stem up — a clip, so their pixels are never resampled. With
        // WebGL the shader develops each instead, through a dithered front (HeroBloom)
        blooms.forEach((bloom) => {
          gsap.set(bloom, { visibility: "visible" });
          if (bloom.dataset.gl === "on") return;
          gsap.fromTo(
            bloom,
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 2.2, ease, clearProps: "clipPath" },
          );
        });

        // ---- the headline arrives as ink, as the Intro's headings do (lib/goo): each line starts as a few
        // liquid blobs that pull together into crisp letters, the second line just after the first. Only
        // once a line is sharp are its letters given their own boxes for the hover's reels — a box clips
        // at its edges, and would cut the blobs into rectangles ----
        title.querySelectorAll<HTMLElement>("[data-line]").forEach((line, i) => {
          // a parent timeline, so goo's own completion (which takes its filter away) still runs
          const onSharp = () => {
            if (!alive) return;
            const split = SplitText.create(line, { type: "words, chars", charsClass: "hero-char", aria: "none" });
            splits.push(split);
            const size = parseFloat(getComputedStyle(line).fontSize);
            const chars = split.chars as HTMLElement[];
            // each box keeps its letter's own width (in em, so it holds at any size), so a reel can't widen it
            const widths = chars.map((c) => c.getBoundingClientRect().width / size);
            chars.forEach((c, k) => {
              c.dataset.char = c.textContent ?? "";
              c.style.width = `${widths[k]}em`;
            });
          };
          gsap.timeline({ onComplete: onSharp }).add(gooIn(line, { delay: 0.45 + i * 0.18, duration: 1.6 }));
        });

        // ---- the pills open from their middles, the hairline draws out from the left ----
        gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease, delay: 0.25 });
        gsap.fromTo(
          hero.querySelectorAll("[data-hero-pill]"),
          { clipPath: "inset(0% 50% 0% 50% round 999px)", autoAlpha: 0 },
          {
            clipPath: "inset(0% 0% 0% 0% round 999px)",
            autoAlpha: 1,
            duration: 1,
            ease: PRIME,
            stagger: 0.06,
            delay: 0.35,
            clearProps: "clipPath",
          },
        );
        // (the description rises line by line through <Text>, which keeps its indent: it starts on the same
        // fonts-ready as this intro, so its delay is on the same clock)
        gsap.set(hero.querySelectorAll("[data-intro]:not([data-hero-bloom])"), { visibility: "visible" });
        gsap.delayedCall(2.9, () => {
          ready = true;
        });
      });
      document.fonts.ready.then(intro);

      return () => {
        alive = false;
        title?.removeEventListener("pointerover", onOver);
        splits.forEach((s) => s.revert());
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="top"
      data-cursor="light"
      data-nav-message="We switch the things"
      className="relative z-0 flex h-[100svh] min-h-[640px] w-full items-end overflow-hidden bg-bloom text-ink lg:items-center"
    >
      {/* the photograph, in a box of its own 9:16 */}
      <div
        data-intro
        data-hero-bloom
        className="absolute inset-x-0 top-0 mx-auto aspect-[9/16] w-[min(100%,56.25svh)] [mask-image:linear-gradient(to_bottom,#000_62%,transparent_92%)] lg:inset-x-auto lg:bottom-0 lg:left-[max(68%-28.125svh,54%-2.8svh)] lg:top-auto lg:mx-0 lg:h-full lg:w-auto lg:[mask-image:none]"
      >
        <Image
          src={PHOTO}
          alt="An x-ray photograph of a single cosmos flower, its translucent petals veined in fine black lines"
          fill
          // phones: the full width; desktop: 9/16 of the screen's height
          sizes="(min-width: 1024px) 57vh, 100vw"
          quality={90}
          fetchPriority="high"
          loading="eager"
          className="object-cover"
        />
        {/* the same photograph, alive: drawn by a shader over the <img>, which stays as the fallback */}
        <HeroBloom />
      </div>

      {/* the small one, mirrored, rising from the foot at the left — the wind reaches it a moment later */}
      <div
        data-intro
        data-hero-bloom
        aria-hidden
        className="absolute bottom-0 left-[calc(34vw-23.5svh)] hidden aspect-[9/16] h-[44svh] lg:block"
      >
        <Image src={PHOTO} alt="" fill sizes="25vh" quality={85} className="-scale-x-100 object-cover" />
        <HeroBloom mirror lag={0.7} />
      </div>

      {/* ---- the corners under the navbar: open for work at the left, the studio's time at the right ---- */}
      <div
        data-intro
        className="absolute inset-x-0 top-[calc(var(--nav-top)+var(--nav-h)+20px)] flex items-start justify-between gap-3 px-[var(--gutter)]"
      >
        <span data-hero-pill className={pill}>
          <span aria-hidden className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-ink/40 motion-reduce:animate-none" />
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          </span>
          Open for new projects
        </span>
        <span data-hero-pill className={pill}>
          <span className="hidden text-stone sm:inline">Hyderabad</span>
          <HydTime />
          <span className="text-stone">IST</span>
        </span>
      </div>

      {/* ---- the middle: the headline, its first line at the left and its second at the right, with the facts
           between them; around them, pills — what we make above the first line and under the second, the
           description and the ways in beside the second. The h1 lends its lines to the grid (display:
           contents), so each sits in a row with its companions; on phones it all stacks at the foot, in the
           same order, the second line still to the right ---- */}
      <div
        data-hero-copy
        className="relative flex w-full flex-col bg-gradient-to-t from-bloom from-55% to-bloom/0 px-[var(--gutter)] pb-[max(28px,5svh)] pt-20 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-x-10 lg:bg-none lg:py-0"
      >
        <Services from={0} to={3} className="hidden flex-wrap gap-2 lg:col-start-1 lg:row-start-1 lg:mb-7 lg:flex" />

        <h1
          data-intro
          data-hero-title
          aria-label="We switch the things"
          className="contents font-sans text-[clamp(3.25rem,13.5vw,5.5rem)] font-medium uppercase leading-[0.86] tracking-[-0.05em] lg:text-[clamp(5rem,8.2vw,9.5rem)]"
        >
          <span data-line aria-hidden className="block lg:col-start-1 lg:row-start-2">
            We switch
          </span>
          {/* the facts, justified across a hairline that runs between the two lines */}
          <span aria-hidden className="relative my-5 flex items-center justify-between md:my-6 lg:col-span-3 lg:row-start-3 lg:my-7">
            <span data-hero-rule className="absolute inset-x-0 top-1/2 block h-px origin-left bg-ink/20" />
            {FACTS.map((f) => (
              <span key={f} data-hero-pill className={`relative ${pill}`}>
                {f}
              </span>
            ))}
          </span>
          <span
            data-line
            aria-hidden
            className="block self-end text-right lg:col-span-2 lg:col-start-2 lg:row-start-4 lg:justify-self-end"
          >
            The things
          </span>
        </h1>

        {/* beside the second line at the left: the description, and the ways in under it */}
        <div className="mt-8 flex flex-col gap-6 lg:col-start-1 lg:row-start-4 lg:mb-[0.4em] lg:mt-0 lg:self-end">
          <Text justify animateOnScroll={false} delay={0.9} duration={1.1} stagger={0.07}>
            <p
              data-intro
              className="group max-w-[34ch] text-[12.5px] font-medium indent-[25%] leading-[1.15] text-graphite md:text-[17px] lg:max-w-[36ch]"
            >
              A design &amp; development studio built on one belief{" "}
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat text-ink transition-[background-size] duration-700 ease-prime group-hover:bg-[length:100%_1px]">
                average is not an option.
              </span>{" "}
              We take ideas from zero and push them to their most refined, most premium form.
            </p>
          </Text>

          <div data-intro className="flex flex-wrap gap-2">
            <span data-hero-pill>
              <PillLink href="#contact" active icon={arrow} className={big}>
                Start a project
              </PillLink>
            </span>
            <span data-hero-pill>
              <PillLink href="/projects" className={`${big} bg-bloom/80 backdrop-blur-sm`}>
                See the work
              </PillLink>
            </span>
          </div>
        </div>

        <Services
          from={3}
          className="hidden flex-wrap justify-end gap-2 lg:col-span-2 lg:col-start-2 lg:row-start-5 lg:mt-7 lg:flex lg:justify-self-end"
        />
      </div>
    </section>
  );
}
