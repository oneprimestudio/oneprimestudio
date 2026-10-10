import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { clamp01, E, hash, L, lerp, measure, p, spring, type, wobble } from "../launch/lib";
import Q from "./cues.json";

/*
 * One Prime Studio — the mark, explained (1080×1920, 60 fps, 25 s).
 *
 *   0  a point                       (Humane Space: everything starts from a dot)
 *   1  the point stretches into a capsule, then hollows out   (Onbord: elastic circle → pill)
 *   2  droplets fly in and merge into the knob                 (lab / Onbord: gooey metaballs)
 *   3  one switch · one motion · one idea: the knob flips the world  (Sable: circle invert)
 *   4  "ne" bounces in — the switch is the O                   (bouncy: letters with weight)
 *   5  the geometry, drawn as a blueprint                      (construction lines + ratios)
 *   6  "Prime Studio" assembles from slices                    (NOIR: sliced letters)
 *   7  design · develop · launch · evolve                      (create/inspire: word + dot + colour)
 *   8  the lockup, the click, the line
 *
 * Proportions are the studio's own (src/components/Logo.tsx): pill 1.75 × 0.9, stroke 0.11, knob 0.52.
 */

const useT = () => useCurrentFrame() / Q.fps;
const CX = 540;
const CY = 880;
const S = 200;
const PW = 1.75 * S;
const PH = 0.9 * S;
const B = 0.11 * S;
const KD = 0.52 * S;
const KR = KD / 2;
const NE = 0.98 * S;
const LEFT_SOLO = CX - PW / 2;
const LEFT_LOCK = CX - (PW - 0.04 * S + NE) / 2;
const knobCx = (left, k) => left + B + 0.12 * S + k * (PW - 2 * B - 0.24 * S - KD) + KD / 2;
const sp = (t, at, f = 2.3, d = 0.42) => spring(t, at, f, d);

/* ------------------------------------------------------------------ captions */
function Soft({ t, at, text, size = 54, color = L.sub, out, step = 0.026, style }) {
  return (
    <span style={{ display: "inline-flex", ...type(size, color, { letterSpacing: "-0.025em" }), ...style }}>
      {[...text].map((ch, i) => {
        const k = p(t, at + i * step, 0.55, E.out);
        const o = out == null ? 0 : p(t, out + i * step * 0.4, 0.4, E.in);
        const v = k * (1 - o);
        return (
          <span key={i} style={{ display: "inline-block", opacity: v, transform: `translateY(${(1 - k) * 0.4 - o * 0.4}em)`, filter: v < 0.99 ? `blur(${(1 - v) * 8}px)` : undefined }}>
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}
const Caption = ({ y = 1290, children }) => <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center" }}>{children}</div>;

/* ------------------------------------------------------------------ the pill (crisp) */
function PillOutline({ left, top = CY - PH / 2, color = L.ink, draw = 1, w = PW, h = PH }) {
  const per = 2 * (w - h) + Math.PI * h;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left, top, overflow: "visible" }}>
      <rect x={B / 2} y={B / 2} width={w - B} height={h - B} rx={(h - B) / 2} fill="none" stroke={color} strokeWidth={B} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
    </svg>
  );
}

/* ------------------------------------------------------------------ 0–2 · point → capsule → knob (gooey) */
const DROPS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + hash(i, 1, 2) * 0.6;
  const r = 650 + hash(i, 4, 1) * 300;
  return { a, r, size: 12 + hash(i, 7, 3) * 18, delay: [3, 0, 5, 2, 7, 1, 6, 4][i] * 0.08, curve: (hash(i, 2, 8) - 0.5) * 500 };
});

