import { A, E, GUTTER, SANS, clamp01, level, lerp, p } from "./time";

/* ------------------------------------------------------------------ type (Montreal only — no mono in this film) */
export const display = (size, color = A.ink, extra) => ({
  fontFamily: SANS,
  fontWeight: 500,
  fontSize: size,
  letterSpacing: "-0.05em",
  lineHeight: 0.9,
  color,
  ...extra,
});

/**
 * The site's heading animation (lib/goo.ts, after bleibtgleich.dev): the text arrives blurred and a
 * sharp alpha threshold turns the blur into blobs that firm up into letters. Solid colours only —
 * the threshold erases anything translucent.
 */
export function Goo({ id, t, at, dur = 0.9, children, style, rise = 0.35 }) {
  const k = p(t, at, dur, E.menu);
  if (t < at) return <span style={{ display: "inline-block", opacity: 0, ...style }}>{children}</span>;
  const blur = lerp(18, 0, k);
  const live = k < 0.995;
  return (
    <span style={{ display: "inline-block", position: "relative", ...style }}>
      {live && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={id} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation={blur} />
            <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
          </filter>
        </svg>
      )}
      <span
        style={{
          display: "inline-block",
          filter: live ? `url(#${id})` : undefined,
          opacity: clamp01(k * 4),
          transform: `translateY(${(1 - k) * rise}em)`,
        }}
      >
        {children}
      </span>
    </span>
  );
}

/** a heading set as stepped lines (em indents), each line gooing in at its own time */
export function Stepped({ id, t, lines, size, color = A.ink, style, dur = 0.9 }) {
  return (
    <div style={{ ...display(size, color), ...style }}>
      {lines.map(([text, indent, at, lineStyle], i) => (
        <div key={i} style={{ paddingLeft: indent, whiteSpace: "nowrap", height: "0.9em" }}>
          <Goo id={`${id}-${i}`} t={t} at={at} dur={dur} style={lineStyle}>
            {text}
          </Goo>
        </div>
      ))}
    </div>
  );
}

/** a section's opening: the page's hairline drawing across, with the bullet riding the kick */
export function Rule({ t, at, y = 210, color = A.ink, ruleColor = A.rule }) {
  const k = p(t, at, 1.0, E.menu);
  return (
    <div style={{ position: "absolute", left: GUTTER, right: GUTTER, top: y }}>
      <div style={{ height: 1.5, background: ruleColor, transform: `scaleX(${k})`, transformOrigin: "0 50%" }} />
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 24,
          width: 14,
          height: 14,
          borderRadius: 7,
          background: color,
          transform: `scale(${p(t, at + 0.1, 0.45, E.back) * (1 + 0.35 * level("kick", t))})`,
        }}
      />
    </div>
  );
}
