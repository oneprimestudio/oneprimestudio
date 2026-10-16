import { AbsoluteFill, Audio, random, staticFile } from "remotion";
import { Logo, Pill } from "../lib/ui";
import { Goo, Stepped, display } from "../about/kit";
import { Globe } from "../about/Globe";
import { Seam } from "../about/Seam";
import { A, E, END, GUTTER, M, S, SANS, TL, W, clamp01, io, lerp, p, swing, useT } from "./time";
import { Bloom, Grain, Invert, Shockwave, Vignette, camera, splitFilter } from "./fx";

/*
 * One Prime Studio, launch film v2 (1080×1920, 60 fps): problem to solution.
 *   Act 1  night, reverb, handheld: a website nobody finds, a brand that blends in, tools that never
 *          talk, customers walking past; it all collapses into one dot.
 *   Act 2  the dot explodes into white ("Not anymore."), the switch flips on: One Prime Studio.
 *   Act 3  white, cash hits: a brand people remember, a website that brings in leads, systems that
 *          run the business.
 *   Act 4  design, development and software spiral into one point, which blooms into the globe;
 *          arcs out of Hyderabad; the sign-off.
 * Every time comes from src/about2/timeline.json; every hit in the picture is a cue in the mix.
 */

const RAPID = 0.5; // goo duration for this film's headings
const CITIES = [
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Berlin", lat: 52.52, lon: 13.4 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
];
const TOOLS = ["Sheets", "Mail", "Billing", "Calendar", "CRM"];
const tNot = W("turn", 0);

/* ------------------------------------------------------------------ shared pieces */
function Heading({ id, t, lines, size = 104, color = A.ink, top = 250, out }) {
  const o = out == null ? 0 : p(t, out, 0.45, E.prime);
  return (
    <div style={{ position: "absolute", left: GUTTER, top, transform: `translateY(${-o * 260}px)`, opacity: 1 - o }}>
      <Stepped id={id} t={t} size={size} color={color} dur={RAPID} lines={lines} />
    </div>
  );
}

/** a card hanging from a pivot at its top centre: drops in, then swings to rest */
function Hang({ t, at, x, y, w, h, amp = 12, from = -1500, children, style }) {
  const k = p(t, at, 0.55, E.prime);
  const r = swing(t, at + 0.35, amp, 1.4, 2.8);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - k) * from,
        width: w,
        height: h,
        transformOrigin: "50% -40px",
        transform: `rotate(${t < at + 0.35 ? amp * (1 - k) : r}deg)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BrowserCard({ alive = 0, dead = 0, t }) {
  const bar = (w, c = "#e4e3ee") => ({ height: 14, width: w, borderRadius: 7, background: c });
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#fff",
        borderRadius: 22,
        overflow: "hidden",
        boxShadow: "0 60px 120px -50px rgba(0,0,0,0.6)",
        filter: dead ? `grayscale(${dead}) brightness(${1 - 0.55 * dead})` : undefined,
      }}
    >
      <div style={{ height: 58, background: "#f1f0ec", display: "flex", alignItems: "center", gap: 10, padding: "0 22px" }}>
        {["#e5484d", "#f5a524", "#18a058"].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.8 }} />
        ))}
        <span style={{ marginLeft: 18, flex: 1, height: 32, borderRadius: 16, background: "#fff", fontFamily: SANS, fontSize: 19, color: A.stone, display: "flex", alignItems: "center", paddingLeft: 18 }}>
          yourbusiness.com
        </span>
      </div>
      <div style={{ padding: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: A.ink }} />
          <span style={bar(90)} />
          <span style={bar(70)} />
          <span style={bar(80)} />
          <span style={{ marginLeft: "auto", width: 120, height: 36, borderRadius: 18, background: alive ? A.accent : "#d9d8e6" }} />
        </div>
        <div style={{ marginTop: 26, height: 250, borderRadius: 16, background: A.ink, padding: 30, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12 }}>
          {alive ? (
            <>
              <div style={{ ...display(54, "#fff", { letterSpacing: "-0.04em", lineHeight: 0.95 }) }}>Booked out,<br />every week.</div>
              <span style={{ width: 150, height: 40, borderRadius: 20, background: A.accent, marginTop: 8 }} />
            </>
          ) : (
            <>
              <span style={bar(340, "rgba(255,255,255,0.85)")} />
              <span style={bar(250, "rgba(255,255,255,0.5)")} />
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 22 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, height: 150, borderRadius: 14, background: `linear-gradient(160deg, ${["#c9d7ff", "#e8e6f5", "#dfe8ff"][i]}, #f6f6fb)` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** a notification chip */
function Note({ t, at, text, y }) {
  const k = p(t, at, 0.45, E.prime);
  if (t < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 40,
        top: y,
        transform: `translateX(${(1 - k) * 700}px) rotate(${swing(t, at + 0.2, 7, 1.8, 3.5) * (k >= 1 ? 1 : 0)}deg)`,
        transformOrigin: "100% 0%",
        background: "#fff",
        borderRadius: 22,
        padding: "22px 30px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 30px 60px -24px rgba(8,6,78,0.45), 0 0 0 1.5px rgba(8,6,78,0.06)",
        fontFamily: SANS,
        fontWeight: 500,
        fontSize: 34,
        letterSpacing: "-0.02em",
        color: A.ink,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 11, background: A.money, transform: `scale(${p(t, at + 0.15, 0.4, E.back)})` }} />
      {text}
      <span style={{ fontWeight: 400, fontSize: 26, color: A.stone, marginLeft: 8 }}>now</span>
    </div>
  );
}

