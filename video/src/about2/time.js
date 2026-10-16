import { Easing, useCurrentFrame } from "remotion";
import tl from "./timeline.json";
import levels from "./levels.json";
import { clamp01 } from "../lib/core";

export { clamp01, lerp, noise3, hash } from "../lib/core";
export { SANS, MONO } from "../lib/core"; // importing core also loads PP Neue Montreal + GT America Mono

/* ------------------------------------------------------------------ the About page's palette */
export const A = {
  paper: "#ffffff",
  ink: "#08064e",
  accent: "#2f6bff",
  stone: "#66657d",
  graphite: "#3b3a56",
  chalk: "#f7f6f2",
  mist: "#8a89a3",
  rule: "rgba(8,6,78,0.12)",
  night: "#04032e",
  alarm: "#e5484d",
  money: "#18a058",
};
export const GUTTER = 64;

/* ------------------------------------------------------------------ time */
export const TL = tl;
export const FPS = tl.fps;
export const useT = () => useCurrentFrame() / FPS;
export const W = (cue, i) => tl.cues[cue].words[i].t;
export const END = (cue) => tl.cues[cue].speechEnd;
export const M = (name) => tl.marks[name];
export const S = (id) => tl.scenes.find((s) => s.id === id);

/** per-frame audio envelope (kick | voice), 0..1 */
export const level = (name, t) => {
  const arr = levels[name];
  const f = t * FPS;
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(f)));
  return arr[i] + (arr[i + 1] - arr[i]) * clamp01(f - i);
};

/* ------------------------------------------------------------------ the site's curves (src/lib/gsap.ts) */
function pathEase(segments) {
  const bez = (a, b, c, d, s) => {
    const u = 1 - s;
    return u * u * u * a + 3 * u * u * s * b + 3 * u * s * s * c + s * s * s * d;
  };
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const [p0, p1, p2, p3] = segments.find((sg) => x <= sg[3][0]) ?? segments[segments.length - 1];
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      if (bez(p0[0], p1[0], p2[0], p3[0], mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(p0[1], p1[1], p2[1], p3[1], (lo + hi) / 2);
  };
}
export const E = {
  prime: Easing.bezier(0.87, 0, 0.13, 1), // PRIME: navbar open, card lifts, wipes, the CTA hover
  menu: pathEase([
    [[0, 0], [0.18, 0], [0.24, 0.36], [0.4, 0.62]],
    [[0.4, 0.62], [0.56, 0.88], [0.7, 1], [1, 1]],
  ]), // MENU_EASE: reveals, rules
  card: pathEase([
    [[0, 0], [0.3, 0], [0.32, 0.26], [0.48, 0.56]],
    [[0.48, 0.56], [0.62, 0.82], [0.72, 1], [1, 1]],
  ]), // CARD_EASE
  out: Easing.bezier(0.16, 1, 0.3, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  io: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  linear: (x) => x,
};

/** eased progress of t through [at, at + dur] */
export const p = (t, at, dur, ease = E.out) => (dur <= 0 ? (t >= at ? 1 : 0) : ease(clamp01((t - at) / dur)));
/** a damped pendulum: starts at `amp` degrees and swings to rest */
export const swing = (t, at, amp = 12, hz = 1.5, decay = 2.6) => (t < at ? amp : amp * Math.exp(-decay * (t - at)) * Math.cos(2 * Math.PI * hz * (t - at)));
/** in, hold, out: 0 → 1 → 0 */
export const io = (t, a, ad, b, bd, ease = E.out, easeOut = E.in) => p(t, a, ad, ease) * (1 - p(t, b, bd, easeOut));
