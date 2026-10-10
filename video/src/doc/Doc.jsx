import { AbsoluteFill, Audio, staticFile } from "remotion";
import { D, E, p, TL, useT, lerp } from "./time";
import { Chrome, Subs } from "./kit";
import { Hook, Sheets, Site, Title, Tools } from "./Problem";
import { Mods, Product, Turn } from "./Product";
import { Close, Maera, Sign, Store, Team } from "./World";
import { flashAmount, flashFilter, FlashOverlay, Flares, Glow, Grain, Lasers, Leaks } from "./fx";

const SCENES = { title: Title, hook: Hook, sheets: Sheets, tools: Tools, site: Site, turn: Turn, product: Product, mods: Mods, maera: Maera, store: Store, team: Team, close: Close, sign: Sign };

/*
 * How each scene comes in. Every one is a mask: the new scene is revealed through a moving clip
 * edge (drawn as a hairline) while the old one drifts the other way. "collapse" closes the old
 * scene into a circle that shrinks to a single dot — the dot becomes the knob of the switch.
 */
const IN = { hook: "none", sheets: "up", tools: "left", site: "up", turn: "collapse", product: "up", mods: "up", maera: "up", store: "left", team: "left", close: "up", sign: "circle" };
const DUR = { up: 0.8, left: 0.8, collapse: 0.6, circle: 0.95, none: 0 };

function layer(kind, k, role) {
  // role: "in" (k 0→1 reveal) or "out" (k 0→1 leaving)
  if (role === "out") {
    if (kind === "up") return { transform: `translateY(${-k * 180}px)` };
    if (kind === "left") return { transform: `translateX(${-k * 160}px)` };
    if (kind === "collapse") return { clipPath: `circle(${lerp(1200, 13, k)}px at 540px 1180px)` };
    if (kind === "circle") return { transform: `scale(${1 - 0.06 * k})` };
    return {};
  }
  if (kind === "up") return { clipPath: `inset(${(1 - k) * 100}% 0 0 0)`, transform: `translateY(${(1 - k) * 120}px)` };
  if (kind === "left") return { clipPath: `inset(0 0 0 ${(1 - k) * 100}%)`, transform: `translateX(${(1 - k) * 120}px)` };
  if (kind === "circle") return { clipPath: `circle(${k * 1150}px at 540px 960px)` };
  return {};
}

/** a scene with its own slow push-in (continuous across the transition out of it) */
function Shot({ S, t, sc }) {
  const push = lerp(1, 1.03, p(t, sc.start, Math.max(1, sc.end - sc.start + 0.8), E.sine));
  return (
    <AbsoluteFill style={{ transform: `scale(${push})` }}>
      <S t={t} sc={sc} />
    </AbsoluteFill>
  );
}

export function Doc() {
  const t = useT();
  const i = Math.max(0, TL.scenes.findIndex((s) => t >= s.start && t < s.end));
  const idx = t >= TL.duration ? TL.scenes.length - 1 : i;
  const sc = TL.scenes[idx];
  const kind = IN[sc.id] ?? "none";
  const d = DUR[kind];
  const k = d ? p(t, sc.start, d, kind === "collapse" ? E.io : E.io5) : 1;
  const prev = idx > 0 && k < 1 ? TL.scenes[idx - 1] : null;
  const Cur = SCENES[sc.id];
  const Prev = prev ? SCENES[prev.id] : null;
  const edge = kind === "up" || kind === "left";
  // the bloom of any flash hit
  const flash = flashAmount(t);
  return (
    <AbsoluteFill style={{ background: D.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: flashFilter(flash) }}>
      {kind === "collapse" && Prev ? (
        <>
          <AbsoluteFill><Shot S={Cur} t={t} sc={sc} /></AbsoluteFill>
          <AbsoluteFill style={{ background: D.bg, ...layer(kind, k, "out") }}><Shot S={Prev} t={t} sc={prev} /></AbsoluteFill>
        </>
      ) : (
        <>
          {Prev && <AbsoluteFill style={layer(kind, k, "out")}><Shot S={Prev} t={t} sc={prev} /></AbsoluteFill>}
          <AbsoluteFill style={Prev ? { background: D.bg, ...layer(kind, k, "in") } : null}><Shot S={Cur} t={t} sc={sc} /></AbsoluteFill>
          {Prev && edge && (
            <span
              style={
                kind === "up"
                  ? { position: "absolute", left: 0, right: 0, height: 3, top: 1920 * (1 - k) + (1 - k) * 120, background: D.ink }
                  : { position: "absolute", top: 0, bottom: 0, width: 3, left: 1080 * (1 - k) + (1 - k) * 120, background: D.ink }
              }
            />
          )}
        </>
      )}
      </AbsoluteFill>
      {/* ambient light: a slow blue + violet glow that gives the white some depth */}
      <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", pointerEvents: "none" }}>
        <Glow t={t} x={260} y={520} size={1500} color="rgba(47,107,255,0.05)" />
        <Glow t={t + 7} x={860} y={1500} size={1400} color="rgba(123,92,255,0.045)" />
      </div>
      <Leaks t={t} />
      <Flares t={t} />
      <Lasers t={t} />
      <FlashOverlay t={t} />
      <Subs t={t} ids={["prob1", "prob2", "prob3", "real1", "real2", "real3"]} />
      <Chrome t={t} />
      <Grain />
      <Audio src={staticFile("doc/master.wav")} />
    </AbsoluteFill>
  );
}
