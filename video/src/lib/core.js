import { continueRender, delayRender, Easing, staticFile, useCurrentFrame } from "remotion";
import levels from "../levels.json";
import tl from "../timeline.json";

/* ------------------------------------------------------------------ brand */
export const C = {
  ink: "#08064e",
  night: "#04032e",
  sand: "#efede9",
  paper: "#ffffff",
  accent: "#2f6bff",
  violet: "#3b2bb0",
  mist: "#8a89a3",
  stone: "#87869d",
  graphite: "#3b3a56",
  haze: "#1d1b78",
};
export const SANS = "Montreal, 'Helvetica Neue', Arial, sans-serif";
export const MONO = "GTMono, ui-monospace, monospace";
export const W_ = 1080;
export const H_ = 1920;

/* ------------------------------------------------------------------ fonts */
const FACES = [
  ["Montreal", "fonts/ppneuemontreal-thin.otf", "200"],
  ["Montreal", "fonts/ppneuemontreal-book.otf", "400"],
  ["Montreal", "fonts/ppneuemontreal-medium.otf", "500"],
  ["Montreal", "fonts/ppneuemontreal-bold.otf", "700"],
  ["GTMono", "fonts/GTAmericaMono-Regular.woff2", "400"],
];
if (typeof document !== "undefined" && !window.__opFonts) {
  window.__opFonts = true;
  const handle = delayRender("Loading PP Neue Montreal + GT America Mono");
  Promise.all(
    FACES.map(([family, file, weight]) =>
      new FontFace(family, `url('${staticFile(file)}')`, { weight }).load().then((f) => document.fonts.add(f)),
    ),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}

/* ------------------------------------------------------------------ time */
export const TL = tl;
export const FPS = tl.fps;
export const HIT = tl.hits;
export const useT = () => useCurrentFrame() / FPS;
export const W = (cue, i) => tl.cues[cue].words[i].t;
export const cue = (id) => tl.cues[id];
export const scene = (id) => tl.scenes.find((s) => s.id === id);

/** per-frame audio envelope (voice | energy | kick), linearly interpolated, 0..1 */
export const level = (name, t) => {
  const arr = levels[name];
  const f = t * FPS;
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(f)));
  return arr[i] + (arr[i + 1] - arr[i]) * Math.max(0, Math.min(1, f - i));
};

/* ------------------------------------------------------------------ easing */
// A cubic-bezier path made of joined segments (C1), solved x → y — lets us use the studio's
// own two-segment menu curve from the website (src/lib/gsap.ts: MENU_EASE).
function pathEase(segments) {
  const bez = (a, b, c, d, s) => {
    const u = 1 - s;
    return u * u * u * a + 3 * u * u * s * b + 3 * u * s * s * c + s * s * s * d;
  };
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const seg = segments.find((sg) => x <= sg[3][0]) ?? segments[segments.length - 1];
    const [p0, p1, p2, p3] = seg;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (bez(p0[0], p1[0], p2[0], p3[0], mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(p0[1], p1[1], p2[1], p3[1], (lo + hi) / 2);
  };
}

export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-out: everything that arrives
  soft: Easing.bezier(0.22, 1, 0.36, 1), // quint-out: secondary motion
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera + layout moves
  prime: Easing.bezier(0.87, 0, 0.13, 1), // the studio's signature curve: wipes, strikes
  in: Easing.bezier(0.7, 0, 0.84, 0), // exits
  back: Easing.bezier(0.34, 1.56, 0.64, 1), // the switch knob: one soft overshoot
  linear: (x) => x,
  menu: pathEase([
    [
      [0, 0],
      [0.18, 0],
      [0.24, 0.36],
      [0.4, 0.62],
    ],
    [
      [0.4, 0.62],
      [0.56, 0.88],
      [0.7, 1],
      [1, 1],
    ],
  ]),
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
/** eased progress of t through [at, at + dur] */
export const p = (t, at, dur, ease = E.out) => (dur <= 0 ? (t >= at ? 1 : 0) : ease(clamp01((t - at) / dur)));
export const smooth = (e0, e1, x) => {
  const k = clamp01((x - e0) / (e1 - e0));
  return k * k * (3 - 2 * k);
};

/* ------------------------------------------------------------------ noise */
const hash3 = (x, y, z) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const hash = hash3;
const fade = (t) => t * t * (3 - 2 * t);
export function noise3(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const a = lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u);
  const b = lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u);
  const c = lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u);
  const d = lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(a, b, v), lerp(c, d, v), w);
}

/* ------------------------------------------------------------------ camera */
/** decaying shake after each hit, deterministic */
export function shake(t) {
  let x = 0;
  let y = 0;
  for (const h of Object.values(HIT)) {
    const d = t - h;
    if (d < 0 || d > 0.45) continue;
    const a = 9 * Math.exp(-d / 0.09);
    x += a * Math.sin(d * 83 + h);
    y += a * Math.cos(d * 71 + h * 2);
  }
  return [x, y];
}
