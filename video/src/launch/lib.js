import { Easing, useCurrentFrame } from "remotion";
import cues from "./cues.json";
import { clamp01, lerp, hash, noise3 } from "../lib/core"; // also registers PP Neue Montreal

export { clamp01, lerp, hash, noise3 };
export const Q = cues;
export const FPS = cues.fps;
export const useT = () => useCurrentFrame() / FPS;

/* ------------------------------------------------------------------ palette */
export const L = {
  white: "#ffffff",
  ink: "#08064e",
  blue: "#2f6bff",
  deep: "#1b3fe0",
  sky: "#3fd0ff",
  violet: "#7b5cff",
  pink: "#ff8fb1",
  mute: "#b4b3c6",
  sub: "#5c5b78",
  line: "rgba(8,6,78,0.12)",
  card: "#f4f4f8",
};
export const SANS = "Montreal, 'Helvetica Neue', Arial, sans-serif";

/* ------------------------------------------------------------------ easing */
export const E = {
  io: Easing.bezier(0.65, 0, 0.35, 1),
  io5: Easing.bezier(0.83, 0, 0.17, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  backIn: Easing.bezier(0.36, 0, 0.66, -0.56),
};
export const p = (t, at, dur, ease = E.io) => (dur <= 0 ? (t >= at ? 1 : 0) : ease(clamp01((t - at) / dur)));

/**
 * Damped spring from 0 → 1 starting at `at`: the elastic in everything. freq in Hz, damp = ζ.
 * Overshoots ~ e^(-ζπ/√(1-ζ²)) — 0.32 → ~35 %, 0.5 → ~16 %.
 */
export function spring(t, at, freq = 2.4, damp = 0.36) {
  const x = t - at;
  if (x <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * x) * (Math.cos(wd * x) + ((damp * w) / wd) * Math.sin(wd * x));
}
/** a decaying wobble that starts at `at` (for squash / jelly), amplitude 1 → 0 */
export function wobble(t, at, freq = 5, decay = 7) {
  const x = t - at;
  if (x < 0) return 0;
  return Math.exp(-x * decay) * Math.cos(2 * Math.PI * freq * x);
}

/* ------------------------------------------------------------------ text */
let ctx;
/** width of text in px in the brand face (fonts are loaded before the first frame renders) */
export function measure(text, size, weight = 500, spacing = -0.045) {
  if (typeof document === "undefined") return text.length * size * 0.55;
  ctx = ctx || document.createElement("canvas").getContext("2d");
  ctx.font = `${weight} ${size}px Montreal`;
  return ctx.measureText(text).width + spacing * size * text.length;
}
export const type = (size, color = L.ink, extra) => ({
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "-0.045em",
  color,
  whiteSpace: "nowrap",
  ...extra,
});

/** motion blur in px from a value's change over one frame */
export const mblur = (f, t, scale = 1, max = 14) => Math.min(max, Math.abs(f(t + 1 / FPS) - f(t)) * scale);
