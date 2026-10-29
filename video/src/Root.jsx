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
import { AboutFilm } from "./about/AboutFilm";
import aboutTl from "./about/timeline.json";
import { Film2 } from "./about2/Film";
import about2Tl from "./about2/timeline.json";
import { filmFrames, hookFrames, HookReel, SiteFilm, SiteReel, SiteSlide } from "./site/SitePosts";
import siteReel from "./site/reel.json";
import { CoinReel } from "./coin/CoinReel";
import { StoryReel } from "./story/StoryReel";
import storyVo from "./story/vo.json";
import { Poster } from "./posters/Poster";
import coinVo from "./coin/vo.json";

export const Root = () => (
  <>
    <Composition id="StoryReel" component={StoryReel} durationInFrames={Math.ceil(storyVo.total * 60)} fps={60} width={1080} height={1920} />
    <Composition id="Poster" component={Poster} durationInFrames={1} fps={60} width={1080} height={1350} defaultProps={{ n: 0 }} />
    <Composition id="CoinReel" component={CoinReel} durationInFrames={Math.ceil(coinVo.total * 60)} fps={60} width={1080} height={1920} />
    <Composition
      id="SiteReel"
      component={SiteReel}
      durationInFrames={Math.round((siteReel.take.to - siteReel.take.from + siteReel.end.sec) * siteReel.fps)}
      fps={siteReel.fps}
      width={1080}
      height={1920}
    />
    <Composition id="HookReel" component={HookReel} durationInFrames={hookFrames(60)} fps={60} width={1080} height={1920} />
    <Composition id="SiteFilm" component={SiteFilm} durationInFrames={filmFrames(60)} fps={60} width={1920} height={1080} />
    <Composition id="SiteSlide" component={SiteSlide} durationInFrames={1} fps={60} width={1080} height={1350} defaultProps={{ n: 0 }} />
    <Composition id="About2" component={Film2} durationInFrames={about2Tl.frames} fps={about2Tl.fps} width={1080} height={1920} />
    <Composition id="About" component={AboutFilm} durationInFrames={aboutTl.frames} fps={aboutTl.fps} width={1080} height={1920} />
    <Composition id="Intro" component={Intro} durationInFrames={tl.frames} fps={tl.fps} width={1080} height={1920} />
    <Composition id="Doc" component={Doc} durationInFrames={docTl.frames} fps={docTl.fps} width={1080} height={1920} />
    <Composition id="Logo" component={LogoFilm} durationInFrames={Math.round(logoCues.duration * logoCues.fps)} fps={logoCues.fps} width={1080} height={1920} />
    <Composition id="Launch2" component={Launch2} durationInFrames={Math.round(launch2Cues.duration * launch2Cues.fps)} fps={launch2Cues.fps} width={1080} height={1920} />
    <Composition id="Launch" component={LaunchFilm} durationInFrames={Math.round(launchCues.duration * launchCues.fps)} fps={launchCues.fps} width={1080} height={1920} />
  </>
);
