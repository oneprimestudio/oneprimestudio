import { useCurrentFrame } from "remotion";
import { D, E, p, TL, clamp01, lerp, hash } from "./time";

/*
 * Cinematic accents, all driven by TL.fx (see scripts/doc/timeline.py) so the mix hits with them.
 * Built for a white ground: light is blue / violet / peach rather than white, so it reads.
 */
const FX = TL.fx;
const near = (t, kind, before, after) => FX.filter((f) => f.kind === kind && t >= f.t - before && t <= f.t + after);

/* ------------------------------------------------------------------ bloom flash */
/** 0..1 — how blown-out the frame is right now: fast attack, slow cinematic release */
export function flashAmount(t) {
  let a = 0;
  for (const f of near(t, "flash", 0.12, 0.9)) {
    const d = t - f.t;
    const v = d < 0 ? Math.pow(1 + d / 0.12, 2) : Math.exp(-d / 0.2);
    a = Math.max(a, v * (f.k ?? 1));
  }
  return a;
}
/** filter for the picture under a flash: exposure up + bloom blur */
export const flashFilter = (k) => (k < 0.01 ? undefined : `brightness(${1 + 0.9 * k}) saturate(${1 - 0.4 * k}) blur(${(9 * k).toFixed(2)}px)`);
export function FlashOverlay({ t }) {
  const k = flashAmount(t);
  if (k < 0.01) return null;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0.82 * k }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(60% 40% at 50% 46%, rgba(47,107,255,${0.16 * k}), transparent 70%)` }} />
    </>
  );
}

/* ------------------------------------------------------------------ laser beams */
// beams live in a rotated 2280×1920 box whose middle 1080 px is the frame
function Beam({ t, at, y, len, thick, color, glow, dur = 0.6 }) {
  const k = p(t, at, dur, E.io5);
  if (t < at || k >= 1) return null;
  const x = lerp(300 - len, 2000, k);
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: len,
        height: thick,
        borderRadius: thick,
        background: `linear-gradient(90deg, transparent, ${color} 55%, #9db6ff 92%, transparent)`,
        boxShadow: `0 0 ${glow}px ${glow / 4}px ${color}, 0 0 ${glow * 3}px ${glow / 2}px rgba(47,107,255,0.25)`,
        opacity: Math.sin(Math.PI * k) ** 0.4,
      }}
    />
  );
}
export function Lasers({ t }) {
  return near(t, "laser", 0.05, 0.9).map((f, j) => {
    const seed = Math.round(f.t * 10);
    const beams = [];
    for (let i = 0; i < f.n + 2; i++) {
      const r = hash(i, seed, 3);
      beams.push(
        <Beam
          key={i}
          t={t}
          at={f.t + i * 0.04 + r * 0.05}
          y={960 + (i - (f.n + 1) / 2) * lerp(60, 150, r)}
          len={lerp(1100, 1900, hash(i, 2, seed))}
          thick={i % 3 === 0 ? 6 : i % 3 === 1 ? 3 : 2}
          color={i % 3 === 1 ? "rgba(123,92,255,0.95)" : "rgba(47,107,255,1)"}
          glow={i % 3 === 0 ? 34 : 18}
        />,
      );
    }
    // a wide soft light band that rides with the beams
    const kb = p(t, f.t, 0.75, E.io5);
    return (
      <div key={j} style={{ position: "absolute", left: -600, top: 0, width: 2280, height: 1920, transform: `rotate(${f.angle}deg)`, transformOrigin: "50% 50%", mixBlendMode: "multiply" }}>
        {t >= f.t && kb < 1 && (
          <span style={{ position: "absolute", left: lerp(-200, 2100, kb) - 300, top: 960 - 340, width: 600, height: 680, background: "radial-gradient(50% 50% at 50% 50%, rgba(47,107,255,0.22), transparent 70%)", opacity: Math.sin(Math.PI * kb) }} />
        )}
        {beams}
      </div>
    );
  });
}

