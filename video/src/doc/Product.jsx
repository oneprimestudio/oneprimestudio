import { AbsoluteFill, Img, staticFile } from "remotion";
import { D, E, p, io, W, cue, clamp01, lerp } from "./time";
import { Bar, ChapterCard, K, label, Letters, openBox, Row, Rule, Switch, type, wipe, Win } from "./kit";

/* ================================================================== the lockup */
/**
 * The mark as two lines: [switch]ne / Prime Studio. `on` = time the knob slides on; the outline
 * draws from `draw`. Geometry is exposed so the turn can hand a free dot to the knob.
 */
export const LOCK = { s: 170, top: 780 };
const pillW = 1.75 * LOCK.s;
const neW = 0.98 * LOCK.s; // "ne" at this size, measured from the face
export const lockLeft = 540 - (pillW - 0.04 * LOCK.s + neW) / 2;
export const knobOff = (() => {
  const s = LOCK.s;
  const b = 0.11 * s;
  const d = 0.52 * s;
  return { x: lockLeft + b + 0.12 * s + d / 2, y: LOCK.top + (0.9 * s) / 2, d };
})();

export function Lockup({ t, draw, on, ne, words, tag, out, color = D.ink, sub = D.sub }) {
  const s = LOCK.s;
  const o = out == null ? 0 : p(t, out, 0.7, E.io);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${-o * 60}px)`, opacity: 1 - o }}>
      <div style={{ position: "absolute", left: lockLeft, top: LOCK.top, display: "flex", alignItems: "center", fontFamily: "Montreal", fontSize: s }}>
        <Switch s={s} draw={p(t, draw, 0.9, E.io)} k={p(t, on, 0.7, E.io)} color={color} />
        <span style={{ marginLeft: -0.04 * s, ...type(s, color, { letterSpacing: "-0.04em", lineHeight: 1 }) }}>
          <K t={t} at={ne} dur={0.8} tilt={0}>ne</K>
        </span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: LOCK.top + 190, display: "flex", justifyContent: "center", ...type(118, color, { letterSpacing: "-0.035em" }) }}>
        <Letters t={t} at={words} text="Prime Studio" step={0.03} dur={0.75} />
      </div>
      {tag && (
        <div style={{ position: "absolute", left: 0, right: 0, top: LOCK.top + 360, textAlign: "center", ...label(24, sub) }}>
          <K t={t} at={tag} dur={0.8} tilt={0}>{"Design & development studio"}</K>
        </div>
      )}
    </div>
  );
}

/* ================================================================== brand: the sky window */
/**
 * The studio's slides sit on a sky: here it opens as a rounded window growing out of a point,
 * drifting slowly (parallax), with whatever is passed as children drawn on top in white.
 */
export function SkyWindow({ t, at, from = { x: 540, y: 960 }, inset = 40, top = inset + 150, bottom = inset + 120, radius = 46, dur = 1.0, children }) {
  const k = p(t, at, dur, E.io5);
  const l = lerp(from.x, inset, k);
  const r = lerp(1080 - from.x, inset, k);
  const tp = lerp(from.y, top, k);
  const bt = lerp(1920 - from.y, bottom, k);
  const rad = lerp(40, radius, k);
  const zoom = lerp(1.25, 1.06, p(t, at, 3.5, E.io)) + (t - at) * 0.006;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(${tp}px ${r}px ${bt}px ${l}px round ${rad}px)` }}>
      <Img src={staticFile("doc/assets/sky.jpg")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920, objectFit: "cover", transform: `scale(${zoom}) translateY(${(t - at) * -6}px)` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,6,78,0.05), rgba(8,6,78,0.28))" }} />
      {children}
    </div>
  );
}

