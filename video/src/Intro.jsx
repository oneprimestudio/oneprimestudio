import { AbsoluteFill, Audio, staticFile } from "remotion";
import { C, p, E, shake, TL, useT, W, HIT } from "./lib/core";
import { Curtain, Hud } from "./lib/ui";
import { Hook, Problem, Switch } from "./scenes/Act1";
import { Belief, Intro as IntroScene, Services, Zero } from "./scenes/Act2";
import { Ask, Cta, CTA_SWAP, Solve, Why } from "./scenes/Act3";

const SCENES = { hook: Hook, problem: Problem, switch: Switch, intro: IntroScene, belief: Belief, services: Services, zero: Zero, why: Why, solve: Solve, ask: Ask, cta: Cta };
const GROUND = { hook: C.night, problem: C.ink, switch: C.night, intro: C.sand, belief: C.ink, services: C.sand, zero: C.ink, why: C.sand, solve: C.ink, ask: C.ink, cta: C.ink };
const INDEX = { hook: "00", problem: "01", switch: "01", intro: "02", belief: "02", services: "03", zero: "04", why: "05", solve: "06", ask: "07", cta: "07" };

// how light the ground is (0 dark … 1 sand) — drives the HUD colour
const lightness = (id, t) => {
  if (id === "switch") return p(t, HIT.switch + 0.2, 0.5, E.linear);
  if (id === "solve") return p(t, W("solve", 6) + 0.05, 0.35, E.linear);
  if (id === "cta") return 0;
  return GROUND[id] === C.sand ? 1 : 0;
};

export function Intro() {
  const t = useT();
  const sc = TL.scenes.find((s) => t >= s.start && t < s.end) ?? TL.scenes[TL.scenes.length - 1];
  const Scene = SCENES[sc.id];
  const [sx, sy] = shake(t);
  const curtains = TL.scenes.filter((s) => s.in === "dither" && s.id !== "intro");
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
        <Scene t={t} sc={sc} />
      </AbsoluteFill>
      <Hud t={t} light={lightness(sc.id, t)} label={`${INDEX[sc.id]} / 07`} start={sc.start} />
      {curtains.map((s, i) => (
        <Curtain key={s.id} t={t} at={s.start} color={GROUND[s.id]} mode={i % 4} seed={i + 1} />
      ))}
      <Curtain t={t} at={CTA_SWAP} color={C.ink} mode={2} seed={42} />
      <Audio src={staticFile("master.wav")} />
    </AbsoluteFill>
  );
}
