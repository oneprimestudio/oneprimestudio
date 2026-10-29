import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, SANS } from "../lib/core";
import reel from "./reel.json";
import slides from "./slides.json";
import hook from "./hook.json";

/*
 * Instagram posts made from the frame-exact captures of the live site (scripts/capture-site.mjs):
 *  - SiteReel: 9:16, the landscape capture in the middle, a hook line above it per shot, an end card
 *  - SiteSlide: 4:5 carousel slides, one still of the site each, with a short line
 * Everything stays inside Instagram's safe area: top ~220px and bottom ~420px carry its own UI.
 */

const PRIME = (x) => {
  // cubic-bezier(0.87, 0, 0.13, 1), the site's signature curve, solved for y at x
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const b = (a, c, s) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * c + s * s * s;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (b(0.87, 0.13, m) < x) lo = m;
    else hi = m;
  }
  return b(0, 1, (lo + hi) / 2);
};
const clamp = (v) => Math.max(0, Math.min(1, v));

/** words rising out of a mask, one after another, on the prime curve */
function Rise({ lines, at = 0, out = Infinity, size = 92, color = C.ink, weight = 500, gap = 0.06, dur = 0.7, fps = 60 }) {
  const now = useCurrentFrame() / fps;
  const t = useCurrentFrame() / fps - at;
  let k = 0;
  return (
    <div style={{ fontFamily: SANS, fontWeight: weight, fontSize: size, lineHeight: 1.02, letterSpacing: "-0.045em", color }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap", gap: `0 ${size * 0.24}px` }}>
          {line.split(" ").map((w, wi) => {
            const u = PRIME(clamp((t - k * gap) / dur));
            const away = PRIME(clamp((now - out - k * gap * 0.5) / (dur * 0.7)));
            k++;
            return (
              <span key={wi} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.08, marginBottom: -size * 0.08 }}>
                <span style={{ display: "inline-block", transform: `translateY(${(1 - u) * 110 - away * 110}%)` }}>{w}</span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * The Reel: the home page in one unbroken take (no cuts, no wipes) in the middle of the frame; the line above
 * it changes with the section on screen, the old line rising away as the new one rises in. The take then
 * gives way to the end card.
 */
export function SiteReel() {
  const f = useCurrentFrame();
  const { fps, take, labels, end } = reel;
  const len = Math.round((take.to - take.from) * fps);
  const VIDEO_TOP = 700;
  const VH = 608;
  const t = f / fps;
  const fade = clamp((f - len) / 14);
  return (
    <AbsoluteFill style={{ background: C.sand }}>
      <Sequence durationInFrames={len + 14}>
        <AbsoluteFill style={{ opacity: 1 - fade }}>
          <div style={{ position: "absolute", left: 72, top: 230, fontFamily: SANS, fontSize: 30, color: C.ink }}>One Prime Studio</div>
          {labels.map((l, i) => {
            const next = labels[i + 1]?.t ?? Infinity;
            if (t < l.t || t > next + 0.6) return null;
            return (
              <div key={i} style={{ position: "absolute", left: 72, right: 72, top: 300 }}>
                <Rise lines={l.hook} at={l.t} out={next} />
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 0, top: VIDEO_TOP, width: 1080, height: VH, overflow: "hidden", background: "#fff" }}>
            <OffthreadVideo src={staticFile(`site/${take.src}`)} trimBefore={Math.round(take.from * fps)} muted style={{ width: 1080, height: VH, display: "block" }} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={len}>
        <AbsoluteFill style={{ opacity: fade }}>
          <EndCard end={end} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}

function EndCard({ end }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, color: C.sand, fontFamily: SANS }}>
      {/* the studio's switch: the O of "One", flipping on */}
      <div style={{ position: "absolute", left: 72, top: 230, width: 132, height: 66, borderRadius: 33, boxShadow: `inset 0 0 0 6px ${C.sand}`, opacity: clamp(f / 12) }}>
        <div style={{ position: "absolute", top: 13, left: 13 + 66 * PRIME(clamp((f - 10) / 36)), width: 40, height: 40, borderRadius: 20, background: C.sand }} />
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 360 }}>
        <Rise lines={end.title} size={120} color={C.sand} at={0.1} />
        <div style={{ marginTop: 56 }}>
          <Rise lines={end.lines} size={44} weight={400} color="rgba(239,237,233,0.72)" at={0.45} gap={0.03} />
        </div>
      </div>
      <div
        style={{
          position: "absolute", left: 72, top: 1250, height: 84, padding: "0 40px", borderRadius: 42,
          display: "flex", alignItems: "center", fontSize: 40, letterSpacing: "-0.02em",
          background: C.sand, color: C.ink, opacity: clamp((f - 60) / 18), transform: `translateY(${(1 - PRIME(clamp((f - 60) / 40))) * 40}px)`,
        }}
      >
        {end.cta}
      </div>
    </AbsoluteFill>
  );
}

/** one 4:5 carousel slide; `n` picks it from slides.json */
export function SiteSlide({ n = 0 }) {
  const s = slides.slides[n];
  const dark = s.dark;
  const ink = dark ? C.sand : C.ink;
  const total = slides.slides.length;
  return (
    <AbsoluteFill style={{ background: dark ? C.ink : C.sand, fontFamily: SANS, color: ink }}>
      <div style={{ position: "absolute", left: 64, right: 64, top: 56, display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.75 }}>
        <span>One Prime Studio</span>
        <span>{String(n + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
      </div>
      <div style={{ position: "absolute", left: 64, right: 64, top: 150 }}>
        <Rise lines={s.title} size={s.size ?? 84} color={ink} at={-10} />
      </div>
      {s.img ? (
        <div style={{ position: "absolute", left: s.bleed ? 0 : 64, right: s.bleed ? 0 : 64, top: s.imgTop ?? 400, bottom: s.text ? 250 : 150, overflow: "hidden", background: "#fff" }}>
          <Img src={staticFile(`site/stills/${s.img}`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: s.pos ?? "50% 50%" }} />
        </div>
      ) : null}
      {s.text ? (
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 72, fontSize: 30, lineHeight: 1.3, letterSpacing: "-0.01em", opacity: 0.75 }}>{s.text}</div>
      ) : (
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 64, display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.6 }}>
          <span>{s.note ?? ""}</span>
          <span>{n < total - 1 ? "Swipe →" : ""}</span>
        </div>
      )}
      {s.switch ? (
        // the studio's switch, large and on
        <div style={{ position: "absolute", left: 64, top: 560, width: 400, height: 200, borderRadius: 100, boxShadow: `inset 0 0 0 16px ${ink}` }}>
          <div style={{ position: "absolute", top: 40, right: 40, width: 120, height: 120, borderRadius: 60, background: ink }} />
        </div>
      ) : null}
      {s.pill ? (
        <div style={{ position: "absolute", left: 64, bottom: 220, height: 84, padding: "0 40px", borderRadius: 42, display: "flex", alignItems: "center", fontSize: 40, letterSpacing: "-0.02em", background: dark ? C.sand : C.ink, color: dark ? C.ink : C.sand }}>
          {s.pill}
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

/** the 16:9 film: the home page in one take, intro to footer, then the end card */
export const FILM = [{ src: "flow-raw.mp4", from: 0, to: 55.4 }];
export const FILM_END = 4;
export const filmFrames = (fps) => Math.round((FILM.reduce((a, s) => a + s.to - s.from, 0) + FILM_END) * fps);

export function SiteFilm() {
  const f = useCurrentFrame();
  const fps = 60;
  let start = 0;
  const seq = FILM.map((s) => {
    const at = start;
    const len = Math.round((s.to - s.from) * fps);
    start += len;
    return { ...s, at, len };
  });
  const endAt = start;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {seq.map((s, i) => (
        <Sequence key={i} from={s.at} durationInFrames={s.len}>
          <OffthreadVideo src={staticFile(`site/${s.src}`)} trimBefore={Math.round(s.from * fps)} muted style={{ width: 1920, height: 1080 }} />
        </Sequence>
      ))}
      {/* no wipes: the take simply fades into the end card */}
      <Sequence from={endAt} durationInFrames={FILM_END * fps}>
        <AbsoluteFill style={{ opacity: clamp((f - endAt) / 14) }}>
          <FilmEnd />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}

function FilmEnd() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, color: C.sand, fontFamily: SANS }}>
      <div style={{ position: "absolute", left: 120, top: 300, width: 120, height: 60, borderRadius: 30, boxShadow: `inset 0 0 0 6px ${C.sand}`, opacity: clamp(f / 12) }}>
        <div style={{ position: "absolute", top: 12, left: 12 + 60 * PRIME(clamp((f - 10) / 36)), width: 36, height: 36, borderRadius: 18, background: C.sand }} />
      </div>
      <div style={{ position: "absolute", left: 120, right: 120, top: 410 }}>
        <Rise lines={["One Prime Studio"]} size={150} color={C.sand} at={0.1} />
        <div style={{ marginTop: 48 }}>
          <Rise lines={["Websites · Shopify stores · CRM & ERP · SaaS · Brand identity", "Hyderabad → Worldwide"]} size={44} weight={400} color="rgba(239,237,233,0.72)" at={0.45} gap={0.03} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/**
 * The hook Reel: a viral-style cut. A line you can't scroll past on the very first frame, fast hard cuts
 * (no wipes) through the site and the clients' work, each with one short line, and a call to act.
 * `full` shots fill the 9:16 frame from the landscape capture around `focus` (share of its width);
 * `band` shots keep the whole landscape frame across the middle so the interface reads.
 */
export const hookFrames = (fps) => Math.round((hook.beats.reduce((a, b) => a + b.dur, 0) + hook.end.sec) * fps);

export function HookReel() {
  const { fps, beats, end } = hook;
  let at = 0;
  const seq = beats.map((b) => {
    const s = { ...b, at, len: Math.round(b.dur * fps) };
    at += s.len;
    return s;
  });
  return (
    <AbsoluteFill style={{ background: C.sand }}>
      {seq.map((b, i) => (
        <Sequence key={i} from={b.at} durationInFrames={b.len}>
          <Beat b={b} />
        </Sequence>
      ))}
      <Sequence from={at}>
        <EndCard end={end} />
      </Sequence>
      {/* the voice only: music is added in Instagram */}
      <Audio src={staticFile("site/hook-vo.wav")} />
    </AbsoluteFill>
  );
}

function Beat({ b }) {
  const f = useCurrentFrame();
  const ground = b.bg === "ink" ? C.ink : C.sand;
  const onImage = b.fit === "full";
  const ink = b.bg === "ink" ? C.sand : C.ink;
  const FW = (1920 * 1920) / 1080; // a full shot's width at the frame's height
  // a slow push in, so even a held shot keeps moving
  const push = 1 + 0.05 * (f / (b.dur * 60));
  return (
    <AbsoluteFill style={{ background: ground }}>
      {b.src && onImage ? (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `scale(${push})` }}>
          <OffthreadVideo
            src={staticFile(`site/${b.src}`)}
            trimBefore={Math.round(b.from * 60)}
            playbackRate={b.rate ?? 1}
            muted
            style={{ position: "absolute", top: 0, height: 1920, width: FW, left: Math.min(0, Math.max(1080 - FW, 540 - FW * (b.focus ?? 0.5))) }}
          />
          {/* shade under the line so it reads on any picture */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(239,237,233,0.97) 0%, rgba(239,237,233,0.85) 22%, rgba(239,237,233,0) 40%)" }} />
        </div>
      ) : null}
      {b.src && !onImage ? (
        <div style={{ position: "absolute", left: 0, top: 700, width: 1080, height: 608, overflow: "hidden", background: "#fff" }}>
          <OffthreadVideo src={staticFile(`site/${b.src}`)} trimBefore={Math.round(b.from * 60)} playbackRate={b.rate ?? 1} muted style={{ width: 1080, height: 608, display: "block", transform: `scale(${push})` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 72, right: 72, top: b.src ? 300 : 760 }}>
        <Rise lines={b.text} at={b.now ? -1 : 0} size={b.src ? 96 : 116} color={ink} gap={0.05} dur={0.5} />
      </div>
    </AbsoluteFill>
  );
}
