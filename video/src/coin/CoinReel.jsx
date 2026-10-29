import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Img, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { C, MONO, SANS } from "../lib/core";
import { createScene, NAVY, times } from "./scene";
import vo from "./vo.json";

/*
 * The coin Reel (9:16, 60 fps): "A coin has three sides." A silver coin tumbles in slow motion (heads: a
 * template; tails: months of waiting), lands on its edge, and turns into the studio's switch, which throws on
 * and becomes the "O" of the logo. Then the work, each project flipping in like the coin, and a call to DM.
 * Word-by-word captions follow the voice; music is left to Instagram.
 */

const FPS = 60;
const T = times(vo);
const CHALK = "#efede9";
const clamp = (v) => Math.max(0, Math.min(1, v));
const outCubic = (u) => 1 - Math.pow(1 - u, 3);
const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const outBack = (u, k = 1.4) => 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2);
const rise = (t, at, dur = 0.5) => outCubic(clamp((t - at) / dur));

const WORK = [
  { id: "jeeva", img: "coin/jeeva.webp", name: "Jeeva Multispeciality Hospital", tag: "Hospital software · Website", place: "Hanamkonda, Warangal" },
  { id: "maera", img: "coin/maera.webp", name: "Maéra Makeover & Academy", tag: "Website · CRM", place: "Uppal, Hyderabad" },
  { id: "netha", img: "coin/netha.webp", name: "Netha Silks & Co.", tag: "Online store", place: "Bhoodan Pochampally, Telangana" },
];

export function CoinReel() {
  const t = useCurrentFrame() / FPS;
  const root = useRef(null);
  const sw = useRef(null);
  return (
    <AbsoluteFill ref={root} style={{ background: NAVY, overflow: "hidden" }}>
      <Coin t={t} root={root} sw={sw} />
      {/* a soft vignette, so the coin sits in a pool of light */}
      <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 40%, rgba(0,0,0,0) 45%, rgba(2,1,24,0.55) 100%)" }} />
      <Wordmark t={t} sw={sw} />
      <Keywords t={t} />
      {WORK.map((w, i) => (
        <Card key={w.id} t={t} w={w} at={T[w.id] + (i === 0 ? 0.15 : -0.2)} out={(i < WORK.length - 1 ? T[WORK[i + 1].id] : T.cta) - 0.3} />
      ))}
      <Cta t={t} />
      <Captions t={t} />
      <Audio src={staticFile("coin/vo.wav")} />
    </AbsoluteFill>
  );
}

/** the three.js coin; it reads where the 2D logo's switch sits so it can land exactly on it */
function Coin({ t, root, sw }) {
  const canvas = useRef(null);
  const [handle] = useState(() => delayRender("coin scene"));
  const [scene, setScene] = useState(null);
  const done = useRef(false);
  useEffect(() => {
    let s;
    document.fonts.ready.then(() => {
      s = createScene(canvas.current, T);
      setScene(s);
    });
    return () => s?.dispose();
  }, []);
  useLayoutEffect(() => {
    if (!scene) return;
    let target = null;
    if (sw.current && root.current) {
      let x = 0;
      let y = 0;
      for (let e = sw.current; e && e !== root.current; e = e.offsetParent) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      target = { x, y, w: sw.current.offsetWidth, h: sw.current.offsetHeight };
    }
    scene.render(t, target);
    if (!done.current) {
      done.current = true;
      continueRender(handle);
    }
  }, [scene, t, root, sw, handle]);
  return <canvas ref={canvas} width={1080} height={1920} style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }} />;
}

/** a word rising out of its own mask */
function Up({ children, u, style }) {
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em", marginBottom: "-0.08em", ...style }}>
      <span style={{ display: "inline-block", transform: `translateY(${(1 - u) * 105}%)` }}>{children}</span>
    </span>
  );
}

