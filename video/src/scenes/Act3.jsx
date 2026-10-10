import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, interpolateColors, staticFile } from "remotion";
import { Dither } from "../lib/Dither";
import { C, clamp01, cue, E, H_, hash, HIT, lerp, MONO, noise3, p, SANS, W, W_ } from "../lib/core";
import { Cursor, display, mono, Pill, Ripple, Scramble, Words } from "../lib/ui";
import { Orb } from "./Act2";

const sat = clamp01;

/* ================================================================== WHY */
const POINTS = [
  { id: "why1", y: 640, lines: [[0, 1, 2], [3, 4, 5]], text: ["Every", "solution", "starts", "with", "a", "purpose."], hot: 5 },
  { id: "why2", y: 880, lines: [[0, 1, 2, 3], [4, 5, 6]], text: ["The", "small", "things", "make", "the", "big", "difference."], hot: 6 },
  { id: "why3", y: 1120, lines: [[0, 1, 2], [3, 4, 5]], text: ["Built", "to", "grow", "with", "your", "business."], hot: 2 },
  { id: "why4", y: 1360, lines: [[0, 1, 2], [3, 4, 5]], text: ["And", "we", "stay", "for", "the", "journey."], hot: 5 },
].map((pt) => ({ ...pt, x: 190, node: [124, pt.y + 14] }));
const START = [124, 560];

