# One Prime — Instagram intro (1080×1920, 60 fps, ~64 s)

Everything is generated from code, so any line, timing or sound can be changed and re-rendered.

```
scripts/vo.py        voice-over: 18 lines, a delivery style per act, word timings  → public/vo/*.wav, src/vo.json
scripts/timeline.py  the edit: every line on a 120 BPM grid, hits on downbeats     → src/timeline.json
scripts/audio.py     score + sound design + mix + master (−1 dBFS ceiling)         → public/master.wav, src/levels.json
src/                 the picture (Remotion, .jsx so the website's tsconfig ignores it)
  lib/core.js        brand tokens, fonts, easing (incl. the site's menu curve), noise
  lib/Dither.jsx     the 4×4 Bayer tile from 5.png as the threshold map
  lib/ui.jsx         masked reveals, scramble, the logo switch, HUD, dither curtain
  scenes/Act1–3.jsx  hook · problem · switch · intro · belief · services · zero · why · solved · ask · CTA
```

## Re-cut

1. Edit a line in `scripts/vo.py` (`LINES`), or a delivery in `STYLE`.
2. `npm run build:sound`. This runs VO, then the timeline, then audio. Scenes follow the new timings automatically.
3. `npm run stills -- 4.2 16.1 60.5` writes review frames to `out/stills/`.
4. `npm run render` writes `out/oneprime-intro.mp4`.

`npm run studio` opens Remotion Studio on http://localhost:3123 to scrub the timeline.

## Voice

The VO is Microsoft neural TTS (`edge-tts`): Andrew narrates, Ava asks the client questions.
For ElevenLabs, render each line in `LINES` to `public/vo/<id>.wav` (48 kHz mono) with the same ids,
write `src/vo.json` with word timings (ElevenLabs `with-timestamps` gives character timings), then
run `timeline.py` and `audio.py`.

Remotion is free for individuals and companies of up to 3 people. See remotion.dev/license.

---

# One Prime — a short film (documentary-style SaaS intro, 1080×1920, 60 fps, ~69 s)

White ground, PP Neue Montreal only, masked kinetic type, every curve in-out. A second composition
(`Doc`) in the same workspace; the Instagram intro above is untouched.

```
scripts/doc/vo.py        14 narrator lines (en-US-ChristopherNeural, documentary read) → public/doc/vo, src/doc/vo.json
scripts/doc/timeline.py  100 BPM grid, scene bounds                                    → src/doc/timeline.json
scripts/doc/audio.py     felt piano + pads (A minor → C major on "One"), SFX, mix       → public/doc/master.wav
src/doc/
  time.js     palette, in-out easing set, timeline helpers
  kit.jsx     K (masked kinetic word), Row, Letters, Slot, wipes, Switch mark, chapter cards, subtitles, chrome
  Problem.jsx prologue · hook · spreadsheets · five tools · the website
  Product.jsx the turn (dot → switch) · one studio · six modules
  World.jsx   clinic · store · team scenarios · built as one · sign-off + CTA
  fx.jsx      laser beams, bloom flash, anamorphic flare, light leaks, film grain, ambient glow (driven by timeline `fx`)
  Doc.jsx     scene masks (wipe up / left, circle collapse, circle reveal), FX layers, subtitles, chrome, audio
public/doc/assets/
  sky.jpg     the studio's sky backdrop (logo reveal window + end card)
  badge.jpg   ID badge mockup (Brand identity module)
  dither.png  dither flower (prologue)
  maera.mp4   Maera salon CRM walkthrough — client work, shown as the case study in chapter 03
```

`npm run doc:sound` rebuilds VO → timeline → mix, `COMP=Doc npm run stills -- 12 30` renders review
frames, `npm run doc:render` writes `out/oneprime-film.mp4`.

---

# One Prime — launch intro (1080×1920, 60 fps, 23.5 s, no voice)

Built from three Pinterest references: the Maxterz bouncing-ball logo reveal, the Joi app's elastic UI
morphs, and ElevenLabs' punch-through + gradient orb. The ball is the knob of the One Prime switch.

```
src/launch/cues.json   every beat of the edit (seconds) — read by the picture and the mix
src/launch/lib.js      palette, springs (damped, overshooting), wobble for squash/stretch, text measuring
src/launch/Launch.jsx  bounce · introducing → mark · punch-through + orb · services card · Day 01 · CTA → banner · finale
scripts/launch/audio.py  120 BPM bouncy score + elastic SFX (boings, pops, zips, slot roll, sparkles) → public/launch/master.wav
```

Move a cue in `cues.json`, then `npm run launch:sound` and `npm run launch:render` → `out/oneprime-launch.mp4`.

## Launch v2 — "Introducing Logotype" style (1080×1920, 60 fps, 19 s)

`src/launch2/` (composition `Launch2`): "Introducing" folds into a spinning ring that settles into the
switch, the knob drops in and clicks on, the wordmark slides out; then a mosaic of real work (Maera
CRM screens, the studio's slides, sky, badge, dither, drawn UI cards) drifts up around one line of
text, three service cards spring in, and the mark closes. Card images live in `public/launch2/`.
Sound: `scripts/launch2/audio.py` — ambient pads, plucks through a ping-pong delay, everything in a
4.6 s hall. `npm run launch2:sound`, `npm run launch2:render` → `out/oneprime-launch-v2.mp4`.

## Logo film (1080×1920, 60 fps, 25 s)

`src/logo/` (composition `Logo`): the mark explained in nine steps — a point; it stretches into the
capsule and hollows out; droplets merge into the knob; the switch flips the world (ink, then blue);
"ne" falls in and the switch is shown to be the O; the geometry drawn as a blueprint (1.75 · 0.90 ·
0.52 · 0.11); "Prime Studio" assembles from slices; Design · Develop · Launch · Evolve on colour
fields; the lockup clicks on with "Average is not an option." Effects follow Pinterest logo-animation
references (gooey metaballs, elastic pill, circle invert, sliced type, bouncing letters, word + dot).
Sound: `scripts/logo/audio.py`. `npm run logo:sound`, `npm run logo:render` → `out/oneprime-logo-intro.mp4`.