/* ================================================================== interlude · the turn */
export function Turn({ t, sc }) {
  const w = (i) => W("turn", i) - 0.08;
  const out = cue("turn").speechEnd + 0.3;
  const n0 = W("name", 0);
  // the dot left behind by the collapse travels into the knob of the switch
  const dot0 = sc.start + 0.45;
  const go = p(t, out + 0.2, 1.0, E.io);
  const dx = lerp(540, knobOff.x, go);
  const dy = lerp(1180, knobOff.y, go);
  const dd = lerp(26, knobOff.d, go);
  const handoff = out + 1.2;
  const lockOut = sc.end - 0.15;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...type(104) }}>
        <div><Row t={t} out={out} style={{ justifyContent: "center" }} words={[["So", w(0)], ["we", w(1)], ["built", w(2)]]} /></div>
        <div><Row t={t} out={out + 0.05} style={{ justifyContent: "center" }} words={[["something", w(3)], ["different.", w(4), { color: D.accent }]]} /></div>
      </div>
      {t >= dot0 && t < handoff && (
        <span style={{ position: "absolute", left: dx - dd / 2, top: dy - dd / 2, width: dd, height: dd, borderRadius: "50%", background: D.ink, transform: `scale(${p(t, dot0 - 0.2, 0.5, E.io)})` }} />
      )}
      {t >= handoff && <Lockup t={t} draw={handoff - 0.3} on={n0 - 0.05} ne={n0 + 0.05} words={W("name", 1) - 0.1} tag={W("name", 2) + 0.35} out={lockOut} />}
      {/* the switch turns on and a window of sky opens from its knob: same lockup, in white, inside */}
      {t >= n0 && <SkyWindow t={t} at={n0 + 0.02} from={knobOff}>
        <Lockup t={t} draw={handoff - 0.3} on={n0 - 0.05} ne={n0 + 0.05} words={W("name", 1) - 0.1} tag={W("name", 2) + 0.35} out={lockOut} color="#fff" sub="rgba(255,255,255,0.85)" />
      </SkyWindow>}
    </AbsoluteFill>
  );
}

/* ================================================================== one studio, every product */
export const PRODUCTS = ["Website", "App", "CRM · ERP", "SaaS", "Store", "Brand"];

/** mini thumbnails for the product deck */
function Thumb({ i }) {
  const box = { position: "absolute", left: 22, right: 22, top: 22, bottom: 74, borderRadius: 14, background: D.card, overflow: "hidden" };
  const inner = [
    <div key="w" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}><Bar w="40%" h={10} c={D.ink} /><Bar w="90%" h={22} c={D.ink} r={6} /><Bar w="70%" h={22} c={D.ink} r={6} /><Bar w={80} h={26} c={D.accent} r={14} style={{ marginTop: 8 }} /></div>,
    <div key="a" style={{ position: "absolute", left: "50%", top: 14, width: 104, height: 190, marginLeft: -52, borderRadius: 18, border: `3px solid ${D.ink}`, background: "#fff", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}><Bar w="60%" h={10} c={D.ink} /><Bar w="100%" h={40} c={D.soft} /><Bar w="100%" h={40} /></div>,
    <div key="c" style={{ display: "flex", gap: 8, padding: 14 }}>{[3, 2, 1].map((n, c) => <div key={c} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>{Array.from({ length: n }).map((_, r) => <Bar key={r} w="100%" h={34} c={c === 2 ? D.accent : "#fff"} />)}</div>)}</div>,
    <svg key="s" width="100%" height="100%" viewBox="0 0 200 180"><path d="M10 150 C50 140 60 90 100 100 S150 40 190 30" fill="none" stroke={D.accent} strokeWidth="6" strokeLinecap="round" /><rect x="10" y="12" width="60" height="26" rx="6" fill={D.ink} /></svg>,
    <div key="st" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 14 }}>{[0, 1, 2, 3].map((k) => <Bar key={k} w="100%" h={78} c={k === 1 ? D.soft : "#fff"} />)}</div>,
    <div key="b" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Switch s={60} k={1} /></div>,
  ][i];
  return <div style={box}>{inner}</div>;
}

