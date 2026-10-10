import { AbsoluteFill, Img, staticFile } from "remotion";
import { D, E, p, io, W, cue, clamp01, lerp, hash, noise3 } from "./time";
import { Bar, ChapterCard, Cursor, K, label, openBox, Row, Rule, type, Win } from "./kit";

/* ================================================================== prologue */
export function Title({ t }) {
  const out = 1.55;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      {/* the studio's dither flower, opening out of a point and turning slowly */}
      <Img
        src={staticFile("doc/assets/dither.png")}
        style={{
          position: "absolute",
          left: 540 - 420,
          top: 940 - 420,
          width: 840,
          height: 840,
          mixBlendMode: "multiply",
          opacity: 0.16 * (1 - p(t, out, 0.6, E.io)),
          clipPath: `circle(${p(t, 0.0, 1.4, E.io) * 62}% at 50% 50%)`,
          transform: `rotate(${t * 9}deg) scale(${lerp(0.85, 1.05, p(t, 0, 2.2, E.sine)) + p(t, out, 0.6, E.io) * 0.25})`,
          filter: `blur(${p(t, out, 0.6, E.io) * 6}px)`,
        }}
      />
      <Rule t={t} at={0.15} dur={1.0} x={240} y={958} w={600} origin="center" style={{ transform: `scaleX(${p(t, 0.15, 1.0, E.io) * (1 - p(t, out, 0.5, E.io))})` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", ...label(24, D.sub) }}>
        <K t={t} at={0.35} dur={0.8} out={out} tilt={0}>
          One Prime Studio presents
        </K>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 990, textAlign: "center", ...type(60, D.ink, { letterSpacing: "-0.03em" }) }}>
        <Row t={t} out={out} style={{ justifyContent: "center" }} words={[["A", 0.55], ["short", 0.6], ["film", 0.65], ["about", 0.7], ["software.", 0.75]]} />
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== hook */
const WINS = [
  [90, 1010, 300, 230],
  [420, 960, 270, 300],
  [720, 1030, 280, 210],
  [120, 1280, 360, 200],
  [510, 1300, 230, 180],
  [770, 1270, 220, 250],
];

function MiniWin({ t, i, x, y, w, h, at, broken }) {
  const k = p(t, at + i * 0.07, 0.8, E.doc);
  const b = p(t, broken + i * 0.05, 0.9, E.io);
  const dx = (noise3(i * 3.1, t * 0.35, 1) - 0.5) * 24;
  const dy = (noise3(i * 1.7, t * 0.35, 5) - 0.5) * 24;
  const rot = b * (hash(i, 7, 3) - 0.5) * 16;
  const err = i === 1 || i === 5;
  return (
    <Win
      w={w}
      h={h}
      style={{
        left: x + dx,
        top: y + dy + (1 - k) * 60 + b * (hash(i, 2, 9) * 50),
        clipPath: openBox(k, 22),
        transform: `rotate(${rot}deg) scale(${lerp(0.92, 1, k)})`,
        opacity: lerp(1, 0.55, b * (err ? 0 : 1)),
        filter: `grayscale(${b})`,
      }}
    >
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <Bar w="70%" h={16} c={i % 2 ? D.soft : D.card2} />
        <Bar w="90%" />
        <Bar w="55%" />
        {h > 220 && <Bar w="80%" />}
        {err && <Bar w="100%" h={30} c={D.red} style={{ opacity: b, transform: `scaleX(${b})`, transformOrigin: "left" }} />}
      </div>
    </Win>
  );
}

export function Hook({ t }) {
  const a = (i) => W("open1", i) - 0.08;
  const b = (i) => W("open2", i) - 0.08;
  const out1 = cue("open1").speechEnd + 0.25;
  const out2 = cue("open2").speechEnd + 0.45;
  const sz = 140;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      {WINS.map(([x, y, w, h], i) => (
        <MiniWin key={i} t={t} i={i} x={x} y={y} w={w} h={h} at={W("open1", 5) - 0.2} broken={W("open2", 4)} />
      ))}
      <div style={{ position: "absolute", left: 90, top: 300, ...type(sz) }}>
        <div><K t={t} at={a(0)} out={out1}>Every</K></div>
        <div><K t={t} at={a(1)} out={out1 + 0.04}>business</K></div>
        <div><Row t={t} out={out1 + 0.08} words={[["today", a(2)], ["runs", a(3)]]} /></div>
        <div><Row t={t} out={out1 + 0.12} words={[["on", a(4)], ["software.", a(5), { color: D.accent }]]} /></div>
      </div>
      <div style={{ position: "absolute", left: 90, top: 300, ...type(sz) }}>
        <div><Row t={t} out={out2} words={[["Most", b(0)], ["of", b(1)], ["it", b(2)]]} /></div>
        <div><Row t={t} out={out2 + 0.04} words={[["was", b(3)], ["never", b(4), { color: D.red }]]} /></div>
        <div><Row t={t} out={out2 + 0.08} words={[["built", b(5)], ["for", b(6)]]} /></div>
        <div><K t={t} at={b(7)} out={out2 + 0.12}>them.</K></div>
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== 01 · spreadsheets */
const COLS = ["A", "B", "C", "D", "E", "F"];
export function Sheets({ t, sc }) {
  const at = sc.start;
  const card = at + 0.95;
  const w0 = W("prob1", 0);
  const zoom = lerp(1, 1.07, p(t, card, 4, E.sine));
  const fill0 = card + 0.25;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <div style={{ position: "absolute", left: 90, top: 210, ...type(120) }}>
        <K t={t} at={w0 - 0.08}>Spreadsheets</K>
      </div>
      <div style={{ position: "absolute", left: 90, top: 352, ...label(24, D.sub) }}>
        <K t={t} at={W("prob1", 3) - 0.1} tilt={0}>Holding the whole company together</K>
      </div>
      <div style={{ position: "absolute", left: 60, top: 440, width: 960, height: 900, transform: `scale(${zoom})`, transformOrigin: "50% 30%", clipPath: openBox(p(t, card + 0.05, 0.9, E.doc), 22) }}>
        <Win w={960} h={900} title="Q3_final_FINAL_v7.xlsx" style={{ left: 0, top: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: `70px repeat(6, 1fr)`, fontFamily: "Montreal", fontSize: 22, color: D.sub }}>
            <span style={{ height: 46, background: D.card, borderBottom: `2px solid ${D.line}` }} />
            {COLS.map((c) => (
              <span key={c} style={{ height: 46, display: "flex", alignItems: "center", justifyContent: "center", background: D.card, borderBottom: `2px solid ${D.line}`, borderLeft: `2px solid ${D.line}`, fontWeight: 500 }}>{c}</span>
            ))}
            {Array.from({ length: 16 }).flatMap((_, r) => [
              <span key={`r${r}`} style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: D.card, borderBottom: `2px solid ${D.line}` }}>{r + 1}</span>,
              ...COLS.map((c, ci) => {
                const idx = r * 6 + ci;
                const on = t >= fill0 + idx * 0.022;
                const bad = hash(r, ci, 11) > 0.86;
                const badAt = W("prob1", 2) + hash(r, ci, 4) * 1.6;
                const isBad = bad && t >= badAt;
                const pop = isBad ? 1 - p(t, badAt, 0.35, E.io) : 0;
                const v = Math.floor(hash(r, ci, 2) * 98000 + 1200).toLocaleString("en-IN");
                return (
                  <span key={`${r}${c}`} style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 14px", borderBottom: `2px solid ${D.line}`, borderLeft: `2px solid ${D.line}`, background: isBad ? `rgba(229,72,77,${0.12 + pop * 0.3})` : "transparent", color: isBad ? D.red : D.ink, fontWeight: isBad ? 500 : 400 }}>
                    {on ? (isBad ? "#REF!" : ci === 0 ? `INV-${1000 + r * 7}` : v) : ""}
                  </span>
                );
              }),
            ])}
          </div>
        </Win>
      </div>
      <ChapterCard t={t} at={at} n="01" title="The problem." until={card} />
    </AbsoluteFill>
  );
}

