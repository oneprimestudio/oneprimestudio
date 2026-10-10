"use client";

import { useRef } from "react";
import { ensureSmoother, gsap, hoverScramble, MENU_EASE, prefersReducedMotion, SplitText, useGSAP } from "@/lib/gsap";

const FACTS = [
  { label: "Studio", value: "Design & Development" },
  { label: "Focus", value: "Websites, Apps, CRM, ERP, SaaS" },
  { label: "Established", value: "2026" },
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

const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-stone md:text-[11px]";

/**
 * The studio, minimal: a statement and its lede, one hairline, then the facts, the services and a
 * short description — nothing else. It slides over the pinned hero.
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

      // the statement and the lede rise line by line out of their own masks
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
              ease,
              stagger: 0.08,
              scrollTrigger: { trigger: node, start: "top 85%", once: true },
            }),
        });
      });

      // the hairline draws from the left as it comes into view
      const rule = el.querySelector<HTMLElement>("[data-rule]");
      if (rule) {
        gsap.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.4, ease, scrollTrigger: { trigger: rule, start: "top 90%", once: true } },
        );
      }

      // everything else settles up into place as it enters
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
        gsap.from(node, {
          y: 24,
          autoAlpha: 0,
          duration: 1,
          ease,
          scrollTrigger: { trigger: node, start: "top 90%", once: true },
        });
      });

      return unScramble;
    },
    { scope: root },
  );

  return (
    <section
      id="studio"
      ref={root}
      data-cursor="light"
      data-nav-message="The studio"
      className="relative z-10 bg-chalk px-[var(--gutter)] pb-24 pt-5 text-ink shadow-[0_-24px_60px_-30px_rgba(8,6,78,0.25)] md:pb-36 md:pt-5"
    >
      <div className="grid grid-cols-2 md:grid-cols-12 md:gap-x-6">
        <p data-hover-scramble className={`${label} md:col-span-3`}>
          [001] — Studio
        </p>
        <p className={`${label} justify-self-end text-right md:col-span-4 md:col-start-9`}>One Prime Studio® · Est. 2026</p>
      </div>

      {/* the statement, and its lede */}
      <div className="mt-14 grid gap-y-8 md:mt-20 md:grid-cols-12 md:gap-x-6">
        <h2
          data-lines
          className="max-w-[7.4em] text-[clamp(2.75rem,6.2vw,6.25rem)] font-medium leading-[0.9] tracking-[-0.05em] md:col-span-6"
        >
          {/* "an option." never splits (SplitText folds &nbsp; into a space, so nowrap does it), and 7.4em never
              holds the whole line: it breaks after "not" at every size */}
          Average is not <span className="whitespace-nowrap">an option.</span>
        </h2>
        <p
          data-lines
          className="max-w-[26ch] text-[clamp(1.375rem,2.15vw,2.5rem)] leading-[1.12] tracking-[-0.025em] text-graphite md:col-span-6 md:col-start-7 md:max-w-none"
        >
          We take ideas from zero and push them to their most refined, most premium form — websites, apps and systems
          that people don&rsquo;t just use, but feel.
        </p>
      </div>

      {/* one hairline, then the facts, the services and the description */}
      <div className="mt-24 md:mt-5">

        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-10 col-start-7 md:grid-cols-12">
          {FACTS.map((f) => (
            <div key={f.label} data-reveal className="md:col-span-2   ">
              <p data-hover-scramble className={label}>
                {f.label}
              </p>
              <p className="mt-2 text-[15px] leading-[1.35] md:text-[16px]">{f.value}</p>
            </div>
          ))}

          <div data-reveal className="col-span-2 md:col-span-6 md:col-start-7">
            <p data-hover-scramble className={label}>
              Services
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 text-[15px] leading-[1.35] md:text-[16px]">
              {SERVICES.map((s) => (
                <li
                  key={s}
                  className="group relative py-[3px] text-graphite transition-colors duration-500 hover:text-ink"
                >
                  {/* the dot sits outside the text, so the list stays flush with its label */}
                  <span
                    aria-hidden
                    className="absolute -left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 scale-0 rounded-full bg-accent transition-transform duration-500 ease-prime group-hover:scale-100"
                  />
                  <span className="inline-block transition-transform duration-500 ease-prime group-hover:translate-x-0.5">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            data-reveal
            className="col-span-2 mt-6 max-w-[52ch] space-y-5 text-[15px] leading-[1.5] text-graphite md:col-span-6 md:col-start-7 md:mt-14 md:text-[17px]"
          >
            <p className="text-ink">
              Most software works — but nobody enjoys using it. We start with the problem, not a template, and shape
              every screen around the people who use it every day: fewer clicks, clearer flows, nothing generic.
            </p>
            <p>
              From the first sketch to launch, design and development happen in one place, so the brand, the product
              and the code feel like one thing. Built to perform, to scale, and to stand apart.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
