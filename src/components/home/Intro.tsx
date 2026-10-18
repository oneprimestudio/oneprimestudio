"use client";

import { useRef } from "react";
import GlobeMark from "@/components/GlobeMark";
import { ensureSmoother, gsap, hoverScramble, liven, MENU_EASE, ONCE, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { gooHeadings } from "@/lib/goo";
import Text from "../Text";

const FACTS = [
  { label: "Studio", value: "Design & Development" },
  { label: "Focus", value: "Websites, Apps, CRM, ERP, SaaS" },
  { label: "Based", value: "Hyderabad, working worldwide" },
];

const SERVICES = [
  "Custom UI/UX",
  "Custom Shopify",
  "E-Commerce",
  "CRM & ERP Systems",
  "SaaS Products",
  "Brand Identity",
  "Logo Identity",
];

const label = "font-mono text-[10px] uppercase tracking-[0.12em] text-stone md:text-[11px]";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The studio, minimal and roomy. It slides over the pinned hero.
 *
 *   top       the section's labels at the corners
 *   middle    the statement (arriving as ink, lib/goo) — one size, its lines stepped in evenly, a turning globe
 *             after "Average" and "option." in a pill — and its lede at the right, with long pauses around
 *   foot      after a hairline, four quiet columns in small type: the date under a turning globe, the facts,
 *             what we make (numbered), and how we work — two short paragraphs, each with an indent, which
 *             rise line by line through <Text>
 */
export default function Intro() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) return unScramble;
      const ease = MENU_EASE;
      const unLive = liven(el);

      // headings arrive as ink: blobs that firm up into letters (lib/goo); body copy rises through <Text>
      gooHeadings(el);

      // the hairline draws from the left as it comes into view
      const rule = el.querySelector<HTMLElement>("[data-rule]");
      if (rule) {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.4, ease, scrollTrigger: { trigger: rule, start: "top 90%", ...ONCE } },
        );
      }

      // the columns settle up into place one after another as they enter
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node, i) => {
        gsap.from(node, {
          y: 24,
          autoAlpha: 0,
          duration: 1,
          ease,
          delay: (i % 4) * 0.08,
          scrollTrigger: { trigger: node, start: "top 90%", ...ONCE },
        });
      });

      return () => {
        unScramble();
        unLive();
      };
    },
    { scope: root },
  );

  return (
    <section
      id="studio"
      ref={root}
      data-cursor="light"
      data-nav-message="The studio"
      className="relative z-10 bg-chalk px-[var(--gutter)] pb-[16vh] pt-6 text-ink shadow-[0_-24px_60px_-30px_rgba(8,6,78,0.25)] md:pb-[22vh] md:pt-8"
    >
      {/* ---- the corners ---- */}
      <div className="flex items-baseline justify-between gap-6">
        <p data-hover-scramble className={label}>
          [001] — Studio
        </p>
        <p className={`${label} text-right`}>One Prime Studio® · Estd. 2024</p>
      </div>

      {/* ---- the statement: one size, each line stepped in from the last by the same 1.1em (0.6em on phones),
           so the three share one stair of edges; a globe turning after "Average", "option." in a pill.
           data-goo="blocks": it arrives as ink line by line, each line its own element ---- */}
      <h2
        data-goo="blocks"
        className="mt-[10vh] text-[clamp(2.75rem,11.5vw,4.5rem)] font-medium leading-[0.86] tracking-[-0.05em] md:mt-[12vh] md:text-[clamp(4.5rem,9vw,12.5rem)]"
      >
        <span className="flex items-center gap-[0.14em] whitespace-nowrap">
          Average
          <GlobeMark weight={2} className="h-[0.7em] w-[0.7em] shrink-0 translate-y-[0.03em] text-ink" />
        </span>
        <span className="block whitespace-nowrap pl-[0.6em] text-black md:pl-[1.1em]">was never</span>
        <span className="block whitespace-nowrap pl-[1.2em] md:pl-[2.2em]">
          an{" "}
          <span className="-mb-[0.14em] -mt-[0.04em] text-[clamp(2.75rem,11.5vw,5.5rem)] inline-block rounded-full px-[0.24em] pb-[0.14em] pt-[0.04em] ring-[0.045em] ring-inset ring-current">
            option.
          </span>
        </span>
      </h2>

      {/* ---- the lede, at the right ---- */}
      <div className="mt-[10vh] grid md:mt-[10vh] md:grid-cols-12 md:gap-x-6">
        <Text>
          <p className="max-w-[26ch] text-[clamp(1.175rem,2.15vw,2.5rem)] indent-[15%] leading-[1.05] tracking-[-0.025em] font-medium text-graphite md:col-span-6 md:col-start-7 md:max-w-none">
            We take ideas from zero and push them to their most refined, most premium form websites, apps and systems
            that people don&rsquo;t just use, but feel.
          </p>
        </Text>
      </div>

      {/* ---- one hairline, then four quiet columns ---- */}
      <span data-rule aria-hidden className="mt-[14vh] block h-px origin-left bg-ink/10 md:mt-[18vh]" />
      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 md:mt-12 md:grid-cols-12">
        {/* the date, under a turning globe */}
        <div data-reveal className="md:col-span-3 ">

          <div className="bg-white border-2 border-ink  px-[4px] rounded-full h-[3.5rem] w-[55%] flex items-center justify- gap-3 " >
            <GlobeMark className="h-7 w-7 text-ink md:h-12 md:w-12" />
            <span className="flex items-center  justify-center gap-2" >
              <p className={`text-[11px] text-ink mt-5`}>Estd.</p>
              <p className="text-[16px] font-medium text-ink leading-none tracking-[-0.03em] md:text-[32px]">2024</p>
            </span>
          </div>


        </div>

        {/* the facts */}
        <dl data-reveal className="space-y-6 md:col-span-3">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt data-hover-scramble className={label}>
                {f.label}
              </dt>
              <Text>
                <dd className="mt-1.5 text-[14px] leading-[1.4] md:text-[15px]">{f.value}</dd>
              </Text>
            </div>
          ))}
        </dl>

        {/* what we make */}
        <div data-reveal className="col-span-2 md:col-span-3">
          <p data-hover-scramble className={label}>
            Services
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 md:grid-cols-1">
            {SERVICES.map((s, i) => (
              <li key={s} className="group flex items-baseline gap-3 py-[3px] text-[14px] leading-[1.15] font-semibold text-graphite transition-colors duration-500 ease-prime hover:text-ink md:text-[15px]">
                <span className="font-mono text-[10px] tracking-[0.08em] text-stone">{pad(i + 1)}</span>
                <Text>
                  <span className="transition-transform duration-500 ease-prime group-hover:translate-x-1">{s}</span>
                </Text>
              </li>
            ))}
          </ul>
        </div>

        {/* how we work */}
        <div data-reveal className="col-span-2 space-y-5 md:col-span-3">
          <p data-hover-scramble className={label}>
            Approach
          </p>
          <Text>
            <p className="indent-[12%] text-[14px] leading-[1.6] text-ink md:text-[15px]">
              Most software works but nobody enjoys using it. We start with the problem, not a template, and shape
              every screen around the people who use it every day: fewer clicks, clearer flows, nothing generic.
            </p>
          </Text>
          <Text>
            <p className="indent-[12%] text-[14px] leading-[1.6] text-graphite md:text-[15px]">
              From the first sketch to launch, design and development happen in one place, so the brand, the product
              and the code feel like one thing. Built to perform, to scale, and to stand apart.
            </p>
          </Text>
        </div>
      </div>
    </section>
  );
}
