import { Easing, useCurrentFrame } from "remotion";
import tl from "./timeline.json";

export { clamp01, lerp, hash, noise3 } from "../lib/core";
import { clamp01 } from "../lib/core";

/* ------------------------------------------------------------------ palette (white film) */
export const D = {
  bg: "#ffffff",
  ink: "#08064e",
  sub: "#5c5b78",
  mute: "#b4b3c6",
  line: "rgba(8,6,78,0.12)",
  card: "#f4f4f8",
  card2: "#ebebf2",
  accent: "#2f6bff",
  soft: "#e6edff",
  red: "#e5484d",
  green: "#18a058",
};
export const SANS = "Montreal, 'Helvetica Neue', Arial, sans-serif";

/* ------------------------------------------------------------------ time */
export const TL = tl;
export const FPS = tl.fps;
export const useT = () => useCurrentFrame() / FPS;
export const W = (cue, i) => tl.cues[cue].words[i].t;
export const cue = (id) => tl.cues[id];
export const scene = (id) => tl.scenes.find((s) => s.id === id);

/* ------------------------------------------------------------------ easing — all in-out */
export const E = {
  doc: Easing.bezier(0.72, 0, 0.18, 1), // type + masks: slow start, long silky settle
  io: Easing.bezier(0.65, 0, 0.35, 1), // camera + layout moves
  io5: Easing.bezier(0.83, 0, 0.17, 1), // wipes: decisive middle
  sine: Easing.bezier(0.37, 0, 0.63, 1), // drifts
  linear: (x) => x,
};

/** eased progress of t through [at, at + dur] */
export const p = (t, at, dur, ease = E.doc) => (dur <= 0 ? (t >= at ? 1 : 0) : ease(clamp01((t - at) / dur)));
/** in, hold, out: 0 → 1 → 0 */
export const io = (t, a, ad, b, bd, ease = E.doc) => p(t, a, ad, ease) * (1 - p(t, b, bd, ease));
