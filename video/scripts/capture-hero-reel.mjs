// Frame-exact capture of the hero for a reel: the page's clocks (Date.now, performance.now) and its
// requestAnimationFrame are replaced by a virtual clock that moves exactly 1/60 s per frame, so every GSAP
// tween, spring and shader advances by one true frame between screenshots, however long a screenshot takes.
// Real mouse events follow a scripted path; an arrow cursor is drawn over the page (screenshots carry none).
// PNG frames are piped straight into ffmpeg (libx264, 60 fps).
//
//   node reel.mjs <url> <out.mp4> [seconds] [--preview]
import { spawn } from "node:child_process";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = "C:/Users/ruthw/Documents/SaaS/oneprimestudio/video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const [url, out, secArg] = process.argv.slice(2);
const PREVIEW = process.argv.includes("--preview");
const FPS = 60;
const SECONDS = +(secArg ?? 15);
const FRAMES = Math.round(SECONDS * FPS);
const W = 1080;
const H = 1920;
const PORT = 9300 + Math.floor(Math.random() * 200);

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, "--force-device-scale-factor=1",
  "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars", "--mute-audio",
  "--user-data-dir=" + process.env.TEMP + "/reel-profile", "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://localhost:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id); else if (msg.method === "Runtime.exceptionThrown") errs.push(msg.params.exceptionDetails.exception?.description?.split("\n")[0]); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
// the virtual clock, installed before any of the page's scripts run
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  const realPerf = performance.now.bind(performance);
  const epoch = Date.now();
  let t = realPerf();
  const q = new Map(); let nid = 1;
  const t0 = t;
  performance.now = () => t;
  // new Date() too, so the clocks on the page tick at the video's pace
  const RealDate = Date;
  class VDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(epoch + t - t0); } static now() { return epoch + t - t0; } }
  window.Date = VDate;
  window.requestAnimationFrame = (cb) => { const i = nid++; q.set(i, cb); return i; };
  window.cancelAnimationFrame = (i) => { q.delete(i); };
  // CSS animations and transitions run on the browser's own clock: each frame, every one is paused and set to
  // where the virtual clock says it should be
  const css = new WeakMap();
  const syncCss = () => {
    for (const a of document.getAnimations()) {
      let s = css.get(a);
      if (!s) { s = { base: a.currentTime || 0, from: t }; css.set(a, s); a.pause(); }
      a.currentTime = s.base + (t - s.from);
    }
  };
  window.__step = (ms) => { t += ms; const run = [...q.values()]; q.clear(); for (const cb of run) { try { cb(t); } catch (e) { console.error(e); } } syncCss(); };
  // the arrow cursor, drawn over everything, following the real mouse events
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.innerHTML = '<svg width="26" height="34" viewBox="0 0 26 34"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#0a0a0a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    c.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);will-change:transform";
    document.body.appendChild(c);
    addEventListener("pointermove", (e) => { c.style.transform = "translate(" + (e.clientX - 2) + "px," + (e.clientY - 2) + "px)"; }, true);
  });
})();` });
await send("Page.navigate", { url });
// real time for the page to load, hydrate and decode; the virtual clock stands still meanwhile, so the
// intro waits at its first frame
// the page boots on requestAnimationFrame too (hydration, effects): its queue is pumped meanwhile without
// moving the clock, so everything is set up and waiting at the intro's first frame
for (let k = 0; k < 200; k++) { await ev("window.__step && window.__step(0)"); await sleep(50); }
await ev(`document.fonts.ready.then(() => true)`);
for (let k = 0; k < 30; k++) { await ev("window.__step(0)"); await sleep(50); }

// ---- the cursor's path: waypoints [t (s), x, y], joined by a Catmull-Rom curve, eased between points ----
const P = [
  [0.0, 1180, 1500], [3.0, 1180, 1500],           // off screen while the intro plays
  [3.9, 980, 1250],                                 // comes in from the lower right
  [4.8, 820, 900],                                  // up to the bloom's heart: the flower leans to it
  [5.6, 640, 620],
  [6.3, 980, 520],                                  // around the head, slowly
  [6.75, 400, 980],                                 // a quick swipe across: a gust through the petals
  [7.5, 110, 845],                                  // over to the first line
  [8.9, 480, 848],                                  // across "WE SWITCH": every letter switches
  [9.6, 590, 1072],
  [10.9, 1030, 1076],                               // across "THE THINGS"
  [11.8, 520, 1250],
  [12.8, 240, 1360],                                // to the small flower
  [13.6, 120, 1500],
  [14.3, 360, 1640],
  [15.0, 540, 1760],
];
const at = (s) => {
  let i = 0;
  while (i < P.length - 2 && s > P[i + 1][0]) i++;
  const [t1, x1, y1] = P[i]; const [t2, x2, y2] = P[i + 1];
  const p0 = P[Math.max(0, i - 1)], p3 = P[Math.min(P.length - 1, i + 2)];
  let u = t2 > t1 ? Math.min(1, Math.max(0, (s - t1) / (t2 - t1))) : 1;
  u = u * u * (3 - 2 * u); // ease in and out between waypoints
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return [cr(p0[1], x1, x2, p3[1]), cr(p0[2], y1, y2, p3[2])];
};

// ---- encoder ----
const ff = spawn(FFMPEG, [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
  "-c:v", "libx264", "-preset", PREVIEW ? "veryfast" : "slow", "-crf", PREVIEW ? "23" : "14",
  "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS), "-movflags", "+faststart", out,
], { stdio: ["pipe", "ignore", "pipe"] });
let fferr = ""; ff.stderr.on("data", (d) => (fferr = (fferr + d).slice(-2000)));

// the cursor trail's size is a share of the viewport's height: on a 1920px-tall frame it comes out twice
// its laptop size and buries the flower, so the reel leaves it out (NOTRAIL=0 keeps it)
if (process.env.NOTRAIL !== "0")
  await ev(`(() => { const s = document.createElement("style"); s.textContent = ".mix-blend-difference{visibility:hidden!important}"; document.head.appendChild(s); })()`);
// a short pre-roll, not recorded: the intro's first frames are the bare ground, before the dots arrive, and
// the first screenshots can still hold a frame painted before the clock started
for (let f = 0; f < 15; f++) {
  await ev(`window.__step(${1000 / FPS})`);
  await send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
}

const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  const s = f / FPS;
  const [x, y] = at(s);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  await ev(`window.__step(${1000 / FPS})`);
  const shot = await send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
  const buf = Buffer.from(shot.result.data, "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 60 === 0) console.log(`frame ${f}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
console.log("done", out, "errors:", errs.length ? errs.slice(0, 5) : "none");
console.log(fferr.split("\n").slice(-4).join("\n"));
ws.close(); chrome.kill(); process.exit(0);
