import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText, ScrambleTextPlugin, CustomEase);
// a phone's address bar showing or hiding is not a resize worth recalculating every trigger for
ScrollTrigger.config({ ignoreMobileResize: true });

/** The studio's signature curve — cubic-bezier(0.87, 0, 0.13, 1) — used for every layout move. */
export const PRIME = CustomEase.create("prime", "0.87,0,0.13,1");
export const PRIME_DURATION = 0.6;

/**
 * Menu curve. Two cubic segments joined with matching tangents (C1), starting and ending at zero
 * velocity, with a peak speed of ~1.6× the average — the 0.87,0,0.13,1 curve peaks near 5×, which
 * reads as a jump in the middle of the move.
 */
export const MENU_EASE = CustomEase.create("menu", "M0,0 C0.18,0 0.24,0.36 0.4,0.62 0.56,0.88 0.7,1 1,1");
/**
 * Card curve — an ease-in-out whose fastest point sits just before the middle (t≈0.39, ~2.3× average
 * speed), then lands over a long, soft tail. Symmetric enough that reversing a hover reads the same.
 */
export const CARD_EASE = CustomEase.create("card", "M0,0 C0.3,0 0.32,0.26 0.48,0.56 0.62,0.82 0.72,1 1,1");
/**
 * Hover curve — still starts at zero velocity (no jolt), but peaks early (t≈0.17) and spends the rest
 * of its time settling, so a card answers the cursor at once. Used both ways: enter and leave each get
 * their own tween instead of reversing one, so going home never plays the slow start backwards.
 */
export const HOVER_EASE = CustomEase.create("hover", "M0,0 C0.12,0 0.16,0.34 0.26,0.6 0.38,0.9 0.56,1 1,1");
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
  // Created outside whichever section's gsap.context asked first: that context reverts when its page is
  // left, and would take the smoother's own ScrollTrigger with it, leaving a smoother deaf to the scroll.
  // No automatic effects either: the smoother outlives every route, so each section registers its own (liven)
  let smoother: ScrollSmoother | null = null;
  gsap.context().ignore(() => {
    // smoothTouch: phones get the same eased scroll, a little lighter so a swipe still feels direct
    smoother = ScrollSmoother.create({ wrapper, content, smooth: 1, effects: false, smoothTouch: 0.12 });
  });
  return smoother;
}

/**
 * Elements marked data-lag / data-speed inside `scope` trail or lead the scroll a little, so a section
 * feels alive rather than merely scrolled. Call from a section's useGSAP; returns the cleanup.
 */
export function liven(scope: Element) {
  const smoother = ScrollSmoother.get();
  const targets = scope.querySelectorAll("[data-lag], [data-speed]");
  if (!smoother || !targets.length) return () => {};
  const effects = smoother.effects(targets, null) as ScrollTrigger[];
  return () => effects.forEach((t) => t.kill());
}

// who is holding the page still (the open menu, a page transition): it scrolls again once nobody is.
// The input is refused rather than the smoother paused: a paused smoother parks its eased follow, and
// resumed after a route swap it can stay parked — the window scrolls, the content doesn't.
const holders = new Set<string>();
const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);
// a panel that scrolls on its own while the page is held (a drawer) is marked data-own-scroll, and keeps
// its input; it should also set overscroll-behavior: contain, so its scroll never chains to the page
const ownScroll = (e: Event) => !!(e.target as Element | null)?.closest?.("[data-own-scroll]");
const refuse = (e: Event) => {
  if (!ownScroll(e)) e.preventDefault();
};
const refuseKeys = (e: KeyboardEvent) => {
  const field = (e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable]");
  if (SCROLL_KEYS.has(e.key) && !field && !ownScroll(e)) e.preventDefault();
};
let refusing = false;
/** Holds the page still while `on`, per holder. */
export function holdScroll(holder: string, on: boolean) {
  if (on) holders.add(holder);
  else holders.delete(holder);
  const still = holders.size > 0;
  if (still === refusing) return;
  refusing = still;
  const opts = { passive: false } as const;
  if (still) {
    window.addEventListener("wheel", refuse, opts);
    window.addEventListener("touchmove", refuse, opts);
    window.addEventListener("keydown", refuseKeys);
  } else {
    window.removeEventListener("wheel", refuse);
    window.removeEventListener("touchmove", refuse);
    window.removeEventListener("keydown", refuseKeys);
  }
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
