"use client";

import { useRef, useState } from "react";
import { ensureSmoother, gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import FlowerScene from "./FlowerScene";
import LocalTime from "./LocalTime";
import Spinner from "./Spinner";

const CELLS = 40;
const PROGRESS = 0.85;
const FILLED = Math.round(CELLS * PROGRESS);

const LOG = [
  { label: "Brand system", state: "locked", done: true },
  { label: "Type & grid", state: "kerned", done: true },
  { label: "Case studies", state: "polishing", done: false },
  { label: "Motion", state: "tuning", done: false },
  { label: "Launch", state: "soon", done: false },
];

const SWITCH_LINES = [
  "Flip the switch.",
  "Almost. Not yet.",
  "Patience — we’re refining.",
  "Still no. Average isn’t an option.",
  "Okay, you’re keen. We like that.",
];

const once = (trigger: Element, start = "top 85%") => ({ trigger, start, once: true });

export default function PrimeSection() {
  const root = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const quipRef = useRef<HTMLParagraphElement>(null);
  const busy = useRef(false);
  const tries = useRef(0);
  const [said, setSaid] = useState(SWITCH_LINES[0]);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      const track = trackRef.current;
      const knob = knobRef.current;
      const quip = quipRef.current;
      if (!el || !track || !knob || !quip || !contextSafe) return;
      ensureSmoother();
      const q = <T extends Element>(selector: string) => el.querySelector<T>(selector)!;
      const pct = q<HTMLElement>("[data-pct]");
      const cells = Array.from(el.querySelectorAll<HTMLElement>("[data-cell]"));
      const still = prefersReducedMotion();

      // The switch never stays on — the site isn't ready yet.
      const flip = contextSafe(() => {
        if (busy.current) return;
        busy.current = true;
        tries.current = Math.min(tries.current + 1, SWITCH_LINES.length - 1);
        const line = SWITCH_LINES[tries.current];
        setSaid(line);
        const travel = track.clientWidth - knob.offsetWidth - knob.offsetLeft * 2;
        gsap
          .timeline({ onComplete: () => void (busy.current = false) })
          .to(knob, { x: travel, duration: still ? 0 : 0.45, ease: "back.out(2.2)" })
          .to(track, { backgroundColor: "#2f6bff", borderColor: "#2f6bff", duration: 0.25 }, 0)
          .to(
            quip,
            { duration: still ? 0 : 0.9, ease: "none", scrambleText: { text: line, chars: "upperCase", speed: 0.6 } },
            0,
          )
          .to(knob, { x: 0, duration: still ? 0 : 1, ease: "elastic.out(1, 0.4)" }, "+=0.6")
          .to(track, { backgroundColor: "rgba(47,107,255,0)", borderColor: "#ffffff", duration: 0.35 }, "<");
      });
      track.addEventListener("click", flip);

      if (still) {
        gsap.set(cells.slice(0, FILLED), { backgroundColor: "#ffffff" });
        pct.textContent = `${Math.round(PROGRESS * 100)}%`;
        return () => track.removeEventListener("click", flip);
      }

      SplitText.create(q("[data-prime-title]"), {
        type: "lines, words, chars",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.chars, {
            yPercent: 130,
            duration: 1.4,
            ease: "expo.out",
            stagger: 0.028,
            scrollTrigger: once(self.elements[0], "top 80%"),
          }),
      });

      SplitText.create(q("[data-prime-copy]"), {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110,
            duration: 1.2,
            ease: "expo.out",
            stagger: 0.07,
            scrollTrigger: once(self.elements[0]),
          }),
      });

      gsap.from(el.querySelectorAll("[data-fade]"), {
        autoAlpha: 0,
        y: 16,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: once(el, "top 70%"),
      });

      // progress: cells light up one by one while the counter runs, then the next cell blinks
      const counter = { v: 0 };
      gsap
        .timeline({ scrollTrigger: once(q("[data-progress]")) })
        .fromTo(
          cells.slice(0, FILLED),
          { backgroundColor: "rgba(255,255,255,0.12)" },
          { backgroundColor: "#ffffff", duration: 0.12, stagger: 0.035, ease: "none" },
        )
        .to(
          counter,
          {
            v: Math.round(PROGRESS * 100),
            duration: FILLED * 0.035,
            ease: "none",
            onUpdate: () => {
              pct.textContent = `${Math.round(counter.v)}%`;
            },
          },
          0,
        )
        .to(cells[FILLED], { backgroundColor: "#2f6bff", duration: 0.5, repeat: -1, yoyo: true, ease: "steps(1)" });

      gsap.from(el.querySelectorAll("[data-log-row]"), {
        autoAlpha: 0,
        y: 18,
        duration: 1,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: once(q("[data-log]")),
      });

      // magnetic switch: the button leans toward the pointer inside a larger, static hit area
      const magnet = q<HTMLElement>("[data-magnet]");
      const xTo = gsap.quickTo(track, "x", { duration: 0.6, ease: "power3" });
      const yTo = gsap.quickTo(track, "y", { duration: 0.6, ease: "power3" });
      const onMove = (e: PointerEvent) => {
        const r = magnet.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      magnet.addEventListener("pointermove", onMove);
      magnet.addEventListener("pointerleave", onLeave);

      // split lines and trigger positions depend on the web fonts
      document.fonts.ready.then(() => ScrollTrigger.refresh());

      return () => {
        track.removeEventListener("click", flip);
        magnet.removeEventListener("pointermove", onMove);
        magnet.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: root },
  );

  return (
    <section
      id="prime"
      ref={root}
      data-cursor="dark"
      data-nav-message="Getting ready for prime"
      className="relative z-10 overflow-hidden bg-ink px-5 pb-6 pt-24 text-white md:px-8 md:pb-8 md:pt-32"
    >
      <div
        data-fade
        className="grid grid-cols-2 font-mono text-[11px] uppercase tracking-[0.08em] text-white/55 md:grid-cols-12"
      >
        <p className="md:col-span-3">(003) — Status</p>
        <p className="justify-self-end text-right md:col-span-3 md:col-start-10">Build 0.9 · Under construction</p>
      </div>

      <h2
        data-prime-title
        className="mt-10 font-sans text-[clamp(3.4rem,12vw,14rem)] font-medium leading-[0.84] tracking-[-0.06em] md:mt-16"
      >
        Getting ready
        <br />
        for <span className="text-accent">prime.</span>
      </h2>

      <div className="mt-16 grid grid-cols-1 gap-y-16 md:mt-24 md:grid-cols-12 md:gap-x-6">
        <div className="flex flex-col gap-12 md:col-span-6 lg:col-span-5">
          <p data-prime-copy className="font-mono text-[14px] leading-[1.7] text-white/85 md:text-[15px]">
            The full site is in the studio right now — being designed, broken, rebuilt and refined until
            it&rsquo;s worthy of the name. We&rsquo;d rather launch late than launch average.
          </p>

          <div data-progress>
            <div className="mb-3 flex justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-white/55">
              <span>Progress</span>
              <span data-pct className="tabular-nums text-white">
                0%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Site build progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(PROGRESS * 100)}
              className="grid grid-cols-[repeat(40,minmax(0,1fr))] gap-[3px]"
            >
              {Array.from({ length: CELLS }, (_, i) => (
                <span key={i} data-cell className="aspect-square bg-[rgba(255,255,255,0.12)]" />
              ))}
            </div>
          </div>

          <ul data-log className="font-mono text-[12px] uppercase tracking-[0.06em] md:text-[13px]">
            {LOG.map((item, i) => (
              <li
                key={item.label}
                data-log-row
                className="flex items-baseline gap-3 border-t border-white/12 py-3 last:border-b"
              >
                <span className="w-4 text-accent">{item.done ? "✓" : <Spinner offset={i} />}</span>
                <span className="text-white">{item.label}</span>
                <span className="flex-1 -translate-y-[3px] border-b border-dotted border-white/25" />
                <span className={item.done ? "text-white/55" : "text-white"}>{item.state}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center justify-between gap-12 md:col-span-6 md:col-start-7">
          <FlowerScene className="w-full max-w-[520px] cursor-pointer" />

          {/* The brand mark, made interactive */}
          <div data-fade className="flex w-full items-center justify-between gap-6 md:justify-end">
            <p
              ref={quipRef}
              aria-hidden
              className="font-mono text-[12px] uppercase tracking-[0.08em] text-white/70 md:text-right"
            >
              {SWITCH_LINES[0]}
            </p>
            <p className="sr-only" aria-live="polite">
              {said}
            </p>
            <div data-magnet className="-m-6 shrink-0 p-6">
              <button
                ref={trackRef}
                type="button"
                aria-label="Launch the site"
                className="relative block h-16 w-[8.5rem] rounded-full border-2 border-white"
              >
                <span ref={knobRef} className="absolute left-2 top-1/2 -mt-[22px] h-11 w-11 rounded-full bg-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer
        data-fade
        className="mt-24 grid grid-cols-2 gap-y-3 border-t border-white/15 pt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-white/55 md:mt-32 md:grid-cols-12"
      >
        <p className="md:col-span-3">© 2026 One Prime Studio</p>
        <p className="justify-self-end md:col-span-3 md:col-start-6 md:justify-self-start">
          Your time <LocalTime />
        </p>
        <p className="col-span-2 md:col-span-3 md:col-start-10 md:justify-self-end">Average is not an option.</p>
      </footer>
    </section>
  );
}
