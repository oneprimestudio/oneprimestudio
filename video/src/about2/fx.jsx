import { AbsoluteFill, random } from "remotion";
import { Dither } from "../lib/Dither";
import { A, TL, clamp01, noise3 } from "./time";

/*
 * The film's effects, all driven by the sound cues in timeline.json so picture and sound hit together:
 *   shake   — every hit kicks the camera (decaying), plus a slow handheld drift through Act 1
 *   punch   — a zoom bump on the same hits
 *   invert  — 2–3 frames of colour inversion on the big hits (a white overlay in difference mode)
 *   split   — red/blue chromatic offsets on hits and glitches
 *   grain + vignette for the dark act, a dithered shockwave ring for the explosion
 */
const KICK = { hit: 22, drop: 26, shock: 16, slam: 12, cash: 9, thud: 10, lock: 8, glitch: 10, snap: 5, absorb: 0 };
const EVENTS = TL.sfx.filter((c) => KICK[c.sound]).map((c) => ({ t: c.t, a: KICK[c.sound] * (c.gain ?? 1), kind: c.sound }));
const INVERT = TL.sfx.filter((c) => ["hit", "drop"].includes(c.sound) && (c.gain ?? 1) >= 0.6).map((c) => c.t);
const SPLIT = TL.sfx.filter((c) => ["hit", "drop", "glitch", "buzz", "shock"].includes(c.sound)).map((c) => c.t);

export function camera(t, actOneEnd) {
  let x = 0;
  let y = 0;
  let r = 0;
  let s = 0;
  for (const e of EVENTS) {
    const d = t - e.t;
    if (d < 0 || d > 0.5) continue;
    const k = Math.exp(-d / 0.075);
    x += e.a * k * Math.sin(d * 95 + e.t * 7);
    y += e.a * k * Math.cos(d * 81 + e.t * 3);
    r += e.a * 0.04 * k * Math.sin(d * 60 + e.t);
    s += e.a * 0.0012 * k;
  }
  if (t < actOneEnd) {
    // handheld: slow, uneasy
    x += (noise3(t * 0.7, 1, 0) - 0.5) * 14;
    y += (noise3(t * 0.6, 2, 0) - 0.5) * 14;
    r += (noise3(t * 0.4, 3, 0) - 0.5) * 0.8;
  }
  return `translate(${x}px, ${y}px) rotate(${r}deg) scale(${1 + s})`;
}

export function splitFilter(t) {
  let k = 0;
  for (const h of SPLIT) {
    const d = t - h;
    if (d >= 0 && d < 0.18) k = Math.max(k, 1 - d / 0.18);
  }
  if (k <= 0.02) return undefined;
  const o = 10 * k;
  return `drop-shadow(${o}px 0 0 rgba(229,72,77,${0.75 * k})) drop-shadow(${-o}px 0 0 rgba(47,107,255,${0.75 * k}))`;
}

export function Invert({ t }) {
  const on = INVERT.some((h) => t >= h && t < h + 0.05);
  if (!on) return null;
  return <AbsoluteFill style={{ background: "#fff", mixBlendMode: "difference", pointerEvents: "none" }} />;
}

/** a white bloom that decays */
export function Bloom({ t, at, k = 0.85, color = "#fff", dur = 0.09 }) {
  if (t < at || t > at + 0.6) return null;
  return <AbsoluteFill style={{ background: color, opacity: k * Math.exp(-(t - at) / dur), pointerEvents: "none" }} />;
}

export function Grain({ t, opacity = 0.09 }) {
  const seed = Math.floor(t * 30);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "screen" }}>
      <svg width="1080" height="1920">
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.2" />
        </filter>
        <rect width="1080" height="1920" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
}

export function Vignette({ opacity = 1 }) {
  return <AbsoluteFill style={{ pointerEvents: "none", opacity, background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)" }} />;
}

/** the explosion's ring, drawn in the studio's dither squares */
export function Shockwave({ t, at, x = 540, y = 960, color = A.ink, speed = 2600, band = 130 }) {
  const d = t - at;
  if (d < 0 || d > 0.9) return null;
  const R = d * speed;
  const fade = 1 - d / 0.9;
  return (
    <Dither
      px={8}
      color={color}
      field={(i, j, px, py) => {
        const r = Math.hypot(px - x, py - y);
        const q = 1 - Math.abs(r - R) / band;
        return clamp01(q) * fade * (0.6 + 0.4 * random(`${i}-${j}`));
      }}
    />
  );
}
