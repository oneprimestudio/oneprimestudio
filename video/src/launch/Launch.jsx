import { AbsoluteFill, Audio, staticFile } from "remotion";
import { clamp01, E, hash, L, lerp, mblur, measure, noise3, p, Q, spring, type, useT, wobble } from "./lib";

/*
 * One Prime Studio — launch intro (1080×1920, 60 fps, 23.5 s). No voice: picture + SFX + music.
 * References: a bouncing ball that writes the line and becomes the logo (Maxterz), elastic UI
 * morphs (Joi), a punch-through into the mark and a fluid gradient orb with orbit rings (ElevenLabs).
 * The ball is the knob of the One Prime switch all the way through.
 */

const CX = 540;
const CY = 960;
const BALL = 70;

/* ================================================================== shared pieces */
function Ball({ x, y, r = BALL / 2, color, rot = 0, sx = 1, sy = 1, blur = 0 }) {
  return (
    <span
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        background: color,
        transform: `rotate(${rot}deg) scale(${sx}, ${sy})`,
        filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
      }}
    />
  );
}

/** letter-by-letter: each glyph springs up from its baseline */
function Pop({ t, at, text, step = 0.035, size, color, freq = 2.6, damp = 0.38, style, out, outStep = 0.02 }) {
  return (
    <span style={{ display: "inline-flex", ...type(size, color), ...style }}>
      {[...text].map((ch, i) => {
        const k = spring(t, at + i * step, freq, damp);
        const o = out == null ? 0 : p(t, out + i * outStep, 0.3, E.in);
        return (
          <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - k) * 0.5 + o * -0.4}em) scale(${Math.max(0, k) * (1 - o)})`, transformOrigin: "50% 90%", opacity: clamp01(k * 4) * (1 - o) }}>
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}

/** letters fade + un-blur in a scattered order (ElevenLabs "Experiments") */
function Dissolve({ t, at, text, size, color, spread = 0.45, out, style }) {
  return (
    <span style={{ display: "inline-flex", ...type(size, color), ...style }}>
      {[...text].map((ch, i) => {
        const a = at + hash(i, text.length, 5) * spread;
        const k = p(t, a, 0.3, E.io);
        const o = out == null ? 0 : p(t, out + hash(i, 3, 9) * 0.25, 0.25, E.io);
        const v = k * (1 - o);
        return (
          <span key={i} style={{ display: "inline-block", opacity: v, filter: v < 0.98 ? `blur(${(1 - v) * 10}px)` : undefined }}>
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}

/** the switch outline (no knob — the ball is the knob) */
function Pill({ x, y, s, draw = 1, color = L.ink, fill = "transparent" }) {
  const b = 0.11 * s;
  const w = 1.75 * s;
  const h = 0.9 * s;
  const per = 2 * (w - h) + Math.PI * h;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      <rect x={b / 2} y={b / 2} width={w - b} height={h - b} rx={(h - b) / 2} fill={fill} stroke={color} strokeWidth={b} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
    </svg>
  );
}
/** knob centre for a pill at (x, y), size s, switch position k */
const knobAt = (x, y, s, k) => {
  const b = 0.11 * s;
  const d = 0.52 * s;
  const inner = 1.75 * s - 2 * b;
  return { x: x + b + 0.12 * s + k * (inner - 0.24 * s - d) + d / 2, y: y + (0.9 * s) / 2, r: d / 2 };
};

/** soft white panels drifting in depth behind white scenes (ElevenLabs) */
function Panels({ t, opacity = 1 }) {
  const P = [
    [-120, 260, 520, 360, 0.6],
    [720, 180, 460, 300, 0.9],
    [640, 1400, 560, 420, 0.7],
    [-80, 1500, 420, 320, 1.1],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {P.map(([x, y, w, h, sp], i) => (
        <span key={i} style={{ position: "absolute", left: x + Math.sin(t * 0.4 * sp + i) * 40, top: y + Math.cos(t * 0.33 * sp + i * 2) * 30, width: w, height: h, borderRadius: 36, background: "linear-gradient(180deg,#ffffff,#f6f6fa)", boxShadow: "0 40px 80px -30px rgba(8,6,78,0.12), 0 2px 0 rgba(255,255,255,1) inset" }} />
      ))}
    </div>
  );
}

function Cursor({ x, y, scale = 1.3, opacity = 1 }) {
  return (
    <svg width={44 * scale} height={54 * scale} viewBox="0 0 22 27" style={{ position: "absolute", left: x - 3 * scale, top: y - 2 * scale, opacity, overflow: "visible" }}>
      <path d="M2 2 L2 21 L7 16.5 L10.5 24.5 L13.7 23.1 L10.3 15.3 L17 15.3 Z" fill={L.ink} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function Ring({ t, at, x, y, color, size = 260, dur = 0.7, width = 4 }) {
  const k = p(t, at, dur, E.out);
  if (t < at || k >= 1) return null;
  return <span style={{ position: "absolute", left: x - (size * k) / 2, top: y - (size * k) / 2, width: size * k, height: size * k, borderRadius: "50%", border: `${width}px solid ${color}`, opacity: 1 - k }} />;
}

/* ================================================================== A · the bounce (0 – 3.45) */
const WSIZE = 132;
const GAP = 46;
function layoutWords() {
  let x = 0;
  return Q.words.map((w) => {
    const wd = measure(w, WSIZE);
    const o = { w, x, wd, cx: x + wd / 2 };
    x += wd + GAP;
    return o;
  });
}
/** ball position in world space (before the camera) */
function ballPath(t, words) {
  const top = CY - WSIZE * 0.74 - BALL / 2;
  const keys = [{ t: 0.05, x: words[0].cx - 260, y: -120, h: 0 }];
  Q.bounce.forEach((b, i) => keys.push({ t: b, x: words[i].cx, y: top, h: 250 }));
  return { keys, top };
}
function flight(t, keys, h0 = 250) {
  if (t <= keys[0].t) return { x: keys[0].x, y: keys[0].y, vx: 0, vy: 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (t <= b.t) {
      const u = (t - a.t) / (b.t - a.t);
      const arc = i === 1 ? 0 : h0;
      const y = i === 1 ? lerp(a.y, b.y, u * u) : lerp(a.y, b.y, u) - 4 * arc * u * (1 - u);
      const x = lerp(a.x, b.x, u);
      return { x, y };
    }
  }
  const z = keys[keys.length - 1];
  return { x: z.x, y: z.y };
}

function Bounce({ t }) {
  const words = layoutWords();
  const { keys, top } = ballPath(t, words);
  const last = Q.bounce[3];
  // camera follows the ball with a little lag, then holds
  const camAt = (tt) => {
    const f = flight(Math.min(tt, last), keys);
    return f.x - CX;
  };
  const cam = (tt) => lerp(camAt(tt - 0.12), camAt(last - 0.12), 0);
  const camX = t < last ? cam(t) : cam(last);
  // after the last word: one big hop to the centre of the screen
  const final = { x: camX + CX, y: 1000 };
  const pos = (tt) => {
    if (tt <= last) return flight(tt, keys);
    const u = clamp01((tt - last) / (Q.land - last));
    const a = keys[keys.length - 1];
    return { x: lerp(a.x, final.x, u), y: lerp(a.y, final.y, u) - 4 * 520 * u * (1 - u) };
  };
  const b = pos(t);
  const b2 = pos(t + 1 / 60);
  const vx = (b2.x - b.x) * 60;
  const vy = (b2.y - b.y) * 60;
  const speed = Math.hypot(vx, vy);
  // squash on every landing, stretch along the velocity in flight
  const lands = [...Q.bounce, Q.land];
  let sq = 0;
  for (const l of lands) sq += 0.5 * wobble(t, l, 4.5, 9);
  const st = Math.min(0.55, speed / 3200);
  const inAir = Math.abs(sq) < 0.02;
  const rot = inAir ? (Math.atan2(vy, vx) * 180) / Math.PI : 0;
  const sx = inAir ? 1 + st : 1 + sq;
  const sy = inAir ? 1 - st * 0.45 : 1 - sq;
  // background flips with the beat
  const blue = (t >= Q.bounce[1] && t < Q.bounce[2]) || (t >= Q.bounce[3] && t < Q.bounce[3] + 0.32);
  const fg = blue ? "#fff" : L.blue;
  const dim = p(t, Q.hop, 0.45, E.io);
  // the ball becomes the screen
  const grow = p(t, Q.fill, 0.42, E.io5);
  const r = BALL / 2 + grow * 1250;
  return (
    <AbsoluteFill style={{ background: blue ? L.blue : L.white }}>
      <div style={{ position: "absolute", left: -camX, top: 0, opacity: 1 - dim * 0.85, filter: dim > 0.01 ? `blur(${dim * 5}px)` : undefined }}>
        {words.map((w, i) => {
          const k = spring(t, Q.bounce[i] - 0.02, 3.2, 0.32);
          if (t < Q.bounce[i] - 0.02) return null;
          return (
            <span key={i} style={{ position: "absolute", left: w.x, top: CY - WSIZE * 0.5, ...type(WSIZE, fg), transform: `scale(${0.4 + 0.6 * k}, ${k})`, transformOrigin: "50% 100%" }}>
              {w.w}
            </span>
          );
        })}
      </div>
      <Ball x={b.x - camX} y={b.y} r={r} color={fg === "#fff" && grow === 0 ? "#fff" : L.blue} rot={grow > 0 ? 0 : rot} sx={grow > 0 ? 1 : sx} sy={grow > 0 ? 1 : sy} blur={grow > 0 ? 0 : Math.min(6, speed / 900)} />
    </AbsoluteFill>
  );
}

/* ================================================================== B · introducing → the mark (3.45 – 6.5) */
const S = 150;
const NE = 0.98 * S; // "ne" in Montreal Medium at this size
const LX = CX - (1.75 * S - 0.04 * S + NE) / 2;
const LY = 800;

function Mark({ t, color = L.ink, knob = L.ink, draw, on, ne, words, tag, hideKnob }) {
  const k = on == null ? 1 : clamp01(spring(t, on, 2.2, 0.42)) + Math.max(0, spring(t, on, 2.2, 0.42) - 1);
  const kn = knobAt(LX, LY, S, k);
  return (
    <>
      <Pill x={LX} y={LY} s={S} draw={draw} color={color} />
      {!hideKnob && <Ball x={kn.x} y={kn.y} r={kn.r} color={knob} />}
      <span style={{ position: "absolute", left: LX + 1.75 * S - 0.04 * S, top: LY + 0.9 * S * 0.5 - S * 0.56 }}>
        <Pop t={t} at={ne} text="ne" size={S} color={color} step={0.06} style={{ letterSpacing: "-0.04em" }} />
      </span>
      <div style={{ position: "absolute", left: 0, right: 0, top: LY + 175, display: "flex", justifyContent: "center" }}>
        <Pop t={t} at={words} text="Prime Studio" size={112} color={color} step={0.03} style={{ letterSpacing: "-0.035em" }} />
      </div>
      {tag != null && (
        <div style={{ position: "absolute", left: 0, right: 0, top: LY + 340, textAlign: "center", ...type(30, color === L.ink ? L.sub : "rgba(255,255,255,0.8)", { letterSpacing: "0.06em", textTransform: "uppercase" }), opacity: p(t, tag, 0.5), transform: `translateY(${(1 - p(t, tag, 0.6, E.out)) * 24}px)` }}>
          Design &amp; development studio
        </div>
      )}
    </>
  );
}

function Intro({ t }) {
  const kOff = knobAt(LX, LY, S, 0);
  const sh = p(t, Q.shrink, 0.55, E.io5);
  const settle = wobble(t, Q.shrink + 0.55, 5, 8) * 0.18;
  const r = lerp(1300, kOff.r, sh) * (1 + settle);
  const x = lerp(CX, kOff.x, sh);
  const y = lerp(1000, kOff.y, sh);
  const knobCol = sh < 1 ? L.blue : L.ink;
  return (
    <AbsoluteFill style={{ background: L.white }}>
      <Panels t={t} opacity={p(t, Q.shrink + 0.2, 0.6)} />
      {t >= Q.pillDraw - 0.05 && <Mark t={t} draw={p(t, Q.pillDraw, 0.45, E.io)} on={Q.switchOn} ne={Q.name} words={Q.name + 0.18} tag={Q.tag} hideKnob={t < Q.switchOn} />}
      {t < Q.switchOn && <Ball x={x} y={y} r={r} color={sh > 0.9 ? L.ink : knobCol} />}
      {t < Q.shrink + 0.3 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 900, display: "flex", justifyContent: "center", opacity: 1 - sh }}>
          <Dissolve t={t} at={Q.introducing} text="Introducing" size={124} color="#fff" out={Q.introOut} />
        </div>
      )}
      <Ring t={t} at={Q.switchOn} x={knobAt(LX, LY, S, 1).x} y={kOff.y} color={L.blue} size={320} />
    </AbsoluteFill>
  );
}

/* ================================================================== C · punch-through + orb (6.5 – 9.05) */
function Orb({ t, x, y, size, round, rot, solid = 0 }) {
  const blobs = [
    [L.sky, 0.3, 0.3, 0.8],
    [L.blue, 0.7, 0.4, 0.9],
    [L.violet, 0.45, 0.75, 0.7],
    [L.pink, 0.75, 0.75, 0.45],
  ];
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: `${round * 50}%`, overflow: "hidden", transform: `rotate(${rot}deg)`, background: L.blue, boxShadow: `0 40px 120px -20px rgba(63,208,255,${0.45 * (1 - solid)})` }}>
      {blobs.map(([c, bx, by, s], i) => {
        const dx = (noise3(i * 3, t * 0.6, 1) - 0.5) * 0.6;
        const dy = (noise3(i * 5, t * 0.6, 7) - 0.5) * 0.6;
        return <span key={i} style={{ position: "absolute", left: `${(bx + dx) * 100 - s * 60}%`, top: `${(by + dy) * 100 - s * 60}%`, width: `${s * 120}%`, height: `${s * 120}%`, borderRadius: "50%", background: c, filter: `blur(${size * 0.12}px)`, opacity: 1 - solid }} />;
      })}
      <span style={{ position: "absolute", inset: 0, background: `radial-gradient(70% 70% at 30% 25%, rgba(255,255,255,${0.35 * (1 - solid)}), transparent 60%)` }} />
    </div>
  );
}

function Punch({ t }) {
  // the camera dives into the knob of the mark until the ink fills the frame
  const kOn = knobAt(LX, LY, S, 1);
  const z = Math.pow(48, p(t, Q.punch, 0.5, E.in));
  const inside = t >= Q.orb - 0.02;
  const out = p(t, Q.orbOut, 0.45, E.io5);
  const grow = spring(t, Q.orb, 1.6, 0.5);
  const morph = p(t, Q.orb + 0.1, 0.55, E.io);
  const size = lerp(lerp(70, 470, grow), 140, out);
  const ox = CX;
  const oy = lerp(900, CY, out);
  const ring = (i) => p(t, Q.orb + 0.3 + i * 0.12, 0.7, E.io) * (1 - out);
  // the slot inside the orb
  const words = ["Design", "Develop", "Launch"];
  return (
    <AbsoluteFill style={{ background: inside ? L.ink : L.white }}>
      {!inside && (
        <div style={{ position: "absolute", inset: 0, transform: `scale(${z})`, transformOrigin: `${kOn.x}px ${kOn.y}px`, filter: z > 3 ? `blur(${Math.min(8, z / 6)}px)` : undefined }}>
          <Mark t={t} draw={1} ne={-10} words={-10} tag={-10} />
        </div>
      )}
      {inside && (
        <>
          {/* white comes back as a circle growing out of the orb */}
          <span style={{ position: "absolute", left: ox - out * 1300, top: oy - out * 1300, width: out * 2600, height: out * 2600, borderRadius: "50%", background: L.white }} />
          <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
            {[0, 1].map((i) => {
              const rx = 380 + i * 90;
              const ry = 110 + i * 40;
              const per = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
              return (
                <g key={i} transform={`translate(${ox} ${oy}) rotate(${(i ? -18 : 14) + t * (i ? -6 : 8)})`} opacity={ring(i)}>
                  <ellipse rx={rx} ry={ry} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray={per} strokeDashoffset={per * (1 - ring(i))} />
                  <circle cx={rx * Math.cos(t * (2.2 + i))} cy={ry * Math.sin(t * (2.2 + i))} r={7} fill={i ? L.pink : L.sky} />
                </g>
              );
            })}
          </svg>
          <Orb t={t} x={ox} y={oy} size={size} round={lerp(0.18, 1, morph)} rot={lerp(-45, 90, morph)} solid={out} />
          <div style={{ position: "absolute", left: ox - 250, top: oy - 40, width: 500, height: 80, overflow: "hidden", display: "flex", justifyContent: "center", opacity: 1 - out * 3 }}>
            {words.map((w, i) => {
              const a = Q.orbWords[i];
              const b = Q.orbWords[i + 1] ?? 99;
              const y = (1 - clamp01(spring(t, a, 2.6, 0.5))) * 100 - clamp01(spring(t, b, 2.6, 0.5)) * 100;
              return <span key={w} style={{ position: "absolute", top: 4, transform: `translateY(${t < a ? 120 : y}%)`, ...type(64, "#fff", { letterSpacing: "-0.03em" }) }}>{w}</span>;
            })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1330, display: "flex", justifyContent: "center", opacity: 1 - out }}>
            <Dissolve t={t} at={Q.orb + 0.35} text="A design & development studio" size={40} color="rgba(255,255,255,0.9)" spread={0.5} />
          </div>
          {/* the "+" fades in as the orb settles into a button */}
          <span style={{ position: "absolute", left: ox - 24, top: oy - 3, width: 48, height: 6, borderRadius: 3, background: "#fff", opacity: out }} />
          <span style={{ position: "absolute", left: ox - 3, top: oy - 24, width: 6, height: 48, borderRadius: 3, background: "#fff", opacity: out }} />
        </>
      )}
    </AbsoluteFill>
  );
}

/* ================================================================== D · the services card (9.05 – 13.5) */
const ITEMS = ["Websites", "Mobile apps", "CRM & ERP", "SaaS products", "Shopify stores", "Brand identity"];
function Services({ t }) {
  const c = Q.click;
  const open = spring(t, c, 1.9, 0.55);
  const curK = p(t, Q.plus + 0.05, c - Q.plus - 0.08, E.io);
  const fall = p(t, Q.cardOut, 0.5, E.in);
  const fallF = (tt) => p(tt, Q.cardOut, 0.5, E.in) * 1500;
  // button travels to the card's corner
  const cardW = 840;
  const cardH = 960;
  const cardX = CX - cardW / 2;
  const cardY = 1000 - cardH / 2;
  const bx = lerp(CX, cardX + cardW - 96, clamp01(open));
  const by = lerp(CY, cardY + 96, clamp01(open));
  const press = t >= c && t < c + 0.25 ? 1 - 0.12 * wobble(t, c, 6, 10) - 0.06 : 1;
  const xRot = clamp01(spring(t, c + 0.02, 2.6, 0.4)) * 45 + Math.max(0, spring(t, c + 0.02, 2.6, 0.4) - 1) * 45;
  return (
    <AbsoluteFill style={{ background: L.white }}>
      <Panels t={t} opacity={p(t, Q.plus, 0.6)} />
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${fall * 1500}px) rotate(${fall * -14}deg) perspective(1600px) rotateX(${fall * 25}deg)`, transformOrigin: "50% 60%", filter: fall > 0 ? `blur(${mblur(fallF, t, 0.25, 12)}px)` : undefined }}>
        {t >= c && (
          <div style={{ position: "absolute", left: cardX, top: cardY, width: cardW, height: cardH, borderRadius: 56, background: "#fff", boxShadow: "0 2px 0 #fff inset, 0 30px 60px -20px rgba(8,6,78,0.18), 0 80px 140px -50px rgba(47,107,255,0.35)", transform: `scale(${Math.max(0, open)})`, transformOrigin: `${bx - cardX}px ${by - cardY}px`, border: `1.5px solid ${L.line}` }}>
            <div style={{ position: "absolute", left: 64, top: 70, ...type(24, L.sub, { letterSpacing: "0.12em", textTransform: "uppercase" }) }}>One Prime Studio</div>
            <div style={{ position: "absolute", left: 64, top: 112, ...type(64, L.ink) }}>What we build</div>
            {ITEMS.map((it, i) => {
              const a = Q.items[i];
              const slide = (tt) => (1 - p(tt, a, 0.38, E.out)) * 140;
              const vis = p(t, a, 0.25);
              const tick = spring(t, a + 0.22, 3, 0.35);
              const draw = p(t, a + 0.28, 0.25, E.io);
              const y = 250 + i * 112;
              return (
                <div key={it} style={{ position: "absolute", left: 64, right: 64, top: y, height: 96, display: "flex", alignItems: "center", gap: 30, borderTop: `1.5px solid ${L.line}`, opacity: vis, transform: `translateX(${slide(t)}px)`, filter: t < a + 0.38 ? `blur(${mblur(slide, t, 0.35, 10)}px)` : undefined }}>
                  <span style={{ position: "relative", width: 54, height: 54, borderRadius: 16, border: `3px solid ${tick > 0.05 ? L.blue : L.mute}`, boxSizing: "border-box", flexShrink: 0 }}>
                    <span style={{ position: "absolute", inset: -3, borderRadius: 16, background: L.blue, transform: `scale(${Math.max(0, tick)})` }} />
                    <svg width="54" height="54" viewBox="0 0 54 54" style={{ position: "absolute", left: -3, top: -3 }}>
                      <path d="M15 28 L24 37 L40 19" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset={40 * (1 - draw)} />
                    </svg>
                  </span>
                  <span style={type(52, tick > 0.5 ? L.ink : L.sub, { letterSpacing: "-0.03em" })}>{it}</span>
                  <span style={{ marginLeft: "auto", ...type(22, L.blue, { letterSpacing: "0.1em" }), opacity: draw }}>0{i + 1}</span>
                </div>
              );
            })}
          </div>
        )}
        {/* the button: + → × */}
        <span style={{ position: "absolute", left: bx - 70 * (t >= c ? lerp(1, 0.62, clamp01(open)) : 1), top: by - 70 * (t >= c ? lerp(1, 0.62, clamp01(open)) : 1), width: 140 * (t >= c ? lerp(1, 0.62, clamp01(open)) : 1), height: 140 * (t >= c ? lerp(1, 0.62, clamp01(open)) : 1), borderRadius: "50%", background: L.blue, transform: `scale(${press}) rotate(${xRot}deg)`, boxShadow: "0 20px 40px -12px rgba(47,107,255,0.6)" }}>
          <span style={{ position: "absolute", left: "33%", top: "47%", width: "34%", height: "6%", borderRadius: 4, background: "#fff" }} />
          <span style={{ position: "absolute", left: "47%", top: "33%", width: "6%", height: "34%", borderRadius: 4, background: "#fff" }} />
        </span>
      </div>
      <Ring t={t} at={c} x={CX} y={CY} color={L.blue} size={300} />
      {t > Q.plus && t < c + 0.6 && <Cursor x={lerp(900, CX + 18, curK)} y={lerp(1560, CY + 22, curK)} opacity={clamp01((t - Q.plus) * 4) * (1 - p(t, c + 0.2, 0.3))} />}
    </AbsoluteFill>
  );
}

