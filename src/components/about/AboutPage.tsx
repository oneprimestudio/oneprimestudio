"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";
import FounderDrawer from "@/components/about/FounderDrawer";
import WorldSection from "@/components/world/WorldSection";
import { FOUNDERS, type Founder } from "@/lib/founders";
import { gooHeadings } from "@/lib/goo";
import { ensureSmoother, gsap, hoverScramble, MENU_EASE, prefersReducedMotion, useGSAP } from "@/lib/gsap";

/*
 * About the studio, after bleibtgleich.dev: display type in stepped lines, tiny labels, hairline tables
 * and a great deal of white — every section answers one question plainly.
 *
 *   head      who we are, in one sentence
 *   01        what we do: identity, leads and solutions, for every business
 *   02        why we started
 *   03        who we are: the two founders and what each of them does
 *   04        where we are: the globe stage shared with the home page (WorldSection)
 */

const label = "font-mono text-[10px] uppercase  md:text-[11px]";
const display = "font-medium tracking-[-0.05em]";

const PILLARS = [
  {
    name: "Identity",
    text: "Logo, type, colour and voice — a brand people recognise at a glance and remember after.",
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


function Bullet({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className={`${label} flex items-center gap-2.5 text-ink`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
      <span className="text-stone">{n}</span>
      {children}
    </p>
  );
}

/** a heading set as stepped lines, each line an element of its own (data-goo="blocks") */
function Stepped({ lines, className = "", as: Tag = "h2" }: { lines: [string, string][]; className?: string; as?: "h1" | "h2" }) {
  return (
    <Tag data-goo="blocks" className={`${display} ${className}`}>
      {lines.map(([text, indent]) => (
        <span key={text} className="block whitespace-nowrap" style={{ paddingLeft: indent }}>
          {text}
        </span>
      ))}
    </Tag>
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
    () => {
      const el = root.current;
      if (!el) return;
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
      return () => {
        unScramble();
      };
    },
    { scope: root },
  );

  return (
    <main ref={root} className="relative bg-white text-ink">
      {/* ---- head ---- */}
      <section
        data-nav-message="About the studio"
        className="px-[var(--gutter)] pb-[18vh] pt-[calc(var(--nav-top)+var(--nav-h)+48px)]"
      >
        <div className="grid grid-cols-2 md:grid-cols-12 md:gap-x-6">
          <p data-hover-scramble className={`${label} text-stone md:col-span-3`}>
            [ About ] — One Prime Studio
          </p>
          <p className={`${label} justify-self-end text-right text-stone md:col-span-4 md:col-start-9`}>
            Hyderabad, India · Working worldwide
          </p>
        </div>

        <div className="mt-[20vh] grid gap-y-14 md:mt-[26vh] md:grid-cols-12 md:items-end md:gap-x-6">
          <Stepped
            as="h1"
            className="text-[clamp(2.75rem,7.6vw,9rem)] leading-[0.9] md:col-span-8"
            lines={[
              ["Every business", "0"],
              ["deserves to be", "1.4em"],
              ["found, chosen", "0.5em"],
              ["and run well.", "2.2em"],
            ]}
          />
          <p
            data-reveal
            className="max-w-[34ch] text-[18px] leading-[1.4] tracking-[-0.01em] text-graphite md:col-span-4 md:text-[20px]"
          >
            One Prime Studio is a design and development studio in Hyderabad, started by two engineers. We give
            businesses and products a sharper identity, the leads that follow it, and the systems that keep it all
            running — designed and built end to end by the same hands.
          </p>
        </div>
      </section>

      {/* ---- 01 what we do ---- */}
      <section data-nav-message="What we do" className="px-[var(--gutter)] pb-[20vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/12" />
        <div className="mt-8 grid gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-3">
            <Bullet n="01">What we do</Bullet>
          </div>
          <div className="md:col-span-9">
            <Stepped
              className="text-[clamp(2.25rem,5.4vw,6.25rem)] leading-[0.95]"
              lines={[
                ["Identity, leads", "0"],
                ["and solutions —", "1.2em"],
                ["for every business.", "0.4em"],
              ]}
            />
            <ol className="mt-[6vh] grid   md:grid-cols-3">
              {PILLARS.map((p, i) => (
                <div key={p.name} 
                className="flex space-x-[5rem] items-center"
                >
                  <li
                    
                    data-reveal
                    className=" bg-ink aspect-[4/5] relative border-ink/12  flex flex-col justify-end md:p-[2rem] "
                  >
                    <p className={`${label} absolute top-5 left-5 text-stone`}>0{i + 1}</p>
                    <h3 className="mt-6 text-[clamp(1.75rem,2.4vw,2.5rem)] font-medium text-white leading-none tracking-[-0.04em]">
                      {p.name}
                    </h3>
                    <p className="mt-4 max-w-[30ch] text-[15px] leading-[1.5] text-white md:text-[16px]">{p.text}</p>
                  </li>
                </div>

              ))}
            </ol>
            <p
              data-reveal
              className="mt-[10vh] max-w-[26ch] text-[clamp(1.375rem,2.2vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.03em]"
            >
              From a single shop to a growing product — the scope changes,{" "}
              <span className="text-stone">the standard doesn&rsquo;t.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ---- 02 why ---- */}
      <section data-nav-message="Why we started" className="px-[var(--gutter)] pb-[20vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/12" />
        <div className="mt-8 grid gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-3">
            <Bullet n="02">Why we started</Bullet>
          </div>
          <div className="md:col-span-9">
            <Stepped
              className="text-[clamp(2.25rem,5.4vw,6.25rem)] leading-[0.95]"
              lines={[
                ["Average was", "0"],
                ["never an", "1.6em"],
                ["option.", "0.8em"],
              ]}
            />
            <div className="mt-[12vh] grid gap-y-8 text-[17px] leading-[1.55] text-graphite md:grid-cols-2 md:gap-x-10 md:text-[19px]">
              <p data-reveal className="max-w-[40ch]">
                Most businesses are offered one of two things: a template that looks like everyone else, or an agency
                that splits design from engineering — the brand goes one way, the website another, the software a
                third.
              </p>
              <p data-reveal className="max-w-[40ch]">
                We started One Prime to close that gap. One studio where the identity, the website and the systems
                behind them are designed and engineered together, by the people you actually talk to — no hand-offs,
                no lost intent, and nothing average.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 03 founders ---- */}
      <section data-nav-message="The founders" className="px-[var(--gutter)] pb-[20vh]">
        <span data-rule aria-hidden className="block h-px bg-ink/12" />
        <div className="mt-8 grid gap-y-10 md:grid-cols-12 md:gap-x-6">
          <div className="md:col-span-3">
            <Bullet n="03">Founders</Bullet>
          </div>
          <div className="md:col-span-9">
            <Stepped
              className="text-[clamp(2.25rem,5.4vw,6.25rem)] leading-[0.95]"
              lines={[
                ["Two founders,", "0"],
                ["every layer.", "1.4em"],
              ]}
            />
          </div>
        </div>

        {/* the founders as cards, in the Services cards' own style: plain white, square, 4:5, a soft resting
            shadow and a deeper one as the card lifts on the prime curve; the name and their words at the
            foot. The whole card opens the drawer: its "More details" button's ::after covers the card (the
            nearest positioned box), so the text above it stays unpositioned */}
        <div className="mt-[12vh] md:grid md:grid-cols-12 md:gap-x-6">
          <ul className="grid gap-5 sm:grid-cols-2 md:col-span-9 md:col-start-4 md:max-w-[880px] md:gap-6">
            {FOUNDERS.map((f, i) => (
              <li key={f.slug} data-reveal>
                <article className="group relative flex aspect-[4/5] flex-col bg-white p-7 text-ink ring-1 ring-ink/[0.05] transition-transform duration-700 ease-prime hover:-translate-y-3 has-[:focus-visible]:-translate-y-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent md:p-9">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 shadow-[0_28px_56px_-36px_rgba(0,0,0,0.45)]"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 shadow-[0_50px_90px_-30px_rgba(0,0,0,0.5)] transition-opacity duration-700 ease-prime group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
                  />

                  <p className={`${label} flex justify-between text-stone`}>
                    <span>0{i + 1} — Founder</span>
                    <span>Co-founder</span>
                  </p>

                  <div className="mt-auto">
                    <h3 className="text-[clamp(1.5rem,2vw,2.125rem)] font-medium leading-[1.06] tracking-[-0.035em]">
                      {f.name}
                    </h3>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-accent md:text-[11px]">
                      {f.role.replace(/^Co-founder · /, "")}
                    </p>
                    <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.45] text-stone transition-colors duration-700 ease-prime group-hover:text-graphite md:text-[15px]">
                      “{f.quote}”
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        opener.current = e.currentTarget;
                        openFounder(f);
                      }}
                      aria-haspopup="dialog"
                      className={`${label} mt-6 inline-flex items-center gap-2 text-ink outline-none after:absolute after:inset-0 after:content-[''] md:mt-7`}
                    >
                      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-700 ease-prime group-hover:bg-[length:100%_1px]">
                        More details
                      </span>
                      <span aria-hidden className="transition-transform duration-700 ease-prime group-hover:translate-x-1">
                        →
                      </span>
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>
        <FounderDrawer founder={founder} open={drawerOpen} onClose={closeDrawer} onClosed={drawerGone} returnTo={opener} />
      </section>

      {/* ---- 04 where ---- */}
      <WorldSection index="[ 04 ]" />
    </main>
  );
}
