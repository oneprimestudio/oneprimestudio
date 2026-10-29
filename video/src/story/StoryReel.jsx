import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, SANS } from "../lib/core";
import vo from "./vo.json";

/*
 * "Why we started": a 60-second documentary Reel (9:16, 60 fps). The story is the About page's own:
 * most businesses are sold a template or a split agency; two engineers in Hyderabad started One Prime to
 * close that gap; the founders; the work (Jeeva, Maéra, Netha Silks); the logo. Calm narration (the films'
 * narrator), documentary subtitles, name lower-thirds, chapter marks, slow pushes, dissolves, film grain.
 * Every scene starts on its line of the voice-over (src/story/vo.json).
 */

const FPS = 60;
const CHALK = "#efede9";
const INK = C.ink;
const L = Object.fromEntries(vo.lines.map((l) => [l.id, l]));
const at = (id) => L[id].start;
const word = (id, w) => L[id].words.find((x) => (x.show ?? x.w).toLowerCase().startsWith(w))?.t ?? at(id);
const clamp = (v) => Math.max(0, Math.min(1, v));
const outCubic = (u) => 1 - Math.pow(1 - u, 3);
const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const rise = (t, a, d = 0.6) => outCubic(clamp((t - a) / d));

const ORDER = ["hook", "template", "agency", "gap", "two", "ruthwik", "vinith", "same", "jeeva", "maera", "netha", "together", "end"];
const sceneStart = (id) => (id === "hook" ? 0 : at(id) - 0.15);
const sceneEnd = (id) => {
  const i = ORDER.indexOf(id);
  return i < ORDER.length - 1 ? sceneStart(ORDER[i + 1]) : vo.total;
};
const DISSOLVE = 0.25;
// before they split (and once they come back), brand, website and software sit as one stack
const STACK = { Brand: -128, Website: 0, Software: 128 };

/** a scene: mounted for its stretch of the film, dissolving in over the one before */
function Scene({ id, children, bg = INK }) {
  const a = sceneStart(id);
  const b = sceneEnd(id);
  const from = Math.max(0, Math.round(a * FPS));
  const len = Math.round((b + DISSOLVE - a) * FPS);
  return (
    <Sequence from={from} durationInFrames={len}>
      <SceneFade a={a} bg={bg}>{children}</SceneFade>
    </Sequence>
  );
}
function SceneFade({ a, bg, children }) {
  const t = useCurrentFrame() / FPS + a;
  const o = a === 0 ? 1 : clamp((t - a) / DISSOLVE);
  return <AbsoluteFill style={{ background: bg, opacity: o }}>{children(t)}</AbsoluteFill>;
}

const Up = ({ u, children, style }) => (
  <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.1em", marginBottom: "-0.1em", ...style }}>
    <span style={{ display: "inline-block", transform: `translateY(${(1 - u) * 105}%)` }}>{children}</span>
  </span>
);

function Chapter({ t, a, n, title, color = CHALK }) {
  const u = rise(t, a + 0.1, 0.6);
  return (
    <div style={{ position: "absolute", left: 72, top: 220, display: "flex", gap: 22, fontFamily: SANS, fontSize: 26, letterSpacing: "0.12em", textTransform: "uppercase", color, opacity: 0.85 }}>
      <Up u={u}>{n}</Up>
      <Up u={rise(t, a + 0.2, 0.6)}>{title}</Up>
    </div>
  );
}

function LowerThird({ t, a, name, role, color = CHALK }) {
  const u = rise(t, a, 0.7);
  return (
    <div style={{ position: "absolute", left: 72, right: 72, top: 1090, color, fontFamily: SANS }}>
      <div style={{ width: 360 * u, height: 2, background: color, opacity: 0.8 }} />
      <div style={{ marginTop: 22, fontSize: 52, fontWeight: 500, letterSpacing: "-0.03em" }}>
        <Up u={rise(t, a + 0.15, 0.6)}>{name}</Up>
      </div>
      <div style={{ marginTop: 10, fontSize: 30, opacity: 0.78 }}>
        <Up u={rise(t, a + 0.3, 0.6)}>{role}</Up>
      </div>
    </div>
  );
}

