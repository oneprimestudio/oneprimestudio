import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import { clamp01, E, hash, L, lerp, measure, p, spring, type, wobble } from "../launch/lib";
import Q from "./cues.json";

/*
 * One Prime Studio — launch intro, "Introducing Logotype" style (1080×1920, 60 fps, 19 s).
 * Small, quiet type on white. "Introducing" folds into a spinning ring that settles into the
 * switch; the knob drops in, clicks on, the wordmark slides out. Then a mosaic of the studio's
 * real work drifts upward around a single line of text, the services arrive as three cards, and
 * the mark closes the film. Elastic where things land, reverb under everything.
 */

const CX = 540;
const CY = 960;
const useT = () => useCurrentFrame() / Q.fps;
const A = (f) => staticFile(f);

/* ================================================================== text helpers */
/** letters drift up out of a soft blur, staggered; leave the same way */
function Soft({ t, at, text, size = 58, color = L.ink, out, step = 0.028, style }) {
  return (
    <span style={{ display: "inline-flex", ...type(size, color, { letterSpacing: "-0.03em" }), ...style }}>
      {[...text].map((ch, i) => {
        const k = p(t, at + i * step, 0.55, E.out);
        const o = out == null ? 0 : p(t, out + i * step * 0.5, 0.4, E.in);
        const v = k * (1 - o);
        return (
          <span key={i} style={{ display: "inline-block", opacity: v, transform: `translateY(${(1 - k) * 0.35 - o * 0.35}em)`, filter: v < 0.99 ? `blur(${(1 - v) * 8}px)` : undefined }}>
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </span>
  );
}

/* ================================================================== the mark */
const S = 78; // lockup size: small and quiet, like the reference
const PW = 1.75 * S;
const PH = 0.9 * S;
const B = 0.11 * S;
const KD = 0.52 * S;
const WORD = "ne Prime Studio";
const wordW = () => measure("ne", S, 500, -0.04) + measure(" Prime Studio", S, 500, -0.03);
const lockLeft = () => CX - (PW - 0.04 * S + wordW()) / 2;
const knobX = (left, k) => left + B + 0.12 * S + k * (PW - 2 * B - 0.24 * S - KD) + KD / 2;

/**
 * The lockup at a given state. `left` is the pill's x; `wordK` 0..1 slides the wordmark out from
 * behind the pill; `ring` (0..1) is the spin-in, drawing the pill as a coin flipping to rest.
 */
function Lockup({ t, left, top, wordK, knob, ring, color = L.ink }) {
  // ring: spins like a coin (scaleX = |cos θ|), tilted, then stretches from a circle into the pill
  const spinning = ring < 1;
  const theta = ring * Math.PI * 4;
  const sx = spinning ? Math.max(0.06, Math.abs(Math.cos(theta))) : 1;
  const tilt = (1 - ring) * 24;
  const stretch = spinning ? 0 : clamp01(spring(t, Q.settle, 2.4, 0.38));
  const w = lerp(PH, PW, stretch) + (spinning ? 0 : Math.max(0, spring(t, Q.settle, 2.4, 0.38) - 1) * PW * 0.6);
  const cx = left + PW / 2;
  return (
    <>
      {/* wordmark: revealed from behind the pill */}
      <div style={{ position: "absolute", left: left + PW - 0.04 * S, top: top + PH / 2 - S * 0.56, width: wordW() + 20, height: S * 1.25, overflow: "hidden" }}>
        <div style={{ display: "flex", transform: `translateX(${(wordK - 1) * 105}%)`, filter: wordK > 0 && wordK < 1 ? `blur(${(1 - wordK) * 6}px)` : undefined }}>
          <span style={type(S, color, { letterSpacing: "-0.04em" })}>ne</span>
          <span style={type(S, color, { letterSpacing: "-0.03em" })}>&nbsp;Prime Studio</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: cx - w / 2, top, width: w, height: PH, transform: `rotate(${tilt}deg) scaleX(${sx})`, background: L.white }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: PH, border: `${B}px solid ${color}`, boxSizing: "border-box" }} />
      </div>
      {knob}
    </>
  );
}

/* ================================================================== mosaic cards */
const KINDS = ["maera-dash", "slide-logo", "code", "blue-aa", "maera-cal", "sky", "kanban", "badge", "store", "slide-services", "chart", "ink-logo", "maera-shop", "dither", "phone", "swatches", "maera-bill", "slide-cta"];
const LABEL = {
  "maera-dash": "Maera · Salon CRM",
  "maera-cal": "Maera · Bookings",
  "maera-shop": "Maera · Point of sale",
  "maera-bill": "Maera · Receipts",
  sky: "One Prime",
  kanban: "CRM pipeline",
  store: "Shopify store",
  chart: "SaaS dashboard",
  phone: "Mobile app",
  code: "Development",
  "blue-aa": "Type system",
  swatches: "Brand colours",
  dither: "Visual language",
};
const COLS = [
  { x: 36, w: 318, y0: 1960, speed: 1.0 },
  { x: 381, w: 318, y0: 2210, speed: 0.86 },
  { x: 726, w: 318, y0: 2080, speed: 1.1 },
];
const HEIGHTS = [380, 300, 430, 260, 350, 400, 290];
const CARDS = (() => {
  const out = [];
  let k = 0;
  COLS.forEach((c, ci) => {
    let y = c.y0;
    let j = ci * 2;
    while (y < 4900) {
      const kind = KINDS[k % KINDS.length];
      const portrait = kind.startsWith("slide");
      const h = portrait ? Math.round(c.w * 1.25) : HEIGHTS[j % HEIGHTS.length];
      out.push({ x: c.x + (hash(k, 3, 1) - 0.5) * 16, w: c.w, y, h, speed: c.speed, kind, i: k });
      y += h + 30;
      j += 1;
      k += 5; // spread kinds so neighbours differ
    }
  });
  return out;
})();

const Bar = ({ w, h = 12, c = "#e9e9f0", r = 6, style }) => <span style={{ display: "block", width: w, height: h, borderRadius: r, background: c, ...style }} />;

function CardFace({ kind, w, h, t }) {
  const cover = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  if (kind.startsWith("maera-")) return <Img src={A(`launch2/${kind}.jpg`)} style={{ ...cover, objectPosition: "50% 30%" }} />;
  if (kind.startsWith("slide-")) return <Img src={A(`launch2/${kind}.jpg`)} style={cover} />;
  if (kind === "sky") return <Img src={A("doc/assets/sky.jpg")} style={{ ...cover, objectPosition: "50% 20%" }} />;
  if (kind === "badge") return <Img src={A("doc/assets/badge.jpg")} style={{ ...cover, transform: "scale(1.5)", objectPosition: "50% 30%" }} />;
  if (kind === "dither") return (
    <div style={{ position: "absolute", inset: 0, background: "#f1f1f5" }}>
      <Img src={A("doc/assets/dither.png")} style={{ position: "absolute", left: "10%", top: "8%", width: "80%", height: "84%", objectFit: "contain", mixBlendMode: "multiply", transform: `rotate(${t * 8}deg)` }} />
    </div>
  );
  if (kind === "ink-logo") return (
    <div style={{ position: "absolute", inset: 0, background: L.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "relative", width: 1.75 * 54, height: 0.9 * 54, borderRadius: 60, border: `${0.11 * 54}px solid #fff`, boxSizing: "border-box" }}>
        <span style={{ position: "absolute", right: 0.12 * 54 - 2, top: (0.9 * 54 - 2 * 0.11 * 54 - 0.52 * 54) / 2, width: 0.52 * 54, height: 0.52 * 54, borderRadius: "50%", background: "#fff" }} />
      </span>
      <span style={{ ...type(54, "#fff", { letterSpacing: "-0.04em" }), marginLeft: -2 }}>ne</span>
    </div>
  );
  if (kind === "blue-aa") return (
    <div style={{ position: "absolute", inset: 0, background: L.blue }}>
      <span style={{ position: "absolute", left: 26, top: 18, ...type(150, "#fff", { letterSpacing: "-0.05em" }) }}>Aa</span>
    </div>
  );
  if (kind === "swatches") return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {[L.ink, L.blue, "#7b5cff", "#e6edff", "#ffffff"].map((c) => <span key={c} style={{ flex: 1, background: c }} />)}
    </div>
  );
  if (kind === "code") return (
    <div style={{ position: "absolute", inset: 0, background: "#0d0c26", padding: "26px 24px" }}>
      {[[0, 60, "#7b5cff"], [1, 120, "#3fd0ff"], [1, 90, "#ffffff55"], [2, 140, "#ff8fb1"], [2, 70, "#ffffff55"], [1, 100, "#3fd0ff"], [0, 40, "#7b5cff"], [0, 150, "#ffffff55"], [1, 80, "#2f6bff"]].map(([ind, ww, c], i) => (
        <Bar key={i} w={ww} h={10} c={c} style={{ marginLeft: ind * 22, marginBottom: 14 }} />
      ))}
    </div>
  );
  if (kind === "kanban") return (
    <div style={{ position: "absolute", inset: 0, background: "#f4f4f8", display: "flex", gap: 10, padding: 18 }}>
      {[3, 2, 1].map((n, c) => (
        <div key={c} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: n }).map((_, r) => <div key={r} style={{ height: 64, borderRadius: 10, background: c === 2 ? L.blue : "#fff", padding: 10 }}><Bar w="70%" h={8} c={c === 2 ? "#ffffff" : L.ink} /><Bar w="45%" h={7} style={{ marginTop: 8 }} c={c === 2 ? "#ffffff88" : "#e2e2ea"} /></div>)}
        </div>
      ))}
    </div>
  );
  if (kind === "store") return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(140deg,#ffb38a,#ffe2cf)", padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ borderRadius: 10, background: i === 1 ? "#ffffffcc" : "#ffffff88" }} />)}
    </div>
  );
  if (kind === "chart") {
    const d = clamp01((t - Q.mosaic) / 2.5);
    return (
      <div style={{ position: "absolute", inset: 0, background: "#fff", padding: 22 }}>
        <Bar w={90} h={10} c={L.ink} />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>{[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 54, borderRadius: 10, background: "#f4f4f8" }} />)}</div>
        <svg width="100%" height="55%" viewBox="0 0 280 140" preserveAspectRatio="none" style={{ marginTop: 14 }}>
          <path d="M0 120 C40 112 60 80 100 86 S170 40 210 46 S260 12 280 8" fill="none" stroke={L.blue} strokeWidth="4" strokeLinecap="round" strokeDasharray="400" strokeDashoffset={400 * (1 - d)} />
        </svg>
      </div>
    );
  }
  // phone
  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#7b5cff,#2f6bff)" }}>
      <div style={{ position: "absolute", left: "50%", top: 30, width: 150, height: h + 40, marginLeft: -75, borderRadius: 30, background: "#fff", border: "5px solid #0d0c26", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <Bar w={46} h={8} c="#0d0c26" style={{ alignSelf: "center" }} />
        <Bar w="70%" h={12} c={L.ink} />
        <div style={{ height: 70, borderRadius: 12, background: "#e6edff" }} />
        <div style={{ height: 40, borderRadius: 10, background: "#f4f4f8" }} />
        <div style={{ height: 40, borderRadius: 10, background: "#f4f4f8" }} />
      </div>
    </div>
  );
}

