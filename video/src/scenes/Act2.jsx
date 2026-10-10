import { AbsoluteFill, interpolateColors } from "remotion";
import { Dither } from "../lib/Dither";
import { C, clamp01, cue, E, hash, lerp, level, noise3, p, SANS, smooth } from "../lib/core";
import { display, mono, Pill, Rise, Scramble, Words } from "../lib/ui";


/* ------------------------------------------------------------------ SDF helpers (px) */
const sdRoundBox = (x, y, hw, hh, r) => {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const sdCircle = (x, y, r) => Math.hypot(x, y) - r;
const fillOf = (d, soft = 2) => smooth(soft, -soft, d);
const lineOf = (d, w, soft = 2) => smooth(w + soft, w - soft, Math.abs(d));

/* ------------------------------------------------------------------ the ElevenLabs-style orb */
function Orb({ t, cx, cy, r, color = C.accent, amount = 1, px = 7 }) {
  const v = level("voice", t);
  const e = level("energy", t);
  return (
    <Dither
      px={px}
      color={color}
      left={cx - r * 1.6}
      top={cy - r * 1.6}
      width={r * 3.2}
      height={r * 3.2}
      field={(i, j, x, y) => {
        const dx = (x - cx) / r;
        const dy = (y - cy) / r;
        const ang = Math.atan2(dy, dx);
        const wob = 1 + 0.1 * Math.sin(ang * 3 + t * 1.3) * (0.4 + v) + 0.07 * (noise3(Math.cos(ang) * 1.4 + 3, Math.sin(ang) * 1.4, t * 0.8) - 0.5);
        const rr = Math.hypot(dx, dy) / wob;
        const core = Math.exp(-rr * rr * 1.6);
        const rim = Math.exp(-((rr - 0.92) ** 2) / 0.006) * (0.35 + 0.65 * v);
        const swirl = noise3(dx * 2 + t * 0.4, dy * 2, t * 0.5) - 0.5;
        return (core * (0.42 + 0.35 * v + 0.15 * e) + rim * 0.6 + swirl * 0.25 * core) * amount;
      }}
    />
  );
}

/* ================================================================== INTRO */
export function Intro({ t, sc }) {
  const w = cue("intro").words;
  const move = p(t, sc.start, 0.6, E.menu);
  // the pill arrives from the switch (s 320 at the frame centre) and becomes the "O" of the lockup
  const S0 = 320;
  const S1 = 150;
  const s = lerp(S0, S1, move);
  const lockW = 1.75 * S1 + 1.13 * S1 - 0.04 * S1; // pill + "ne"
  const x1 = 540 - lockW / 2;
  const cx = lerp(540 - 0.875 * S0, x1, move);
  const cy = lerp(900, 600, move) - 0.45 * s;
  const col = p(t, sc.start, 0.35, E.linear);
  const stroke = interpolateColors(col, [0, 1], [C.accent, C.ink]);
  const fill = interpolateColors(col, [0, 1], ["rgba(47,107,255,1)", "rgba(47,107,255,0)"]);
  const knob = interpolateColors(col, [0, 1], [C.sand, C.ink]);
  const ne = p(t, w[0].t - 0.05, 0.7);
  const orb = p(t, sc.start + 0.1, 1.2, E.out);
  const line = (words, from, style) => words.map((word, i) => [word, w[from + i].t, style?.[i]]);
  const underline = p(t, w[11].t + 0.75, 0.6, E.prime);
  return (
    <AbsoluteFill style={{ background: C.sand }}>
      <div style={{ opacity: 0.55 * orb, transform: `scale(${lerp(0.6, 1, orb)})`, transformOrigin: "540px 640px", position: "absolute", inset: 0 }}>
        <Orb t={t} cx={540} cy={640} r={330} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 232, ...mono(22, C.graphite) }}>
        <Scramble t={t} at={sc.start + 0.3} dur={0.7} text="(02) — Introducing" />
      </div>
      {/* lockup */}
      <div style={{ position: "absolute", left: cx, top: cy, display: "flex", alignItems: "center", color: C.ink, fontFamily: SANS, fontSize: S1 }}>
        <Pill s={s} k={1} stroke={stroke} fill={fill} knob={knob} />
        <span style={{ display: "inline-block", overflow: "hidden", marginLeft: -0.04 * S1, padding: "0 0.03em 0.12em", marginBottom: "-0.12em", opacity: move > 0.6 ? 1 : 0 }}>
          <span style={{ display: "inline-block", fontWeight: 500, letterSpacing: "-0.04em", transform: `translateY(${(1 - ne) * 110}%)` }}>ne</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...display(96, C.ink, { lineHeight: 1 }) }}>
        <Words t={t} gap="0.22em" style={{ justifyContent: "center" }} words={[["Prime", w[1].t], ["Studio", w[2].t]]} />
      </div>
      <div style={{ position: "absolute", left: 80, top: 1030, ...display(80, C.ink, { lineHeight: 1.0 }) }}>
        <div>
          <Words t={t} gap="0.22em" words={line(["A", "design", "&", "development"], 3)} />
        </div>
        <div>
          <Words t={t} gap="0.22em" words={line(["studio,", "built", "on"], 7)} />
        </div>
        <div style={{ position: "relative", display: "inline-block" }}>
          <Words t={t} gap="0.22em" words={line(["one", "belief."], 10, [undefined, { color: C.accent }])} />
          <span style={{ position: "absolute", left: 0, right: 0, bottom: -10, height: 6, background: C.accent, transform: `scaleX(${underline})`, transformOrigin: "left" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 84, top: 1440, ...mono(21, C.graphite) }}>
        <Scramble t={t} at={w[6].t} dur={0.9} text="Design & development studio — Est. 2026" />
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== BELIEF */
function Slam({ t, at, children, style }) {
  const k = p(t, at - 0.02, 0.38, E.out);
  if (t < at - 0.02) return <span style={{ opacity: 0, ...style }}>{children}</span>;
  return (
    <span style={{ display: "inline-block", transform: `scale(${lerp(1.55, 1, k)}) translateY(${(1 - k) * 18}%)`, filter: `blur(${(1 - k) * 16}px)`, opacity: clamp01(k * 4), transformOrigin: "30% 60%", ...style }}>
      {children}
    </span>
  );
}
export function Belief({ t, sc }) {
  const w = cue("belief").words;
  const strike = p(t, w[4].t + 0.32, 0.5, E.prime);
  const zoom = 1 + 0.04 * clamp01((t - sc.start) / (sc.end - sc.start));
  const k = level("kick", t);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Dither
        px={10}
        color={C.haze}
        field={(i, j, x, y) => (noise3(x * 0.004, y * 0.004, t * 0.6) - 0.35) * (0.5 + 1.1 * k)}
      />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <div style={{ position: "absolute", left: 60, top: 470, ...display(200, C.sand, { lineHeight: 0.86, textTransform: "uppercase", letterSpacing: "-0.05em" }) }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Slam t={t} at={w[0].t}>Average</Slam>
            <span style={{ position: "absolute", left: -10, right: -10, top: "47%", height: 24, background: C.accent, transform: `scaleX(${strike})`, transformOrigin: "left" }} />
          </div>
          <div style={{ display: "flex", gap: "0.24em" }}>
            <Slam t={t} at={w[1].t}>Is</Slam>
            <Slam t={t} at={w[2].t} style={{ color: C.accent }}>
              not
            </Slam>
          </div>
          <div>
            <Slam t={t} at={w[3].t}>An</Slam>
          </div>
          <div>
            <Slam t={t} at={w[4].t}>option.</Slam>
          </div>
        </div>
        <div style={{ position: "absolute", left: 66, top: 1260, ...mono(24, "rgba(239,237,233,0.6)") }}>
          <Scramble t={t} at={sc.start + 0.2} dur={0.7} text="[ The one belief ]" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ================================================================== SERVICES */
const SERVICES = [
  { word: 0, name: "Websites", tag: "Custom UI/UX" },
  { word: 1, name: "Apps", tag: "iOS · Android · Web" },
  { word: 2, name: "CRMs", tag: "Sales · Clients" },
  { word: 4, name: "ERPs", tag: "Ops · Inventory" },
  { word: 5, name: "SaaS Products", tag: "Zero → scale" },
  { word: 7, name: "Shopify Stores", tag: "E-commerce" },
  { word: 9, name: "Brand Identity", tag: "& Logo identity" },
];

// each service as a field over the icon box, (x, y) relative to its centre, box half-size 240
const ICONS = [
  (x, y) => {
    // browser window
    const frame = lineOf(sdRoundBox(x, y, 215, 150, 18), 9);
    const bar = lineOf(y + 92, 5) * fillOf(sdRoundBox(x, y, 210, 150, 18));
    const dots = [-180, -150, -120].reduce((a, cx) => Math.max(a, fillOf(sdCircle(x - cx, y + 121, 9))), 0);
    const hero = 0.38 * fillOf(sdRoundBox(x - 0, y + 15, 170, 52, 6));
    const cards = [-112, 0, 112].reduce((a, cx) => Math.max(a, 0.6 * lineOf(sdRoundBox(x - cx, y - 100, 48, 30, 4), 4)), 0);
    return Math.max(frame, bar, dots, hero, cards);
  },
  (x, y) => {
    // phone
    const body = lineOf(sdRoundBox(x, y, 112, 210, 34), 10);
    const notch = fillOf(sdRoundBox(x, y + 180, 34, 8, 8));
    const screen = 0.3 * fillOf(sdRoundBox(x, y + 10, 88, 150, 8));
    const rows = [-90, -30, 30, 90].reduce((a, cy) => Math.max(a, 0.75 * fillOf(sdRoundBox(x + 20, y - cy, 58, 12, 6))), 0);
    return Math.max(body, notch, screen, rows);
  },
  (x, y) => {
    // CRM: a client at the centre of rings of relationships
    const r = Math.hypot(x, y);
    const rings = Math.max(lineOf(r - 95, 6), lineOf(r - 165, 6) * 0.8, lineOf(r - 228, 5) * 0.6);
    const core = fillOf(sdCircle(x, y, 42));
    const sat3 = [0, 2.1, 4.2].reduce((a, ang) => Math.max(a, fillOf(sdCircle(x - Math.cos(ang) * 165, y - Math.sin(ang) * 165, 20))), 0);
    return Math.max(rings, core, sat3);
  },
  (x, y) => {
    // ERP: modules on a grid, some live
    let v = 0;
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const d = sdRoundBox(x - a * 140, y - b * 140, 58, 58, 10);
        const live = (a + b + 3) % 2 === 0 ? 0.85 : 0.35;
        v = Math.max(v, live * fillOf(d), lineOf(d, 5));
      }
    return v;
  },
  (x, y) => {
    // SaaS: stacked layers
    let v = 0;
    [-110, 0, 110].forEach((c, i) => {
      const d = Math.abs(x) / 210 + Math.abs(y - c) / 82 - 1;
      v = Math.max(v, lineOf(d * 80, 6), (i === 0 ? 0.8 : 0.25) * fillOf(d * 80));
    });
    return v;
  },
  (x, y) => {
    // Shopify: a bag
    const body = sdRoundBox(x, y - 60, 160, 150, 16);
    const handle = lineOf(Math.hypot(x, y + 90) - 80, 9) * (y < -90 ? 1 : 0);
    return Math.max(0.55 * fillOf(body), lineOf(body, 9), handle);
  },
  (x, y) => {
    // Brand: the mark itself
    const ring = lineOf(sdRoundBox(x, y, 205, 104, 104) + 13, 13);
    const knob = fillOf(sdCircle(x - 101, y, 60));
    return Math.max(ring, knob);
  },
];

export function Services({ t, sc }) {
  const w = cue("services").words;
  const times = SERVICES.map((s) => w[s.word].t);
  let active = times.filter((x) => t >= x - 0.05).length - 1;
  const cur = Math.max(0, active);
  const prev = Math.max(0, cur - 1);
  const morph = active <= 0 ? p(t, times[0] - 0.1, 0.45, E.inOut) : p(t, times[cur] - 0.08, 0.42, E.inOut);
  const appear = p(t, sc.start + 0.15, 0.6);
  const bob = Math.sin(t * 1.6) * 6;
  return (
    <AbsoluteFill style={{ background: C.sand }}>
      <div style={{ position: "absolute", left: 96, top: 232, ...mono(22, C.graphite) }}>
        <Scramble t={t} at={sc.start + 0.25} dur={0.7} text="(03) — What we build" />
      </div>
      {/* the figure: one dithered icon that rebuilds itself for every service */}
      <div style={{ position: "absolute", left: 300, top: 300 + bob, width: 480, height: 480, opacity: appear }}>
        <Dither
          px={8}
          width={480}
          height={480}
          left={0}
          top={0}
          color={C.ink}
          field={(i, j, x, y) => {
            const lx = x - 240;
            const ly = 240 - y;
            const a = ICONS[prev](lx, -ly);
            const b = ICONS[cur](lx, -ly);
            const r = hash(i, j, cur + 11);
            return active <= 0 ? (r < morph ? b : 0) : r < morph ? b : a;
          }}
        />
        {[
          { left: -18, top: -18, borderLeft: "2px solid", borderTop: "2px solid" },
          { right: -18, top: -18, borderRight: "2px solid", borderTop: "2px solid" },
          { left: -18, bottom: -18, borderLeft: "2px solid", borderBottom: "2px solid" },
          { right: -18, bottom: -18, borderRight: "2px solid", borderBottom: "2px solid" },
        ].map((st, i) => (
          <span key={i} style={{ position: "absolute", width: 26, height: 26, borderColor: C.accent, ...st }} />
        ))}
        <div style={{ position: "absolute", left: -18, top: 500, ...mono(19, C.graphite) }}>
          Fig. {String(cur + 1).padStart(2, "0")} — <span style={{ color: C.accent }}>{SERVICES[cur].name}</span>
        </div>
      </div>
      {/* the list */}
      <div style={{ position: "absolute", left: 84, right: 84, top: 870 }}>
        {SERVICES.map((s, i) => {
          const at = times[i] - 0.06;
          const isActive = i === cur && t >= at;
          const done = t >= at;
          const rule = p(t, at, 0.6, E.prime);
          return (
            <div key={i} style={{ position: "relative", display: "flex", alignItems: "baseline", height: 88, opacity: done ? (isActive ? 1 : 0.38) : 1 }}>
              <span style={{ ...mono(22, isActive ? C.accent : C.graphite), width: 80, opacity: done ? 1 : 0 }}>{String(i + 1).padStart(2, "0")}</span>
              <Rise t={t} at={at} dur={0.55} style={{ ...display(70, C.ink, { lineHeight: 1 }) }}>
                {s.name}
              </Rise>
              <span style={{ marginLeft: "auto", ...mono(18, C.graphite), opacity: p(t, at + 0.15, 0.4) }}>{s.tag}</span>
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 4, height: 1.5, background: "rgba(8,6,78,0.18)", transform: `scaleX(${rule})`, transformOrigin: "left" }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== ZERO → PRIME */
export function Zero({ t, sc }) {
  const w = cue("zero").words;
  const steps = [4, 7, 8, 9, 10].map((i) => w[i].t);
  const PX = [96, 64, 40, 24, 14, 8];
  const ROUGH = [0.95, 0.75, 0.55, 0.35, 0.2, 0.08];
  const step = steps.filter((s) => t >= s).length;
  const formT = w[11].t;
  const crisp = t >= formT;
  const s = 430;
  const cx = 540;
  const cy = 700;
  const k0 = p(t, sc.start + 0.1, 0.6);
  const settle = step > 0 ? Math.exp(-(t - steps[step - 1]) / 0.09) : 0;
  const run = clamp01((t - steps[0]) / (formT - steps[0]));
  const pct = Math.round(100 * run);
  const flash = crisp ? Math.exp(-(t - formT) / 0.12) : 0;
  const shapeField = (x, y) => {
    const lx = x - cx + settle * 14;
    const ly = y - cy;
    const ring = lineOf(sdRoundBox(lx, ly, 0.875 * s - 0.055 * s, 0.45 * s - 0.055 * s, 0.45 * s - 0.055 * s), 0.055 * s, 3);
    const kx = 0.875 * s - 0.11 * s - 0.12 * s - 0.26 * s;
    const knob = fillOf(sdCircle(lx - kx, ly, 0.26 * s), 3);
    return Math.max(ring, knob);
  };
  const phrase = (ids, from, style, out) => (
    <Words t={t} out={out} gap="0.22em" words={ids.map((word, i) => [word, w[from + i].t, style?.[i]])} />
  );
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", left: 96, top: 232, ...mono(22, "rgba(239,237,233,0.6)") }}>
        <Scramble t={t} at={sc.start + 0.25} dur={0.7} text="(04) — From zero to prime" />
      </div>
      {!crisp && (
        <Dither
          px={PX[step]}
          color={C.sand}
          opacity={k0}
          field={(i, j, x, y) => {
            const v = shapeField(x, y);
            const n = noise3(x * 0.01, y * 0.01, t * 2 + step);
            return v > 0.04 ? v * (1 - ROUGH[step] * 0.35) + (n - 0.5) * ROUGH[step] * 0.9 : 0;
          }}
        />
      )}
      {crisp && (
        <div style={{ position: "absolute", left: cx - 0.875 * s, top: cy - 0.45 * s, transform: `scale(${1 + 0.03 * flash})` }}>
          <Pill s={s} k={1} stroke={C.sand} knob={C.sand} />
        </div>
      )}
      <div style={{ position: "absolute", left: 120, right: 120, top: 1000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", ...mono(20, "rgba(239,237,233,0.6)") }}>
          <span>Idea</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: C.sand, fontSize: 30 }}>{String(pct).padStart(3, "0")}%</span>
          <span style={{ color: crisp ? C.accent : undefined }}>Prime</span>
        </div>
        <div style={{ position: "relative", height: 3, marginTop: 18, background: "rgba(239,237,233,0.18)" }}>
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${run * 100}%`, background: C.accent }} />
          {[0, 0.25, 0.5, 0.75, 1].map((m) => (
            <span key={m} style={{ position: "absolute", left: `${m * 100}%`, top: -7, width: 1.5, height: 17, background: "rgba(239,237,233,0.4)" }} />
          ))}
        </div>
        <div style={{ ...mono(18, "rgba(239,237,233,0.45)"), marginTop: 14 }}>Resolution {PX[step]}px → {crisp ? "vector" : `${PX[Math.min(step + 1, 5)]}px`}</div>
      </div>
      <div style={{ position: "absolute", left: 84, top: 1210, ...display(100, C.sand, { lineHeight: 1 }) }}>
        <div style={{ position: "absolute", top: 0 }}>{phrase(["Ideas,", "from", "zero."], 2, [undefined, undefined, { color: C.accent }], w[5].t - 0.15)}</div>
        <div style={{ position: "absolute", top: 0, width: 920 }}>{phrase(["to", "their", "most", "refined,"], 5, null, w[9].t - 0.15)}</div>
        <div style={{ position: "absolute", top: 0, width: 920 }}>{phrase(["most", "premium", "form."], 9, [undefined, undefined, { color: C.accent }])}</div>
      </div>
      <div style={{ position: "absolute", left: 88, top: 1460, ...mono(22, "rgba(239,237,233,0.7)") }}>
        <Scramble t={t} at={formT + 0.1} dur={0.8} text="Old idea → Refined execution" />
      </div>
      <AbsoluteFill style={{ background: C.sand, opacity: flash * 0.25 }} />
    </AbsoluteFill>
  );
}

export { Orb, sdRoundBox, sdCircle, fillOf, lineOf };