/** the logo as Logo.tsx draws it, stacked: the switch-"O" with "ne", then "Prime Studio" */
function Wordmark({ t, sw }) {
  // the 2D switch appears once the 3D one has landed in its place, flat (scene.js hides it at T.hand)
  const show = clamp((t - (T.name + 0.58)) / 0.08);
  const ne = rise(t, T.name + 0.42, 0.45);
  const ps = rise(t, T.name + 0.6, 0.5);
  // to the top of the screen while the work is shown
  const top = inOut(clamp((t - (T.jeeva - 0.35)) / 0.5));
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center",
        color: CHALK, fontFamily: SANS, transformOrigin: "50% 0", transform: `translateY(${-460 * top}px) scale(${1 - 0.64 * top})`,
      }}
    >
      <div style={{ fontSize: 300, lineHeight: 1, display: "flex", alignItems: "baseline" }}>
        <span ref={sw} style={{ position: "relative", top: "0.016em", display: "inline-block", width: "1.064em", height: "0.547em", opacity: show }}>
          <svg viewBox="0 0 1064 547" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
            <rect x="48.75" y="48.75" width="966.5" height="449.5" rx="224.75" fill="none" stroke={CHALK} strokeWidth="97.5" />
            <circle cx="790.5" cy="273.5" r="136" fill={CHALK} />
          </svg>
        </span>
        <Up u={ne} style={{ marginLeft: "-0.027em", fontWeight: 500, letterSpacing: "-0.04em" }}>ne</Up>
      </div>
      <div style={{ fontSize: 118, lineHeight: 1, marginTop: 26, fontWeight: 500, letterSpacing: "-0.03em" }}>
        <Up u={ps}>Prime Studio</Up>
      </div>
    </div>
  );
}

