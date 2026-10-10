import { interpolateColors, random } from "remotion";
import { Dither } from "./Dither";
import { C, clamp01, E, FPS, H_, hash, lerp, MONO, noise3, p, SANS, W_ } from "./core";

/* ------------------------------------------------------------------ type */

/** masked line/word reveal: rises out of its own mask, optionally leaves upward */
export function Rise({ t, at, dur = 0.75, out, outDur = 0.45, from = 112, ease = E.out, children, style, inner }) {
  const k = p(t, at, dur, ease);
  const o = out == null ? 0 : p(t, out, outDur, E.in);
  const y = (1 - k) * from - o * from;
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "top",
        padding: "0.06em 0.04em 0.14em",
        margin: "-0.06em -0.04em -0.14em",
        ...style,
      }}
    >
      <span style={{ display: "inline-block", transform: `translateY(${y}%)`, willChange: "transform", ...inner }}>{children}</span>
    </span>
  );
}

/** a line whose words rise at their spoken times: words = [[text, time, style?], …] */
export function Words({ t, words, out, gap = "0.24em", dur = 0.7, style }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", columnGap: gap, ...style }}>
      {words.map(([w, at, st], i) => (
        <Rise key={i} t={t} at={at - 0.06} dur={dur} out={out} inner={st}>
          {w}
        </Rise>
      ))}
    </span>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>";
/** mono scramble that resolves left to right */
export function Scramble({ t, at, dur = 0.8, text, style }) {
  if (t < at) return <span style={{ opacity: 0, ...style }}>{text}</span>;
  const k = clamp01((t - at) / dur);
  const tick = Math.floor(t * 24);
  let s = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const ci = i / text.length;
    if (ch === " " || ci < k * 1.15 - 0.15) s += ch;
    else if (ci < k * 1.15 + 0.25) s += GLYPHS[Math.floor(random(`${text}${i}${tick}`) * GLYPHS.length)];
    else s += " ";
  }
  return <span style={{ whiteSpace: "pre", ...style }}>{s}</span>;
}

/** typewriter with a block caret */
export function Type({ t, at, end, text, caret = true, style }) {
  const n = Math.round(clamp01((t - at) / Math.max(0.001, end - at)) * text.length);
  const blink = Math.floor(t * 3) % 2 === 0;
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {t >= at ? text.slice(0, n) : ""}
      {caret && t >= at - 0.4 && <span style={{ opacity: blink ? 1 : 0 }}>▌</span>}
    </span>
  );
}

export const mono = (size = 24, color, extra) => ({
  fontFamily: MONO,
  fontSize: size,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color,
  ...extra,
});
export const display = (size, color, extra) => ({
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: size,
  lineHeight: 0.88,
  letterSpacing: "-0.045em",
  color,
  ...extra,
});

/* ------------------------------------------------------------------ the mark */
/*
 * Geometry from src/components/Logo.tsx, in em of `s`: a 1.75 × 0.9 pill with a 0.11 stroke and a
 * 0.52 knob, 0.12 from the inner edge. k = 0 → knob left (off), k = 1 → knob right (on: it reads "o").
 */
export function Pill({ s, k = 0, stroke = C.sand, fill = "transparent", knob = C.sand, style, knobScale = 1 }) {
  const b = 0.11 * s;
  const innerW = 1.75 * s - 2 * b;
  const d = 0.52 * s;
  const left = 0.12 * s + k * (innerW - 0.24 * s - d);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: 1.75 * s,
        height: 0.9 * s,
        borderRadius: s,
        border: `${b}px solid ${stroke}`,
        background: fill,
        boxSizing: "border-box",
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          position: "absolute",
          left,
          top: (0.68 * s - d) / 2,
          width: d,
          height: d,
          borderRadius: "50%",
          background: knob,
          transform: `scale(${knobScale})`,
        }}
      />
    </span>
  );
}