/* ================================================================== 01 · five tools */
export const TOOLS = [
  ["Mail", "M"],
  ["Sheets", "S"],
  ["Chat", "#"],
  ["CRM", "C"],
  ["Drive", "D"],
];
export function Tile({ name, glyph, size = 170, style }) {
  return (
    <div style={{ position: "absolute", width: size, ...style }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.26, background: D.card, border: `2px solid ${D.line}`, display: "flex", alignItems: "center", justifyContent: "center", ...type(size * 0.44, D.ink, { letterSpacing: "-0.02em" }) }}>{glyph}</div>
      <div style={{ marginTop: 14, textAlign: "center", ...label(20, D.sub) }}>{name}</div>
    </div>
  );
}

export function Tools({ t }) {
  const w = (i) => W("prob2", i) - 0.08;
  const cx = 540;
  const cy = 930;
  const R = 300;
  const brk = W("prob2", 3);
  const apart = p(t, brk, 0.9, E.io);
  const pos = TOOLS.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const r = R + apart * 40;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const pairs = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push([i, j]);
  const draw = (k) => p(t, w(1) + 0.15 + k * 0.03, 0.7, E.io);
  const cut = p(t, brk + 0.05, 0.75, E.io);
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <div style={{ position: "absolute", left: 90, top: 210, ...type(120) }}>
        <div><Row t={t} words={[["Five", w(0)], ["tools.", w(1)]]} /></div>
        <div><Row t={t} words={[["Never", w(3), { color: D.red }], ["talking.", w(4)]]} /></div>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {pairs.map(([i, j], k) => {
          const [x1, y1] = pos[i];
          const [x2, y2] = pos[j];
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const d = draw(k);
          // two halves, each retracting from the middle toward its tile once the link breaks
          const half = (ax, ay) => {
            const reach = d * (1 - cut * 0.82);
            return <line x1={ax} y1={ay} x2={lerp(ax, mx, reach)} y2={lerp(ay, my, reach)} stroke={cut > 0 ? D.mute : D.ink} strokeWidth={3} strokeDasharray="10 10" />;
          };
          const xk = io(t, brk + k * 0.03, 0.35, brk + 0.9, 0.4, E.io);
          return (
            <g key={k}>
              {half(x1, y1)}
              {half(x2, y2)}
              <g transform={`translate(${mx} ${my}) scale(${xk})`} opacity={xk}>
                <circle r={20} fill="#fff" stroke={D.red} strokeWidth={3} />
                <path d="M-7 -7 L7 7 M7 -7 L-7 7" stroke={D.red} strokeWidth={3.5} strokeLinecap="round" />
              </g>
            </g>
          );
        })}
      </svg>
      {TOOLS.map(([name, g], i) => {
        const k = p(t, w(0) + 0.05 + i * 0.09, 0.8, E.doc);
        const [x, y] = pos[i];
        return <Tile key={name} name={name} glyph={g} style={{ left: x - 85, top: y - 85, clipPath: openBox(k, 44), transform: `translateY(${(1 - k) * 50}px)` }} />;
      })}
    </AbsoluteFill>
  );
}

