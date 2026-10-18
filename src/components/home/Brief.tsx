"use client";

import { type ChangeEvent, useRef, useState } from "react";
import LocalTime from "@/components/LocalTime";
import { gooHeadings, gooIn } from "@/lib/goo";
import { ensureSmoother, gsap, hoverScramble, liven, MENU_EASE, ONCE, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { EMAIL } from "@/lib/studio";

/*
 * The brief, as one sentence. After bleibtgleich.dev's "nothing more than a sentence": a project is
 * started by filling the blanks of a single line set at display size —
 *
 *   Hi, I'm ___,  I need [a website ▾]  for ___,  by [next month ▾].
 *
 * — and sending it: the visitor's mail app opens with the sentence already written to the studio (or
 * it is copied, for anyone who'd rather paste it). Obys-quiet around it: tiny labels in the corners, how
 * it works in three short lines, lots of white. The sentence arrives as ink (lib/goo), and a blank that
 * changes firms up again out of the blur, so the line reacts as it is written.
 */

const NEEDS = [
  "a website",
  "an online store",
  "a Shopify store",
  "a CRM or ERP",
  "a SaaS product",
  "a brand identity",
  "a logo",
];
const WHEN = ["next month", "this quarter", "in two weeks", "whenever it's right"];

const label = "font-mono text-[10px] uppercase tracking-[0.14em] md:text-[11px]";
// a blank in the sentence: the line's own type, a dotted rule under it, sized to what it holds. Solid
// colours only — the heading's ink effect thresholds alpha, and would erase anything translucent
const blank =
  "min-w-[3ch] appearance-none border-0 border-b-2 border-dotted border-[#b9b8cc] bg-transparent p-0 font-[inherit] text-[inherit] leading-[inherit] tracking-[inherit] text-accent outline-none transition-colors duration-500 ease-prime [field-sizing:content] placeholder:text-[#c6c5d6] hover:border-ink focus:outline-none focus-visible:border-solid focus-visible:border-accent focus-visible:outline-none";

export default function Brief() {
  const root = useRef<HTMLElement>(null);
  const [name, setName] = useState("");
  const [need, setNeed] = useState(NEEDS[0]);
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState(WHEN[0]);
  const [copied, setCopied] = useState(false);

  const sentence = `Hi, I'm ${name.trim() || "—"}. I need ${need} for ${what.trim() || "a new project"}, by ${when}.`;
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(`A project: ${need}`)}&body=${encodeURIComponent(
    `${sentence}\n\n`,
  )}`;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) return unScramble;
      const unLive = liven(el);
      gooHeadings(el);
      el.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node, i) =>
        gsap.from(node, {
          y: 18,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          delay: (i % 3) * 0.06,
          scrollTrigger: { trigger: node, start: "top 92%", ...ONCE },
        }),
      );
      return () => {
        unScramble();
        unLive();
      };
    },
    { scope: root },
  );

  // a blank that changes firms up again out of the blur
  const settle = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!prefersReducedMotion() && e.target instanceof HTMLSelectElement) gooIn(e.target, { from: 0.12, duration: 0.8 });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${sentence}\n\n— to ${EMAIL}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      id="brief"
      ref={root}
      data-cursor="light"
      data-nav-message="Write us a sentence"
      className="relative z-10 bg-white px-[var(--gutter)] pb-[16vh] pt-6 text-ink md:pt-10"
    >
      {/* the corners: what this is, and the time where you are */}
      <div className="grid grid-cols-2 border-t border-ink/10 pt-6 md:grid-cols-12 md:gap-x-6">
        <p data-hover-scramble className={`${label} text-stone md:col-span-3`}>
          [006] — The brief
        </p>
        <p className={`${label} justify-self-end text-right text-stone md:col-span-4 md:col-start-9`}>
          Your time <LocalTime className="text-ink" />
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = mailto;
        }}
        className="mt-[16vh] md:mt-[20vh]"
      >
        {/* the sentence, set like a statement, stepped like the footer's (in em: a share of its own width would
            be measured from the lines it is indenting) */}
        <h2
          data-goo="blocks"
          data-lag="0.05"
          className="mx-auto w-fit max-w-full text-[clamp(2.25rem,6.2vw,6.75rem)] font-medium leading-[1.02] tracking-[-0.05em]"
        >
          <span className="block md:whitespace-nowrap">
            Hi, I&rsquo;m{" "}
            <input
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              autoComplete="name"
              spellCheck={false}
              size={Math.max(name.length, 9)}
              className={`${blank} max-w-[12ch]`}
            />
            ,
          </span>
          <span className="block md:whitespace-nowrap md:pl-[1.4em]">
            I need{" "}
            <select
              aria-label="What you need"
              value={need}
              onChange={(e) => {
                setNeed(e.target.value);
                settle(e);
              }}
              className={`${blank} cursor-pointer`}
            >
              {NEEDS.map((n) => (
                <option key={n} value={n} className="text-[16px] text-ink">
                  {n}
                </option>
              ))}
            </select>
          </span>
          <span className="block md:whitespace-nowrap md:pl-[0.5em]">
            for{" "}
            <input
              aria-label="What it's for"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="what you're building"
              spellCheck={false}
              size={Math.max(what.length, 18)}
              className={`${blank} max-w-[18ch]`}
            />
            ,
          </span>
          <span className="block md:whitespace-nowrap md:pl-[2.6em]">
            by{" "}
            <select
              aria-label="When you'd like it"
              value={when}
              onChange={(e) => {
                setWhen(e.target.value);
                settle(e);
              }}
              className={`${blank} cursor-pointer`}
            >
              {WHEN.map((w) => (
                <option key={w} value={w} className="text-[16px] text-ink">
                  {w}
                </option>
              ))}
            </select>
            .
          </span>
        </h2>

        <div className="mt-[12vh] grid gap-y-12 md:mt-[16vh] md:grid-cols-12 md:items-end md:gap-x-6">
          {/* how it works, in three quiet lines */}
          <ol data-reveal className="space-y-3 text-[14px] leading-[1.4] md:col-span-4">
            {[
              "Fill the blanks — a word or two is plenty.",
              "Send it: your mail app opens with the sentence written.",
              "We write back, and the first conversation starts there.",
            ].map((step, i) => (
              <li key={step} className="grid grid-cols-[2.5rem_1fr] border-t border-ink/10 pt-3">
                <span className={`${label} pt-0.5 text-stone`}>0{i + 1}</span>
                <span className="text-graphite">{step}</span>
              </li>
            ))}
          </ol>

          {/* the way out: send it, or copy it */}
          <div data-reveal className="flex flex-col items-start gap-5 md:col-span-5 md:col-start-8 md:items-end">
            <button
              type="submit"
              className="group inline-flex items-center gap-4 rounded-full bg-ink py-2 pl-7 pr-2 text-[clamp(1rem,1.3vw,1.25rem)] font-medium tracking-[-0.02em] text-chalk"
            >
              Send the sentence
              <span className="grid h-10 w-10 place-items-center rounded-full bg-chalk text-ink transition-transform duration-700 ease-prime group-hover:rotate-45">
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
                </svg>
              </span>
            </button>
            <p className={`${label} flex flex-wrap items-center gap-x-3 gap-y-2 text-stone`}>
              <span>or</span>
              <button type="button" onClick={copy} className="text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink">
                {copied ? "Copied — paste it anywhere" : "Copy it"}
              </button>
              <span>·</span>
              <a href={`mailto:${EMAIL}`} className="text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink">
                {EMAIL}
              </a>
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}