export function Product({ t, sc }) {
  const w = (i) => W("what", i) - 0.08;
  const fan = p(t, W("what", 4) - 0.15, 1.1, E.doc);
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      <div style={{ position: "absolute", left: 90, top: 250, ...type(150) }}>
        <Row t={t} words={[["One", w(0)], ["studio.", w(1)]]} />
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, top: 440, ...type(76, D.ink, { letterSpacing: "-0.035em", lineHeight: 1 }) }}>
        <Row t={t} gap="0.22em" words={[["For", w(2)], ["every", w(3)], ["product", w(4), { color: D.accent }], ["your", w(5)], ["business", w(6)], ["runs", w(7)], ["on.", w(8)]]} />
      </div>
      {PRODUCTS.map((name, i) => {
        const k = p(t, w(4) - 0.1 + i * 0.06, 0.9, E.doc);
        const ang = lerp(0, (i - 2.5) * 11, fan);
        const x = lerp(0, (i - 2.5) * 128, fan);
        const y = lerp(0, Math.abs(i - 2.5) * 34, fan);
        return (
          <div key={name} style={{ position: "absolute", left: 540 - 130 + x, top: 830 + y, width: 260, height: 340, background: "#fff", borderRadius: 26, border: `2px solid ${D.line}`, boxShadow: "0 30px 50px -28px rgba(8,6,78,0.35)", transform: `rotate(${ang}deg) translateY(${(1 - k) * 220}px)`, transformOrigin: "50% 160%", opacity: clamp01(k * 3) }}>
            <Thumb i={i} />
            <div style={{ position: "absolute", left: 22, bottom: 22, ...label(19, D.ink, { letterSpacing: "0.04em" }) }}>{name}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ================================================================== 02 · the modules */
export const MODS = [
  ["Websites", "Sites that turn visitors into customers", 0],
  ["Apps", "iOS, Android and the web", 1],
  ["CRM & ERP", "Run sales and operations in one place", 2],
  ["SaaS platforms", "From idea to launch, then scale", 6],
  ["Shopify stores", "Commerce that sells around the clock", 8],
  ["Brand identity", "A name, a mark, a voice — remembered", 10],
];
const modT = (i) => W("mods", MODS[i][2]);

/* illustration for each module, local time lt since it became active */
function Illo({ i, lt }) {
  const k = (a, d = 0.7) => p(lt, a, d, E.io);
  if (i === 0)
    return (
      <Win w={760} h={480} title="yourbrand.com" style={{ left: 70, top: 60 }}>
        <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 16 }}>
          <Bar w={`${lerp(20, 82, k(0.1))}%`} h={42} c={D.ink} r={10} />
          <Bar w={`${lerp(10, 58, k(0.2))}%`} h={42} c={D.ink} r={10} />
          <Bar w="62%" h={14} style={{ marginTop: 10 }} />
          <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
            <Bar w={170} h={56} c={D.accent} r={30} style={{ transform: `scale(${lerp(0.6, 1, k(0.35))})`, transformOrigin: "left" }} />
            <Bar w={150} h={56} c={D.card} r={30} />
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 14 }}>{[0, 1, 2].map((j) => <Bar key={j} w={220} h={90} c={j === 1 ? D.soft : D.card} r={12} style={{ clipPath: wipe(k(0.4 + j * 0.08), "up", 12) }} />)}</div>
        </div>
      </Win>
    );
  if (i === 1)
    return (
      <>
        {[0, 1].map((j) => (
          <div key={j} style={{ position: "absolute", left: 210 + j * 260, top: 40 + (j ? 60 : 0) + (1 - k(j * 0.12)) * 120, width: 220, height: 460, borderRadius: 36, border: `4px solid ${D.ink}`, background: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <Bar w={60} h={8} c={D.ink} style={{ alignSelf: "center" }} />
            <Bar w="70%" h={18} c={D.ink} />
            <Bar w="100%" h={110} c={j ? D.soft : D.card} r={14} />
            <Bar w="100%" h={50} r={12} />
            <Bar w="100%" h={50} r={12} />
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-around" }}>{[0, 1, 2, 3].map((q) => <Bar key={q} w={22} h={22} r={11} c={q === 0 ? D.accent : D.card2} />)}</div>
          </div>
        ))}
      </>
    );
  if (i === 2) {
    const mv = k(0.5, 0.9);
    return (
      <div style={{ position: "absolute", left: 50, top: 60, right: 50, display: "flex", gap: 20 }}>
        {["Lead", "Deal", "Won"].map((c, ci) => (
          <div key={c} style={{ flex: 1, background: D.card, borderRadius: 18, padding: 16, height: 420, position: "relative" }}>
            <div style={label(18, D.sub)}>{c}</div>
            {Array.from({ length: 3 - ci }).map((_, r) => (
              <div key={r} style={{ marginTop: 14, height: 80, borderRadius: 12, background: "#fff", border: `2px solid ${D.line}`, padding: 12 }}><Bar w="70%" h={12} c={D.ink} /><Bar w="45%" h={10} style={{ marginTop: 10 }} /></div>
            ))}
          </div>
        ))}
        <div style={{ position: "absolute", left: lerp(16, 16 + 2 * 280, mv), top: 50 + 94 * 2 - Math.sin(Math.PI * mv) * 60, width: 228, height: 80, borderRadius: 12, background: D.accent, padding: 12, boxShadow: "0 20px 30px -15px rgba(47,107,255,0.6)", transform: `rotate(${Math.sin(Math.PI * mv) * 4}deg)` }}>
          <Bar w="70%" h={12} c="#fff" /><Bar w="45%" h={10} c="rgba(255,255,255,0.6)" style={{ marginTop: 10 }} />
        </div>
      </div>
    );
  }
  if (i === 3) {
    const d = k(0.15, 1.1);
    return (
      <Win w={760} h={480} title="app.yourproduct.io" style={{ left: 70, top: 60 }}>
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 150, background: D.card, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>{[0, 1, 2, 3, 4].map((j) => <Bar key={j} w="80%" h={12} c={j === 1 ? D.accent : D.card2} />)}</div>
          <div style={{ flex: 1, padding: 20, position: "relative" }}>
            <div style={{ display: "flex", gap: 14 }}>{[0, 1, 2].map((j) => <div key={j} style={{ flex: 1, height: 90, borderRadius: 12, border: `2px solid ${D.line}`, padding: 12 }}><Bar w="50%" h={10} /><Bar w={`${lerp(20, 70, k(0.2 + j * 0.1))}%`} h={26} c={D.ink} style={{ marginTop: 12 }} /></div>)}</div>
            <svg width="560" height="250" viewBox="0 0 560 250" style={{ marginTop: 20 }}>
              <path d="M0 220 C80 210 110 150 180 160 S300 90 360 100 S470 30 560 20" fill="none" stroke={D.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray="700" strokeDashoffset={700 * (1 - d)} />
              <path d="M0 220 C80 210 110 150 180 160 S300 90 360 100 S470 30 560 20 L560 250 L0 250 Z" fill={D.soft} opacity={0.6 * d} />
            </svg>
          </div>
        </div>
      </Win>
    );
  }
  if (i === 4) {
    const n = Math.min(3, Math.floor(Math.max(0, lt - 0.4) / 0.35));
    return (
      <Win w={760} h={480} title="store.yourbrand.in" style={{ left: 70, top: 60 }}>
        <div style={{ position: "absolute", right: 22, top: -36, width: 34, height: 34, borderRadius: 17, background: D.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...type(20, "#fff", { letterSpacing: 0 }), transform: `scale(${n ? 1 : 0})` }}>{n}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, padding: 24 }}>
          {[0, 1, 2, 3, 4, 5].map((j) => (
            <div key={j} style={{ clipPath: wipe(k(0.05 + j * 0.06), "up", 12) }}>
              <Bar w="100%" h={120} c={j % 3 === 1 ? D.soft : D.card} r={12} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}><Bar w="50%" h={12} c={D.ink} /><span style={type(18, D.sub, { letterSpacing: 0 })}>₹{(j + 2) * 499}</span></div>
            </div>
          ))}
        </div>
      </Win>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0a0857" }}>
      <Img src={staticFile("doc/assets/badge.jpg")} style={{ position: "absolute", left: 0, top: 0, width: 900, height: 600, objectFit: "cover", transform: `scale(${lerp(1.18, 1.04, k(0, 2.2))}) translateY(${lerp(30, 0, k(0, 2.2))}px)` }} />
      <div style={{ position: "absolute", left: 40, bottom: 34, ...label(18, "rgba(255,255,255,0.75)") }}>One Prime Studio · ID</div>
    </div>
  );
}

export function Mods({ t, sc }) {
  const card = sc.start + 0.95;
  let cur = -1;
  MODS.forEach((_, i) => {
    if (t >= modT(i) - 0.15) cur = i;
  });
  const listIn = p(t, card + 0.1, 0.9, E.doc);
  const hi = cur < 0 ? 0 : lerp(Math.max(0, cur - 1), cur, p(t, modT(cur) - 0.15, 0.6, E.io));
  const rowH = 66;
  const listTop = 1090;
  return (
    <AbsoluteFill style={{ background: D.bg }}>
      {/* header: the module name swaps through a mask on each spoken word */}
      <div style={{ position: "absolute", left: 90, top: 205, ...label(22, D.sub) }}>
        <K t={t} at={card + 0.1} tilt={0}>Module</K>
      </div>
      <div style={{ position: "absolute", left: 90, top: 245, height: 130, width: 900, overflow: "hidden", ...type(112) }}>
        {MODS.map(([name], i) => {
          const a = modT(i) - 0.15;
          const b = i + 1 < MODS.length ? modT(i + 1) - 0.15 : 1e9;
          const y = (1 - p(t, a, 0.6, E.io)) * 110 - p(t, b, 0.6, E.io) * 110;
          return <div key={name} style={{ position: "absolute", left: 0, top: 6, whiteSpace: "nowrap", transform: `translateY(${y}%)` }}>{name}</div>;
        })}
      </div>
      {/* preview card: each illustration opens through a wipe */}
      <div style={{ position: "absolute", left: 90, top: 420, width: 900, height: 600, borderRadius: 28, background: D.card, clipPath: openBox(p(t, card + 0.15, 0.9, E.doc), 28), overflow: "hidden" }}>
        {MODS.map((_, i) => {
          const a = modT(i) - 0.15;
          const b = i + 1 < MODS.length ? modT(i + 1) - 0.15 : 1e9;
          if (t < a - 0.01 || t > b + 0.8) return null;
          const k = p(t, a, 0.7, E.io5);
          const leave = p(t, b, 0.7, E.io5);
          return (
            <div key={i} style={{ position: "absolute", inset: 0, background: D.card, clipPath: wipe(k, "up"), transform: `translateY(${-leave * 80}px)` }}>
              <Illo i={i} lt={t - a} />
            </div>
          );
        })}
      </div>
      {/* the module list: each one switches on */}
      <div style={{ position: "absolute", left: 90, right: 90, top: listTop - 50, display: "flex", justifyContent: "space-between", ...label(20, D.sub), opacity: listIn }}>
        <span>One Prime · modules</span>
        <span style={{ fontVariantNumeric: "tabular-nums", color: D.ink }}>{cur + 1} / 6 enabled</span>
      </div>
      <span style={{ position: "absolute", left: 70, right: 70, top: listTop + hi * rowH, height: rowH, borderRadius: 18, background: D.card, opacity: cur < 0 ? 0 : listIn }} />
      {MODS.map(([name, desc], i) => {
        const on = p(t, modT(i) - 0.1, 0.6, E.io);
        const rowIn = p(t, card + 0.15 + i * 0.05, 0.8, E.doc);
        const col = on > 0.5 ? D.ink : D.mute;
        return (
          <div key={name} style={{ position: "absolute", left: 90, right: 90, top: listTop + i * rowH, height: rowH, display: "flex", alignItems: "center", gap: 24, borderTop: `2px solid ${D.line}`, clipPath: wipe(rowIn, "up") }}>
            <span style={{ ...label(20, col), width: 36, fontVariantNumeric: "tabular-nums" }}>0{i + 1}</span>
            <span style={{ ...type(36, col, { letterSpacing: "-0.02em" }), width: 300 }}>{name}</span>
            <span style={{ ...type(22, on > 0.5 ? D.sub : D.mute, { letterSpacing: "-0.005em" }), flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{desc}</span>
            <Switch s={34} k={on} color={on > 0.5 ? D.ink : D.mute} fill={on > 0.5 ? D.ink : "transparent"} knob={on > 0.5 ? "#fff" : D.mute} style={{ marginRight: 6 }} />
          </div>
        );
      })}
      <ChapterCard t={t} at={sc.start} n="02" title="The product." sub="Six modules. One studio." until={card} />
    </AbsoluteFill>
  );
}
