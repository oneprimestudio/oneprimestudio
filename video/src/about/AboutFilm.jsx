import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Logo } from "../lib/ui";
import { Dither } from "../lib/Dither";
import { A, E, END, GUTTER, M, S, SANS, TL, W, clamp01, io, level, lerp, p, useT } from "./time";
import { Goo, Rule, Stepped, display } from "./kit";
import { Globe } from "./Globe";
import { Seam } from "./Seam";

/*
 * One Prime Studio — About, a launch film (1080×1920, 60 fps). The /about page told as pure motion —
 * no navbar, no mono labels, no cursor: the boot dot, the headline, the navbar's opening move used as
 * the reveal of the studio's name, the seam, the three cards, the split that becomes one, the ink
 * collapsing into the dithered globe that fires arcs out of Hyderabad, and the sign-off.
 * Every time below comes from src/about/timeline.json (built from script.json + the voice).
 */

const PILLARS = [
  ["Identity", "Logo, type, colour and voice — a brand people recognise at a glance."],
  ["Leads", "Websites and stores built to be found, and to turn visits into enquiries."],
  ["Solutions", "CRMs, ERPs and SaaS products that take the busywork off a team."],
];
const CITIES = [
  { name: "Dubai", lat: 25.2, lon: 55.27 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Berlin", lat: 52.52, lon: 13.4 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Toronto", lat: 43.65, lon: -79.38 },
];
const GLOBE = { cx: 540, cy: 1150, size: 820 };

