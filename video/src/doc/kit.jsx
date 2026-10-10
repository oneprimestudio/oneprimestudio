import { D, E, p, SANS, clamp01, lerp, TL, cue } from "./time";

/* ------------------------------------------------------------------ type */
export const type = (size, color = D.ink, extra) => ({
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: size,
  lineHeight: 0.92,
  letterSpacing: "-0.045em",
  color,
  ...extra,
});
export const label = (size = 24, color = D.sub, extra) => ({
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
  ...extra,
});

/**
 * Kinetic masked word: rises out of its own mask with a small tilt that straightens as it lands,
 * leaves upward through the same mask. Every curve is in-out.
 */
export function K({ t, at, dur = 0.85, out, outDur = 0.6, from = 112, tilt = 7, children, style, inner }) {
  const k = p(t, at, dur, E.doc);
  const o = out == null ? 0 : p(t, out, outDur, E.io);
  const y = (1 - k) * from - o * from;
  const r = (1 - k) * tilt - o * tilt * 0.5;
  // motion blur: proportional to how far the word travels this frame
  const k2 = p(t + 1 / 60, at, dur, E.doc);
  const o2 = out == null ? 0 : p(t + 1 / 60, out, outDur, E.io);
  const blur = Math.min(7, Math.abs(k2 - k - (o2 - o)) * from * 0.9);
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "top",
        padding: "0.08em 0.05em 0.16em",
        margin: "-0.08em -0.05em -0.16em",
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-block",
          transform: `translateY(${y}%) rotate(${r}deg)`,
          transformOrigin: "0% 100%",
          filter: blur > 0.25 ? `blur(${blur.toFixed(2)}px)` : undefined,
        }}
      >
        {inner ? <span style={{ display: "inline-block", ...inner }}>{children}</span> : children}
      </span>
    </span>
  );
}

/** a row of kinetic words: words = [[text, at, innerStyle?], …] */
export function Row({ t, words, out, outStep = 0.04, gap = "0.24em", dur, style }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", columnGap: gap, ...style }}>
      {words.map(([w, at, st], i) => (
        <K key={i} t={t} at={at} dur={dur} out={out == null ? null : out + i * outStep} inner={st}>
          {w}
        </K>
      ))}
    </span>
  );
}

/** per-letter kinetic reveal (staggered masks) */
export function Letters({ t, at, text, step = 0.035, dur = 0.8, out, style }) {
  return (
    <span style={{ display: "inline-flex", ...style }}>
      {[...text].map((ch, i) => (
        <K key={i} t={t} at={at + i * step} dur={dur} out={out == null ? null : out + i * step * 0.6} tilt={0}>
          {ch === " " ? " " : ch}
        </K>
      ))}
    </span>
  );
}

/** vertical slot: rolls through `items`, one every `step`, from `at`; the last one stays */
export function Slot({ t, at, items, step = 0.32, dur = 0.42, style, color }) {
  const n = items.length;
  const f = Math.max(0, (t - at) / step);
  const i = Math.min(n - 1, Math.floor(f));
  const k = i >= n - 1 && f >= n - 1 ? 1 : p(t, at + i * step, dur, E.io);
  const lines = items.map((w, j) => {
    let y;
    if (t < at) y = j === 0 ? 110 : 220;
    else if (j === i) y = (1 - k) * 105;
    else if (j === i - 1) y = -k * 105;
    else y = j < i ? -220 : 220;
    return (
      <span key={j} style={{ position: j === 0 ? "relative" : "absolute", left: 0, top: 0, display: "inline-block", transform: `translateY(${y}%)`, whiteSpace: "nowrap", color: typeof color === "function" ? color(j) : color }}>
        {w}
      </span>
    );
  });
  return (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0.08em 0.05em 0.16em", margin: "-0.08em -0.05em -0.16em", ...style }}>
      {/* keep width of the widest item */}
      <span style={{ visibility: "hidden", display: "inline-grid" }}>
        {items.map((w, j) => (
          <span key={j} style={{ gridArea: "1/1", whiteSpace: "nowrap" }}>
            {w}
          </span>
        ))}
      </span>
      <span style={{ position: "absolute", left: "0.05em", top: "0.08em" }}>{lines}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ masks */
/** clip-path wipe in from a side: side = "up" | "down" | "left" | "right" */
export function wipe(k, side = "up", round = 0) {
  const a = (1 - k) * 100;
  const r = round ? ` round ${round}px` : "";
  if (side === "up") return `inset(${a}% 0 0 0${r})`;
  if (side === "down") return `inset(0 0 ${a}% 0${r})`;
  if (side === "left") return `inset(0 0 0 ${a}%${r})`;
  return `inset(0 ${a}% 0 0${r})`;
}
/** box that opens from its centre line (masking reveal for cards) */
export function openBox(k, round = 0) {
  const a = (1 - k) * 50;
  return `inset(${a}% 0 ${a}% 0${round ? ` round ${round}px` : ""})`;
}

/** hairline that draws from one end */
export function Rule({ t, at, dur = 0.9, x, y, w, h = 2, color = D.ink, origin = "left", style }) {
  const k = p(t, at, dur, E.io);
  return (
    <span
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: color,
        transform: `scaleX(${k})`,
        transformOrigin: origin,
        ...style,
      }}
    />
  );
}