/** a landscape capture cropped to fill the 9:16 frame around `focus` (a share of its width), pushing in */
function FullVideo({ src, from, t, a, focus = 0.5, rate = 1 }) {
  const FW = (1920 * 1920) / 1080;
  const push = 1.04 - 0.04 * clamp((t - a) / 5);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `scale(${push})` }}>
      <OffthreadVideo src={staticFile(`story/${src}`)} trimBefore={Math.round(from * FPS)} playbackRate={rate} muted style={{ position: "absolute", top: 0, height: 1920, width: FW, left: Math.min(0, Math.max(1080 - FW, 540 - FW * focus)) }} />
    </div>
  );
}

function Photo({ src, t, a, pos, from = 1.12, to = 1.0, dur = 6 }) {
  const s = from + (to - from) * inOut(clamp((t - a) / dur));
  return <Img src={staticFile(`story/${src}`)} style={{ position: "absolute", inset: 0, width: 1080, height: 1920, objectFit: "cover", objectPosition: pos, transform: `scale(${s})`, transformOrigin: pos }} />;
}

const Shade = ({ top = 0.0, bottom = 0.75 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(4,3,46,${top}) 0%, rgba(4,3,46,0) 26%, rgba(4,3,46,0) 38%, rgba(4,3,46,${bottom * 0.85}) 56%, rgba(4,3,46,${bottom}) 100%)` }} />
);

/** a browser window holding a screen */
function Window({ src, w, x, y, t, a, delay = 0 }) {
  const u = rise(t, a + delay, 0.9);
  return (
    <div style={{ position: "absolute", left: x, top: y + (1 - u) * 80, width: w, opacity: u, borderRadius: 18, overflow: "hidden", background: "#fff", boxShadow: "0 60px 120px -40px rgba(0,0,0,0.6)" }}>
      <div style={{ height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#f2f1ed" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 10, height: 10, borderRadius: 5, background: "#cfcdc6" }} />
        ))}
      </div>
      <Img src={staticFile(`story/${src}`)} style={{ width: "100%", display: "block" }} />
    </div>
  );
}

/** the template every business is offered: one wireframe, repeated */
function Wireframe({ k }) {
  const g = "#b9b7c9";
  return (
    <div style={{ width: 280, height: 350, borderRadius: 16, background: "#e4e2dc", padding: 18, display: "flex", flexDirection: "column", gap: 12, opacity: 0.55 + 0.45 * ((k * 37) % 7 === 0 ? 1 : 0.6) }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: 5, background: g }} />
        ))}
      </div>
      <div style={{ height: 120, borderRadius: 8, background: g, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 30, bottom: -10, width: 120, height: 80, background: "#a6a4b8", transform: "rotate(45deg)" }} />
        <div style={{ position: "absolute", right: 34, top: 22, width: 26, height: 26, borderRadius: 13, background: "#d2d0dd" }} />
      </div>
      <div style={{ height: 14, width: "80%", borderRadius: 7, background: g }} />
      <div style={{ height: 14, width: "55%", borderRadius: 7, background: g }} />
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ flex: 1, height: 70, borderRadius: 8, background: g }} />
        ))}
      </div>
    </div>
  );
}

function Switch({ color, on }) {
  return (
    <svg viewBox="0 0 1064 547" style={{ width: "1.064em", height: "0.547em", overflow: "visible", position: "relative", top: "0.016em" }}>
      <rect x="48.75" y="48.75" width="966.5" height="449.5" rx="224.75" fill="none" stroke={color} strokeWidth="97.5" />
      <circle cx={273.5 + 517 * on} cy="273.5" r="136" fill={color} />
    </svg>
  );
}
// the site's throw of the knob: cubic-bezier(0.34, 1.56, 0.64, 1), approximated by an overshooting ease
const throwOn = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2));

// ---- subtitles: the line being spoken, a few words at a time ----
const QUIET = new Set(["hook", "two", "together", "end"]); // lines already set large on screen
const SUBS = (() => {
  const out = [];
  for (const l of vo.lines) {
    if (QUIET.has(l.id)) continue;
    const words = l.words.map((w) => ({ text: w.show ?? w.w, t: w.t }));
    let cur = [];
    const flush = () => {
      if (cur.length) out.push({ t: cur[0].t, end: l.end + 0.3, text: cur.map((w) => w.text).join(" ") });
      cur = [];
    };
    for (const w of words) {
      cur.push(w);
      if (cur.length >= 6 || (/[,.:;?!]$/.test(w.text) && cur.length >= 2)) flush();
    }
    flush();
  }
  for (let i = 0; i < out.length - 1; i++) out[i].end = Math.min(out[i].end, out[i + 1].t);
  return out;
})();

function Subtitles({ t }) {
  const s = SUBS.find((x) => t >= x.t && t < x.end);
  if (!s) return null;
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 1330, textAlign: "center", fontFamily: SANS, fontSize: 46, fontWeight: 500, lineHeight: 1.22, letterSpacing: "-0.01em", color: "#fff", textShadow: "0 2px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.6)", opacity: clamp((t - s.t) / 0.08) }}>
      {s.text}
    </div>
  );
}

/** film grain, a different field every two frames */
function Grain({ f }) {
  return (
    <svg style={{ position: "absolute", inset: 0, width: 1080, height: 1920, opacity: 0.09, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="g">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2) % 97} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#g)" />
    </svg>
  );
}

export function StoryReel() {
  const f = useCurrentFrame();
  const t = f / FPS;
  return (
    <AbsoluteFill style={{ background: INK, fontFamily: SANS }}>
      {/* the hook: on screen from the very first frame */}
      <Scene id="hook">
        {(t) => (
          <>
            <div style={{ position: "absolute", left: 72, top: 220, fontSize: 26, letterSpacing: "0.12em", textTransform: "uppercase", color: CHALK, opacity: 0.7 }}>A short documentary</div>
            <div style={{ position: "absolute", left: 72, right: 72, top: 640, color: CHALK, fontSize: 92, fontWeight: 500, letterSpacing: "-0.045em", lineHeight: 1.02, transform: `scale(${1 + 0.02 * clamp(t / 3)})`, transformOrigin: "0 50%" }}>
              Most businesses get sold one of{" "}
              <span style={{ color: "#a9c1ff" }}>two things.</span>
            </div>
            <div style={{ position: "absolute", left: 72, top: 1120, display: "flex", gap: 18, color: CHALK, fontSize: 30 }}>
              {["1", "2"].map((n, i) => (
                <span key={n} style={{ width: 66, height: 66, borderRadius: 33, boxShadow: `inset 0 0 0 2px ${CHALK}`, display: "grid", placeItems: "center", opacity: rise(t, 1.2 + i * 0.35, 0.4) }}>{n}</span>
              ))}
            </div>
          </>
        )}
      </Scene>

      {/* one: the template, repeated */}
      <Scene id="template" bg="#f1efe9">
        {(t) => {
          const a = sceneStart("template");
          const drift = (t - a) * 40;
          return (
            <>
              <div style={{ position: "absolute", left: -120, top: -200 - drift, display: "grid", gridTemplateColumns: "repeat(4, 280px)", gap: 24, transform: "rotate(-8deg)" }}>
                {Array.from({ length: 28 }, (_, k) => (
                  <Wireframe key={k} k={k} />
                ))}
              </div>
              <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(241,239,233,0) 40%, rgba(8,6,78,0.7) 100%)" }} />
              <div style={{ position: "absolute", left: 72, top: 220, fontSize: 30, fontWeight: 500, color: INK, letterSpacing: "0.12em" }}>
                <Up u={rise(t, a + 0.1)}>1 · A TEMPLATE</Up>
              </div>
            </>
          );
        }}
      </Scene>

      {/* two: the agency, where brand, website and software go three ways */}
      <Scene id="agency">
        {(t) => {
          const parts = [
            ["Brand", word("agency", "brand"), [-1, -1]],
            ["Website", word("agency", "website"), [1, 0]],
            ["Software", word("agency", "software"), [-1, 1]],
          ];
          return (
            <>
              <div style={{ position: "absolute", left: 72, top: 220, fontSize: 30, fontWeight: 500, color: CHALK, letterSpacing: "0.12em" }}>
                <Up u={rise(t, at("agency"))}>2 · AN AGENCY</Up>
              </div>
              <svg style={{ position: "absolute", inset: 0, width: 1080, height: 1920 }}>
                {parts.map(([name, w, [dx, dy]]) => {
                  const u = inOut(clamp((t - w) / 1.4));
                  return <line key={name} x1="540" y1="860" x2={540 + dx * 300 * u} y2={860 + (STACK[name] * (1 - u) + dy * 330 * u)} stroke={CHALK} strokeWidth="2" strokeDasharray="10 12" opacity={0.5 * (1 - u * 0.6)} />;
                })}
              </svg>
              {parts.map(([name, w, [dx, dy]]) => {
                const u = inOut(clamp((t - w) / 1.4));
                const show = rise(t, at("agency") + 0.2, 0.5);
                return (
                  <div key={name} style={{ position: "absolute", left: 540 - 170 + dx * 300 * u, top: 860 - 56 + STACK[name] * (1 - u) + dy * 330 * u, width: 340, height: 112, borderRadius: 56, boxShadow: `inset 0 0 0 2px ${CHALK}`, display: "grid", placeItems: "center", color: CHALK, fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em", opacity: show, transform: `rotate(${dx * dy * 6 * u}deg)` }}>
                    {name}
                  </div>
                );
              })}
            </>
          );
        }}
      </Scene>

      {/* the gap, closed: the three come together as one switch, and it throws on */}
      <Scene id="gap">
        {(t) => {
          const a = sceneStart("gap");
          const come = inOut(clamp((t - a) / 0.9));
          const on = throwOn(clamp((t - word("gap", "gap")) / 0.45));
          const offs = [
            [-1, -1],
            [1, 0],
            [-1, 1],
          ];
          return (
            <>
              {["Brand", "Website", "Software"].map((name, i) => {
                const [dx, dy] = offs[i];
                const k = 1 - come;
                return (
                  <div key={name} style={{ position: "absolute", left: 540 - 170 + dx * 300 * k, top: 860 - 56 + STACK[name] * (1 - k) + dy * 330 * k, width: 340, height: 112, borderRadius: 56, boxShadow: `inset 0 0 0 2px ${CHALK}`, display: "grid", placeItems: "center", color: CHALK, fontSize: 44, fontWeight: 500, opacity: 1 - clamp((come - 0.75) / 0.25) }}>
                    {name}
                  </div>
                );
              })}
              <div style={{ position: "absolute", left: 0, right: 0, top: 700, display: "flex", justifyContent: "center", fontSize: 560, color: CHALK, opacity: clamp((come - 0.7) / 0.25) }}>
                <Switch color={CHALK} on={on} />
              </div>
              <div style={{ position: "absolute", left: 72, right: 72, top: 1120, textAlign: "center", fontSize: 40, color: CHALK, letterSpacing: "-0.01em", opacity: 0.85 }}>
                <Up u={rise(t, word("gap", "gap") + 0.2)}>Identity, website and systems. One studio.</Up>
              </div>
            </>
          );
        }}
      </Scene>

      {/* Hyderabad: the globe from the site, drawing its line */}
      <Scene id="two">
        {(t) => (
          <>
            <FullVideo src="flow-raw.mp4" from={39.0} t={t} a={at("two")} focus={0.5} />
            <Shade top={0.6} bottom={0.55} />
            <div style={{ position: "absolute", left: 72, top: 220, color: CHALK, fontSize: 66, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
              <div><Up u={rise(t, word("two", "two"))}>Two engineers.</Up></div>
              <div><Up u={rise(t, word("two", "one"))}>One studio.</Up></div>
              <div style={{ color: "#a9c1ff" }}><Up u={rise(t, word("two", "hyderabad"))}>Hyderabad.</Up></div>
            </div>
          </>
        )}
      </Scene>

      {/* the founders */}
      <Scene id="ruthwik">
        {(t) => (
          <>
            <Photo src="ruthwik.jpg" t={t} a={at("ruthwik")} pos="42% 72%" />
            <Shade top={0.55} bottom={0.85} />
            <Chapter t={t} a={at("ruthwik")} n="" title="The people" />
            <LowerThird t={t} a={at("ruthwik") + 0.4} name="M. Nagaruthwik" role="Founder · Full-stack engineer & creative designer" />
          </>
        )}
      </Scene>
      <Scene id="vinith">
        {(t) => (
          <>
            <Photo src="vinith.jpg" t={t} a={at("vinith")} pos="50% 26%" />
            <Shade top={0.4} bottom={0.85} />
            <LowerThird t={t} a={at("vinith") + 0.3} name="A. Vinith" role="Founder · Senior backend engineer & DBA" />
          </>
        )}
      </Scene>
      <Scene id="same">
        {(t) => {
          const a = at("same");
          return (
            <>
              <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 960, overflow: "hidden" }}>
                <Img src={staticFile("story/ruthwik.jpg")} style={{ width: 1080, height: 960, objectFit: "cover", objectPosition: "42% 62%", transform: `translateX(${(1 - rise(t, a - 0.15, 0.8)) * -80}px)` }} />
              </div>
              <div style={{ position: "absolute", left: 0, top: 960, width: 1080, height: 960, overflow: "hidden" }}>
                <Img src={staticFile("story/vinith.jpg")} style={{ width: 1080, height: 960, objectFit: "cover", objectPosition: "50% 22%", transform: `translateX(${(1 - rise(t, a - 0.05, 0.8)) * 80}px)` }} />
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 958, height: 4, background: INK }} />
              <Shade top={0.2} bottom={0.8} />
            </>
          );
        }}
      </Scene>

      {/* the work */}
      <Scene id="jeeva">
        {(t) => (
          <>
            <FullVideo src="tour-raw2.mp4" from={24.7} t={t} a={at("jeeva")} focus={0.72} rate={0.85} />
            <Shade top={0.6} bottom={0.85} />
            <Chapter t={t} a={at("jeeva")} n="" title="The work" />
            <LowerThird t={t} a={at("jeeva") + 0.6} name="Jeeva Multispeciality Hospital" role="Hospital software · Website · Hanamkonda" />
          </>
        )}
      </Scene>
      <Scene id="maera" bg="#2a2227">
        {(t) => (
          <>
            <Window src="maera-dash.jpg" w={900} x={90} y={250} t={t} a={at("maera") - 0.1} />
            <Window src="maera-cal.jpg" w={760} x={250} y={540} t={t} a={at("maera")} delay={0.5} />
            <LowerThird t={t} a={at("maera") + 0.6} name="Maéra Makeover & Academy" role="Website · CRM · Uppal, Hyderabad" />
          </>
        )}
      </Scene>
      <Scene id="netha" bg="#3a1714">
        {(t) => (
          <>
            <Photo src="netha-2.webp" t={t} a={at("netha")} pos="50% 40%" from={1.1} to={1.0} dur={4} />
            <Shade top={0.4} bottom={0.85} />
            <LowerThird t={t} a={at("netha") + 0.3} name="Netha Silks & Co." role="Online store · Bhoodan Pochampally" />
          </>
        )}
      </Scene>

      {/* what the studio makes, over the site's own bloom */}
      <Scene id="together">
        {(t) => (
          <>
            <FullVideo src="flow-raw.mp4" from={0.9} t={t} a={at("together")} focus={0.64} rate={0.5} />
            <Shade top={0.15} bottom={0.75} />
            <div style={{ position: "absolute", left: 72, top: 300, color: INK, fontSize: 84, fontWeight: 500, letterSpacing: "-0.045em", lineHeight: 1 }}>
              <div><Up u={rise(t, word("together", "identity"))}>Identity.</Up></div>
              <div><Up u={rise(t, word("together", "leads"))}>Leads.</Up></div>
              <div><Up u={rise(t, word("together", "solutions"))}>Solutions.</Up></div>
            </div>
          </>
        )}
      </Scene>

      {/* the end: the mark throws on, the name, the invitation */}
      <Scene id="end">
        {(t) => {
          const a = at("end");
          const on = throwOn(clamp((t - (a + 0.2)) / 0.45));
          return (
            <>
              <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", color: CHALK, fontSize: 64, fontWeight: 500, letterSpacing: "-0.04em" }}>
                <Up u={rise(t, a)}>Nothing average.</Up>
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 720, display: "flex", justifyContent: "center", alignItems: "baseline", color: CHALK, fontSize: 210, fontWeight: 500, lineHeight: 1 }}>
                <span style={{ display: "inline-flex", alignItems: "baseline", opacity: rise(t, a + 0.1, 0.3) }}>
                  <Switch color={CHALK} on={on} />
                  <span style={{ marginLeft: "-0.027em", letterSpacing: "-0.04em" }}>ne</span>
                </span>
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 940, textAlign: "center", color: CHALK, fontSize: 84, fontWeight: 500, letterSpacing: "-0.03em" }}>
                <Up u={rise(t, word("end", "prime"))}>Prime Studio</Up>
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 1110, display: "flex", justifyContent: "center", opacity: rise(t, a + 1.4, 0.4) }}>
                <span style={{ height: 84, padding: "0 40px", borderRadius: 42, background: CHALK, color: INK, display: "flex", alignItems: "center", fontSize: 40, fontWeight: 500 }}>DM &ldquo;PRIME&rdquo; to start</span>
              </div>
              <div style={{ position: "absolute", left: 0, right: 0, top: 1230, textAlign: "center", color: CHALK, fontSize: 28, opacity: 0.7 * rise(t, a + 1.6, 0.4) }}>
                @oneprimestudio · Hyderabad → Worldwide
              </div>
            </>
          );
        }}
      </Scene>

      <Subtitles t={t} />
      <Grain f={f} />
      <Audio src={staticFile("story/vo.wav")} />
    </AbsoluteFill>
  );
}