/* ------------------------------------------------------------------ helpers */
const HITS = TL.sfx.filter((c) => ["slam", "impact", "drop"].includes(c.sound)).map((c) => c.t);
function punch(t) {
  let s = 0;
  let x = 0;
  let y = 0;
  for (const h of HITS) {
    const d = t - h;
    if (d < 0 || d > 0.4) continue;
    const a = Math.exp(-d / 0.07);
    s += 0.018 * a;
    x += 7 * a * Math.sin(d * 90 + h);
    y += 7 * a * Math.cos(d * 77 + h * 3);
  }
  return `translate(${x}px, ${y}px) scale(${1 + s})`;
}
/** words that rise one by one between `from` and `to` */
function Lede({ t, text, from, to, dim = -1, style }) {
  const words = text.split(" ");
  return (
    <div style={style}>
      {words.map((w, i) => {
        const at = lerp(from, to, i / Math.max(1, words.length - 1));
        const k = p(t, at, 0.45, E.out);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: "0.24em", opacity: k, transform: `translateY(${(1 - k) * 0.4}em)`, color: dim >= 0 && i >= dim ? A.stone : undefined }}>
            {w}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ boot + headline */
function HeadPage({ t }) {
  const dot = p(t, 0.05, 0.45, E.back);
  const cross = p(t, 0.15, 0.6, E.menu);
  const bootOut = p(t, W("h1", 0) - 0.1, 0.5, E.in);
  const chips = [
    ["Found", W("h1", 5)],
    ["Chosen", W("h1", 6)],
    ["Run well", W("h1", 8)],
  ];
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      {/* boot: the bullet and a crosshair */}
      <div style={{ opacity: 1 - bootOut }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 960, height: 1.5, background: A.rule, transform: `scaleX(${cross})` }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 540, width: 1.5, background: A.rule, transform: `scaleY(${cross})` }} />
        <span style={{ position: "absolute", left: 531, top: 951, width: 18, height: 18, borderRadius: 9, background: A.ink, transform: `scale(${dot * (1 + 0.3 * level("kick", t))})` }} />
      </div>
      <Stepped
        id="h1"
        t={t}
        size={112}
        style={{ position: "absolute", left: GUTTER, top: 520 }}
        lines={[
          ["Every business", 0, W("h1", 0) - 0.05],
          ["deserves to be", "1.4em", W("h1", 2) - 0.05],
          ["found, chosen", "0.5em", W("h1", 5) - 0.05],
          ["and run well.", "2.2em", W("h1", 7) - 0.05],
        ]}
      />
      {/* three outcomes tick in as they are said */}
      <div style={{ position: "absolute", left: GUTTER, right: GUTTER, top: 1110 }}>
        <div style={{ height: 1.5, background: A.rule, transform: `scaleX(${p(t, W("h1", 4), 0.8, E.menu)})`, transformOrigin: "0 50%" }} />
        <div style={{ display: "flex", marginTop: 34 }}>
          {chips.map(([word, at]) => {
            const k = p(t, at, 0.5, E.out);
            return (
              <div key={word} style={{ flex: 1, opacity: k, transform: `translateY(${(1 - k) * 24}px)`, display: "flex", alignItems: "center", gap: 14, fontFamily: SANS, fontWeight: 500, fontSize: 44, letterSpacing: "-0.03em", color: A.ink }}>
                <span style={{ width: 30, height: 30, borderRadius: 15, background: A.accent, display: "grid", placeItems: "center", transform: `scale(${p(t, at + 0.05, 0.45, E.back)})` }}>
                  <svg width="16" height="16" viewBox="0 0 14 14">
                    <path d="M2.5 7.5L5.7 10.5L11.5 3.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeDasharray="14" strokeDashoffset={14 * (1 - p(t, at + 0.15, 0.35, E.out))} />
                  </svg>
                </span>
                {word}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: GUTTER, top: 1330, width: 720, fontFamily: SANS, fontSize: 36, lineHeight: 1.32, letterSpacing: "-0.01em", color: A.graphite }}>
        <Lede t={t} text="A design and development studio — identity, websites and the systems behind them, built as one." from={W("h1", 7)} to={W("h1", 9) + 0.4} />
      </div>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ the reveal: the name on ink */
function RevealStage({ t }) {
  const open = M("reveal.open");
  const one = W("name", 2);
  const pill = p(t, open + 0.55, 0.6, E.back);
  const flick = p(t, one - 0.04, 0.5, E.back);
  return (
    <AbsoluteFill style={{ background: A.ink }}>
      {/* the switch's glow on "One" */}
      <div
        style={{
          position: "absolute",
          left: 540 - 700,
          top: 640 - 700,
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(47,107,255,0.45), rgba(47,107,255,0) 60%)",
          opacity: io(t, one - 0.05, 0.15, one + 0.2, 1.4, E.out, E.out),
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 540, display: "flex", justifyContent: "center", transform: `scale(${lerp(0.5, 1, pill)})`, opacity: clamp01(pill * 3) }}>
        <Logo s={168} k={flick} color="#ffffff" words={false} t={t} neAt={one + 0.05} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", ...display(150, "#ffffff") }}>
        <Goo id="ps" t={t} at={W("name", 3) - 0.08} dur={0.8}>
          Prime Studio
        </Goo>
      </div>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ what we do */
function WhatPage({ t }) {
  const t0 = S("what").start;
  const row = p(t, W("what2", 0) - 0.1, 0.9, E.card);
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <Rule t={t} at={t0 + 0.05} />
      <Stepped
        id="what"
        t={t}
        size={96}
        style={{ position: "absolute", left: GUTTER, top: 300 }}
        lines={[
          ["Identity, leads", 0, t0 + 0.15],
          ["and solutions —", "1.2em", t0 + 0.3],
          ["for every business.", "0.4em", t0 + 0.45],
        ]}
      />
      {PILLARS.map(([name, text], i) => {
        const at = W("what1", i) - 0.08;
        const k = p(t, at, 0.5, E.prime);
        if (t < at - 0.01) return null;
        // fanned stack while the words land, a row once the lede starts
        const fan = { x: 540 + (i - 1) * 120, y: 1060 + (i - 1) * 26, r: (i - 1) * 5, s: 1 };
        const line = { x: GUTTER + 150 + i * 326, y: 885, r: 0, s: 0.6 };
        const x = lerp(fan.x, line.x, row);
        const y = lerp(fan.y, line.y, row) + (1 - k) * 1100;
        const r = lerp(fan.r, line.r, row) + (1 - k) * 14;
        const s = lerp(fan.s, line.s, row);
        return (
          <div
            key={name}
            style={{
              position: "absolute",
              left: x - 250,
              top: y - 312,
              width: 500,
              height: 625,
              background: A.ink,
              transform: `rotate(${r}deg) scale(${s})`,
              boxShadow: "0 50px 90px -40px rgba(8,6,78,0.55)",
              color: "#fff",
              padding: 44,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ position: "absolute", left: 44, top: 44, width: 16, height: 16, borderRadius: 8, background: A.accent, transform: `scale(${p(t, at + 0.25, 0.4, E.back)})` }} />
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 76, letterSpacing: "-0.04em", lineHeight: 1 }}>{name}</div>
            <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 28, lineHeight: 1.38, color: "rgba(255,255,255,0.86)" }}>{text}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: GUTTER, top: 1220, width: 950, ...display(62, A.ink, { lineHeight: 1.1, letterSpacing: "-0.03em" }) }}>
        <Lede t={t} text="From a single shop to a growing product — the scope changes, the standard doesn’t." from={W("what2", 3) - 0.1} to={END("what2") + 0.2} dim={11} />
      </div>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ why */
function WhyPage({ t }) {
  const t0 = S("why").start;
  const one = W("why2", 4);
  const join = p(t, one - 0.5, 0.5, E.prime);
  const fill = p(t, one + 0.08, 0.75, E.prime);
  const tiles = [
    ["Brand", "Agency one", W("why1", 4), { x: -20, y: -250, r: -9 }],
    ["Website", "Agency two", W("why1", 6), { x: 0, y: 250, r: 5 }],
    ["Software", "Agency three", W("why1", 9), { x: 20, y: -150, r: 9 }],
  ];
  const glitch = t > W("why1", 9) + 0.15 && t < W("why1", 9) + 0.32;
  const block = { x: 105, y: 905, w: 870, h: 290 };
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <Rule t={t} at={t0 + 0.45} />
      <Stepped
        id="why"
        t={t}
        size={88}
        style={{ position: "absolute", left: GUTTER, top: 300 }}
        lines={[
          ["Most studios split", 0, W("why1", 0) - 0.05],
          ["it three ways.", "1.3em", W("why1", 2) - 0.05],
        ]}
      />
      <div style={{ position: "absolute", inset: 0, filter: glitch ? "drop-shadow(6px 0 0 rgba(47,107,255,0.8)) drop-shadow(-6px 0 0 rgba(229,72,77,0.6))" : undefined, transform: glitch ? `translateX(${Math.sin(t * 300) * 8}px)` : undefined }}>
        {tiles.map(([name, agency, at, off], i) => {
          const k = p(t, at, 0.55, E.prime) * (1 - join);
          const x = block.x + i * 290 + off.x * k + (i - 1) * 50 * k;
          const y = block.y + off.y * k;
          const merged = t >= one;
          return (
            <div
              key={name}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 290,
                height: 290,
                background: merged ? A.ink : A.chalk,
                boxShadow: merged ? "none" : `0 0 0 1.5px ${A.rule}`,
                transform: `rotate(${off.r * k}deg)`,
                padding: 28,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                opacity: merged && fill > 0 ? 0 : 1,
              }}
            >
              <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 52, letterSpacing: "-0.04em", color: merged ? "#fff" : A.ink }}>{name}</span>
              <span style={{ position: "absolute", left: 28, bottom: -50, fontFamily: SANS, fontSize: 28, letterSpacing: "-0.01em", color: A.accent, opacity: k, whiteSpace: "nowrap" }}>{agency}</span>
            </div>
          );
        })}
      </div>
      {/* "as one": the three become one ink block, which opens to the whole frame */}
      {t >= one && (
        <div
          style={{
            position: "absolute",
            left: lerp(block.x, 0, fill),
            top: lerp(block.y, 0, fill),
            width: lerp(block.w, 1080, fill),
            height: lerp(block.h, 1920, fill),
            background: A.ink,
          }}
        />
      )}
      {fill > 0.3 && (
        <Stepped
          id="avg"
          t={t}
          size={132}
          color="#ffffff"
          style={{ position: "absolute", left: GUTTER, top: 700 }}
          lines={[
            ["Average was", 0, one + 0.3],
            ["never an", "1.6em", one + 0.42],
            ["option.", "0.8em", one + 0.54],
          ]}
        />
      )}
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ where */
function WherePage({ t }) {
  const t0 = S("where").start;
  const hyd = W("w1", 2);
  const every = M("where.arcs");
  // the ink frame (the end of "why") collapses into a disc the size of the globe, then drains away
  const col = p(t, t0, 0.9, E.prime);
  const drain = p(t, t0 + 0.9, 0.9, E.io);
  const r = GLOBE.size / 2;
  // the view: drifting → swings to India → spins west as the arcs fire
  let view = { lat: 6, lon: 30 + (t - t0) * 9 };
  const ks = p(t, hyd - 0.4, 0.9, E.prime);
  view = { lat: lerp(view.lat, 14, ks), lon: lerp(view.lon, 74 + Math.max(0, t - hyd - 0.5) * 2.5, ks) };
  const ke = p(t, every, 2.4, E.io);
  view = { lat: lerp(view.lat, 26, ke), lon: lerp(view.lon, -18, ke) };
  const fired = CITIES.map((c, i) => every + 0.12 + i * (TL.beat / 4) * 1.5);
  const routes = CITIES.map((to, i) => {
    const at = fired[i];
    const draw = p(t, at, 0.75, E.out);
    return { to, draw, label: p(t, at + 0.55, 0.4, E.out), pulse: draw >= 1 ? ((t - at - 0.75) * 0.7) % 1 : 0 };
  }).filter((q) => q.draw > 0);
  const home = p(t, hyd, 0.55, E.back);
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <Rule t={t} at={t0 + 0.6} />
      <Stepped
        id="where"
        t={t}
        size={92}
        style={{ position: "absolute", left: GUTTER, top: 300 }}
        lines={[
          ["Based in", 0, W("w1", 0) - 0.05],
          ["Hyderabad, India —", "0.7em", hyd - 0.05],
          ["and everywhere.", "0.2em", every - 0.05, { color: A.accent }],
        ]}
      />
      <div style={{ position: "absolute", inset: 0, transform: `scale(${lerp(0.92, 1, p(t, t0 + 0.4, 1.4, E.out))})`, transformOrigin: `${GLOBE.cx}px ${GLOBE.cy}px` }}>
        <Globe view={view} size={GLOBE.size} cx={GLOBE.cx} cy={GLOBE.cy} routes={routes} home={home} rings={home} reveal={p(t, t0 + 0.6, 1.2, E.menu)} time={t} />
      </div>
      {/* once it is a disc, the ink dissolves into the globe in the studio's dither squares */}
      {col >= 1 && drain < 1 && (
        <Dither
          px={6}
          color={A.ink}
          left={GLOBE.cx - r}
          top={GLOBE.cy - r}
          width={2 * r}
          height={2 * r}
          field={(i, j, x, y) => (Math.hypot(x - GLOBE.cx, y - GLOBE.cy) < r ? 1 - drain : 0)}
        />
      )}
      {col < 1 && (
        <div
          style={{
            position: "absolute",
            left: lerp(0, GLOBE.cx - r, col),
            top: lerp(0, GLOBE.cy - r, col),
            width: lerp(1080, 2 * r, col),
            height: lerp(1920, 2 * r, col),
            borderRadius: lerp(0, r, col),
            background: A.ink,
          }}
        />
      )}
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ sign-off */
function SignPage({ t }) {
  const one = W("sign", 0);
  const cta = M("sign.cta");
  const hover = p(t, cta - 0.45, 0.7, E.prime);
  const end = p(t, TL.duration - 1.3, 0.7, E.prime);
  const pill = p(t, S("sign").start + 0.3, 0.5, E.back);
  return (
    <AbsoluteFill style={{ background: A.paper }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - end, transform: `scale(${1 - 0.04 * end})` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", transform: `scale(${lerp(0.6, 1, pill)})`, opacity: clamp01(pill * 3) }}>
          <Logo s={92} k={p(t, one - 0.04, 0.5, E.back)} color={A.ink} t={t} neAt={one + 0.05} wordsAt={W("sign", 1) - 0.05} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 930, textAlign: "center", ...display(58, A.stone, { letterSpacing: "-0.03em", lineHeight: 1.1 }) }}>
          {["Average", "is", "not", "an", "option."].map((w, i) => {
            const k = p(t, W("sign", 3 + i) - 0.05, 0.5, E.out);
            return (
              <span key={w} style={{ display: "inline-block", margin: "0 0.12em", opacity: k, transform: `translateY(${(1 - k) * 0.5}em)` }}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1160, display: "flex", justifyContent: "center", opacity: p(t, END("sign") - 0.3, 0.5), transform: `translateY(${(1 - p(t, END("sign") - 0.3, 0.6, E.out)) * 30}px)` }}>
          <div style={{ position: "relative", border: `2px solid ${A.ink}`, borderRadius: 999, padding: "26px 46px", overflow: "hidden", fontFamily: SANS, fontWeight: 500, fontSize: 38, letterSpacing: "-0.02em", color: A.ink }}>
            <span>Start a project&nbsp;&nbsp;→</span>
            <div style={{ position: "absolute", inset: 0, background: A.ink, clipPath: `inset(0 ${(1 - hover) * 100}% 0 0)`, color: "#fff", padding: "26px 46px", boxSizing: "border-box", whiteSpace: "nowrap" }}>
              Start a project&nbsp;&nbsp;<span style={{ display: "inline-block", transform: `translateX(${hover * 8}px)` }}>→</span>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 1310, textAlign: "center", fontFamily: SANS, fontSize: 34, letterSpacing: "-0.01em", color: A.graphite }}>
          <Goo id="mail" t={t} at={cta + 0.2} dur={0.8}>
            hello@oneprimestudio.com
          </Goo>
        </div>
      </div>
      <span style={{ position: "absolute", left: 531, top: 951, width: 18, height: 18, borderRadius: 9, background: A.ink, transform: `scale(${p(t, TL.duration - 0.9, 0.45, E.back)})` }} />
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ the film */
export function AboutFilm() {
  const t = useT();
  const swap1 = S("what").start;
  const whereT = S("where").start;
  const signT = S("sign").start;

  // the navbar's opening move, without the navbar: the page scales down and slides away, dimming
  const open = t < swap1 ? p(t, M("reveal.open"), 1.0, E.prime) : 0;
  // the scroll from 01 to 02
  const scroll = 1920 * p(t, S("why").start - 0.45, 0.9, E.io);
  // the flash on "One"
  const one = W("name", 2);
  const flash = t >= one ? Math.exp(-(t - one) / 0.07) * 0.75 : 0;

  let page;
  if (t < swap1) {
    page = (
      <>
        {open > 0 && <RevealStage t={t} />}
        <AbsoluteFill style={{ transform: `translateY(${open * 2000}px) scale(${1 - 0.14 * open})`, transformOrigin: "50% 0%", boxShadow: open > 0 ? "0 -30px 80px rgba(0,0,0,0.35)" : undefined }}>
          <HeadPage t={t} />
          <AbsoluteFill style={{ background: "#000", opacity: 0.5 * open }} />
        </AbsoluteFill>
      </>
    );
  } else if (t < whereT) {
    page = [WhatPage, WhyPage].map((P, i) => {
      const y = i * 1920 - scroll;
      if (y <= -1920 || y >= 1920) return null;
      return (
        <AbsoluteFill key={i} style={{ transform: `translateY(${y}px)` }}>
          <P t={t} />
        </AbsoluteFill>
      );
    });
  } else if (t < signT) {
    page = <WherePage t={t} />;
  } else {
    page = <SignPage t={t} />;
  }

  return (
    <AbsoluteFill style={{ background: A.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: punch(t) }}>{page}</AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff", opacity: flash, pointerEvents: "none" }} />
      <Seam t={t} start={M("reveal.seam")} />
      <Seam t={t} start={M("sign.seam")} />
      <Audio src={staticFile("about/master.wav")} />
    </AbsoluteFill>
  );
}