/* ------------------------------------------------------------------ anamorphic flare */
export function Flares({ t }) {
  return near(t, "flare", 0.1, 1.6).map((f, j) => {
    const a = p(t, f.t - 0.1, 0.25, E.io);
    const r = Math.exp(-Math.max(0, t - f.t - 0.15) / 0.45);
    const k = a * r;
    if (k < 0.01) return null;
    const drift = (t - f.t) * 40;
    // ghosts sit on the line from the source through the centre of the frame
    const gx = (s) => f.x + (540 - f.x) * s;
    const gy = (s) => f.y + (960 - f.y) * s;
    return (
      <div key={j} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", pointerEvents: "none" }}>
        <span style={{ position: "absolute", left: f.x - 900 + drift, top: f.y - 10, width: 1800, height: 20, borderRadius: 20, background: "radial-gradient(50% 50% at 50% 50%, rgba(47,107,255,0.85), rgba(47,107,255,0.25) 40%, transparent 70%)", transform: `scaleX(${0.4 + 0.6 * a}) scaleY(${0.6 + 0.4 * k})`, opacity: k, filter: "blur(2px)" }} />
        <span style={{ position: "absolute", left: f.x - 160, top: f.y - 160, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(47,107,255,0.45), rgba(123,92,255,0.12) 45%, transparent 70%)", opacity: k }} />
        {[
          [0.6, 90, "rgba(123,92,255,0.18)"],
          [1.3, 46, "rgba(47,107,255,0.22)"],
          [1.7, 150, "rgba(255,170,120,0.16)"],
          [2.2, 30, "rgba(47,107,255,0.3)"],
        ].map(([s, size, c], i) => (
          <span key={i} style={{ position: "absolute", left: gx(s) - size / 2, top: gy(s) - size / 2, width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${c}, transparent 72%)`, border: `1.5px solid ${c}`, opacity: k * 0.9 }} />
        ))}
      </div>
    );
  });
}

/* ------------------------------------------------------------------ light leaks */
export function Leaks({ t }) {
  return near(t, "leak", 0, 4).map((f, j) => {
    const d = f.dur;
    const env = p(t, f.t, d * 0.35, E.io) * (1 - p(t, f.t + d * 0.55, d * 0.45, E.io));
    if (env < 0.01) return null;
    const q = clamp01((t - f.t) / d);
    const blobs = [
      [lerp(-200, 900, q), lerp(300, 520, q), 900, "rgba(255,166,120,0.55)"],
      [lerp(1200, 300, q), lerp(1500, 1100, q), 1000, "rgba(123,92,255,0.42)"],
      [lerp(600, 1100, q), lerp(-100, 300, q), 700, "rgba(47,107,255,0.4)"],
    ];
    return (
      <div key={j} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: env * 0.55 }}>
        {blobs.map(([x, y, s, c], i) => (
          <span key={i} style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: "50%", background: `radial-gradient(circle, ${c}, transparent 65%)` }} />
        ))}
      </div>
    );
  });
}

/* ------------------------------------------------------------------ film grain + vignette */
export function Grain() {
  const f = useCurrentFrame();
  const seed = f % 12;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.09, pointerEvents: "none" }}>
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.55  0 0 0 1.4 -0.35" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 45%, transparent 60%, rgba(8,6,78,0.07) 100%)", pointerEvents: "none" }} />
    </>
  );
}

/* ------------------------------------------------------------------ ambient light */
/** a slow blue glow behind a scene, gives the white depth */
export function Glow({ t, x = 540, y = 900, size = 1300, color = "rgba(47,107,255,0.10)", at = 0 }) {
  const k = p(t, at, 1.2, E.io);
  const dx = Math.sin(t * 0.35) * 60;
  const dy = Math.cos(t * 0.27) * 50;
  return <span style={{ position: "absolute", left: x - size / 2 + dx, top: y - size / 2 + dy, width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle, ${color}, transparent 65%)`, opacity: k, pointerEvents: "none" }} />;
}
