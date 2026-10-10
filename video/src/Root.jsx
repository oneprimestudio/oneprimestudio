import { Composition } from "remotion";
import { Intro } from "./Intro";
import { Doc } from "./doc/Doc";
import tl from "./timeline.json";
import docTl from "./doc/timeline.json";
import { LaunchFilm } from "./launch/Launch";
import launchCues from "./launch/cues.json";
import { Launch2 } from "./launch2/Launch2";
import launch2Cues from "./launch2/cues.json";
import { LogoFilm } from "./logo/Logo";
import logoCues from "./logo/cues.json";

export const Root = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={tl.frames} fps={tl.fps} width={1080} height={1920} />
    <Composition id="Doc" component={Doc} durationInFrames={docTl.frames} fps={docTl.fps} width={1080} height={1920} />
    <Composition id="Logo" component={LogoFilm} durationInFrames={Math.round(logoCues.duration * logoCues.fps)} fps={logoCues.fps} width={1080} height={1920} />
    <Composition id="Launch2" component={Launch2} durationInFrames={Math.round(launch2Cues.duration * launch2Cues.fps)} fps={launch2Cues.fps} width={1080} height={1920} />
    <Composition id="Launch" component={LaunchFilm} durationInFrames={Math.round(launchCues.duration * launchCues.fps)} fps={launchCues.fps} width={1080} height={1920} />
  </>
);