/* ================================================================== E · launch day (13.5 – 16.0) */
function Digit({ t, from, to, spins, at, dur, size }) {
  const total = spins * 10 + ((to - from + 10) % 10);
  const f = (tt) => from + total * p(tt, at, dur, E.io);
  const v = f(t);
  const blur = mblur(f, t, size * 0.12, 18);
  const frac = v - Math.floor(v);
  const d0 = Math.floor(v) % 10;
  const d1 = (d0 + 1) % 10;
  return (
    <span style={{ position: "relative", display: "inline-block", width: size * 0.6, height: size, overflow: "hidden", ...type(size, L.ink, { letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }) }}>
      <span style={{ position: "absolute", left: 0, top: -frac * size, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        <span style={{ display: "block", height: size }}>{d0}</span>
        <span style={{ display: "block", height: size }}>{d1}</span>
      </span>
    </span>
  );
}
function Launch({ t }) {
  const pop = spring(t, Q.cal, 2.2, 0.4);
  const out = p(t, Q.calOut, 0.5, E.in);
  const tileY = 820;
  const landWob = wobble(t, Q.rollLand, 5, 8) * 0.06;
  return (
    <AbsoluteFill style={{ background: L.white }}>
      <Panels t={t} />
      <Ring t={t} at={Q.rollLand} x={CX} y={tileY} color="rgba(255,143,177,0.9)" size={900} dur={0.9} width={0} />
      {/* soft filled pulses (Joi) */}
      {[0, 0.16].map((d, i) => {
        const k = p(t, Q.rollLand + d, 0.9, E.out);
        if (t < Q.rollLand + d || k >= 1) return null;
        return <span key={i} style={{ position: "absolute", left: CX - 450 * k, top: tileY - 450 * k, width: 900 * k, height: 900 * k, borderRadius: "50%", background: i ? "rgba(47,107,255,0.14)" : "rgba(255,143,177,0.22)", opacity: 1 - k }} />;
      })}
      <div style={{ position: "absolute", left: CX - 170, top: tileY - 170, width: 340, height: 340, borderRadius: 84, background: "#fff", boxShadow: "0 2px 0 #fff inset, 0 30px 60px -18px rgba(8,6,78,0.22), 0 70px 120px -50px rgba(47,107,255,0.4)", border: `1.5px solid ${L.line}`, transform: `translateY(${out * 1400}px) rotate(${out * 20}deg) scale(${Math.max(0, pop) * (1 + landWob)})`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 34, textAlign: "center", ...type(30, L.blue, { letterSpacing: "0.12em", textTransform: "uppercase" }) }}>Launch</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 96, display: "flex", justifyContent: "center" }}>
          <Digit t={t} from={2} to={0} spins={1} at={Q.roll} dur={Q.rollLand - Q.roll} size={190} />
          <Digit t={t} from={7} to={1} spins={3} at={Q.roll} dur={Q.rollLand - Q.roll} size={190} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1090, display: "flex", justifyContent: "center", transform: `translateY(${out * 300}px)`, opacity: 1 - out }}>
        <Pop t={t} at={Q.rollLand + 0.08} text="Day 01." size={150} color={L.ink} step={0.045} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1270, display: "flex", justifyContent: "center", opacity: 1 - out }}>
        <Dissolve t={t} at={Q.rollLand + 0.3} text="One Prime Studio is live." size={44} color={L.sub} spread={0.4} />
      </div>
    </AbsoluteFill>
  );
}