/** how far the mosaic has travelled (px): rush in, drift, rush out */
function scroll(t) {
  const enter = p(t, Q.mosaic, 1.1, E.out) * 1900;
  const cruise = Math.max(0, Math.min(t, Q.exit) - Q.mosaic) * 105;
  const exit = p(t, Q.exit, 0.95, E.io5) * 2800;
  return enter + cruise + exit;
}

function Mosaic({ t }) {
  if (t < Q.mosaic - 0.05 || t > Q.exit + 1.1) return null;
  const s = scroll(t);
  const s2 = scroll(t + 1 / 60);
  return (
    <div style={{ position: "absolute", inset: 0, WebkitMaskImage: "linear-gradient(180deg, #000 0%, #000 37%, rgba(0,0,0,0) 44%, rgba(0,0,0,0) 56%, #000 63%, #000 100%)", maskImage: "linear-gradient(180deg, #000 0%, #000 37%, rgba(0,0,0,0) 44%, rgba(0,0,0,0) 56%, #000 63%, #000 100%)" }}>
      {CARDS.map((c) => {
        const y = c.y - s * c.speed;
        if (y > 1960 || y + c.h < -40) return null;
        const v = (s2 - s) * c.speed * 60; // px/s, for motion blur
        const blur = Math.min(10, v / 450);
        // each card settles with a little spring as the rush ends
        const settle = wobble(t, Q.mosaic + 1.0 + (c.i % 7) * 0.03, 2.2, 5) * 10;
        return (
          <div key={c.i} style={{ position: "absolute", left: c.x, top: y + settle, width: c.w, height: c.h, borderRadius: 16, overflow: "hidden", background: "#eee", boxShadow: "0 30px 50px -30px rgba(8,6,78,0.35)", filter: blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
            <CardFace kind={c.kind} w={c.w} h={c.h} t={t} />
            {LABEL[c.kind] && (
              <span style={{ position: "absolute", left: 14, bottom: 12, display: "flex", alignItems: "center", gap: 8, ...type(17, ["blue-aa", "code", "ink-logo", "phone", "sky", "badge"].includes(c.kind) ? "#fff" : L.ink, { letterSpacing: "0" }) }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "currentColor" }} />
                {LABEL[c.kind]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== services: three cards */
const SVC = [
  { name: "Design", lead: "Look the part", items: ["Custom UI / UX", "Brand identity", "Logo identity"] },
  { name: "Build", lead: "Ship the product", items: ["Websites", "Mobile apps", "SaaS products", "CRM & ERP"], dark: true },
  { name: "Grow", lead: "Sell, everywhere", items: ["Custom Shopify", "E-commerce", "Ongoing partnership"] },
];
function Services({ t }) {
  if (t < Q.svc - 0.05 || t > Q.svcOut + 1) return null;
  const out = p(t, Q.svcOut, 0.7, E.io5);
  return (
    <>
      {SVC.map((c, i) => {
        const at = Q.svc + [0.08, 0, 0.16][i];
        const k = spring(t, at, 1.7, 0.55);
        const w = 318;
        const h = c.dark ? 720 : 640;
        const x = 36 + i * 345;
        const y0 = c.dark ? 760 : 800;
        const y = y0 + (1 - k) * 1300 - out * 1800;
        const fg = c.dark ? "#fff" : L.ink;
        const sub = c.dark ? "rgba(255,255,255,0.6)" : L.sub;
        return (
          <div key={c.name} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 26, background: c.dark ? L.ink : "#fff", border: c.dark ? "none" : `1.5px solid ${L.line}`, boxShadow: c.dark ? "0 40px 80px -30px rgba(8,6,78,0.6)" : "0 30px 60px -30px rgba(8,6,78,0.25)", padding: "34px 28px", boxSizing: "border-box" }}>
            <div style={type(22, c.dark ? "#9db6ff" : L.blue, { letterSpacing: "0.1em", textTransform: "uppercase" })}>{c.name}</div>
            <div style={{ marginTop: 16, ...type(40, fg, { letterSpacing: "-0.035em", whiteSpace: "normal", lineHeight: 1.05 }) }}>{c.lead}</div>
            <div style={{ marginTop: 34, height: 1.5, background: c.dark ? "rgba(255,255,255,0.15)" : L.line }} />
            {c.items.map((it, j) => {
              const tick = spring(t, at + 0.45 + j * 0.12, 2.6, 0.45);
              return (
                <div key={it} style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 14, ...type(26, fg, { letterSpacing: "-0.015em" }) }}>
                  <span style={{ position: "relative", width: 30, height: 30, borderRadius: 15, background: c.dark ? L.blue : "#e6edff", flexShrink: 0, transform: `scale(${Math.max(0, tick)})` }}>
                    <svg width="30" height="30" viewBox="0 0 30 30" style={{ position: "absolute", inset: 0 }}><path d="M9 15.5 L13.5 20 L21.5 11" fill="none" stroke={c.dark ? "#fff" : L.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span style={{ opacity: clamp01(tick * 2) }}>{it}</span>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 28, right: 28, bottom: 30, height: 70, borderRadius: 35, background: c.dark ? L.blue : "#f2f3f8", display: "flex", alignItems: "center", justifyContent: "center", ...type(24, c.dark ? "#fff" : L.ink, { letterSpacing: "-0.01em" }) }}>
              {c.dark ? "DM to start →" : "Included"}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ================================================================== the film */
export function Launch2() {
  const t = useT();
  const left = lockLeft();
  const top = CY - PH / 2;
  // opening: pill starts centred on the ring, slides to the lockup position as the word comes out
  const wordK = p(t, Q.word, 0.8, E.io5);
  const pillLeft = lerp(CX - PW / 2, left, wordK);
  const ring = p(t, Q.ring, Q.settle - Q.ring, E.out);
  // the knob drops in, squashes, then switches on
  const fall = p(t, Q.knob, Q.knobLand - Q.knob, E.in);
  const sq = wobble(t, Q.knobLand, 5, 9) * 0.45;
  const kOn = clamp01(spring(t, Q.on, 2.3, 0.4)) + Math.max(0, spring(t, Q.on, 2.3, 0.4) - 1);
  const kx = knobX(pillLeft, t >= Q.on ? kOn : 0);
  const ky = lerp(-80, top + PH / 2, fall);
  // lockup leaves as the mosaic rushes in
  const leave = p(t, Q.mosaic - 0.05, 0.6, E.io5);
  const openVis = t < Q.mosaic + 0.6;
  // ending: lockup again
  const endK = p(t, Q.end, 0.8, E.io5);
  const endOn = clamp01(spring(t, Q.endOn, 2.3, 0.4)) + Math.max(0, spring(t, Q.endOn, 2.3, 0.4) - 1);
  const fadeOut = p(t, Q.fade, 0.45, E.io);
  return (
    <AbsoluteFill style={{ background: L.white, overflow: "hidden" }}>
      {/* soft light */}
      <span style={{ position: "absolute", left: -300, top: 300, width: 1700, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(47,107,255,0.06), transparent 60%)" }} />

      {/* 1 · Introducing → ring → mark */}
      {t < Q.ring + 0.2 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: CY - 30, display: "flex", justifyContent: "center", transform: `scaleX(${1 - p(t, Q.introOut, 0.3, E.in)})`, filter: t > Q.introOut ? `blur(${p(t, Q.introOut, 0.3) * 10}px)` : undefined, opacity: 1 - p(t, Q.introOut + 0.15, 0.15) }}>
          <Soft t={t} at={Q.intro} text="Introducing" />
        </div>
      )}
      {t >= Q.ring && openVis && (
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-leave * 260}px) scale(${1 - leave * 0.25})`, opacity: 1 - leave, filter: leave > 0.01 ? `blur(${leave * 8}px)` : undefined }}>
          <Lockup
            t={t}
            left={pillLeft}
            top={top}
            wordK={wordK}
            ring={ring}
            knob={t >= Q.knob && <span style={{ position: "absolute", left: kx - KD / 2, top: ky - KD / 2, width: KD, height: KD, borderRadius: "50%", background: L.ink, transform: `scale(${1 + sq}, ${1 - sq})`, transformOrigin: "50% 100%" }} />}
          />
        </div>
      )}

      {/* 2 · the mosaic, and the line in the middle of it */}
      <Mosaic t={t} />
      {t >= Q.t1 - 0.1 && t < Q.t2 + 0.6 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: CY - 30, display: "flex", justifyContent: "center" }}>
          <Soft t={t} at={Q.t1} text="Websites, apps & platforms" out={Q.t2 - 0.45} />
        </div>
      )}
      {t >= Q.t2 - 0.1 && t < Q.exit + 0.5 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: CY - 30, display: "flex", justifyContent: "center" }}>
          <Soft t={t} at={Q.t2} text="For fast-growing businesses" out={Q.exit - 0.3} />
        </div>
      )}

      {/* 3 · every service */}
      {t >= Q.t3 - 0.1 && t < Q.svcOut + 0.8 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 600, display: "flex", justifyContent: "center", transform: `translateY(${-p(t, Q.svcOut, 0.7, E.io5) * 700}px)` }}>
          <Soft t={t} at={Q.t3} text="Every service. One studio." out={Q.svcOut - 0.1} />
        </div>
      )}
      <Services t={t} />

      {/* 4 · the mark closes */}
      {t >= Q.end && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - fadeOut, filter: fadeOut > 0.01 ? `blur(${fadeOut * 8}px)` : undefined }}>
          <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - endK) * 120}px)`, opacity: clamp01(endK * 1.5) }}>
            <Lockup t={t} left={lerp(CX - PW / 2, left, p(t, Q.end + 0.35, 0.8, E.io5))} top={top} wordK={p(t, Q.end + 0.35, 0.8, E.io5)} ring={1} knob={<span style={{ position: "absolute", left: knobX(lerp(CX - PW / 2, left, p(t, Q.end + 0.35, 0.8, E.io5)), t >= Q.endOn ? endOn : 0) - KD / 2, top: top + PH / 2 - KD / 2, width: KD, height: KD, borderRadius: "50%", background: L.ink }} />} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: CY + 110, display: "flex", justifyContent: "center" }}>
            <Soft t={t} at={Q.dm} text="DM One Prime Studio" size={34} color={L.sub} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: CY + 170, display: "flex", justifyContent: "center" }}>
            <Soft t={t} at={Q.tags} text="Websites · Apps · CRM · ERP · SaaS · Shopify · Brand" size={22} color={L.mute} step={0.012} />
          </div>
        </div>
      )}
      <Audio src={staticFile("launch2/master.wav")} />
    </AbsoluteFill>
  );
}
