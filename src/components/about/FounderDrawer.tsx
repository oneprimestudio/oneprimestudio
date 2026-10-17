"use client";

import Image from "next/image";
import { type RefObject, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { makePaper } from "@/components/about/paper";
import GlobeMark from "@/components/GlobeMark";
import type { Founder } from "@/lib/founders";
import { gsap, holdScroll, MENU_CLOSE, MENU_OPEN, prefersReducedMotion, PRIME, SplitText } from "@/lib/gsap";
import { EMAIL } from "@/lib/studio";

/*
 * A founder in full, on a sheet of white paper. Opening it holds and darkens the page the way the open
 * menu does; a three.js sheet (paper.ts) rises straight up from below the screen on the navbar's own
 * opening curve (PRIME, MENU_OPEN), rolling in over a gentle bend, and lands flat in the drawer's place —
 * where the real drawer, white with ink type, takes over and its lines rise out of their masks.
 * Closing hands back to the paper, which rolls back down and away.
 *
 * The drawer is narrower than the screen on wide screens (65% of it, centred) and full width on phones.
 * Inside, the About page's opening in small: a centred head (a hook, the name, the role, the portrait with
 * a micro line either side), then their words as a statement, a hairline with a "+", the globe badge at
 * the left and who they are with two slim pill buttons at the right, and three quiet columns (focus as
 * tags, principles, skills as tags). Small type, every piece of information in its own place.
 *
 * Portalled to <body>: the page lives in the smoother's transformed layer, where `position: fixed` would
 * be fixed to the layer, not the screen. The page is held still while it is open; the drawer keeps its
 * own scroll (data-own-scroll). Escape, the close button or a click on the dim closes it; focus goes into
 * the drawer and back to the button that opened it.
 */

const label = "font-mono text-[10px] uppercase  md:text-[10px]";
/** a small uppercase hook line, as the About page's */
const hook = "text-[11px] font-medium uppercase leading-[1.15] tracking-[0.01em] md:text-[12px]";
/** a slim bordered pill button: little height, round ends */
const pill =
  "group inline-flex items-center gap-1.5 rounded-full px-3 py-[4px] text-[12px] font-medium leading-[1.2] tracking-[-0.01em] ring-1 ring-inset transition-colors duration-500 ease-prime md:text-[13px]";
/** a slim bordered tag */
const tag = "rounded-full px-2.5 py-[2px] text-[12px] leading-[1.4] text-ink ring-1 ring-inset ring-ink/15";

export default function FounderDrawer({
  founder,
  open,
  onClose,
  onClosed,
  returnTo,
}: {
  founder: Founder | null;
  open: boolean;
  onClose: () => void;
  /** where focus goes back to once the drawer has gone: the button that opened it */
  returnTo: RefObject<HTMLElement | null>;
  /** after the sheet has gone, so the parent can let the founder go */
  onClosed: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !founder) return;
    const veil = el.querySelector<HTMLElement>("[data-veil]")!;
    const sheet = el.querySelector<HTMLElement>("[data-sheet]")!;
    const canvas = el.querySelector<HTMLCanvasElement>("[data-paper]")!;
    const still = prefersReducedMotion();
    const paper = still ? null : makePaper(canvas);
    const state = { p: 0 };
    const draw = (time = gsap.ticker.time) => paper?.draw(state.p, time);
    const fly = (on: boolean) => {
      canvas.style.visibility = on ? "visible" : "hidden";
      if (on) gsap.ticker.add(draw);
      else gsap.ticker.remove(draw);
    };

    if (open) {
      holdScroll("drawer", true);
      const splits = Array.from(el.querySelectorAll<HTMLElement>("[data-lines]")).map((node) =>
        SplitText.create(node, { type: "lines", mask: "lines", linesClass: "split-line" }),
      );
      const lines = splits.flatMap((s) => s.lines);
      gsap.set(sheet, { autoAlpha: 0 });
      gsap.set([lines, el.querySelectorAll("[data-sheet-item]")], { autoAlpha: 0 });
      const tl = gsap.timeline({ defaults: { ease: PRIME } });
      tl.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: still ? 0 : MENU_OPEN * 0.8, ease: "power2.out" }, 0);
      let landAt = 0;
      if (paper) {
        // the paper rises straight up on the navbar's own opening curve and time, rolling in over a gentle
        // bend low on the screen; once it is up and flat, the drawer takes over from it
        paper.fit(sheet.getBoundingClientRect());
        state.p = 0;
        fly(true);
        tl.to(state, { p: 1, duration: MENU_OPEN * 1.2 }, 0);
        landAt = MENU_OPEN * 1.2;
        tl.set(sheet, { autoAlpha: 1 }, landAt).call(() => fly(false), undefined, landAt + 0.05);
      } else {
        tl.set(sheet, { autoAlpha: 1 }, 0).fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: still ? 0 : MENU_OPEN }, 0);
        landAt = still ? 0 : MENU_OPEN * 0.4;
      }
      tl.call(() => closeRef.current?.focus({ preventScroll: true }), undefined, landAt)
        .fromTo(
          el.querySelectorAll("[data-sheet-item]"),
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: still ? 0 : 0.7, stagger: 0.04 },
          landAt,
        )
        .fromTo(
          lines,
          { yPercent: 110, autoAlpha: 1 },
          { yPercent: 0, autoAlpha: 1, duration: still ? 0 : 0.9, stagger: 0.035 },
          landAt,
        );
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        tl.kill();
        fly(false);
        splits.forEach((s) => s.revert());
        paper?.dispose();
      };
    }

    // closing: the drawer hands back to the paper
    const tl = gsap.timeline({
      onComplete: () => {
        fly(false);
        holdScroll("drawer", false);
        returnTo.current?.focus({ preventScroll: true });
        onClosed();
      },
    });
    if (paper) {
      // it rolls back down over the same gentle bend and away, on the menu's closing curve
      paper.fit(sheet.getBoundingClientRect());
      state.p = 1;
      fly(true);
      tl.set(sheet, { autoAlpha: 0 }, 0.02).to(state, { p: 0, duration: MENU_CLOSE * 1.1, ease: PRIME }, 0);
    } else {
      tl.to(sheet, { yPercent: 100, duration: still ? 0 : MENU_CLOSE, ease: PRIME }, 0);
    }
    tl.to(veil, { autoAlpha: 0, duration: still ? 0 : MENU_CLOSE * 0.8, ease: "power2.in" }, 0.15);
    return () => {
      tl.kill();
      fly(false);
      paper?.dispose();
    };
  }, [open, founder, onClose, onClosed, returnTo]);

  // never leave the page held if the drawer goes away mid-way (a route change)
  useEffect(() => () => holdScroll("drawer", false), []);

  if (!founder || typeof document === "undefined") return null;
  const first = founder.name.replace(/^[A-Z]\. /, "");
  const role = founder.role.replace(/^Co-founder · /, "");

  return createPortal(
    <div ref={root} className="fixed inset-0 z-[80]">
      <div data-veil onClick={onClose} className="invisible absolute inset-0 bg-black/65 opacity-0 backdrop-brightness-[0.55]" />
      <canvas data-paper aria-hidden className="pointer-events-none invisible absolute inset-0 block h-full w-full" />
      <div
        data-sheet
        role="dialog"
        aria-modal="true"
        aria-labelledby={`founder-${founder.slug}`}
        className="invisible absolute bottom-0 left-1/2 flex max-h-[92svh] w-[95%] rounded -translate-x-1/2 flex-col bg-white text-ink opacity-0 md:max-w-[65%]"
      >
        {/* the label row, held at the top of the sheet */}
        <div className="flex items-center justify-between gap-4 border-b border-ink/12 px-3 py-3.5 md:px-3">
          <p data-sheet-item className={`${label} text-stone`}>
            [ Founder ] {first}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${label} group inline-flex items-center gap-2 rounded-full px-2.5 py-[3px] text-ink ring-1 ring-inset ring-ink/20 transition-colors duration-500 ease-prime hover:bg-ink hover:text-white`}
          >
            Close
            <svg aria-hidden viewBox="0 0 10 10" className="h-2 w-2 transition-transform duration-500 ease-prime group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
            </svg>
          </button>
        </div>

        <div
          data-own-scroll
          className="overflow-y-auto overscroll-contain px-6 pb-14 pt-12 [scrollbar-width:none] md:px-10 md:pt-14 [&::-webkit-scrollbar]:hidden"
        >
          {/* ---- the head, centred: a hook, the name, the role; the portrait with a micro line either side ---- */}
          <p data-sheet-item className={`${hook} text-center text-ink`}>
            <span className="px-[4px] md:text-[14px] rounded-full border border-ink " >Co-founder</span> · One Prime Studio
          </p>
          <h2
            id={`founder-${founder.slug}`}
            data-lines
            className="mt-5 text-center text-[clamp(2.25rem,4vw,3.75rem)] font-medium leading-[1] tracking-[-0.045em]"
          >
            {founder.name}
          </h2>
          <p data-lines className={`${label} mt-4 text-center text-stone`}>
            {role}
          </p>

          <div className="mt-10 grid grid-cols-2 items-center gap-y-6 md:mt-12 md:grid-cols-12 md:gap-x-6">
            <p data-sheet-item className={`${hook} order-2 max-w-[22ch] text-ink md:order-none md:col-span-3`}>
              {founder.line}
            </p>
            <div data-sheet-item className="col-span-2 mx-auto w-[min(56vw,220px)] md:col-span-4 md:col-start-5 md:w-full md:max-w-[240px]">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-chalk">
                <Image
                  src={founder.photo}
                  alt={`${founder.name}, co-founder of One Prime Studio`}
                  fill
                  sizes="240px"
                  className="object-cover"
                  style={{ objectPosition: founder.focus }}
                />
              </div>
            </div>
            <p
              data-sheet-item
              className={`${hook} order-3 max-w-[20ch] justify-self-end text-right text-ink md:order-none md:col-span-3 md:col-start-10`}
            >
              Hyderabad, India · Working worldwide
            </p>
          </div>

          {/* ---- in their words: the hook and the statement; a hairline with a "+" ---- */}
          <div className="mt-16 md:mt-20 md:grid md:grid-cols-12 md:gap-x-6">
            <div className="md:col-span-9 md:col-start-2">
              <p data-sheet-item className={`${hook} text-ink`}>
                In {first}&rsquo;s words,
              </p>
              <p
                data-lines
                className="mt-3 max-w-[30ch] text-[clamp(1.375rem,2.1vw,2rem)] leading-[1.08] font-medium tracking-[-0.025em] text-ink"
              >
                {founder.quote}
              </p>
            </div>
          </div>
          <div className="relative mt-12 md:mt-14">
            <span aria-hidden className="block h-px bg-ink/12" />
            <span aria-hidden className="absolute left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-[13px] leading-none text-ink">
              +
            </span>
          </div>

          {/* ---- the badge at the left; who they are and the ways in at the right ---- */}
          <div className="mt-10 grid gap-y-10 md:grid-cols-12 md:gap-x-6">
            <div data-sheet-item className="md:col-span-5 md:col-start-2">
              <div className="inline-flex items-stretch ring-1 ring-inset ring-ink/25">
                <div className="flex flex-col items-center justify-center gap-2 bg-ink px-4 py-3 text-chalk">
                  <GlobeMark className="h-6 w-6" />
                  <span className={hook}>Estd. 2024</span>
                </div>
                <p className={`${hook} flex max-w-[20ch] items-center px-4 text-ink`}>Co-founder of One Prime Studio.</p>
              </div>
            </div>
            <div className="md:col-span-5 md:col-start-8">
              <div className="space-y-4 text-[14px] leading-[1.6] text-graphite">
                {founder.about.map((para) => (
                  <p key={para} data-lines>
                    {para}
                  </p>
                ))}
              </div>
              <div data-sheet-item className="mt-7 flex flex-wrap gap-2">
                <a
                  href={`mailto:${EMAIL}?subject=${encodeURIComponent(`For ${founder.name}`)}`}
                  className={`${pill} bg-ink text-white ring-ink hover:bg-white hover:text-ink`}
                >
                  Write to {first}
                  <span aria-hidden className="transition-transform duration-500 ease-prime group-hover:rotate-45">
                    ↗
                  </span>
                </a>
                <button type="button" onClick={onClose} className={`${pill} text-ink ring-ink/20 hover:bg-ink hover:text-white`}>
                  Back to the page
                </button>
              </div>
            </div>
          </div>

          {/* ---- three quiet columns: focus, principles, skills ---- */}
          <span aria-hidden className="mt-14 block h-px bg-ink/12 md:mt-16" />
          <div className="mt-8 grid gap-y-10 md:grid-cols-12 md:gap-x-6">
            <section data-sheet-item className="md:col-span-3 md:col-start-2">
              <p className={`${label} text-stone`}>Focus</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {founder.does.map((d) => (
                  <li key={d} className={tag}>
                    {d}
                  </li>
                ))}
              </ul>
            </section>
            <section data-sheet-item className="md:col-span-3 md:col-start-5">
              <p className={`${label} text-stone`}>Principles</p>
              <ol className="mt-4 space-y-3">
                {founder.how.map((h, i) => (
                  <li key={h} className="grid grid-cols-[1.75rem_1fr] text-[13px] leading-[1.5] text-graphite">
                    <span className={`${label} pt-[2px] text-stone`}>0{i + 1}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
            </section>
            <section data-sheet-item className="md:col-span-4 md:col-start-9">
              <p className={`${label} text-stone`}>Skills</p>
              <div className="mt-4 space-y-4">
                {founder.skills.map((g) => (
                  <div key={g.title}>
                    <p className={`${hook} text-ink`}>{g.title}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {g.items.map((it) => (
                        <li key={it} className={tag}>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <p data-sheet-item className={`${hook} mt-14 flex gap-2 text-ink md:ml-[calc((100%-11*1.5rem)/12+1.5rem)]`}>
            <span aria-hidden>✦</span>
            <span>The same hands design it and build it.</span>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
