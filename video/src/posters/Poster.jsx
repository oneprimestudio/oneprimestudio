import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, MONO, SANS } from "../lib/core";
import posters from "./posters";

/*
 * Instagram posters (4:5, 1080×1350): a full-bleed photograph with the type laid straight onto it, after the
 * reference the user chose: wide-tracked uppercase titles, small body text, frosted-glass cards, thin outline
 * pills on leader lines pointing into the picture, small stats.
 *
 * Everything sits on a golden-ratio grid. φ = 1.618; the frame's golden lines are
 *   x: 413 · 667   (1080 / φ², 1080 / φ)        y: 516 · 834   (1350 / φ², 1350 / φ)
 * and the type steps on φ too: 18 · 29 · 47 · 76 px. The margin is 54 (1080 / 20).
 * Facts come from src/lib/work.ts; the project's own screen sits in the glass card as the proof.
 */

export const PHI = 1.618;
export const GX = [Math.round(1080 / PHI / PHI), Math.round(1080 / PHI)]; // 413, 667
export const GY = [Math.round(1350 / PHI / PHI), Math.round(1350 / PHI)]; // 516, 834
const M = 54;
const T = { label: 18, sub: 29, mid: 47, title: 76 };

function Switch({ color, size = 1 }) {
  return (
    <svg viewBox="0 0 1064 547" style={{ width: `${1.064 * size}em`, height: `${0.547 * size}em`, overflow: "visible", position: "relative", top: "0.016em" }}>
      <rect x="48.75" y="48.75" width="966.5" height="449.5" rx="224.75" fill="none" stroke={color} strokeWidth="97.5" />
      <circle cx="790.5" cy="273.5" r="136" fill={color} />
    </svg>
  );
}

function Logo({ color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.32em", lineHeight: 1, color, fontFamily: SANS, fontWeight: 500 }}>
      <span style={{ display: "inline-flex", alignItems: "baseline" }}>
        <Switch color={color} />
        <span style={{ marginLeft: "-0.027em", letterSpacing: "-0.04em" }}>ne</span>
      </span>
      <span style={{ letterSpacing: "-0.03em" }}>Prime Studio</span>
    </span>
  );
}

const glass = (tone) => ({
  background: tone === "dark" ? "rgba(8,6,40,0.28)" : "rgba(255,255,255,0.34)",
  backdropFilter: "blur(22px) saturate(1.2)",
  WebkitBackdropFilter: "blur(22px) saturate(1.2)",
  boxShadow: `inset 0 0 0 1px ${tone === "dark" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.7)"}, 0 30px 60px -30px rgba(0,0,0,0.35)`,
  borderRadius: 22,
});

const Label = ({ children, ink, style }) => (
  <div style={{ fontFamily: MONO, fontSize: T.label, letterSpacing: "0.16em", textTransform: "uppercase", color: ink, ...style }}>{children}</div>
);

/** a thin outline pill on a leader line that ends in a dot on the picture */
function Callout({ text, x, y, to, ink, tone }) {
  const w = text.length * 10.6 + 44;
  const h = 46;
  const side = to[0] > x + w / 2 ? x + w : x; // the line leaves from the pill's nearer end
  return (
    <>
      <svg style={{ position: "absolute", inset: 0, width: 1080, height: 1350, overflow: "visible" }}>
        <line x1={side} y1={y + h / 2} x2={to[0]} y2={to[1]} stroke={ink} strokeWidth="1.5" opacity="0.8" />
        <circle cx={to[0]} cy={to[1]} r="6" fill={ink} />
        <circle cx={to[0]} cy={to[1]} r="14" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.6" />
      </svg>
      <div style={{ position: "absolute", left: x, top: y, height: h, width: w, borderRadius: h / 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontSize: 20, color: ink, whiteSpace: "nowrap", ...glass(tone) }}>
        {text}
      </div>
    </>
  );
}