/** the full lockup: pill + "ne" (+ "Prime Studio") */
export function Logo({ s, k = 1, color = C.sand, words = true, neAt, wordsAt, t, gap = 0.32 }) {
  const ne = neAt == null ? 1 : p(t, neAt, 0.7);
  const ws = wordsAt == null ? 1 : p(t, wordsAt, 0.8);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: gap * s, color, fontFamily: SANS, fontSize: s, lineHeight: 1 }}>
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        <Pill s={s} k={k} stroke={color} knob={color} />
        <span style={{ display: "inline-block", overflow: "hidden", marginLeft: -0.04 * s, padding: "0 0.02em 0.1em", marginBottom: "-0.1em" }}>
          <span style={{ display: "inline-block", fontWeight: 500, letterSpacing: "-0.04em", transform: `translateY(${(1 - ne) * 110}%)` }}>ne</span>
        </span>
      </span>
      {words && (
        <span style={{ display: "inline-block", overflow: "hidden", padding: "0 0.02em 0.12em", marginBottom: "-0.12em" }}>
          <span style={{ display: "inline-block", fontWeight: 500, letterSpacing: "-0.03em", transform: `translateY(${(1 - ws) * 110}%)` }}>
            Prime Studio
          </span>
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ chrome */
/** the website hero's language: hairline frame, corner registration, mono status line */
export function Hud({ t, light, label, start }) {
  const col = (a) => interpolateColors(light, [0, 1], [`rgba(239,237,233,${a})`, `rgba(8,6,78,${a})`]);
  const draw = p(t, 0.15, 1.1, E.menu);
  const inset = 36;
  const secs = Math.floor(t);
  const ff = Math.floor((t - secs) * FPS);
  const tc = `${String(secs).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
  const tick = (x, y) => (
    <span key={`${x}${y}`} style={{ position: "absolute", left: x - 11, top: y - 11, width: 22, height: 22, opacity: draw }}>
      <span style={{ position: "absolute", left: 10.25, top: 0, width: 1.5, height: 22, background: col(0.6) }} />
      <span style={{ position: "absolute", top: 10.25, left: 0, height: 1.5, width: 22, background: col(0.6) }} />
    </span>
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* frame lines grow out from the corners */}
      {[
        { left: inset, top: inset, width: (W_ - 2 * inset) * draw, height: 1.5 },
        { right: inset, bottom: inset, width: (W_ - 2 * inset) * draw, height: 1.5 },
        { left: inset, bottom: inset, height: (H_ - 2 * inset) * draw, width: 1.5 },
        { right: inset, top: inset, height: (H_ - 2 * inset) * draw, width: 1.5 },
      ].map((s, i) => (
        <span key={i} style={{ position: "absolute", background: col(0.16), ...s }} />
      ))}
      {tick(inset, inset)}
      {tick(W_ - inset, inset)}
      {tick(inset, H_ - inset)}
      {tick(W_ - inset, H_ - inset)}
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 82,
          display: "flex",
          justifyContent: "space-between",
          ...mono(21, col(0.72)),
        }}
      >
        <Scramble t={t} at={0.35} dur={0.9} text="One Prime Studio" />
        <span style={{ display: "flex", gap: 28 }}>
          <Scramble key={label} t={t} at={start + 0.05} dur={0.6} text={label} />
          <span style={{ fontVariantNumeric: "tabular-nums", opacity: draw }}>[ {tc} ]</span>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ transition */
const sat = clamp01;
/**
 * Bayer pixel dissolve between scenes. A front sweeps across the frame: its leading edge is the
 * accent dither, behind it the incoming scene's ground; past the cut the front keeps travelling
 * and uncovers the new scene with the same accent edge. Blocky 48px jitter makes it read digital.
 */
export function Curtain({ t, at, color, accent = C.accent, mode = 0, seed = 1 }) {
  const t0 = at - 0.36;
  const t1 = at + 0.42;
  if (t < t0 || t > t1) return null;
  const F = t < at ? lerp(0, 1.4, p(t, t0, 0.36, E.inOut)) : 1.4;
  const Q = t < at ? -0.45 : lerp(-0.45, 1.4, p(t, at, 0.42, E.inOut));
  const s = 0.13;
  const G = (x, y) => {
    const u = x / W_;
    const v = y / H_;
    let g;
    if (mode === 0) g = 0.62 * v + 0.38 * u;
    else if (mode === 1) g = 1 - v;
    else if (mode === 2) g = Math.hypot(u - 0.5, (v - 0.5) * 1.78) / 1.02;
    else g = 0.62 * (1 - v) + 0.38 * (1 - u);
    return g * 0.84 + 0.12 * hash(Math.floor(x / 48), Math.floor(y / 48), seed) + 0.04 * noise3(x * 0.02, y * 0.02, seed);
  };
  return (
    <>
      <Dither px={8} color={accent} field={(i, j, x, y) => {
        const g = G(x, y);
        return Math.min(sat((F - g) / s), sat((g - Q) / s));
      }} />
      <Dither px={8} color={color} field={(i, j, x, y) => {
        const g = G(x, y);
        return Math.min(sat((F - 0.15 - g) / s), sat((g - Q - 0.15) / s));
      }} />
    </>
  );
}

/* ------------------------------------------------------------------ cursor */
export function Cursor({ x, y, color = C.ink, outline = C.sand, scale = 1, opacity = 1 }) {
  return (
    <svg
      width={44 * scale}
      height={54 * scale}
      viewBox="0 0 22 27"
      style={{ position: "absolute", left: x - 3 * scale, top: y - 2 * scale, opacity, overflow: "visible" }}
    >
      <path d="M2 2 L2 21 L7 16.5 L10.5 24.5 L13.7 23.1 L10.3 15.3 L17 15.3 Z" fill={color} stroke={outline} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** expanding click ring */
export function Ripple({ t, at, x, y, color = C.accent, size = 90 }) {
  const k = p(t, at, 0.5, E.out);
  if (t < at || k >= 1) return null;
  return (
    <span
      style={{
        position: "absolute",
        left: x - (size * k) / 2,
        top: y - (size * k) / 2,
        width: size * k,
        height: size * k,
        borderRadius: "50%",
        border: `3px solid ${color}`,
        opacity: 1 - k,
      }}
    />
  );
}
