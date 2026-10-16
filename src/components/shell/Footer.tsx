"use client";

import { useRef } from "react";
import {
  ensureSmoother,
  gsap,
  HOVER_EASE,
  hoverScramble,
  MENU_EASE,
  prefersReducedMotion,
  ScrollSmoother,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { gooHeadings } from "@/lib/goo";
import LocalTime from "../LocalTime";
import { EMAIL, SOCIALS } from "@/lib/studio";

const NAV = [
  { label: "Studio", href: "#studio" },
  { label: "Services", href: "#services" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Principles", href: "#principles" },
];

const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-stone md:text-[11px]";
const line = "font-medium tracking-[-0.05em]";

// the knob's throw, as a share of its own width: (1.064 − 2 × 0.0975 − 2 × 0.04 − 0.272) / 0.272 — see Logo.tsx
const KNOB_TRAVEL = (0.517 / 0.272) * 100;

const toTop = () => {
  const smoother = ScrollSmoother.get();
  if (smoother) smoother.scrollTo(0, true);
  else window.scrollTo({ top: 0, behavior: "smooth" });
};

/**
 * The footer, in the Intro's language: a stepped statement, mono labels, one hairline and a row of
 * facts — then the wordmark at the full width of the page. The footer is revealed from behind (its
 * content drifts down into place as it scrolls in), the wordmark's letters rise, and on the last
 * pixels of the page the "o" switch throws itself on. The switch also takes you back to the top.
 *
 * 60fps: everything that moves is a transform or an opacity on its own layer; nothing animates
 * layout, colour or filters, and nothing reads layout while scrolling.
 */
export default function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      const q = <T extends Element = HTMLElement>(s: string) => el.querySelector<T>(s)!;
      const qa = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      const cleanups: (() => void)[] = [unScramble];

      // the wordmark is set to the width of the page: measured once at 100px, then scaled
      const row = q("[data-mark-row]");
      const mark = q("[data-mark]");
      const fit = () => {
        mark.style.fontSize = "100px";
        mark.style.fontSize = `${(100 * row.clientWidth) / mark.offsetWidth}px`;
      };
      fit();
      let refresh: gsap.core.Tween | undefined;
      const ro = new ResizeObserver(() => {
        fit();
        refresh?.kill();
        refresh = gsap.delayedCall(0.15, () => ScrollTrigger.refresh());
      });
      ro.observe(row);
      document.fonts.ready.then(fit);
      cleanups.push(() => ro.disconnect());

      const switchBtn = q("[data-switch]");
      switchBtn.addEventListener("click", toTop);
      cleanups.push(() => switchBtn.removeEventListener("click", toTop));
      const done = () => cleanups.forEach((fn) => fn());

      if (prefersReducedMotion()) return done;

      // ---- entrances, as in the Intro ----
      // headings arrive as ink: blobs that firm up into letters (lib/goo); body copy rises line by line
      gooHeadings(el);
      qa("[data-lines]").forEach((node) => {
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
              scrollTrigger: { trigger: node, start: "top 90%", once: true },
            }),
        });
      });
      gsap.fromTo(
        q("[data-rule]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.4,
          ease: MENU_EASE,
          scrollTrigger: { trigger: q("[data-rule]"), start: "top 95%", once: true },
        },
      );
      qa("[data-reveal]").forEach((node, i) => {
        gsap.from(node, {
          y: 24,
          autoAlpha: 0,
          duration: 1,
          ease: MENU_EASE,
          delay: (i % 4) * 0.06,
          scrollTrigger: { trigger: node, start: "top 95%", once: true },
        });
      });

      // ---- the reveal, scrubbed to the last screen of the page ----
      const inner = q("[data-inner]");
      const chars = SplitText.create(qa("[data-mark-text]"), { type: "chars" }).chars;
      fit(); // split letters lose their kerning pairs: measure again
      // the content waits higher up and drifts down into place while the footer comes up the screen, so it
      // seems to be uncovered rather than scrolled in; it is home by the time the footer reaches the top
      gsap.fromTo(
        inner,
        { y: () => -window.innerHeight * 0.3 },
        {
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            // a footer shorter than the screen never reaches the top: it lands at the end of the page instead
            end: () => (el.offsetHeight < window.innerHeight ? "bottom bottom" : "top top"),
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
      // the last few hundred pixels of the page belong to the wordmark: its letters rise one after another,
      // and on the very last ones the switch throws itself on
      const finale = gsap
        .timeline({
          defaults: { ease: MENU_EASE },
          scrollTrigger: {
            trigger: el,
            start: () => `bottom bottom+=${Math.round(Math.min(window.innerHeight * 0.45, 420))}`,
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(q("[data-switch-wrap]"), { yPercent: 110 }, { yPercent: 0, duration: 0.5 }, 0)
        .fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: 0.5, stagger: 0.03 }, 0.05)
        .fromTo(q("[data-knob]"), { xPercent: 0 }, { xPercent: KNOB_TRAVEL, duration: 0.2, ease: HOVER_EASE }, 0.8)
        .fromTo(q("[data-switch-on]"), { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, 0.88);

      // ---- the address: its letters roll over to a second copy, and the arrow leans toward you ----
      const email = q("[data-email]");
      const rolls = SplitText.create(qa("[data-roll]"), { type: "chars" }).chars;
      const under = q("[data-under]");
      const arrow = q("[data-arrow]");
      const glyph = q("[data-glyph]");
      const xTo = gsap.quickTo(arrow, "x", { duration: 0.6, ease: "power3" });
      const yTo = gsap.quickTo(arrow, "y", { duration: 0.6, ease: "power3" });
      const onEnter = () => {
        gsap.to(rolls, { yPercent: -100, duration: 0.6, ease: HOVER_EASE, stagger: 0.012, overwrite: true });
        gsap.set(under, { transformOrigin: "0% 50%" });
        gsap.to(under, { scaleX: 1, duration: 0.7, ease: HOVER_EASE, overwrite: true });
        gsap.to(glyph, { rotation: 45, duration: 0.6, ease: HOVER_EASE, overwrite: true });
      };
      const onLeave = () => {
        gsap.to(rolls, { yPercent: 0, duration: 0.55, ease: HOVER_EASE, stagger: 0.008, overwrite: true });
        gsap.set(under, { transformOrigin: "100% 50%" });
        gsap.to(under, { scaleX: 0, duration: 0.55, ease: HOVER_EASE, overwrite: true });
        gsap.to(glyph, { rotation: 0, duration: 0.55, ease: HOVER_EASE, overwrite: true });
        xTo(0);
        yTo(0);
      };
      // the arrow's box is cached on enter, so moving the pointer never reads layout
      let box = arrow.getBoundingClientRect();
      const onMove = (e: PointerEvent) => {
        xTo((e.clientX - (box.left + box.width / 2)) * 0.25);
        yTo((e.clientY - (box.top + box.height / 2)) * 0.25);
      };
      const cache = () => {
        box = arrow.getBoundingClientRect();
        onEnter();
      };
      email.addEventListener("pointerenter", cache);
      email.addEventListener("pointerleave", onLeave);
      email.addEventListener("pointermove", onMove);
      cleanups.push(() => {
        email.removeEventListener("pointerenter", cache);
        email.removeEventListener("pointerleave", onLeave);
        email.removeEventListener("pointermove", onMove);
      });

      // ---- the switch, by hand: hovering it nudges the knob as the Logo's does ----
      // a third of the knob's width toward wherever it would go next — on when it's off, off when it's on
      const nudge = () =>
        gsap.to(q("[data-knob-nudge]"), {
          xPercent: finale.progress() > 0.9 ? -30 : 30,
          duration: 0.5,
          ease: HOVER_EASE,
          overwrite: true,
        });
      const settle = () =>
        gsap.to(q("[data-knob-nudge]"), { xPercent: 0, duration: 0.5, ease: HOVER_EASE, overwrite: true });
      switchBtn.addEventListener("pointerenter", nudge);
      switchBtn.addEventListener("pointerleave", settle);
      cleanups.push(() => {
        switchBtn.removeEventListener("pointerenter", nudge);
        switchBtn.removeEventListener("pointerleave", settle);
      });

      return done;
    },
    { scope: root },
  );

  return (
    <footer
      id="contact"
      ref={root}
      data-cursor="light"
      data-nav-message="Say hello"
      className="relative z-10 overflow-hidden bg-chalk text-ink"
    >
      <div data-inner className="px-[var(--gutter)] pb-5 pt-5 md:pb-6">
        <div className="grid grid-cols-2 md:grid-cols-12 md:gap-x-6">
          <p data-hover-scramble className={`${label} md:col-span-3`}>
            [007] — Contact
          </p>
          <p className={`${label} justify-self-end text-right md:col-span-4 md:col-start-9`}>
            One Prime Studio® · Hyderabad, India
          </p>
        </div>

        {/* the statement, stepped like the Intro's */}
        <div className="mt-10 md:mt-14">
          <h2 data-goo className={`text-[clamp(2.75rem,10.4vw,13.5rem)] leading-[0.82] ${line}`}>
            Got an idea?
          </h2>
          <h2 data-goo className={`indent-[15%] text-[clamp(2.75rem,8.8vw,11.5rem)] leading-[0.8] ${line}`}>
            Let&rsquo;s make
          </h2>
          <h2 data-goo className={`indent-[33%] text-[clamp(2.75rem,8vw,10.5rem)] leading-[0.82] ${line}`}>
            <span className="whitespace-nowrap">
              it <span className="text-accent">prime.</span>
            </span>
          </h2>
        </div>

        {/* the way in: a line of copy and the address */}
        <div className="mt-14 grid gap-y-8 md:mt-20 md:grid-cols-12 md:gap-x-6">
          <p
            data-reveal
            className="max-w-[30ch] text-[clamp(1.125rem,1.6vw,1.625rem)] font-medium leading-[1.15] tracking-[-0.02em] text-graphite md:col-span-4 md:col-start-2"
          >
            Tell us what you&rsquo;re building. The first conversation is where it gets good.
          </p>
          <div data-reveal className="md:col-span-6 md:col-start-7">
            <p data-hover-scramble className={label}>
              Start a project
            </p>
            <a
              data-email
              href={`mailto:${EMAIL}`}
              className="mt-3 flex items-center justify-between gap-4 text-[clamp(1.375rem,3.1vw,3.25rem)] font-medium leading-[1.15] tracking-[-0.035em]"
            >
              <span className="relative min-w-0">
                <span className="relative block overflow-hidden">
                  <span data-roll className="block whitespace-nowrap">
                    {EMAIL}
                  </span>
                  <span data-roll aria-hidden className="absolute left-0 top-full block whitespace-nowrap">
                    {EMAIL}
                  </span>
                </span>
                <span aria-hidden className="absolute inset-x-0 -bottom-1 h-px bg-ink/15" />
                <span
                  data-under
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-ink"
                />
              </span>
              <span
                data-arrow
                aria-hidden
                className="grid h-[1.5em] w-[1.5em] shrink-0 place-items-center rounded-full bg-ink text-chalk md:h-[1.6em] md:w-[1.6em]"
              >
                <svg
                  data-glyph
                  viewBox="0 0 12 12"
                  className="h-[0.42em] w-[0.42em]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.25}
                >
                  <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
                </svg>
              </span>
            </a>
          </div>
        </div>

        {/* one hairline, then the facts */}
        <div className="relative mt-16 h-px md:mt-24">
          <span data-rule className="absolute inset-0 origin-left bg-ink/15" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-10 md:grid-cols-12">
          <div data-reveal className="md:col-span-3">
            <p data-hover-scramble className={label}>
              Studio
            </p>
            <p className="mt-2 text-[15px] leading-[1.35] md:text-[16px]">
              Hyderabad, India
              <br />
              <span className="text-graphite">Working worldwide</span>
            </p>
          </div>
          <div data-reveal className="md:col-span-3">
            <p data-hover-scramble className={label}>
              Your time
            </p>
            <p className="mt-2 text-[15px] leading-[1.35] md:text-[16px]">
              <LocalTime className="text-ink" />
              <br />
              <span className="text-graphite">Est. 2026</span>
            </p>
          </div>
          <nav data-reveal aria-label="Footer" className="md:col-span-3">
            <p data-hover-scramble className={label}>
              Navigate
            </p>
            <ul className="mt-2 text-[15px] leading-[1.35] md:text-[16px]">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="group relative inline-block py-[3px] text-graphite transition-colors duration-500 hover:text-ink"
                  >
                    {/* the dot sits outside the text, as in the Intro's list */}
                    <span
                      aria-hidden
                      className="absolute -left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 scale-0 rounded-full bg-accent transition-transform duration-500 ease-prime group-hover:scale-100"
                    />
                    <span className="inline-block font-semibold transition-transform duration-500 ease-prime group-hover:translate-x-0.5">
                      {n.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div data-reveal className="md:col-span-3">
            <p data-hover-scramble className={label}>
              Follow
            </p>
            <ul className="mt-2 text-[15px] leading-[1.35] md:text-[16px]">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    className="group inline-flex items-center gap-2 py-[3px] font-semibold text-graphite transition-colors duration-500 hover:text-ink"
                  >
                    {s.label}
                    <svg
                      aria-hidden
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5 -translate-x-1 translate-y-1 opacity-0 transition-[transform,opacity] duration-500 ease-prime group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* the wordmark, as wide as the page — its "o" is the studio's switch, and it takes you home */}
        <div data-mark-row className="mt-16 overflow-hidden pb-[0.6vw] md:mt-24">
          <span
            data-mark
            className="inline-flex items-baseline gap-[0.32em] whitespace-nowrap text-[11vw] leading-[0.9]"
          >
            <span className="inline-flex items-baseline">
              <span data-switch-wrap className="relative top-[0.016em] inline-block h-[0.547em] w-[1.064em]">
                <button
                  type="button"
                  data-switch
                  aria-label="Back to top"
                  className="absolute inset-0 cursor-pointer rounded-full"
                >
                  {/* the lit state: a filled pill that fades in under the outline as the knob arrives */}
                  <span data-switch-on aria-hidden className="absolute inset-0 rounded-full bg-accent opacity-0" />
                  <svg aria-hidden viewBox="0 0 1064 547" className="absolute inset-0 h-full w-full overflow-visible">
                    <rect
                      x="48.75"
                      y="48.75"
                      width="966.5"
                      height="449.5"
                      rx="224.75"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="97.5"
                    />
                  </svg>
                  <span
                    data-knob-nudge
                    aria-hidden
                    className="absolute left-[0.1375em] top-1/2 -mt-[0.136em] block h-[0.272em] w-[0.272em]"
                  >
                    <span data-knob className="block h-full w-full rounded-full bg-current" />
                  </span>
                </button>
              </span>
              <span data-mark-text className="-ml-[0.027em] font-medium tracking-[-0.04em]">
                ne
              </span>
            </span>
            <span data-mark-text className="font-medium tracking-[-0.03em]">
              Prime Studio
            </span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-3 border-t border-ink/10 pt-4 md:grid-cols-12">
          <p className={`${label} md:col-span-3`}>© 2026 One Prime Studio</p>
          <p className={`${label} justify-self-end text-right md:col-span-4 md:col-start-5 md:justify-self-center`}>
            Average is not an option.
          </p>
          <button
            type="button"
            onClick={toTop}
            className={`${label} group col-span-2 inline-flex items-center gap-2 justify-self-start transition-colors duration-500 hover:text-ink md:col-span-3 md:col-start-10 md:justify-self-end`}
          >
            Back to top
            <span
              aria-hidden
              className="inline-block transition-transform duration-500 ease-prime group-hover:-translate-y-0.5"
            >
              ↑
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