export function Poster({ n = 0 }) {
  const p = posters[n];
  const ink = p.ink;
  return (
    <AbsoluteFill style={{ background: "#111", fontFamily: SANS, color: ink, overflow: "hidden" }}>
      <Img src={staticFile(`posters/${p.photo}`)} style={{ position: "absolute", inset: 0, width: 1080, height: 1350, objectFit: "cover", objectPosition: p.focus, transform: `scale(${p.zoom ?? 1})`, transformOrigin: p.focus }} />
      {p.shade ? <AbsoluteFill style={{ background: p.shade }} /> : null}

      {/* top row: the case label at the margin, the counter at the right margin */}
      <Label ink={ink} style={{ position: "absolute", left: M, top: M }}>{p.label}</Label>
      <Label ink={ink} style={{ position: "absolute", right: M, top: M }}>{p.count}</Label>

      {/* the title block, hung from its golden line */}
      <div style={{ position: "absolute", left: p.titleX ?? M, top: p.titleY, width: p.titleW ?? 1080 - 2 * M, textAlign: p.align ?? "left" }}>
        <Label ink={ink} style={{ opacity: 0.75, marginBottom: 22 }}>{p.kicker}</Label>
        <div style={{ fontSize: p.titleSize ?? T.title, fontWeight: 400, letterSpacing: "0.07em", lineHeight: 1.04, textTransform: "uppercase" }}>
          {p.title.map((l) => (
            <div key={l}>{l}</div>
          ))}
        </div>
        <div style={{ marginTop: 22, fontSize: T.sub, letterSpacing: "-0.01em", opacity: 0.9 }}>{p.client}</div>
        <div style={{ marginTop: 14, fontSize: 20, lineHeight: 1.45, maxWidth: p.bodyW ?? 520, opacity: 0.8, marginLeft: p.align === "right" ? "auto" : 0 }}>{p.body}</div>
      </div>

      {p.callouts.map((c) => (
        <Callout key={c.text} {...c} ink={ink} tone={p.tone} />
      ))}

      {/* stats: number on the φ scale, label small beneath */}
      <div style={{ position: "absolute", left: p.statsX ?? M, top: p.statsY, display: "flex", flexDirection: p.statsRow ? "row" : "column", gap: p.statsRow ? 44 : 26 }}>
        {p.stats.map(([num, lab]) => (
          <div key={lab}>
            <div style={{ fontSize: T.title, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}>{num}</div>
            <Label ink={ink} style={{ marginTop: 8, fontSize: 15, opacity: 0.75 }}>{lab}</Label>
          </div>
        ))}
      </div>

      {/* the proof: the project's live screen in a glass card */}
      <div style={{ position: "absolute", left: p.cardX, top: p.cardY, width: p.cardW, padding: 12, ...glass(p.tone) }}>
        <div style={{ borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ height: 30, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: "#f2f1ed" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: "#cfcdc6" }} />
            ))}
            <span style={{ marginLeft: 10, fontFamily: SANS, fontSize: 13, color: "#77756e" }}>{p.url}</span>
          </div>
          <Img src={staticFile(`posters/${p.screen}`)} style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", objectPosition: "50% 0%", display: "block" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 6px 2px", fontFamily: SANS, fontSize: 17, color: ink }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: p.dot }} />
            Live
          </span>
          <span style={{ opacity: 0.8 }}>{p.scope}</span>
        </div>
      </div>

      {/* footer on the bottom margin */}
      <Label ink={ink} style={{ position: "absolute", left: M, bottom: M, fontSize: 15, opacity: 0.8 }}>{p.foot}</Label>
      {/* the mark, in a glass pill so it reads on any part of the picture */}
      <div style={{ position: "absolute", right: M, bottom: M - 14, height: 50, padding: "0 20px", display: "flex", alignItems: "center", fontSize: 24, ...glass(p.tone) }}>
        <Logo color={ink} />
      </div>
    </AbsoluteFill>
  );
}