/* ================================================================== 01 · the website */
export function Site({ t, sc }) {
  const w = (i) => W("prob3", i) - 0.08;
  const open = p(t, sc.start + 0.05, 0.95, E.doc);
  const visitors = Math.round(lerp(312, 1284, p(t, sc.start + 0.4, 3.2, E.sine)));
  const nothing = W("prob3", 7);
  const red = p(t, nothing, 0.4, E.io);
  // the cursor drifts to the button, hovers, then leaves without clicking
  const cA = p(t, sc.start + 0.6, 1.5, E.io);
  const cB = p(t, W("prob3", 5), 1.0, E.io);
  const cx = lerp(lerp(980, 420, cA), 1040, cB);
  const cy = lerp(lerp(1420, 1035, cA), 1480, cB);
  const hover = cA > 0.98 && cB < 0.05;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <div style={{ position: "absolute", left: 90, top: 210, ...type(120) }}>
        <div><Row t={t} words={[["Looks", w(3)], ["good.", w(4)]]} /></div>
        <div><Row t={t} words={[["Sells", w(6)], ["nothing.", w(7), { color: D.red }]]} /></div>
      </div>
      <Win w={900} h={760} title="yourbrand.com" style={{ left: 90, top: 500, clipPath: openBox(open, 22) }}>
        <div style={{ padding: "26px 34px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Bar w={120} h={18} c={D.ink} />
          <div style={{ display: "flex", gap: 22 }}>
            {[70, 80, 60].map((x, i) => <Bar key={i} w={x} h={12} />)}
          </div>
        </div>
        <div style={{ padding: "40px 34px 0", display: "flex", flexDirection: "column", gap: 18 }}>
          <Bar w="88%" h={52} c={D.ink} r={12} />
          <Bar w="64%" h={52} c={D.ink} r={12} />
          <Bar w="70%" h={16} style={{ marginTop: 14 }} />
          <Bar w="52%" h={16} />
          <div style={{ marginTop: 22, width: 220, height: 70, borderRadius: 40, background: hover ? D.accent : D.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...type(26, "#fff", { letterSpacing: "-0.01em" }) }}>Buy now</div>
          <div style={{ marginTop: 24, height: 210, borderRadius: 16, background: `linear-gradient(120deg, ${D.soft}, ${D.card})` }} />
        </div>
      </Win>
      <div style={{ position: "absolute", left: 560, top: 1150, width: 430, padding: "24px 28px", background: "#fff", borderRadius: 22, border: `2px solid ${D.line}`, boxShadow: "0 30px 60px -30px rgba(8,6,78,0.3)", clipPath: openBox(p(t, sc.start + 0.6, 0.8, E.doc), 22), display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={label(18, D.sub)}>Visitors</div>
          <div style={{ marginTop: 10, ...type(56), fontVariantNumeric: "tabular-nums" }}>{visitors.toLocaleString("en-IN")}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={label(18, D.sub)}>Sales</div>
          <div style={{ marginTop: 10, ...type(56, red > 0.5 ? D.red : D.ink), transform: `scale(${1 + 0.18 * Math.sin(Math.PI * red)})`, transformOrigin: "right center" }}>0</div>
        </div>
      </div>
      {t > sc.start + 0.5 && <Cursor x={cx} y={cy} scale={1.3} opacity={clamp01((t - sc.start - 0.5) * 3)} />}
    </AbsoluteFill>
  );
}