/* ================================================================== F · text → pill → banner (16.0 – 18.0) */
function Cta({ t }) {
  const txt = "Start your build";
  const pill = spring(t, Q.pill, 2.4, 0.45);
  const ban = spring(t, Q.banner, 1.8, 0.5);
  const banF = (tt) => spring(tt, Q.banner, 1.8, 0.5) * 300;
  const w = lerp(lerp(0, 700, pill), 960, ban);
  const h = lerp(140, 300, ban);
  const col = Q.ball2;
  const shrink = p(t, col, 0.35, E.io5);
  const W_ = lerp(w, BALL, shrink);
  const H_ = lerp(h, BALL, shrink);
  const bx = lerp(CX, 190, shrink);
  const spark = spring(t, Q.sparkle, 2.6, 0.4);
  const mb = mblur(banF, t, 0.25, 16);
  return (
    <AbsoluteFill style={{ background: L.white }}>
      <Panels t={t} />
      <div style={{ position: "absolute", left: 0, right: 0, top: CY - 45, display: "flex", justifyContent: "center", opacity: 1 - clamp01(pill * 3) }}>
        <span style={{ display: "inline-flex", ...type(90, L.ink) }}>
          {[...txt].map((ch, i) => {
            const a = Q.cta + i * 0.022;
            const f = (tt) => (1 - p(tt, a, 0.35, E.out)) * 160;
            return (
              <span key={i} style={{ display: "inline-block", transform: `translateX(${f(t)}px)`, opacity: p(t, a, 0.2), filter: `blur(${mblur(f, t, 0.3, 10)}px)` }}>
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </span>
      </div>
      {t >= Q.pill && (
        <div style={{ position: "absolute", left: bx - W_ / 2, top: CY - H_ / 2, width: W_, height: H_, borderRadius: H_ / 2 > 90 ? 80 : H_ / 2, background: `linear-gradient(120deg, ${L.blue}, ${L.deep})`, boxShadow: "0 30px 70px -20px rgba(47,107,255,0.6)", overflow: "hidden", filter: mb > 0.3 ? `blur(${mb}px)` : undefined }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, opacity: clamp01(pill * 2) * (1 - clamp01(ban * 3)) }}>
            <span style={type(52, "#fff", { letterSpacing: "-0.03em" })}>Start your build</span>
            <span style={type(52, "#fff")}>→</span>
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 36, paddingLeft: 70, opacity: clamp01(ban * 2 - 0.4) * (1 - shrink * 3) }}>
            <svg width="110" height="110" viewBox="-55 -55 110 110" style={{ transform: `rotate(${spark * 180}deg) scale(${Math.max(0, spark)})`, flexShrink: 0 }}>
              <path d="M0 -50 C6 -12 12 -6 50 0 C12 6 6 12 0 50 C-6 12 -12 6 -50 0 C-12 -6 -6 -12 0 -50 Z" fill="#fff" />
            </svg>
            <div>
              <div style={type(68, "#fff", { letterSpacing: "-0.035em" })}>One Prime Studio</div>
              <div style={{ marginTop: 14, ...type(34, "rgba(255,255,255,0.82)", { letterSpacing: "-0.01em" }) }}>Now open for projects</div>
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

/* ================================================================== G · finale (18.0 – 23.5) */
function Finale({ t }) {
  // the banner collapsed into a ball at (190, 960): two hops to the centre
  const k1 = [Q.ball2 + 0.35, 190, CY];
  const keys = [k1, [Q.ball2Bounce[0], 380, 1140], [Q.ball2Bounce[1], CX, 1000]];
  const pos = (tt) => {
    if (tt <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
    for (let i = 1; i < keys.length; i++) {
      const [ta, xa, ya] = keys[i - 1];
      const [tb, xb, yb] = keys[i];
      if (tt <= tb) {
        const u = (tt - ta) / (tb - ta);
        return { x: lerp(xa, xb, u), y: lerp(ya, yb, u) - 4 * 230 * u * (1 - u) };
      }
    }
    return { x: CX, y: 1000 };
  };
  const b = pos(t);
  const b2 = pos(t + 1 / 60);
  const vx = (b2.x - b.x) * 60;
  const vy = (b2.y - b.y) * 60;
  const sp = Math.hypot(vx, vy);
  let sq = 0;
  for (const l of Q.ball2Bounce) sq += 0.5 * wobble(t, l, 4.5, 9);
  const air = Math.abs(sq) < 0.02;
  const st = Math.min(0.5, sp / 3200);
  const grow = p(t, Q.fill2, 0.42, E.io5);
  const unf = p(t, Q.unfill, 0.6, E.io5);
  // the lockup sits where the intro put it
  const kOn = knobAt(LX, LY, S, 1);
  const holeR = lerp(1400, 0, unf);
  const coll = Q.collapse;
  const fadeAll = p(t, Q.end - 0.15, 0.3, E.io);
  const tagOut = p(t, coll, 0.3, E.in);

  const lockup = (light) => {
    const c = light ? "#fff" : L.ink;
    return (
      <>
        {/* "Prime Studio" writes on as strokes, then fills */}
        <svg width={1080} height={300} style={{ position: "absolute", left: 0, top: LY + 150, overflow: "visible" }}>
          {(() => {
            const text = "Prime Studio";
            const size = 112;
            const total = measure(text, size, 500, -0.035);
            let x = CX - total / 2;
            return [...text].map((ch, i) => {
              const wch = measure(ch, size, 500, -0.035);
              const a = Q.write + i * 0.06;
              const d = p(t, a, 0.5, E.io);
              const f = p(t, a + 0.35, 0.3, E.io);
              const o = p(t, coll + (11 - i) * 0.02, 0.28, E.in);
              const gx = x;
              x += wch;
              if (ch === " ") return null;
              const tx = lerp(gx, kOn.x, o);
              return (
                <text key={i} x={tx} y={130} fontFamily="Montreal" fontWeight={500} fontSize={size * (1 - o)} letterSpacing={0} fill={c} fillOpacity={f} stroke={c} strokeWidth={2.2} strokeDasharray={600} strokeDashoffset={600 * (1 - d)} strokeOpacity={1 - f}>
                  {ch}
                </text>
              );
            });
          })()}
        </svg>
        {t >= Q.icon && (
          <div style={{ position: "absolute", inset: 0, transform: `scale(${Math.max(0, spring(t, Q.icon, 2.4, 0.4))})`, transformOrigin: `${kOn.x}px ${kOn.y}px` }}>
            <Pill x={LX} y={LY} s={S} draw={1 - p(t, coll + 0.2, 0.3, E.in)} color={c} />
            <span style={{ position: "absolute", left: LX + 1.75 * S - 0.04 * S, top: LY + 0.9 * S * 0.5 - S * 0.56 }}>
              <Pop t={t} at={Q.icon + 0.1} text="ne" size={S} color={c} step={0.06} out={coll} style={{ letterSpacing: "-0.04em" }} />
            </span>
          </div>
        )}
      </>
    );
  };
  // knob: slides on after the icon pops, then at the end drops out with a squash
  const kk = clamp01(spring(t, Q.icon + 0.25, 2.2, 0.42));
  const kn = knobAt(LX, LY, S, t >= Q.icon + 0.25 ? kk : 0);
  const drop = p(t, coll + 0.45, 0.25, E.in);
  const endSq = wobble(t, coll + 0.7, 5, 9) * 0.45;
  const endY = lerp(kn.y, kn.y + 160, drop);
  const vanish = 1 - p(t, Q.end - 0.25, 0.25, E.backIn);
  return (
    <AbsoluteFill style={{ background: L.white }}>
      {/* white layer: ink lockup, tagline and CTA */}
      <Panels t={t} opacity={Math.max(unf, 1 - p(t, Q.ball2 + 0.35, 0.5))} />
      {t >= Q.unfill && (
        <>
          {lockup(false)}
          <div style={{ position: "absolute", left: 0, right: 0, top: LY + 360, display: "flex", justifyContent: "center", gap: 18, opacity: 1 - tagOut }}>
            {["Average", "is", "not", "an", "option."].map((w, i) => (
              <span key={w} style={{ position: "relative" }}>
                <Pop t={t} at={Q.tagline + i * 0.08} text={w} size={58} color={i === 0 ? L.mute : L.ink} step={0.02} />
                {i === 0 && <span style={{ position: "absolute", left: -4, right: -4, top: "52%", height: 6, borderRadius: 3, background: L.blue, transform: `scaleX(${p(t, Q.tagline + 0.5, 0.35, E.io)})`, transformOrigin: "left" }} />}
              </span>
            ))}
          </div>
          <div style={{ position: "absolute", left: CX - 330, top: LY + 470, width: 660, height: 110, borderRadius: 55, background: L.blue, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, transform: `scale(${Math.max(0, spring(t, Q.dm, 2.4, 0.4)) * (1 - tagOut)})`, boxShadow: "0 24px 50px -16px rgba(47,107,255,0.6)" }}>
            <span style={type(40, "#fff", { letterSpacing: "-0.02em" })}>DM One Prime Studio</span>
            <span style={{ ...type(40, "#fff"), transform: `translateX(${Math.sin(t * 6) * 5}px)` }}>→</span>
          </div>
        </>
      )}
      {/* blue layer: grows out of the ball, then closes back into the knob */}
      {t >= Q.fill2 - 0.01 && (
        <div style={{ position: "absolute", inset: 0, clipPath: t >= Q.unfill ? `circle(${holeR}px at ${kn.x}px ${kn.y}px)` : `circle(${BALL / 2 + grow * 1300}px at ${CX}px 1000px)`, background: L.blue }}>
          {lockup(true)}
        </div>
      )}
      {t < Q.fill2 && <Ball x={b.x} y={b.y} r={BALL / 2} color={L.blue} rot={air ? (Math.atan2(vy, vx) * 180) / Math.PI : 0} sx={air ? 1 + st : 1 + sq} sy={air ? 1 - st * 0.45 : 1 - sq} blur={Math.min(6, sp / 900)} />}
      {t >= Q.icon + 0.1 && <Ball x={kn.x} y={endY} r={kn.r * vanish} color={t >= Q.unfill + 0.58 ? L.ink : "#fff"} sx={1 + endSq} sy={1 - endSq} />}
      <Ring t={t} at={Q.icon + 0.3} x={kOn.x} y={kOn.y} color="#fff" size={300} />
      <span style={{ position: "absolute", inset: 0, background: "#fff", opacity: fadeAll }} />
    </AbsoluteFill>
  );
}

/* ================================================================== the film */
const SCENES = [
  [0, Bounce],
  [Q.fill + 0.4, Intro],
  [Q.punch, Punch],
  [Q.plus, Services],
  [Q.cal - 0.05, Launch],
  [Q.cta - 0.05, Cta],
  [Q.ball2 + 0.35, Finale],
];

export function LaunchFilm() {
  const t = useT();
  let S_ = SCENES[0][1];
  for (const [at, C] of SCENES) if (t >= at) S_ = C;
  return (
    <AbsoluteFill style={{ background: L.white, overflow: "hidden" }}>
      <S_ t={t} />
      <Audio src={staticFile("launch/master.wav")} />
    </AbsoluteFill>
  );
}