/* ------------------------------------------------------------------ the mark */
/** the One Prime switch: k = 0 off (knob left), 1 on. draw = outline progress, fill = knob fill */
export function Switch({ s, k = 1, color = D.ink, fill = "transparent", knob = color, draw = 1, knobScale = 1, style }) {
  const b = 0.11 * s;
  const w = 1.75 * s;
  const h = 0.9 * s;
  const d = 0.52 * s;
  const inner = w - 2 * b;
  const left = 0.12 * s + k * (inner - 0.24 * s - d);
  const per = 2 * (w - h) + Math.PI * h;
  return (
    <span style={{ position: "relative", display: "inline-block", width: w, height: h, flexShrink: 0, ...style }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <rect x={b / 2} y={b / 2} width={w - b} height={h - b} rx={(h - b) / 2} fill={fill} stroke={color} strokeWidth={b} strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
      </svg>
      <span
        style={{
          position: "absolute",
          left: b + left,
          top: (h - d) / 2,
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

/* ------------------------------------------------------------------ UI bits */
export function Cursor({ x, y, scale = 1, opacity = 1, color = D.ink }) {
  return (
    <svg width={44 * scale} height={54 * scale} viewBox="0 0 22 27" style={{ position: "absolute", left: x - 3 * scale, top: y - 2 * scale, opacity, overflow: "visible" }}>
      <path d="M2 2 L2 21 L7 16.5 L10.5 24.5 L13.7 23.1 L10.3 15.3 L17 15.3 Z" fill={color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
export function Ripple({ t, at, x, y, color = D.accent, size = 120 }) {
  const k = p(t, at, 0.6, E.io);
  if (t < at || k >= 1) return null;
  return (
    <span style={{ position: "absolute", left: x - (size * k) / 2, top: y - (size * k) / 2, width: size * k, height: size * k, borderRadius: "50%", border: `3px solid ${color}`, opacity: 1 - k }} />
  );
}

/** skeleton text line */
export const Bar = ({ w, h = 14, c = D.card2, r = 8, style }) => <span style={{ display: "block", width: w, height: h, borderRadius: r, background: c, ...style }} />;

/** layered, slightly blue-tinted shadow — reads as depth on white */
export const SHADOW = "0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 6px rgba(8,6,78,0.05), 0 24px 48px -16px rgba(8,6,78,0.16), 0 70px 120px -50px rgba(47,107,255,0.30)";

/** a generic app window */
export function Win({ w, h, title, children, style, dots = true, bg = "#fff" }) {
  return (
    <div style={{ position: "absolute", width: w, height: h, background: bg, borderRadius: 22, border: `1.5px solid ${D.line}`, boxShadow: SHADOW, overflow: "hidden", ...style }}>
      <div style={{ height: 46, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `2px solid ${D.line}` }}>
        {dots && [0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: D.card2 }} />)}
        {title && <span style={{ ...label(17, D.sub), marginLeft: 10, letterSpacing: "0.04em", textTransform: "none" }}>{title}</span>}
      </div>
      <div style={{ position: "relative", height: h - 48 }}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ documentary chrome */
const CHAPTERS = [
  [0, "Prologue"],
  ["sheets", "01 — The problem"],
  ["turn", "Interlude"],
  ["mods", "02 — The product"],
  ["maera", "03 — The real world"],
  ["close", "Epilogue"],
];
export function Chrome({ t }) {
  const starts = CHAPTERS.map(([id]) => (id === 0 ? 0 : TL.scenes.find((s) => s.id === id).start + 1.0));
  let ci = 0;
  starts.forEach((s, i) => {
    if (t >= s) ci = i;
  });
  const draw = p(t, 0.2, 1.4, E.io);
  const fade = 1 - p(t, TL.duration - 1.6, 1.2, E.io);
  const prog = clamp01(t / TL.duration);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: fade }}>
      <div style={{ position: "absolute", left: 72, right: 72, top: 92, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, ...label(22, D.ink, { letterSpacing: "0.02em", textTransform: "none" }) }}>
          <K t={t} at={0.35} dur={0.9}>
            <Switch s={26} k={p(t, 0.9, 0.8, E.io)} />
          </K>
          <K t={t} at={0.45} dur={0.9}>
            One Prime Studio
          </K>
        </span>
        <span style={{ position: "relative", ...label(20, D.sub) }}>
          {CHAPTERS.map(([, name], i) => (
            <span key={i} style={{ position: i ? "absolute" : "relative", right: 0, top: 0, whiteSpace: "nowrap" }}>
              <K t={t} at={starts[i] + (i ? 0 : 0.55)} dur={0.8} out={i + 1 < starts.length ? starts[i + 1] - 0.45 : null} outDur={0.45} tilt={0}>
                {name}
              </K>
            </span>
          ))}
        </span>
      </div>
      {/* film progress */}
      <span style={{ position: "absolute", left: 72, right: 72, top: 140, height: 2, background: D.line, transform: `scaleX(${draw})`, transformOrigin: "left" }} />
      <span style={{ position: "absolute", left: 72, top: 140, height: 2, width: 936 * prog * draw, background: D.ink }} />
    </div>
  );
}

/* ------------------------------------------------------------------ chapter card */
/** "Chapter 0N / Title." — rule draws, number and title rise, then the card wipes away upward */
export function ChapterCard({ t, at, n, title, sub, until }) {
  if (t < at - 0.01 || t > until + 0.8) return null;
  const out = p(t, until, 0.75, E.io5);
  return (
    <div style={{ position: "absolute", inset: 0, background: D.bg, clipPath: `inset(0 0 ${out * 100}% 0)` }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: 760, transform: `translateY(${-out * 160}px)` }}>
        <div style={{ ...label(26, D.sub) }}>
          <K t={t} at={at + 0.05} dur={0.7} tilt={0}>
            Chapter {n}
          </K>
        </div>
        <Rule t={t} at={at} dur={0.9} x={0} y={56} w={900} color={D.ink} />
        <div style={{ position: "absolute", top: 92, ...type(124) }}>
          <K t={t} at={at + 0.12} dur={0.85}>
            {title}
          </K>
        </div>
        {sub && (
          <div style={{ position: "absolute", top: 250, ...type(40, D.sub, { letterSpacing: "-0.02em" }) }}>
            <K t={t} at={at + 0.3} dur={0.8} tilt={0}>
              {sub}
            </K>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ subtitles */
/** burnt-in documentary subtitles: the spoken line, word by word, at the bottom of the safe area */
export function Subs({ t, ids, y = 1500 }) {
  const c = ids.map(cue).find((cc) => t >= cc.speechStart - 0.3 && t < cc.speechEnd + 0.5);
  if (!c) return null;
  const out = p(t, c.speechEnd + 0.15, 0.35, E.io);
  return (
    <div style={{ position: "absolute", left: 100, right: 100, top: y, display: "flex", justifyContent: "center", textAlign: "center", opacity: 1 - out }}>
      <span style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.26em", rowGap: 6, ...type(42, D.ink, { lineHeight: 1.12, letterSpacing: "-0.02em" }) }}>
        {c.words.map((w, i) => {
          const on = p(t, w.t - 0.04, 0.22, E.io);
          return (
            <span key={i} style={{ color: on > 0.5 ? D.ink : D.mute, transition: "none", display: "inline-block", transform: `translateY(${(1 - p(t, w.t - 0.12, 0.4, E.doc)) * 10}px)`, opacity: lerp(0.0, 1, p(t, c.speechStart - 0.3, 0.3, E.io)) }}>
              {w.w}
            </span>
          );
        })}
      </span>
    </div>
  );
}

/** documentary lower third: small rule + label + title */
export function LowerThird({ t, at, kicker, title, x = 90, y = 1250, out }) {
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <Rule t={t} at={at} dur={0.7} x={0} y={0} w={64} h={4} color={D.accent} style={out != null ? { opacity: 1 - p(t, out, 0.4, E.io) } : null} />
      <div style={{ marginTop: 26, ...label(22, D.sub) }}>
        <K t={t} at={at + 0.08} dur={0.7} out={out} tilt={0}>
          {kicker}
        </K>
      </div>
      <div style={{ marginTop: 14, ...type(54) }}>
        <K t={t} at={at + 0.16} dur={0.8} out={out}>
          {title}
        </K>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ devices (drawn, no image files) */
/** iPhone-style handset: titanium rim, side keys, dynamic island, glass sheen */
export function Phone({ x = 290, y = 420, w = 500, h = 980, children, style, screen = "#fff", sheen = 0 }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>
      {/* keys */}
      {[[-7, 0.2, 70], [-7, 0.3, 110], [-7, 0.42, 110], [w + 1, 0.32, 160]].map(([kx, ky, kh], i) => (
        <span key={i} style={{ position: "absolute", left: kx, top: h * ky, width: 6, height: kh, borderRadius: 3, background: "linear-gradient(90deg,#8e8da3,#d9d8e2,#8e8da3)" }} />
      ))}
      <div style={{ position: "absolute", inset: 0, borderRadius: 78, padding: 7, background: "linear-gradient(135deg,#e8e7ef 0%,#9d9cb0 22%,#f4f3f8 45%,#8f8ea4 70%,#d6d5df 100%)", boxShadow: SHADOW }}>
        <div style={{ position: "absolute", inset: 7, borderRadius: 71, background: "#0b0a1f", padding: 12 }}>
          <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 60, overflow: "hidden", background: screen }}>
            {children}
            <span style={{ position: "absolute", left: "50%", top: 20, width: 150, height: 42, marginLeft: -75, borderRadius: 22, background: "#0b0a1f", zIndex: 5 }} />
            <span style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, transparent 30%, rgba(255,255,255,${0.22 + sheen * 0.2}) 46%, transparent 60%)`, transform: `translateX(${lerp(-60, 60, sheen)}%)`, zIndex: 6, pointerEvents: "none" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** MacBook-style laptop: black-bezel lid + aluminium deck, screen is 16:10 */
export function Laptop({ x = 60, y = 560, w = 960, children, style, sheen = 0 }) {
  const lidH = w * 0.64;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: lidH + 40, ...style }}>
      <div style={{ position: "absolute", left: w * 0.035, right: w * 0.035, top: 0, height: lidH, borderRadius: "26px 26px 6px 6px", background: "#0b0a1f", padding: "18px 18px 26px", boxShadow: "0 0 0 2px #c9c8d4 inset" }}>
        <span style={{ position: "absolute", left: "50%", top: 6, width: 8, height: 8, marginLeft: -4, borderRadius: 4, background: "#2a2940" }} />
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
          {children}
          <span style={{ position: "absolute", inset: 0, background: `linear-gradient(120deg, transparent 35%, rgba(255,255,255,${0.16 + 0.16 * sheen}) 48%, transparent 62%)`, transform: `translateX(${lerp(-50, 50, sheen)}%)`, pointerEvents: "none" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: lidH - 4, height: 30, borderRadius: "4px 4px 26px 26px", background: "linear-gradient(180deg,#f2f1f6 0%,#c9c8d4 55%,#8f8ea4 100%)", boxShadow: "0 40px 60px -25px rgba(8,6,78,0.45), 0 70px 120px -40px rgba(47,107,255,0.35)" }}>
        <span style={{ position: "absolute", left: "50%", top: 0, width: w * 0.16, height: 10, marginLeft: -w * 0.08, borderRadius: "0 0 10px 10px", background: "#b2b1c0" }} />
      </div>
    </div>
  );
}