/** what the studio is, in the words people search for */
function Keywords({ t }) {
  const gone = 1 - clamp((t - (T.jeeva - 0.35)) / 0.3);
  if (t < T.what) return null;
  const pills = ["Websites", "Shopify stores", "CRM & ERP", "SaaS products"];
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1050, textAlign: "center", color: CHALK, fontFamily: SANS, opacity: gone }}>
      <div style={{ fontSize: 50, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
        <Up u={rise(t, T.what + 0.05)}>Web design & development studio</Up>
      </div>
      <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 26, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.62 }}>
        <Up u={rise(t, T.what + 0.35)}>Hyderabad, India · Worldwide</Up>
      </div>
      <div style={{ marginTop: 34, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
        {pills.map((p, i) => {
          const u = rise(t, T.what + 0.9 + i * 0.1, 0.4);
          return (
            <span key={p} style={{ height: 64, padding: "0 28px", borderRadius: 32, boxShadow: `inset 0 0 0 2px rgba(239,237,233,0.45)`, display: "inline-flex", alignItems: "center", fontSize: 30, opacity: u, transform: `translateY(${(1 - u) * 24}px)` }}>
              {p}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** the back of a card: the coin's silver, with the switch on it */
function Back() {
  return (
    <div
      style={{
        position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)",
        background: "radial-gradient(90% 70% at 35% 25%, #f4f5f9 0%, #c3c6d1 45%, #8d91a3 100%)",
        display: "grid", placeItems: "center",
      }}
    >
      <svg viewBox="0 0 1064 547" style={{ width: "46%" }}>
        <rect x="48.75" y="48.75" width="966.5" height="449.5" rx="224.75" fill="#0c0b44" stroke="#f5f6fa" strokeWidth="97.5" />
        <circle cx="273.5" cy="273.5" r="136" fill="#f5f6fa" />
      </svg>
    </div>
  );
}

/** a project, flipping in like the coin and flipping away for the next */
function Card({ t, w, at, out }) {
  if (t < at - 0.05 || t > out + 0.7) return null;
  const inU = outCubic(clamp((t - at) / 0.8));
  const outU = inOut(clamp((t - out) / 0.6));
  const angle = -180 * (1 - inU) + 180 * outU;
  const label = rise(t, at + 0.35, 0.5) * (1 - clamp((t - out) / 0.3));
  return (
    <>
      <div style={{ position: "absolute", left: 230, top: 300, width: 620, height: 775, perspective: 2000 }}>
        <div
          style={{
            position: "absolute", inset: 0, transformStyle: "preserve-3d",
            transform: `translate(${-300 * outU}px, ${110 * (1 - inU)}px) rotateY(${angle}deg) scale(${0.92 + 0.08 * inU - 0.1 * outU})`,
            opacity: 1 - clamp((t - out - 0.35) / 0.25),
          }}
        >
          <Img src={staticFile(w.img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", backfaceVisibility: "hidden", boxShadow: "0 50px 90px -40px rgba(0,0,0,0.7)" }} />
          <Back />
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1110, textAlign: "center", color: CHALK, fontFamily: SANS, opacity: label }}>
        <div style={{ fontSize: 46, fontWeight: 500, letterSpacing: "-0.03em", transform: `translateY(${(1 - label) * 20}px)` }}>{w.name}</div>
        <div style={{ marginTop: 10, fontSize: 32, opacity: 0.8 }}>{w.tag}</div>
        <div style={{ marginTop: 12, fontFamily: MONO, fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.55 }}>{w.place}</div>
      </div>
    </>
  );
}

/** the call: the three projects in a row, the line, and the DM */
function Cta({ t }) {
  if (t < T.cta - 0.2) return null;
  const dm = vo.lines.find((l) => l.id === "cta").words.find((x) => x.w === "DM")?.t ?? T.cta + 2.2;
  const W = 236;
  const GAP = 28;
  const left = (1080 - (3 * W + 2 * GAP)) / 2;
  return (
    <>
      {WORK.map((w, i) => {
        const u = outCubic(clamp((t - (T.cta - 0.15 + i * 0.12)) / 0.7));
        return (
          <div key={w.id} style={{ position: "absolute", left: left + i * (W + GAP), top: 330, width: W, height: W * 1.25, perspective: 1200 }}>
            <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateY(${(1 - u) * 80}px) rotateY(${-180 * (1 - u)}deg)` }}>
              <Img src={staticFile(w.img)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", backfaceVisibility: "hidden" }} />
              <Back />
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 60, right: 60, top: 720, textAlign: "center", color: CHALK, fontFamily: SANS, fontSize: 78, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
        <div><Up u={rise(t, T.cta + 0.05)}>Don&apos;t leave your website</Up></div>
        <div><Up u={rise(t, T.cta + 0.25)}>to a coin toss.</Up></div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            height: 96, padding: "0 46px", borderRadius: 48, background: CHALK, color: C.ink, display: "flex", alignItems: "center",
            fontFamily: SANS, fontSize: 46, fontWeight: 500, letterSpacing: "-0.02em",
            opacity: clamp((t - dm) / 0.15), transform: `scale(${0.85 + 0.15 * outBack(clamp((t - dm) / 0.35))})`,
          }}
        >
          DM &ldquo;PRIME&rdquo; to start
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1090, textAlign: "center", color: CHALK, fontFamily: SANS, fontSize: 30, opacity: 0.7 * clamp((t - dm - 0.2) / 0.3) }}>
        @oneprimestudio · Web design studio in Hyderabad
      </div>
    </>
  );
}

// ---- captions, a few words at a time, as the voice says them ----
const QUIET = new Set(["name", "what", "cta"]); // lines whose words are already on screen
const ACCENT = /^(three|sides|edge|land|build|Jeeva|Maéra|Netha|Silks)/i;

const CHUNKS = (() => {
  const out = [];
  for (const line of vo.lines) {
    if (QUIET.has(line.id)) continue;
    const words = line.words.map((w) => ({ text: w.show ?? w.w, t: w.t }));
    let cur = [];
    const flush = () => {
      if (cur.length) out.push({ t: cur[0].t, end: line.end + 0.25, words: cur });
      cur = [];
    };
    for (const w of words) {
      cur.push(w);
      const max = line.id === "hook" ? 99 : 3;
      if (cur.length >= max || /[,.:;?!]$/.test(w.text)) flush();
    }
    flush();
  }
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, out[i + 1].t);
  out[0].t = 0; // the hook is on screen from the very first frame
  return out;
})();

function Captions({ t }) {
  const c = CHUNKS.find((x) => t >= x.t && t < x.end);
  if (!c) return null;
  const u = clamp((t - c.t) / 0.1);
  return (
    <div
      style={{
        position: "absolute", left: 60, right: 60, top: 1330, textAlign: "center", fontFamily: SANS, fontWeight: 700,
        fontSize: 80, lineHeight: 1.08, letterSpacing: "-0.01em", wordSpacing: "0.14em", color: "#ffffff",
        WebkitTextStroke: "14px #04032e", paintOrder: "stroke fill",
        transform: `scale(${c.t === 0 ? 1 : 0.86 + 0.14 * outBack(u, 2)})`, opacity: c.t === 0 ? 1 : clamp(u * 2),
      }}
    >
      {c.words.map((w, i) => (
        <span key={i} style={{ color: ACCENT.test(w.text) ? "#a9c1ff" : "#ffffff" }}>
          {w.text}
          {i < c.words.length - 1 ? " " : ""}
        </span>
      ))}
    </div>
  );
}