export function Why({ t, sc }) {
  const titleK = p(t, sc.start + 0.1, 0.8);
  const nodes = [START, ...POINTS.map((pt) => pt.node)];
  return (
    <AbsoluteFill style={{ background: C.sand }}>
      <div style={{ position: "absolute", left: 80, top: 236, color: C.ink, fontFamily: SANS, fontWeight: 500 }}>
        <div style={{ fontSize: 200, lineHeight: 0.86, letterSpacing: "-0.06em", overflow: "hidden", paddingBottom: "0.08em" }}>
          <div style={{ transform: `translateY(${(1 - titleK) * 110}%)` }}>Why</div>
        </div>
        <div style={{ fontSize: 84, lineHeight: 1, letterSpacing: "-0.04em", overflow: "hidden", paddingBottom: "0.1em" }}>
          <div style={{ transform: `translateY(${(1 - p(t, sc.start + 0.25, 0.8)) * 110}%)` }}>One Prime</div>
        </div>
      </div>
      {/* the journey: the website hero's node field, drawn as a path through the four reasons */}
      <svg width={W_} height={H_} style={{ position: "absolute", inset: 0 }}>
        {POINTS.map((pt, i) => {
          const a = nodes[i];
          const b = nodes[i + 1];
          const at = cue(pt.id).speechStart - 0.42;
          const k = p(t, at, 0.5, E.inOut);
          return <line key={i} x1={a[0]} y1={a[1]} x2={lerp(a[0], b[0], k)} y2={lerp(a[1], b[1], k)} stroke="rgba(8,6,78,0.45)" strokeWidth="2" />;
        })}
        {nodes.map(([x, y], i) => {
          const at = i === 0 ? sc.start + 0.3 : cue(POINTS[i - 1].id).speechStart - 0.02;
          const k = p(t, at, 0.5, E.back);
          return (
            <g key={i} opacity={clamp01(k * 3)}>
              <circle cx={x} cy={y} r={20 * k} fill="rgba(8,6,78,0.1)" />
              <circle cx={x} cy={y} r={8 * k} fill={i === 0 ? C.ink : C.accent} />
              <text x={x + 18} y={y - 18} fontFamily={MONO} fontSize="17" fill={C.stone}>
                {i === 0 ? "0,0" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      {POINTS.map((pt, i) => {
        const c = cue(pt.id);
        const next = POINTS[i + 1] ? cue(POINTS[i + 1].id).speechStart - 0.1 : 99;
        const dim = p(t, next, 0.5, E.inOut);
        return (
          <div key={pt.id} style={{ position: "absolute", left: pt.x, top: pt.y - 6, width: 800, opacity: lerp(1, 0.32, dim) }}>
            <div style={{ ...mono(20, C.accent), marginBottom: 12, opacity: p(t, c.speechStart - 0.1, 0.4) }}>
              {String(i + 1).padStart(2, "0")}
              <span style={{ color: C.stone, marginLeft: 22 }}>
                {pt.node[0] - 540},{960 - pt.node[1]}
              </span>
            </div>
            <div style={display(66, C.ink, { lineHeight: 1.02, letterSpacing: "-0.035em" })}>
              {pt.lines.map((line, li) => (
                <div key={li}>
                  <Words t={t} gap="0.22em" words={line.map((wi) => [pt.text[wi], c.words[wi].t, wi === pt.hot ? { color: C.accent } : undefined])} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ================================================================== SOLVE */
const TANGLE = Array.from({ length: 10 }, (_, i) => {
  const r = (k) => hash(i, k, 77);
  return {
    messy: [120, 380 + r(0) * 600, 120 + r(1) * 840, 300 + r(2) * 760, 120 + r(3) * 840, 300 + r(4) * 760, 960, 380 + r(5) * 600],
    clean: [120, 470 + i * 50, 400, 470 + i * 50, 680, 470 + i * 50, 960, 470 + i * 50],
  };
});
const BTN = { x: 540, y: 880 };

export function Solve({ t, sc }) {
  const w = cue("solve").words;
  const blipsFrom = w[1].t;
  const blipsTo = HIT.one - 0.04;
  const counted = t < blipsFrom ? 0 : Math.min(13, Math.floor(((t - blipsFrom) / (blipsTo - blipsFrom)) * 12 + 1e-6) + 1);
  const n = 14 - counted;
  const isOne = t >= HIT.one;
  const bump = isOne ? Math.exp(-(t - HIT.one) / 0.08) : 0;
  const exitA = p(t, w[4].t - 0.2, 0.35, E.in);
  const tangleIn = p(t, w[4].t - 0.05, 0.55, E.out);
  const straighten = p(t, w[5].t - 0.05, 0.75, E.inOut);
  const flood = p(t, w[6].t - 0.25, 0.65, E.inOut);
  const lightK = p(t, w[6].t + 0.05, 0.35, E.linear);
  const ink = (a) => interpolateColors(lightK, [0, 1], [`rgba(239,237,233,${a})`, `rgba(8,6,78,${a})`]);
  const btn = p(t, HIT.one - 0.02, 0.45, E.back);
  const press = isOne && t < HIT.one + 0.12 ? 0.94 : 1;
  const cur = p(t, HIT.one - 0.55, 0.5, E.inOut);
  return (
    <AbsoluteFill style={{ background: flood >= 0.999 ? C.sand : C.ink }}>
      {flood > 0 && flood < 0.999 && (
        <Dither px={8} color={C.sand} field={(i, j, x, y) => {
          const g = (y / H_) * 0.86 + 0.14 * hash(Math.floor(x / 48), Math.floor(y / 48), 5);
          return sat((flood * 1.3 - g) / 0.13);
        }} />
      )}
      <div style={{ position: "absolute", left: 96, top: 232, ...mono(22, ink(0.6)) }}>
        <Scramble t={t} at={sc.start + 0.25} dur={0.7} text="(06) — Problem, solved" />
      </div>
      {/* 14 → 1 */}
      <div style={{ opacity: 1 - exitA, transform: `translateY(${-exitA * 60}px)` }}>
        {Array.from({ length: 7 }, (_, m) => {
          const k = p(t, sc.start + 0.2 + m * 0.05, 1.5, E.inOut);
          const x = lerp(110 + m * 76, BTN.x - 60, k);
          const y = lerp(380 + m * 60, BTN.y - 40, k);
          return <div key={m} style={{ position: "absolute", left: x, top: y, width: lerp(360, 120, k), height: lerp(250, 80, k), border: "1.5px solid rgba(239,237,233,0.18)", borderRadius: 14, opacity: 1 - k }} />;
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", ...mono(24, "rgba(239,237,233,0.6)") }}>Clicks</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: MONO, fontSize: 300, lineHeight: 1, color: isOne ? C.accent : C.sand, fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.12 * bump})` }}>
          {String(n).padStart(2, "0")}
        </div>
        <div style={{ position: "absolute", left: BTN.x - 170, top: BTN.y - 52, width: 340, height: 104, borderRadius: 999, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, ...display(48, C.sand, { lineHeight: 1 }), opacity: clamp01(btn * 3), transform: `scale(${lerp(0.6, 1, btn) * press})` }}>
          Done <span style={{ fontSize: 40 }}>✓</span>
        </div>
        <Ripple t={t} at={HIT.one} x={BTN.x} y={BTN.y} size={260} color={C.sand} />
        {t > HIT.one - 0.6 && <Cursor x={lerp(960, BTN.x + 40, cur)} y={lerp(1200, BTN.y + 10, cur)} color={C.sand} outline={C.ink} scale={1.2} />}
      </div>
      {/* complex → clear */}
      {t > w[4].t - 0.1 && (
        <svg width={W_} height={H_} style={{ position: "absolute", inset: 0 }}>
          {TANGLE.map((ln, i) => {
            const c = ln.messy.map((v, k) => lerp(v, ln.clean[k], straighten));
            const d = `M${c[0]},${c[1]} C${c[2]},${c[3]} ${c[4]},${c[5]} ${c[6]},${c[7]}`;
            return (
              <path key={i} d={d} fill="none" stroke={i === 4 && straighten > 0.5 ? C.accent : ink(0.75)} strokeWidth={3} pathLength="1" strokeDasharray="1 1" strokeDashoffset={1 - clamp01(tangleIn * 1.3 - i * 0.03)} />
            );
          })}
        </svg>
      )}
      <div style={{ position: "absolute", left: 84, top: 1130, ...display(110, ink(1), { lineHeight: 1 }) }}>
        <Words t={t} gap="0.22em" words={[["Complex,", w[4].t], ["made", w[5].t], ["clear.", w[6].t, { color: C.accent }]]} />
      </div>
      <div style={{ position: "absolute", left: 84, top: 1270, ...display(110, ink(1), { lineHeight: 1 }) }}>
        <Words t={t} gap="0.22em" words={[["For", w[7].t], ["everyone.", w[8].t]]} />
      </div>
      <div style={{ position: "absolute", left: 88, top: 1430, display: "flex", gap: 14 }}>
        {["A", "R", "S", "K", "M", "+"].map((ch, k) => {
          const kk = p(t, w[8].t + k * 0.07, 0.4, E.back);
          const bg = [C.ink, C.accent, C.violet, C.graphite, C.ink, "transparent"][k];
          return (
            <span key={k} style={{ width: 88, height: 88, borderRadius: 44, background: bg, border: k === 5 ? `2px solid ${C.ink}` : "none", display: "flex", alignItems: "center", justifyContent: "center", ...mono(30, k === 5 ? C.ink : C.sand, { letterSpacing: 0 }), transform: `scale(${kk})`, marginLeft: k ? -26 : 0, boxShadow: `0 0 0 5px ${C.sand}` }}>
              {ch}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== the sky (from the posts) */
let SKY = null;
function useSky() {
  const [data, setData] = useState(SKY);
  const [handle] = useState(() => (SKY ? null : delayRender("sky luminance")));
  useEffect(() => {
    if (SKY) {
      if (handle) continueRender(handle);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = 540;
      cv.height = 960;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, 540, 960).data;
      const lum = new Float32Array(540 * 960);
      for (let i = 0; i < lum.length; i++) lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      SKY = lum;
      setData(lum);
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = staticFile("sky.png");
  }, [handle]);
  return data;
}

function Sky({ t, from, develop, glow = 0 }) {
  const lum = useSky();
  const z = 1 + 0.07 * clamp01((t - from) / 11);
  return (
    <>
      <Img src={staticFile("sky.png")} style={{ position: "absolute", left: 0, top: 0, width: W_, height: H_, objectFit: "cover", transform: `scaleX(-1) scale(${z})`, filter: "blur(5px) saturate(1.1)" }} />
      <AbsoluteFill style={{ background: `rgba(8,6,78,${0.58 - 0.12 * glow})` }} />
      {lum && (
        <Dither
          px={6}
          color="#d6e2ff"
          opacity={0.42 + 0.25 * glow}
          field={(i, j, x, y) => {
            const sx = 540 + (x - 540) / z;
            const sy = 960 + (y - 960) / z;
            const ix = Math.min(539, Math.max(0, 539 - Math.floor(sx / 2)));
            const iy = Math.min(959, Math.max(0, Math.floor(sy / 2)));
            const v = (lum[iy * 540 + ix] - 0.27) * 2.6 + (noise3(x * 0.01, y * 0.01, t * 0.5) - 0.5) * 0.15;
            const front = develop * 1.25 - (1 - y / H_) * 0.9 - 0.1 * hash(Math.floor(x / 48), Math.floor(y / 48), 9);
            return Math.min(v, sat(front / 0.15));
          }}
        />
      )}
    </>
  );
}

/* ================================================================== ASK */
function Stack({ t }) {
  const w = cue("cta").words;
  const prime = HIT.prime;
  const k = p(t, prime - 0.02, 0.42, E.out);
  return (
    <div style={{ position: "absolute", left: 62, top: 600, ...display(150, C.paper, { textTransform: "uppercase", lineHeight: 0.9, letterSpacing: "-0.05em" }) }}>
      <div>
        <Words t={t} gap="0.2em" words={[["Let's", w[0].t], ["build", w[1].t]]} />
      </div>
      <div>
        <Words t={t} words={[["Something", w[2].t]]} />
      </div>
      <div style={{ fontSize: 336, lineHeight: 0.86, marginTop: 6, letterSpacing: "-0.06em" }}>
        {t >= prime - 0.02 && (
          <span style={{ display: "inline-block", transform: `scale(${lerp(1.5, 1, k)})`, filter: `blur(${(1 - k) * 18}px)`, transformOrigin: "20% 60%", opacity: clamp01(k * 4) }}>Prime</span>
        )}
      </div>
    </div>
  );
}

const QUESTIONS = [
  { words: [["Have", 0], ["an", 1], ["idea?", 2]] },
  { words: [["A", 3], ["new", 4], ["business?", 5]] },
  { words: [["A", 6], ["system", 7], ["to", 8], ["be", 9], ["built?", 10]] },
  { words: [["A", 11], ["brand", 12], ["that", 13], ["needs", 14], ["a", 15], ["new", 16], ["identity?", 17]] },
];

export function Ask({ t, sc }) {
  const w = cue("ask").words;
  const out = cue("cta").speechStart - 0.35;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sky t={t} from={sc.start} develop={p(t, sc.start - 0.1, 1.0, E.inOut)} />
      <div style={{ position: "absolute", left: 96, top: 232, ...mono(22, "rgba(255,255,255,0.7)") }}>
        <Scramble t={t} at={sc.start + 0.25} dur={0.7} text="(07) — Your move" />
      </div>
      <div style={{ position: "absolute", left: 84, top: 640, width: 900, ...display(76, C.paper, { lineHeight: 1.08, letterSpacing: "-0.04em" }) }}>
        {QUESTIONS.map((q, i) => {
          const at = w[q.words[0][1]].t;
          const k = p(t, at - 0.05, 0.5, E.back);
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 22, marginBottom: 22 }}>
              <span style={{ marginTop: 26, width: 18, height: 18, borderRadius: 9, background: C.accent, flexShrink: 0, transform: `scale(${t >= at - 0.05 ? k * (1 - p(t, out, 0.3, E.in)) : 0})` }} />
              <Words t={t} out={out} gap="0.22em" words={q.words.map(([word, wi]) => [word, w[wi].t])} />
            </div>
          );
        })}
      </div>
      <Stack t={t} />
    </AbsoluteFill>
  );
}

/* ================================================================== CTA + END CARD */
export function Cta({ t, sc }) {
  const prime = HIT.prime;
  const click = prime + 1.6;
  const swap = click + 0.36; // the curtain covers the frame here
  const pill = p(t, prime + 0.65, 0.6, E.back);
  const curK = p(t, prime + 0.85, click - prime - 0.9, E.inOut);
  const press = t >= click && t < click + 0.1 ? 0.94 : 1;
  const glow = Math.exp(-Math.max(0, t - prime) / 0.5);
  const end = t >= swap;
  const knob = p(t, swap + 0.25, 0.55, E.back);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {!end && (
        <>
          <Sky t={t} from={scenesAskStart()} develop={1} glow={glow} />
          <Stack t={t} />
          <div style={{ position: "absolute", left: 84, top: 1330, opacity: clamp01(pill * 2), transform: `translateY(${(1 - pill) * 40}px) scale(${press})`, transformOrigin: "left center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 18, background: C.violet, color: C.paper, borderRadius: 999, padding: "26px 46px 30px", ...display(60, C.paper, { lineHeight: 1, letterSpacing: "-0.035em" }) }}>
              DM One Prime Studio <span style={{ display: "inline-block", transform: `translateX(${Math.sin(t * 6) * 6}px)` }}>→</span>
            </span>
          </div>
          <Ripple t={t} at={click} x={480} y={1380} size={300} color={C.paper} />
          {t > prime + 0.8 && <Cursor x={lerp(1000, 470, curK)} y={lerp(1760, 1385, curK)} color={C.paper} outline={C.ink} scale={1.25} />}
          <div style={{ position: "absolute", left: 88, top: 1500, ...mono(22, "rgba(255,255,255,0.75)") }}>
            <Scramble t={t} at={prime + 0.9} dur={0.8} text="Feel free to message us" />
          </div>
        </>
      )}
      {end && (
        <>
          <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
            <Orb t={t} cx={540} cy={860} r={360} amount={p(t, swap, 1.2)} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", color: C.sand, fontFamily: SANS, fontSize: 118 }}>
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <Pill s={118} k={knob} stroke={C.sand} knob={C.sand} />
              <span style={{ marginLeft: -0.04 * 118, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, overflow: "hidden", padding: "0 0.03em 0.12em", marginBottom: "-0.12em" }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - p(t, swap + 0.35, 0.7)) * 110}%)` }}>ne</span>
              </span>
            </span>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 940, textAlign: "center", ...display(84, C.sand, { lineHeight: 1 }) }}>
            <Words t={t} gap="0.22em" style={{ justifyContent: "center" }} words={[["Prime", swap + 0.5], ["Studio", swap + 0.6]]} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1090, textAlign: "center", ...mono(22, "rgba(239,237,233,0.7)") }}>
            <Scramble t={t} at={swap + 0.55} dur={0.7} text="Design & development studio — Est. 2026" />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", ...mono(22, C.accent) }}>
            <Scramble t={t} at={swap + 0.75} dur={0.7} text="Websites · Apps · CRM · ERP · SaaS · Brand" />
          </div>
        </>
      )}
    </AbsoluteFill>
  );
}

const scenesAskStart = () => W("ask", 0) - 0.3;
export const CTA_SWAP = HIT.prime + 1.6 + 0.36;