function Genesis({ t }) {
  // the point
  const pop = sp(t, Q.dot, 2.6, 0.35);
  const breathe = t < Q.stretch ? 1 + 0.06 * Math.sin((t - Q.dot) * 5) * clamp01(t - Q.dot - 0.5) : 1;
  const r0 = 40 * Math.max(0, pop) * breathe;
  // stretch into the capsule, elastic
  const s = sp(t, Q.stretch, 1.7, 0.33);
  const w = lerp(2 * r0, PW, s);
  const h = lerp(2 * r0, PH, Math.min(1.15, s * 1.0));
  const cx = CX;
  // hollow out
  const hk = Math.max(0, sp(t, Q.hollow, 2.2, 0.5));
  const iw = Math.max(0, (w - 2 * B) * hk);
  const ih = Math.max(0, (h - 2 * B) * hk);
  // droplets → knob
  const kx = knobCx(LEFT_SOLO, 0);
  const grow = p(t, Q.drops + 0.5, Q.merge - Q.drops - 0.45, E.io);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id="goo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b" />
          <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12" />
        </filter>
      </defs>
      <g filter="url(#goo)">
        <rect x={cx - w / 2} y={CY - h / 2} width={w} height={h} rx={h / 2} fill={L.ink} />
        {/* two satellites thrown off by the stretch, pulled back in */}
        {[-1, 1].map((d) => {
          const k = p(t, Q.stretch, 0.9, E.io);
          const off = Math.sin(Math.PI * k) * 150;
          return t > Q.stretch && k < 1 ? <circle key={d} cx={cx + d * (w / 2 + off * 0.6)} cy={CY - Math.sin(Math.PI * k) * 40 * d} r={16 * Math.sin(Math.PI * k)} fill={L.ink} /> : null;
        })}
      </g>
      {iw > 1 && <rect x={cx - iw / 2} y={CY - ih / 2} width={iw} height={ih} rx={ih / 2} fill={L.white} />}
      {t >= Q.drops && (
        <g filter="url(#goo)">
          {DROPS.map((d, i) => {
            const k = p(t, Q.drops + d.delay, 0.55, E.io);
            const sx = kx + Math.cos(d.a) * d.r;
            const sy = CY + Math.sin(d.a) * d.r;
            const x = lerp(sx, kx, k) + Math.sin(Math.PI * k) * d.curve * Math.sin(d.a + 1);
            const y = lerp(sy, CY, k) + Math.sin(Math.PI * k) * d.curve * Math.cos(d.a + 1);
            return <circle key={i} cx={x} cy={y} r={d.size * (1 - 0.4 * k)} fill={L.ink} />;
          })}
          <circle cx={kx} cy={CY} r={KR * grow * (1 + 0.12 * wobble(t, Q.merge, 4, 7))} fill={L.ink} />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ the mark at rest (crisp), with the switch */
function knobK(t) {
  return sp(t, Q.on1) - sp(t, Q.off1) + sp(t, Q.on2);
}
function pillLeft(t) {
  return lerp(LEFT_SOLO, LEFT_LOCK, p(t, Q.neMove, 0.55, E.io5));
}

function Mark({ t, color = L.ink, k, left, showNe = true }) {
  const kx = knobCx(left, k);
  const neX = left + PW - 0.04 * S;
  const nW = measure("n", S, 500, -0.04);
  return (
    <>
      <PillOutline left={left} color={color} />
      <span style={{ position: "absolute", left: kx - KR, top: CY - KR, width: KD, height: KD, borderRadius: "50%", background: color }} />
      {showNe &&
        ["n", "e"].map((ch, i) => {
          const at = Q.ne[i];
          if (t < at - 0.4) return null;
          // falls with gravity, lands, squashes
          const fall = p(t, at - 0.4, 0.4, E.in);
          const y = lerp(-700, 0, fall);
          const sq = 0.35 * wobble(t, at, 4.5, 8);
          return (
            <span key={ch} style={{ position: "absolute", left: neX + (i ? nW : 0), top: CY - 0.56 * S + y, ...type(S, color, { letterSpacing: "-0.04em" }), transform: `scale(${1 + sq}, ${1 - sq})`, transformOrigin: "50% 92%" }}>
              {ch}
            </span>
          );
        })}
    </>
  );
}

/* ------------------------------------------------------------------ 3 · the switch flips the world */
function invertR(t) {
  const a = p(t, Q.on1, 0.6, E.io5) * (1 - p(t, Q.off1, 0.5, E.io5));
  const b = p(t, Q.on2, 0.6, E.io5) * (1 - p(t, Q.unInvert, 0.5, E.io5));
  return { r: Math.max(a, b) * 1500, bg: t >= Q.on2 - 0.01 ? L.blue : L.ink };
}

/* ------------------------------------------------------------------ 5 · blueprint */
function Blueprint({ t }) {
  const out = p(t, Q.bpOut, 0.5, E.io);
  if (t < Q.bp || out >= 1) return null;
  const left = LEFT_LOCK;
  const top = CY - PH / 2;
  const right = left + PW;
  const kx = knobCx(left, 1);
  const neEnd = left + PW - 0.04 * S + NE;
  const c = "rgba(47,107,255,0.9)";
  const thin = "rgba(47,107,255,0.35)";
  const line = (at, x1, y1, x2, y2, col = thin, w = 2, dash) => {
    const k = p(t, at, 0.6, E.io) * (1 - out);
    return <line x1={lerp((x1 + x2) / 2, x1, k)} y1={lerp((y1 + y2) / 2, y1, k)} x2={lerp((x1 + x2) / 2, x2, k)} y2={lerp((y1 + y2) / 2, y2, k)} stroke={col} strokeWidth={w} strokeDasharray={dash} />;
  };
  const circ = (at, x, y, r, dash = "8 8") => {
    const k = p(t, at, 0.7, E.io) * (1 - out);
    const per = 2 * Math.PI * r;
    return <circle cx={x} cy={y} r={r} fill="none" stroke={thin} strokeWidth={2} strokeDasharray={dash ? undefined : per} strokeDashoffset={dash ? undefined : per * (1 - k)} opacity={dash ? k : 1} style={dash ? { strokeDasharray: dash } : undefined} />;
  };
  const dim = (at, x1, y1, x2, y2, label, lx, ly) => {
    const k = p(t, at, 0.5, E.io) * (1 - out);
    return (
      <g opacity={k}>
        <line x1={x1} y1={y1} x2={lerp(x1, x2, k)} y2={lerp(y1, y2, k)} stroke={c} strokeWidth={2.5} />
        <circle cx={x1} cy={y1} r={5} fill={c} />
        <circle cx={lerp(x1, x2, k)} cy={lerp(y1, y2, k)} r={5} fill={c} />
        <text x={lx} y={ly} fill={c} fontFamily="Montreal" fontWeight={500} fontSize={30} letterSpacing="0.02em">{label}</text>
      </g>
    );
  };
  const grid = p(t, Q.bp, 0.8, E.io) * (1 - out);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, opacity: grid * 0.6, backgroundImage: "radial-gradient(circle, rgba(47,107,255,0.25) 1.6px, transparent 2px)", backgroundSize: "40px 40px", WebkitMaskImage: "radial-gradient(60% 40% at 50% 46%, #000, transparent)", maskImage: "radial-gradient(60% 40% at 50% 46%, #000, transparent)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {line(Q.bp, 0, top, 1080, top)}
        {line(Q.bp + 0.08, 0, top + PH, 1080, top + PH)}
        {line(Q.bp + 0.16, 0, CY, 1080, CY, thin, 1.5, "6 8")}
        {line(Q.bp + 0.12, left, 560, left, 1180)}
        {line(Q.bp + 0.2, right, 560, right, 1180)}
        {line(Q.bp + 0.28, kx, 560, kx, 1180, thin, 1.5, "6 8")}
        {line(Q.bp + 0.36, neEnd, 560, neEnd, 1180)}
        {circ(Q.bp + 0.3, left + PH / 2, CY, PH / 2)}
        {circ(Q.bp + 0.38, right - PH / 2, CY, PH / 2)}
        {circ(Q.bp + 0.46, kx, CY, KR + 14, null)}
        {dim(Q.dims[0], left, top - 60, right, top - 60, "1.75", (left + right) / 2 - 34, top - 78)}
        {dim(Q.dims[1], left - 50, top, left - 50, top + PH, "0.90", left - 150, CY + 10)}
        {dim(Q.dims[2], kx - KR, top + PH + 60, kx + KR, top + PH + 60, "0.52", kx - 32, top + PH + 108)}
        {dim(Q.dims[3], left, top + B / 2, left - 90, top - 110, "0.11", left - 160, top - 120)}
      </svg>
    </>
  );
}

/* ------------------------------------------------------------------ 6 · Prime Studio, from slices */
function Sliced({ t, at, text, size, color = L.ink, top }) {
  const total = measure(text, size, 500, -0.035);
  let x = CX - total / 2;
  const bands = 4;
  return (
    <>
      {[...text].map((ch, i) => {
        const w = measure(ch, size, 500, -0.035);
        const gx = x;
        x += w;
        if (ch === " ") return null;
        return Array.from({ length: bands }).map((_, b) => {
          const a = at + i * 0.035 + b * 0.05;
          const f = (tt) => (1 - p(tt, a, 0.65, E.out)) * (b % 2 ? 1 : -1) * 420;
          const off = f(t);
          const blur = Math.min(10, Math.abs(f(t + 1 / 60) - off) * 0.4);
          if (t < a) return null;
          return (
            <span key={`${i}-${b}`} style={{ position: "absolute", left: gx + off, top, ...type(size, color, { letterSpacing: "0" }), clipPath: `inset(${(b / bands) * 100}% 0 ${(1 - (b + 1) / bands) * 100}% 0)`, padding: "0.1em 0", marginTop: "-0.1em", filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: p(t, a, 0.2) }}>
              {ch}
            </span>
          );
        });
      })}
    </>
  );
}

/* ------------------------------------------------------------------ 7 · words + colour fields */
const WORDS = [
  ["Design", L.ink],
  ["Develop", L.blue],
  ["Launch", L.violet],
  ["Evolve", "#0d0c26"],
];
function Fields({ t }) {
  if (t < Q.words[0] - 0.15 || t > Q.final + 0.9) return null;
  return (
    <>
      {WORDS.map(([w, col], i) => {
        const at = Q.words[i];
        const k = p(t, at - 0.15, 0.5, E.io5);
        if (t < at - 0.15) return null;
        const nextAt = Q.words[i + 1] ?? 99;
        const dotK = sp(t, at + 0.3, 2.6, 0.35);
        const ww = measure(w, 170, 500, -0.045);
        return (
          <div key={w} style={{ position: "absolute", inset: 0, background: col, clipPath: `inset(${(1 - k) * 100}% 0 0 0)` }}>
            <div style={{ position: "absolute", left: CX - (ww + 50) / 2, top: CY - 90, ...type(170, "#fff") }}>
              <Soft t={t} at={at - 0.05} text={w} size={170} color="#fff" step={0.03} out={nextAt - 0.2} />
            </div>
            <span style={{ position: "absolute", left: CX - (ww + 50) / 2 + ww + 14, top: CY + 30 - (1 - Math.min(1, dotK)) * 260, width: 40, height: 40, borderRadius: "50%", background: "#fff", transform: `scale(${1 + 0.3 * wobble(t, at + 0.55, 4, 8)}, ${1 - 0.3 * wobble(t, at + 0.55, 4, 8)})`, opacity: t > at + 0.3 && t < nextAt - 0.1 ? 1 : 0 }} />
          </div>
        );
      })}
    </>
  );
}

/* ================================================================== the film */
export function LogoFilm() {
  const t = useT();
  const left = pillLeft(t);
  const k = knobK(t);
  const kx = knobCx(left, k);
  const inv = invertR(t);
  // after the slices: the whole mark lifts to make room
  const lift = -p(t, Q.prime - 0.15, 0.6, E.io5) * 100;
  const final = t >= Q.final;
  const fk = p(t, Q.final, 0.85, E.io5);
  const kFinal = Math.max(0, sp(t, Q.click, 2.3, 0.42));
  const fade = p(t, Q.fade, 0.45, E.io);
  const crisp = t >= Q.merge + 0.1;
  const ringK = p(t, Q.ring, 0.8, E.io);
  const ringOut = p(t, Q.tOOut - 0.2, 0.5, E.io);
  return (
    <AbsoluteFill style={{ background: L.white, overflow: "hidden" }}>
      <span style={{ position: "absolute", left: -260, top: 260, width: 1600, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(47,107,255,0.06), transparent 60%)" }} />

      {/* 0–2 · genesis */}
      {!crisp && <Genesis t={t} />}

      {/* 3–6 · the mark */}
      {crisp && !final && (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${lift}px)` }}>
          <Mark t={t} k={k} left={left} />
          {/* the world flips from the knob */}
          {inv.r > 0.5 && (
            <div style={{ position: "absolute", inset: 0, clipPath: `circle(${inv.r}px at ${kx}px ${CY}px)`, background: inv.bg }}>
              <Mark t={t} k={k} left={left} color="#fff" />
            </div>
          )}
          {/* the switch is the O */}
          {t >= Q.ring && ringOut < 1 && (
            <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - ringOut }}>
              <ellipse cx={left + PW / 2} cy={CY} rx={PW / 2 + 46} ry={PH / 2 + 46} fill="none" stroke={L.blue} strokeWidth={4} strokeDasharray={1400} strokeDashoffset={1400 * (1 - ringK)} />
              <line x1={left + PW / 2} y1={CY + PH / 2 + 46} x2={left + PW / 2} y2={lerp(CY + PH / 2 + 46, CY + PH / 2 + 150, p(t, Q.ring + 0.5, 0.4, E.io))} stroke={L.blue} strokeWidth={3} />
              <text x={left + PW / 2 - 14} y={CY + PH / 2 + 200} fill={L.blue} fontFamily="Montreal" fontWeight={500} fontSize={46} opacity={p(t, Q.ring + 0.75, 0.3)}>O</text>
            </svg>
          )}
          <Blueprint t={t} />
          {t >= Q.prime && <Sliced t={t} at={Q.prime} text="Prime Studio" size={140} top={CY + 120} />}
        </div>
      )}

      {/* 7 · design · develop · launch · evolve */}
      <Fields t={t} />

      {/* 8 · the lockup returns through a white circle */}
      {final && (
        <div style={{ position: "absolute", inset: 0, clipPath: `circle(${fk * 1500}px at ${CX}px ${CY}px)`, background: L.white, opacity: 1 - fade, filter: fade > 0.01 ? `blur(${fade * 8}px)` : undefined }}>
          <div style={{ position: "absolute", inset: 0, transform: `translateY(-100px) scale(${lerp(0.9, 1, fk)})`, transformOrigin: `${CX}px ${CY}px` }}>
            <Mark t={99} k={kFinal} left={LEFT_LOCK} />
            <div style={{ position: "absolute", left: 0, right: 0, top: CY + 120, display: "flex", justifyContent: "center", ...type(140, L.ink, { letterSpacing: "-0.035em" }) }}>Prime Studio</div>
            {(() => {
              const r = p(t, Q.click, 0.8, E.out);
              return t > Q.click && r < 1 ? <span style={{ position: "absolute", left: knobCx(LEFT_LOCK, 1) - 160 * r, top: CY - 160 * r, width: 320 * r, height: 320 * r, borderRadius: "50%", border: `4px solid ${L.blue}`, opacity: 1 - r }} /> : null;
            })()}
          </div>
          <Caption y={CY + 300}>
            <Soft t={t} at={Q.tagline} text="Average is not an option." size={58} color={L.ink} />
          </Caption>
          <Caption y={CY + 395}>
            <Soft t={t} at={Q.sub} text="Design & development studio" size={28} color={L.mute} step={0.015} style={{ letterSpacing: "0.08em", textTransform: "uppercase" }} />
          </Caption>
        </div>
      )}

      {/* captions: the story */}
      {t < Q.tPointOut + 0.6 && <Caption><Soft t={t} at={Q.tPoint} text="It starts with a point." out={Q.tPointOut} /></Caption>}
      {t >= Q.tCapsule - 0.1 && t < Q.tCapsuleOut + 0.6 && <Caption><Soft t={t} at={Q.tCapsule} text="A capsule, where every idea begins." out={Q.tCapsuleOut} /></Caption>}
      {t >= Q.tIdea - 0.1 && t < Q.tIdeaOut + 0.6 && <Caption><Soft t={t} at={Q.tIdea} text="Inside it, one idea." out={Q.tIdeaOut} /></Caption>}
      {t >= Q.swap[0] - 0.1 && t < Q.swapOut + 0.6 && (
        <Caption y={1260}>
          {["One switch.", "One motion.", "One idea."].map((s, i) => {
            const nx = Q.swap[i + 1];
            const c = inv.r > 520 ? "#fff" : L.ink;
            return t >= Q.swap[i] - 0.05 && (nx == null || t < nx + 0.4) ? (
              <span key={s} style={{ position: "absolute" }}>
                <Soft t={t} at={Q.swap[i]} text={s} size={72} color={c} out={nx != null ? nx - 0.25 : Q.swapOut} step={0.02} />
              </span>
            ) : null;
          })}
        </Caption>
      )}
      {t >= Q.tO - 0.1 && t < Q.tOOut + 0.6 && <Caption y={1340}><Soft t={t} at={Q.tO} text="Look closely. The switch is the O." out={Q.tOOut} /></Caption>}
      {t >= Q.tBp - 0.1 && t < Q.bpOut + 0.6 && <Caption y={1340}><Soft t={t} at={Q.tBp} text="Built on one geometry." out={Q.bpOut} /></Caption>}
      {t >= Q.tPrime[0] - 0.1 && t < Q.tPrime[1] + 0.3 && <Caption y={1340}><Soft t={t} at={Q.tPrime[0]} text="The capsule is the beginning." out={Q.tPrime[1] - 0.35} /></Caption>}
      {t >= Q.tPrime[1] - 0.1 && t < Q.tPrimeOut + 0.6 && <Caption y={1340}><Soft t={t} at={Q.tPrime[1]} text="Prime is the destination." out={Q.tPrimeOut} /></Caption>}

      <Audio src={staticFile("logo/master.wav")} />
    </AbsoluteFill>
  );
}