/** the grid of identical marks (Act 1 "blends in", Act 3 "remember") */
const GRID = { cols: 5, rows: 6, step: 176, x0: 540 - 2 * 176, y0: 640 };
const YOURS = 17;
const perm = (seed) => {
  const idx = [...Array(30).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(random(`${seed}${i}`) * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
};
const P1 = perm("a");
const P2 = perm("b");
const cell = (k) => [GRID.x0 + (k % GRID.cols) * GRID.step, GRID.y0 + Math.floor(k / GRID.cols) * GRID.step];

/* ------------------------------------------------------------------ ACT 1 */
function SitePage({ t }) {
  const t0 = W("p1", 0);
  const search = W("p2", 0) - 0.12;
  const dies = W("p2", 3);
  const dead = p(t, dies, 0.5, E.out);
  const typed = "best studio near me";
  const n = Math.round(clamp01((t - search - 0.1) / 0.5) * typed.length);
  return (
    <AbsoluteFill>
      <Heading id="p1" t={t} color="#fff" lines={[["Your website", 0, W("p1", 0) - 0.05], ["looks fine.", "1.2em", W("p1", 2) - 0.05]]} />
      <Hang t={t} at={0.7} x={130} y={640} w={820} h={640} amp={10}>
        <div style={{ width: "100%", height: "100%", transform: `translateY(${dead * 60}px) rotate(${dead * 4}deg)`, opacity: 1 - 0.5 * dead }}>
          <BrowserCard dead={dead} t={t} />
        </div>
      </Hang>
      {t > search && (
        <div style={{ position: "absolute", left: 90, right: 90, top: 560, opacity: p(t, search, 0.25) }}>
          <div style={{ height: 96, borderRadius: 48, background: "#fff", display: "flex", alignItems: "center", gap: 20, padding: "0 36px", boxShadow: "0 40px 80px -30px rgba(0,0,0,0.7)", fontFamily: SANS, fontSize: 40, color: A.ink }}>
            <svg width="34" height="34" viewBox="0 0 24 24"><circle cx="10" cy="10" r="7" fill="none" stroke={A.ink} strokeWidth="2.5" /><path d="M15 15l6 6" stroke={A.ink} strokeWidth="2.5" /></svg>
            {typed.slice(0, n)}
            <span style={{ width: 3, height: 44, background: A.accent, opacity: Math.floor(t * 4) % 2 }} />
          </div>
          <div style={{ marginTop: 18, height: 560, overflow: "hidden", borderRadius: 26 }}>
            <div style={{ transform: `translateY(${-Math.max(0, t - W("p2", 2)) * 1400}px)` }}>
              {[...Array(14)].map((_, i) => (
                <div key={i} style={{ height: 120, marginBottom: 14, borderRadius: 22, background: "rgba(255,255,255,0.1)", padding: "24px 30px", boxSizing: "border-box" }}>
                  <div style={{ width: 260 + ((i * 97) % 300), height: 18, borderRadius: 9, background: "rgba(143,176,255,0.75)" }} />
                  <div style={{ marginTop: 16, width: 520 - ((i * 53) % 200), height: 14, borderRadius: 7, background: "rgba(255,255,255,0.3)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Heading id="p2" t={t} top={1480} size={96} color="#fff" lines={[["But nobody", 0, W("p2", 0) - 0.05], ["finds it.", "1.6em", W("p2", 2) - 0.05, { color: A.alarm }]]} />
    </AbsoluteFill>
  );
}

function BrandPage({ t }) {
  const tb = W("p3", 2);
  const k1 = p(t, tb, 0.25, E.prime);
  const k2 = p(t, tb + 0.3, 0.25, E.prime);
  const lost = p(t, tb + 0.1, 0.4);
  const enter = p(t, S("brand").start, 0.45, E.out);
  return (
    <AbsoluteFill>
      <Heading id="p3" t={t} color="#fff" lines={[["Your brand", 0, W("p3", 0) - 0.05], ["blends in.", "1.3em", W("p3", 2) - 0.05]]} />
      {[...Array(30)].map((_, i) => {
        const a = cell(i);
        const b = cell(P1[i]);
        const c = cell(P2[i]);
        const x = lerp(lerp(a[0], b[0], k1), c[0], k2);
        const y = lerp(lerp(a[1], b[1], k1), c[1], k2) + (1 - enter) * (300 + (i % 5) * 60);
        const mine = i === YOURS;
        return (
          <div key={i} style={{ position: "absolute", left: x - 62, top: y - 62, width: 124, height: 124, borderRadius: 30, background: "rgba(255,255,255,0.12)", display: "grid", placeItems: "center", boxShadow: mine ? `0 0 0 ${5 * (1 - lost)}px rgba(47,107,255,${1 - lost})` : undefined, opacity: enter }}>
            <span style={{ width: 46, height: 46, borderRadius: 23, background: "rgba(255,255,255,0.35)" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

const ring = (i, R, cx = 540, cy = 1080) => {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
};

function ToolsPage({ t }) {
  const t0 = S("tools").start;
  const snaps = [W("p4", 3), W("p4", 4), W("p4", 6), W("p4", 6) + 0.12, W("p4", 6) + 0.22];
  const drift = p(t, W("p4", 6) + 0.3, 1.6, E.out);
  const R = 330 + drift * 80;
  return (
    <AbsoluteFill>
      <Heading id="p4" t={t} size={92} color="#fff" lines={[["Your tools don't", 0, W("p4", 0) - 0.05], ["talk to each other.", "0.5em", W("p4", 3) - 0.05]]} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {TOOLS.map((_, i) => {
          const a = ring(i, R);
          const b = ring((i + 1) % 5, R);
          const g = p(t, snaps[i], 0.35, E.out);
          const draw = p(t, t0 + 0.6 + i * 0.08, 0.4, E.out);
          const red = t > snaps[i] && t < snaps[i] + 0.18;
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2;
          const half = (q, from) => [lerp(from[0], mx, q), lerp(from[1], my, q)];
          const e1 = half(draw * (1 - 0.8 * g), a);
          const e2 = half(draw * (1 - 0.8 * g), b);
          const col = red ? A.alarm : "rgba(255,255,255,0.55)";
          return (
            <g key={i}>
              <line x1={a[0]} y1={a[1]} x2={e1[0]} y2={e1[1]} stroke={col} strokeWidth={3} strokeDasharray="10 10" />
              <line x1={b[0]} y1={b[1]} x2={e2[0]} y2={e2[1]} stroke={col} strokeWidth={3} strokeDasharray="10 10" />
            </g>
          );
        })}
      </svg>
      {TOOLS.map((name, i) => {
        const [x, y] = ring(i, R);
        const at = t0 + 0.05 + i * 0.08;
        return (
          <Hang key={name} t={t} at={at} x={x - 115} y={y - 70} w={230} h={140} amp={14}>
            <div style={{ width: "100%", height: "100%", borderRadius: 24, background: "rgba(255,255,255,0.1)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.18)", display: "grid", placeItems: "center", fontFamily: SANS, fontWeight: 500, fontSize: 38, letterSpacing: "-0.02em", color: "#fff" }}>
              {name}
            </div>
          </Hang>
        );
      })}
    </AbsoluteFill>
  );
}

function WalkPage({ t }) {
  const t0 = S("walk").start;
  const col = p(t, M("turn.collapse"), 0.8, E.prime);
  const beats = [0, 0.2, 0.8, 1.0, 1.78, 1.98].map((b) => t0 + b);
  const flat = END("p5") + 0.2;
  // the ECG: the last 2.4 s of signal scrolling right to left
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const x = GUTTER + (i / 160) * 952;
    const tau = t - (1 - i / 160) * 2.4;
    let y = 0;
    if (tau < flat) for (const b of beats) {
      const d = tau - b;
      if (d > 0 && d < 0.14) y -= Math.sin((d / 0.14) * Math.PI) * (b - t0 < 0.5 ? 120 : b - t0 < 1.5 ? 80 : 50) * (Math.round((b - t0) * 10) % 2 ? 0.5 : 1);
    }
    pts.push(`${x.toFixed(1)},${(1500 + y).toFixed(1)}`);
  }
  return (
    <AbsoluteFill style={{ transform: `scale(${1 - col * 0.995})`, transformOrigin: "540px 960px", opacity: col > 0.97 ? 0 : 1 }}>
      <Heading id="p5" t={t} size={96} color="#fff" lines={[["And every day,", 0, W("p5", 0) - 0.05], ["customers", "0.6em", W("p5", 3) - 0.05], ["walk past.", "1.4em", W("p5", 4) - 0.05]]} />
      {/* the doorway */}
      <div style={{ position: "absolute", left: 450, top: 800, width: 180, height: 330, background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(143,176,255,0.5))", boxShadow: "0 0 120px 30px rgba(143,176,255,0.25)", opacity: 1 - 0.6 * p(t, flat, 1) }} />
      <div style={{ position: "absolute", left: 300, right: 300, top: 1130, height: 2, background: "rgba(255,255,255,0.3)" }} />
      {/* people flowing past */}
      {[...Array(22)].map((_, i) => {
        const speed = 300 + random(`s${i}`) * 220;
        const x = ((t - t0) * speed + random(`x${i}`) * 1400) % 1400 - 160;
        const near = Math.exp(-(((x - 540) / 120) ** 2));
        const y = 1180 + random(`y${i}`) * 140 - near * 18;
        return <span key={i} style={{ position: "absolute", left: x, top: y, width: 22, height: 22, borderRadius: 11, background: "#fff", opacity: 0.85 }} />;
      })}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <polyline points={pts.join(" ")} fill="none" stroke={t > flat ? A.alarm : "#8fb0ff"} strokeWidth={4} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ ACT 2 */
function TurnPage({ t }) {
  const boom = p(t, tNot, 0.35, E.out);
  const one = W("name", 2);
  const nameAt = W("name", 0) - 0.3;
  const lock = p(t, nameAt + 0.1, 0.6, E.back);
  return (
    <AbsoluteFill style={{ background: A.night }}>
      {t < tNot + 0.01 && <span style={{ position: "absolute", left: 531, top: 951, width: 18, height: 18, borderRadius: 9, background: "#fff", transform: `scale(${1 + 0.6 * Math.sin(t * 30) ** 2})` }} />}
      <AbsoluteFill style={{ background: A.paper, clipPath: `circle(${boom * 2300}px at 540px 960px)` }}>
        <Shockwave t={t} at={tNot} color={A.ink} />
        <div style={{ position: "absolute", left: GUTTER, top: 640, transform: `translateY(${-p(t, nameAt, 0.5, E.prime) * 1400}px)` }}>
          {[["Not", 0, tNot - 0.03], ["anymore.", "0.6em", W("turn", 1) - 0.05]].map(([text, indent, at], i) => (
            <div key={i} style={{ paddingLeft: indent, transformOrigin: "0% 100%", transform: `rotate(${swing(t, at + 0.2, i ? -6 : 6, 1.6, 3)}deg)`, ...display(200), height: "0.92em", whiteSpace: "nowrap" }}>
              <Goo id={`not${i}`} t={t} at={at} dur={0.4}>
                {text}
              </Goo>
            </div>
          ))}
        </div>
        {/* the switch's bloom on "One" */}
        <div style={{ position: "absolute", left: -160, top: -40, width: 1400, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(47,107,255,0.35), rgba(47,107,255,0) 60%)", opacity: io(t, one - 0.05, 0.12, one + 0.2, 1.4, E.out, E.out) }} />
        {t > nameAt && (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", transformOrigin: "50% -200px", transform: `translateY(${(1 - lock) * -900}px) rotate(${swing(t, nameAt + 0.5, 9, 1.3, 2.4)}deg)` }}>
              <Logo s={170} k={p(t, one - 0.04, 0.45, E.back)} color={A.ink} words={false} t={t} neAt={one + 0.05} />
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 810, textAlign: "center", ...display(150) }}>
              <Goo id="ps2" t={t} at={W("name", 3) - 0.08} dur={RAPID}>
                Prime Studio
              </Goo>
            </div>
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ ACT 3 */
function SolPage({ t }) {
  const t0 = S("sol").start;
  const aOut = W("s2", 0) - 0.3;
  const bOut = W("s3", 0) - 0.3;
  const rem = W("s1", 3);
  const grow = p(t, rem - 0.05, 0.6, E.prime);
  const ka = p(t, aOut, 0.5, E.prime);
  const kb = p(t, bOut, 0.5, E.prime);
  const notes = M("sol.notes");
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      {/* s1: yours stands out of the wall */}
      {ka < 1 && (
        <AbsoluteFill style={{ transform: `translateY(${-ka * 1920}px)` }}>
          <Heading id="s1" t={t} lines={[["A brand people", 0, W("s1", 0) - 0.05], ["remember.", "1.1em", W("s1", 3) - 0.05, { color: A.accent }]]} />
          {[...Array(30)].map((_, i) => {
            const [cx, cy] = cell(i);
            const mine = i === YOURS;
            const enter = p(t, t0 + 0.05 + (i % 7) * 0.025, 0.4, E.out);
            if (mine) {
              const s = lerp(1, 3.3, grow);
              const x = lerp(cx, 540, grow);
              const y = lerp(cy, 1120, grow);
              return (
                <div key={i} style={{ position: "absolute", left: x - 62, top: y - 62, width: 124, height: 124, borderRadius: 30, background: A.ink, display: "grid", placeItems: "center", transform: `scale(${s}) rotate(${grow > 0 ? swing(t, rem + 0.4, 10, 1.5, 2.6) : 0}deg)`, boxShadow: `0 ${30 * grow}px ${60 * grow}px -20px rgba(8,6,78,0.5)`, zIndex: 2, opacity: enter }}>
                  <span style={{ width: 46, height: 46, borderRadius: 23, background: A.accent, transform: `scale(${1 + 0.15 * Math.sin(t * 8) * grow})` }} />
                </div>
              );
            }
            const fall = p(t, rem + (i % 6) * 0.03, 0.6, E.in);
            return (
              <div key={i} style={{ position: "absolute", left: cx - 62, top: cy - 62 + fall * 1300, width: 124, height: 124, borderRadius: 30, background: A.chalk, boxShadow: `inset 0 0 0 1.5px ${A.rule}`, display: "grid", placeItems: "center", transform: `rotate(${fall * (random(`r${i}`) - 0.5) * 120}deg)`, opacity: enter }}>
                <span style={{ width: 46, height: 46, borderRadius: 23, background: "#dcdbe6" }} />
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      {/* s2: the website, alive, and the enquiries pouring in */}
      {t > aOut && kb < 1 && (
        <AbsoluteFill style={{ transform: `translateY(${(1 - ka) * 1920 - kb * 1920}px)` }}>
          <Heading id="s2" t={t} lines={[["A website that", 0, W("s2", 0) - 0.05], ["brings in leads.", "0.6em", W("s2", 3) - 0.05, { color: A.accent }]]} />
          <Hang t={t} at={aOut + 0.15} x={90} y={640} w={820} h={640} amp={-9} from={-1200}>
            <BrowserCard alive={1} t={t} />
          </Hang>
          <Note t={t} at={notes} text="New enquiry" y={1180} />
          <Note t={t} at={notes + TL.beat} text="New booking" y={1310} />
          <Note t={t} at={notes + 2 * TL.beat} text="New order" y={1440} />
        </AbsoluteFill>
      )}
      {/* s3: the tools lock into one hub */}
      {t > bOut && (
        <AbsoluteFill style={{ transform: `translateY(${(1 - kb) * 1920}px)` }}>
          <Heading id="s3" t={t} size={84} lines={[["Systems that run", 0, W("s3", 0) - 0.05], ["your business for you.", "0.3em", W("s3", 3) - 0.05, { color: A.accent }]]} />
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            {TOOLS.map((_, i) => {
              const [x, y] = ring(i, 360, 540, 1120);
              const d = p(t, W("s3", 0) + i * 0.06, 0.35, E.out);
              const ex = lerp(540, x, d);
              const ey = lerp(1120, y, d);
              const q = ((t - W("s3", 0) - 0.4 - i * 0.13) * 1.4) % 1;
              return (
                <g key={i}>
                  <line x1={540} y1={1120} x2={ex} y2={ey} stroke={A.ink} strokeWidth={4} />
                  {d >= 1 && q > 0 && <circle cx={lerp(540, x, q)} cy={lerp(1120, y, q)} r={9} fill={A.accent} />}
                </g>
              );
            })}
          </svg>
          {TOOLS.map((name, i) => {
            const [x, y] = ring(i, 360, 540, 1120);
            const ok = W("s3", 4) + i * 0.07;
            return (
              <Hang key={name} t={t} at={bOut + 0.2 + i * 0.06} x={x - 115} y={y - 70} w={230} h={140} amp={12}>
                <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 24, background: "#fff", boxShadow: "0 24px 50px -24px rgba(8,6,78,0.45), inset 0 0 0 1.5px rgba(8,6,78,0.08)", display: "grid", placeItems: "center", fontFamily: SANS, fontWeight: 500, fontSize: 38, letterSpacing: "-0.02em", color: A.ink }}>
                  {name}
                  <span style={{ position: "absolute", right: -14, top: -14, width: 40, height: 40, borderRadius: 20, background: A.money, display: "grid", placeItems: "center", transform: `scale(${p(t, ok, 0.4, E.back)})` }}>
                    <svg width="20" height="20" viewBox="0 0 14 14"><path d="M2.5 7.5L5.7 10.5L11.5 3.8" fill="none" stroke="#fff" strokeWidth="2.4" /></svg>
                  </span>
                </div>
              </Hang>
            );
          })}
          <div style={{ position: "absolute", left: 540 - 96, top: 1120 - 50, transform: `scale(${p(t, bOut + 0.3, 0.5, E.back)})` }}>
            <Pill s={110} k={p(t, W("s3", 0), 0.45, E.back)} stroke={A.ink} knob={A.ink} fill="#fff" />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ ACT 4 */
function OnePage({ t }) {
  const words = [["Design", W("o1", 0)], ["Development", W("o1", 1)], ["Software", W("o1", 3)]];
  const a0 = W("o2", 0) - 0.1;
  const one = W("o2", 2);
  const a = clamp01((t - a0) / (one - a0));
  const ab = a * a; // accelerating into the point
  const C = [540, 1150];
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <Heading id="o1" t={t} size={88} out={a0} lines={[["Design,", 0, W("o1", 0) - 0.05], ["development", "0.8em", W("o1", 1) - 0.05], ["and software.", "0.3em", W("o1", 3) - 0.05]]} />
      {t > a0 && <Heading id="o2" t={t} size={150} top={300} lines={[["Built", 0, W("o2", 0) - 0.03], ["as one.", "0.9em", W("o2", 1) - 0.03, { color: A.accent }]]} />}
      {t < one + 0.02 &&
        words.map(([name, at], i) => {
          const fan = [540 + (i - 1) * 250, 1150 + Math.abs(i - 1) * 40];
          const ang0 = Math.atan2(fan[1] - C[1], fan[0] - C[0]) + (i === 1 ? Math.PI / 2 : 0);
          const r0 = Math.max(160, Math.hypot(fan[0] - C[0], fan[1] - C[1]));
          const ang = ang0 + ab * 9;
          const r = r0 * (1 - ab);
          const x = a > 0 ? C[0] + Math.cos(ang) * r : fan[0];
          const y = a > 0 ? C[1] + Math.sin(ang) * r : fan[1];
          const k = p(t, at - 0.05, 0.5, E.prime);
          if (t < at - 0.05) return null;
          return (
            <div
              key={name}
              style={{
                position: "absolute",
                left: x - 190,
                top: y - 237 + (1 - k) * -1500,
                width: 380,
                height: 475,
                background: A.ink,
                transformOrigin: a > 0 ? "50% 50%" : "50% -40px",
                transform: a > 0 ? `rotate(${ab * 540 + (i - 1) * 6}deg) scale(${1 - 0.95 * ab})` : `rotate(${(i - 1) * 6 + swing(t, at + 0.3, 14, 1.5, 2.8)}deg)`,
                filter: a > 0.2 ? `blur(${a * 7}px)` : undefined,
                boxShadow: "0 40px 80px -40px rgba(8,6,78,0.6)",
                padding: 36,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                color: "#fff",
              }}
            >
              <span style={{ position: "absolute", left: 36, top: 36, width: 18, height: 18, borderRadius: 9, background: A.accent }} />
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: name.length > 8 ? 50 : 60, letterSpacing: "-0.04em" }}>{name}</span>
            </div>
          );
        })}
      {t >= one - 0.02 && <span style={{ position: "absolute", left: C[0] - 10, top: C[1] - 10, width: 20, height: 20, borderRadius: 10, background: A.ink }} />}
    </AbsoluteFill>
  );
}

function WherePage({ t }) {
  const t0 = S("where").start;
  const hyd = W("w1", 2);
  const every = M("where.arcs");
  const bloom = p(t, t0 - 0.2, 0.9, E.back);
  let view = { lat: 6, lon: 20 + (t - t0) * 16 };
  const ks = p(t, hyd - 0.4, 0.9, E.prime);
  view = { lat: lerp(view.lat, 14, ks), lon: lerp(view.lon, 74 + Math.max(0, t - hyd - 0.5) * 3, ks) };
  const ke = p(t, every, 2.2, E.io);
  view = { lat: lerp(view.lat, 26, ke), lon: lerp(view.lon, -18, ke) };
  const fired = CITIES.map((c, i) => every + 0.12 + i * (TL.bar / 16) * 1.5);
  const routes = CITIES.map((to, i) => {
    const at = fired[i];
    const draw = p(t, at, 0.6, E.out);
    return { to, draw, label: p(t, at + 0.5, 0.45, E.out), pulse: draw >= 1 ? ((t - at - 0.6) * 0.8) % 1 : 0 };
  }).filter((q) => q.draw > 0);
  const zoom = 1 + 0.09 * Math.exp(-Math.max(0, t - every) / 0.12) * (t >= every ? 1 : 0);
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <Heading id="w" t={t} size={92} top={280} lines={[["Based in", 0, W("w1", 0) - 0.05], ["Hyderabad, India.", "0.7em", hyd - 0.05], ["And everywhere.", "0.2em", every - 0.05, { color: A.accent }]]} />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${lerp(0.03, 1, bloom) * zoom}) rotate(${(1 - bloom) * -40}deg)`, transformOrigin: "540px 1150px" }}>
        <Globe view={view} size={820} cx={540} cy={1150} routes={routes} home={p(t, hyd, 0.55, E.back)} rings={1} reveal={p(t, t0, 0.8, E.menu)} time={t} />
      </div>
    </AbsoluteFill>
  );
}

function SignPage({ t }) {
  const one = W("sign", 0);
  const cta = M("sign.cta");
  const hover = p(t, cta - 0.45, 0.6, E.prime);
  const end = p(t, TL.duration - 1.2, 0.7, E.prime);
  const pill = p(t, S("sign").start + 0.25, 0.5, E.back);
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - end, transform: `scale(${1 - 0.04 * end})` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", transformOrigin: "50% -300px", transform: `scale(${lerp(0.6, 1, pill)}) rotate(${swing(t, S("sign").start + 0.5, 7, 1.4, 2.6)}deg)`, opacity: clamp01(pill * 3) }}>
          <Logo s={92} k={p(t, one - 0.04, 0.45, E.back)} color={A.ink} t={t} neAt={one + 0.05} wordsAt={W("sign", 1) - 0.05} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 930, textAlign: "center", ...display(60, A.stone, { letterSpacing: "-0.03em", lineHeight: 1.1 }) }}>
          {["Average", "is", "not", "an", "option."].map((w, i) => {
            const k = p(t, W("sign", 3 + i) - 0.05, 0.4, E.back);
            return (
              <span key={w} style={{ display: "inline-block", margin: "0 0.12em", opacity: clamp01(k), transform: `translateY(${(1 - k) * 0.6}em)` }}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1160, display: "flex", justifyContent: "center", opacity: p(t, END("sign") - 0.3, 0.4), transform: `translateY(${(1 - p(t, END("sign") - 0.3, 0.5, E.back)) * 40}px) scale(${1 - 0.04 * io(t, cta, 0.06, cta + 0.06, 0.2, E.out, E.out)})` }}>
          <div style={{ position: "relative", border: `2px solid ${A.ink}`, borderRadius: 999, padding: "26px 46px", overflow: "hidden", fontFamily: SANS, fontWeight: 500, fontSize: 40, letterSpacing: "-0.02em", color: A.ink }}>
            <span>Start a project&nbsp;&nbsp;→</span>
            <div style={{ position: "absolute", inset: 0, background: A.ink, clipPath: `inset(0 ${(1 - hover) * 100}% 0 0)`, color: "#fff", padding: "26px 46px", boxSizing: "border-box", whiteSpace: "nowrap" }}>
              Start a project&nbsp;&nbsp;<span style={{ display: "inline-block", transform: `translateX(${hover * 8}px)` }}>→</span>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1320, textAlign: "center", fontFamily: SANS, fontSize: 36, letterSpacing: "-0.01em", color: A.graphite }}>
          <Goo id="mail2" t={t} at={cta + 0.15} dur={RAPID}>
            hello@oneprimestudio.com
          </Goo>
        </div>
      </div>
      <span style={{ position: "absolute", left: 531, top: 951, width: 18, height: 18, borderRadius: 9, background: A.ink, transform: `scale(${p(t, TL.duration - 0.8, 0.4, E.back)})` }} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ the film */
const PAGES = { site: SitePage, brand: BrandPage, tools: ToolsPage, walk: WalkPage, turn: TurnPage, sol: SolPage, one: OnePage, where: WherePage, sign: SignPage };
const DARK = new Set(["site", "brand", "tools", "walk"]);

export function Film2() {
  const t = useT();
  const sc = TL.scenes.findLast((s) => t >= s.start) ?? TL.scenes[0];
  const Page = PAGES[sc.id];
  // Act 1 cuts: a fast push through black between the problems
  const cutIn = DARK.has(sc.id) && sc.id !== "site" ? p(t, sc.start, 0.35, E.out) : 1;
  const dark = DARK.has(sc.id) || (sc.id === "turn" && t < tNot + 0.2);
  return (
    <AbsoluteFill style={{ background: dark ? A.night : A.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: camera(t, tNot), filter: splitFilter(t) }}>
        <AbsoluteFill style={{ transform: `scale(${lerp(1.12, 1, cutIn)})`, opacity: cutIn, filter: cutIn < 1 ? `blur(${(1 - cutIn) * 10}px)` : undefined }}>
          <Page t={t} />
        </AbsoluteFill>
      </AbsoluteFill>
      {dark && <Vignette />}
      {dark && <Grain t={t} />}
      <Bloom t={t} at={tNot} k={0.9} />
      <Bloom t={t} at={W("o2", 2)} k={0.85} />
      <Bloom t={t} at={W("w2", 3)} k={0.5} />
      <Bloom t={t} at={W("name", 2)} k={0.35} color={A.accent} />
      <Invert t={t} />
      <Seam t={t} start={M("sign.seam")} />
      <Audio src={staticFile("about2/master.wav")} />
    </AbsoluteFill>
  );
}
