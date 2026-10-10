import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText, ScrambleTextPlugin, CustomEase);
gsap.ticker.lagSmoothing(0); // TEMP-VERIFY

/** The studio's signature curve — cubic-bezier(0.87, 0, 0.13, 1) — used for every layout move. */
export const PRIME = CustomEase.create("prime", "0.87,0,0.13,1");
export const PRIME_DURATION = 0.6;

/**
 * Menu curve. Two cubic segments joined with matching tangents (C1), starting and ending at zero
 * velocity, with a peak speed of ~1.6× the average — the 0.87,0,0.13,1 curve peaks near 5×, which
 * reads as a jump in the middle of the move.
 */
export const MENU_EASE = CustomEase.create("menu", "M0,0 C0.18,0 0.24,0.36 0.4,0.62 0.56,0.88 0.7,1 1,1");
export const MENU_OPEN = 1;
export const MENU_CLOSE = 0.85;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * ScrollSmoother has to exist before any ScrollTrigger that pins. React runs child effects
 * before the shell's, so every section calls this first rather than relying on mount order.
 */
export function ensureSmoother() {
  const existing = ScrollSmoother.get();
  if (existing || prefersReducedMotion()) return existing ?? null;
  // Elements, not selectors: callers run inside scoped gsap contexts, which would scope a selector too.
  const wrapper = document.getElementById("smooth-wrapper");
  const content = document.getElementById("smooth-content");
  if (!wrapper || !content) return null;
  return ScrollSmoother.create({ wrapper, content, smooth: 1.15, smoothTouch: false });
}

/** Labels marked `data-hover-scramble` inside `scope` scramble back into themselves when hovered. */
export function hoverScramble(scope: Element) {
  if (prefersReducedMotion()) return () => {};
  const labels = Array.from(scope.querySelectorAll<HTMLElement>("[data-hover-scramble]"));
  const onEnter = (e: Event) => {
    const el = e.currentTarget as HTMLElement;
    const text = (el.dataset.text ??= el.textContent ?? "");
    gsap.to(el, { duration: 0.6, ease: "none", overwrite: true, scrambleText: { text, chars: "upperCase", speed: 0.6 } });
  };
  labels.forEach((el) => el.addEventListener("pointerenter", onEnter));
  return () => labels.forEach((el) => el.removeEventListener("pointerenter", onEnter));
}

export { gsap, useGSAP, ScrollSmoother, ScrollTrigger, SplitText };
