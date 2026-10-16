"use client";

import { type RefObject, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import DotMonogram from "@/components/about/DotMonogram";
import { makePaper } from "@/components/about/paper";
import type { Founder } from "@/lib/founders";
import { gsap, holdScroll, MENU_CLOSE, MENU_OPEN, prefersReducedMotion, PRIME, SplitText } from "@/lib/gsap";
import { EMAIL } from "@/lib/studio";

/*
 * A founder in full, on a sheet of navy paper. Opening it holds and darkens the page the way the open
 * menu does; a three.js sheet (paper.ts) rises straight up from below the screen on the navbar's own
 * opening curve (PRIME, MENU_OPEN), rolling in over a gentle bend, and lands flat in the drawer's place —
 * where the real drawer, navy with white type, takes over and its lines rise out of their masks.
 * Closing hands back to the paper, which rolls back down and away.
 *
 * The drawer is narrower than the screen on wide screens (65% of it, centred) and full width on phones.
 * Inside, the About page's language: a mono label row, a hairline, the facts at the left and the matter
 * at the right.
 *
 * Portalled to <body>: the page lives in the smoother's transformed layer, where `position: fixed` would
 * be fixed to the layer, not the screen. The page is held still while it is open; the drawer keeps its
 * own scroll (data-own-scroll). Escape, the close button or a click on the dim closes it; focus goes into
 * the drawer and back to the button that opened it.
 */

const label = "font-mono text-[10px] uppercase tracking-[0.14em] md:text-[11px]";

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

  return createPortal(
    <div ref={root} className="fixed inset-0 z-[80]">
      <div data-veil onClick={onClose} className="invisible absolute inset-0 bg-black/65 opacity-0 backdrop-brightness-[0.55]" />
      <canvas data-paper aria-hidden className="pointer-events-none invisible absolute inset-0 block h-full w-full" />
      <div
        data-sheet
        role="dialog"
        aria-modal="true"
        aria-labelledby={`founder-${founder.slug}`}
        className="invisible absolute bottom-0 left-1/2 flex max-h-[92svh] w-full -translate-x-1/2 flex-col bg-ink text-white opacity-0 md:max-w-[65%]"
      >
        {/* the label row, held at the top of the sheet */}
        <div className="flex items-center justify-between gap-4 border-b border-white/15 px-6 py-4 md:px-10">
          <p data-sheet-item className={`${label} text-white/55`}>
            [ Founder ] — {founder.name}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${label} group inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-white transition-colors duration-500 ease-prime hover:bg-white hover:text-ink`}
          >
            Close
            <svg aria-hidden viewBox="0 0 10 10" className="h-2.5 w-2.5 transition-transform duration-500 ease-prime group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" />
            </svg>
          </button>
        </div>

        <div
          data-own-scroll
          className="overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 pb-[10vh] pt-10 md:px-10 md:pt-14">
          <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-6">
            {/* the facts */}
            <aside className="md:col-span-4">
              <div data-sheet-item>
                <DotMonogram text={founder.initials} className="h-32 w-32 text-white md:h-44 md:w-44" />
              </div>
              <dl className="mt-10 max-w-[360px] text-[14px] leading-[1.45]">
                {[
                  ["Role", founder.role.replace(/^Co-founder · /, "")],
                  ["Studio", "One Prime Studio — co-founder"],
                  ["Based", "Hyderabad, India"],
                  ["Works", "Remote, with clients worldwide"],
                ].map(([k, v]) => (
                  <div key={k} data-sheet-item className="grid grid-cols-[6rem_1fr] border-t border-white/15 py-3.5 last:border-b">
                    <dt className={`${label} pt-0.5 text-white/55`}>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <a
                data-sheet-item
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(`For ${founder.name}`)}`}
                className="group mt-8 inline-flex items-center gap-3 rounded-full bg-white py-1.5 pl-5 pr-1.5 text-[13px] font-medium text-ink"
              >
                Write to {founder.name.replace(/^[A-Z]\. /, "")}
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white transition-transform duration-500 ease-prime group-hover:rotate-45">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M2.5 9.5l7-7M4 2.5h5.5V8" />
                  </svg>
                </span>
              </a>
            </aside>

            {/* the matter */}
            <div className="md:col-span-8">
              <h2
                id={`founder-${founder.slug}`}
                data-lines
                className="text-[clamp(2.5rem,4.4vw,4.75rem)] font-medium leading-[0.92] tracking-[-0.05em]"
              >
                {founder.name}
              </h2>
              <p data-lines className={`${label} mt-5 text-[#9db8ff]`}>
                {founder.role}
              </p>

              <blockquote className="mt-12 md:mt-16">
                <p
                  data-lines
                  className="max-w-[24ch] text-[clamp(1.5rem,2.6vw,2.5rem)] font-medium leading-[1.12] tracking-[-0.03em]"
                >
                  <span aria-hidden className="text-[#9db8ff]">“</span>
                  {founder.quote}
                  <span aria-hidden className="text-[#9db8ff]">”</span>
                </p>
              </blockquote>

              <div className="mt-14 grid gap-y-6 text-[17px] leading-[1.55] text-white/75 md:mt-20 md:grid-cols-2 md:gap-x-10 md:text-[18px]">
                {founder.about.map((para) => (
                  <p key={para} data-lines className="max-w-[40ch]">
                    {para}
                  </p>
                ))}
              </div>

              <div className="mt-16 grid gap-y-12 md:mt-20 md:grid-cols-2 md:gap-x-10">
                <section>
                  <p data-sheet-item className={`${label} flex items-center gap-2.5 text-white`}>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
                    Focus
                  </p>
                  <ul className="mt-5 border-t border-white/15">
                    {founder.does.map((d) => (
                      <li key={d} data-sheet-item className="border-b border-white/15 py-3 text-[17px] font-medium tracking-[-0.02em]">
                        {d}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <p data-sheet-item className={`${label} flex items-center gap-2.5 text-white`}>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
                    Principles
                  </p>
                  <ol className="mt-5 border-t border-white/15">
                    {founder.how.map((h, i) => (
                      <li key={h} data-sheet-item className="grid grid-cols-[2.5rem_1fr] border-b border-white/15 py-3 text-[16px] leading-[1.45] text-white/85">
                        <span className={`${label} pt-1 text-white/50`}>0{i + 1}</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <section className="mt-16 md:mt-20">
                <p data-sheet-item className={`${label} flex items-center gap-2.5 text-white`}>
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
                  Skills
                </p>
                <div className="mt-5 grid gap-y-8 border-t border-white/15 pt-6 md:grid-cols-2 md:gap-x-10">
                  {founder.skills.map((g) => (
                    <div key={g.title} data-sheet-item>
                      <p className={`${label} text-white/55`}>{g.title}</p>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {g.items.map((it) => (
                          <li key={it} className="rounded-full border border-white/20 px-3 py-1.5 text-[14px] text-white/90">
                            {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
