// Frame-exact, landscape (1920×1080, 60 fps) capture of the live site for Instagram: the home page from
// its intro to the footer, and a tour through the page transitions. Same idea as capture-hero-reel.mjs —
// the page's clocks, requestAnimationFrame AND timers run on a virtual clock that moves exactly 1/60 s per
// frame, so every tween, spring, shader and transition advances one true frame between screenshots,
// however long a screenshot takes. Real mouse events follow a scripted path, an arrow cursor is drawn
// over the page, and the scroll is driven through window.scrollTo so ScrollSmoother eases after it.
//
//   node capture-site.mjs <base-url> <scene> <out.mp4> [--preview]
//   scenes: probe (prints section positions), home, tour
import { spawn } from "node:child_process";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FFMPEG = "C:/Users/ruthw/Documents/SaaS/oneprimestudio/video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe";
const [base, scene, out] = process.argv.slice(2);
const PREVIEW = process.argv.includes("--preview");
const FPS = 60;
const DT = 1000 / FPS;
// a laptop-sized layout, rendered at 4/3 density: 1440×810 CSS px → 1920×1080 pixels, so type stays
// readable when Instagram shows the landscape video on a phone
// VW/VH/DPR override it, e.g. a 9:16 phone-shaped desktop window for full-screen Reel shots
const W = +(process.env.VW ?? 1440);
const H = +(process.env.VH ?? 810);
const DPR = +(process.env.DPR ?? 4 / 3);
const PORT = 9300 + Math.floor(Math.random() * 200);

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`,
  "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars", "--mute-audio",
  "--user-data-dir=" + process.env.TEMP + "/site-capture-profile-" + scene, "about:blank",
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
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => {
  const realPerf = performance.now.bind(performance);
  const epoch = Date.now();
  let t = realPerf();
  const t0 = t;
  performance.now = () => t;
  const RealDate = Date;
  class VDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(epoch + t - t0); } static now() { return epoch + t - t0; } }
  window.Date = VDate;
  const q = new Map(); let nid = 1;
  window.requestAnimationFrame = (cb) => { const i = nid++; q.set(i, cb); return i; };
  window.cancelAnimationFrame = (i) => { q.delete(i); };
  // timers on the same clock: a 60 ms wait is 60 ms of video, not 60 ms of screenshotting
  const timers = new Map(); let tid = 1;
  const add = (fn, ms, args, every) => { const i = tid++; timers.set(i, { fn, at: t + Math.max(0, +ms || 0), args, every }); return i; };
  window.__realTimeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...args) => add(fn, ms, args, 0);
  window.setInterval = (fn, ms, ...args) => add(fn, ms, args, Math.max(1, +ms || 0));
  window.clearTimeout = window.clearInterval = (i) => { timers.delete(i); };
  const runTimers = () => {
    for (let guard = 0; guard < 1000; guard++) {
      let next = null;
      for (const [i, x] of timers) if (x.at <= t && (!next || x.at < next[1].at)) next = [i, x];
      if (!next) return;
      const [i, x] = next;
      if (x.every) x.at += x.every; else timers.delete(i);
      try { typeof x.fn === "function" ? x.fn(...x.args) : (0, eval)(x.fn); } catch (e) { console.error(e); }
    }
  };
  // the transition's bands draw on the main thread (on this clock), not in a worker with its own
  delete HTMLCanvasElement.prototype.transferControlToOffscreen;
  // CSS animations and transitions, and SVG SMIL, follow the virtual clock too
  const css = new WeakMap();
  SVGSVGElement.prototype.unpauseAnimations = function () {};
  const syncCss = () => {
    for (const a of document.getAnimations()) {
      let s = css.get(a);
      if (!s) { s = { base: a.currentTime || 0, from: t }; css.set(a, s); a.pause(); }
      a.currentTime = s.base + (t - s.from);
    }
    for (const svg of document.querySelectorAll("svg")) {
      if (svg.ownerSVGElement || !svg.querySelector("animate, animateTransform, animateMotion")) continue;
      svg.pauseAnimations(); svg.setCurrentTime((t - t0) / 1000);
    }
  };
  window.__step = (ms) => {
    t += ms;
    runTimers();
    const run = [...q.values()]; q.clear();
    for (const cb of run) { try { cb(t); } catch (e) { console.error(e); } }
    syncCss();
  };
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.innerHTML = '<svg width="20" height="26" viewBox="0 0 26 34"><path d="M2 2 L2 27 L8.5 21 L13 31.5 L17.5 29.5 L13 19.5 L22 19.5 Z" fill="#0a0a0a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    c.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);will-change:transform";
    document.body.appendChild(c);
    addEventListener("pointermove", (e) => { c.style.transform = "translate(" + (e.clientX - 2) + "px," + (e.clientY - 2) + "px)"; }, true);
  });
})();` });

/** loads a page in real time with the clock pumped but standing still, so it waits at its first frame */
async function load(url) {
  console.log("loading", url);
  await send("Page.navigate", { url });
  await sleep(500);
  for (let k = 0; k < 120; k++) { await ev("window.__step && window.__step(0)"); await sleep(50); }
  // real-time waits, capped: lazy images below the fold never load until scrolled to
  const capped = (p) => `Promise.race([${p}, new Promise((r) => __realTimeout(r, 8000))])`;
  console.log("loaded; fonts", await ev(capped(`document.fonts.ready.then(() => "ok")`)));
  console.log("images", await ev(capped(`Promise.all([...document.images].filter((i) => !i.complete && i.loading !== "lazy").map((i) => new Promise((r) => { i.onload = i.onerror = r; }))).then(() => "ok")`)));
  for (let k = 0; k < 30; k++) { await ev("window.__step(0)"); await sleep(50); }
}

/** a section's top in scroll px (offsetTop ignores the smoother's transform, and pin spacers are in the flow) */
const topOf = (sel) => ev(`(() => { let e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; let y = 0; while (e) { y += e.offsetTop; e = e.offsetParent; } return y; })()`);
/** an element's centre on screen right now */
const centre = (sel, i = 0) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((x) => { const r = x.getBoundingClientRect(); return r.width && r.height && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight && getComputedStyle(x).visibility !== "hidden"; })[${i}]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const maxScroll = () => ev(`document.documentElement.scrollHeight - innerHeight`);

if (scene === "probe") {
  await load(base + "/");
  for (let f = 0; f < 240; f++) await ev(`window.__step(${DT})`);
  const ids = ["#top", "#studio", "#services", "#work", "#principles", "#brief", "footer"];
  for (const s of ids) console.log(s, await topOf(s));
  console.log("world", await ev(`(() => { const e = [...document.querySelectorAll("section")].find((s) => /where are you from/i.test(s.textContent)); if (!e) return null; let y = 0, x = e; while (x) { y += x.offsetTop; x = x.offsetParent; } return y; })()`));
  console.log("max", await maxScroll());
  console.log("menu", await centre('button[aria-label="Open menu"]'));
  console.log("errors", errs);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 80 });
  (await import("node:fs")).writeFileSync(out ?? "probe.jpg", Buffer.from(shot.result.data, "base64"));
  ws.close(); chrome.kill(); process.exit(0);
}

// ---- the recording: state the scenes move, one screenshot per virtual frame ----
const ff = spawn(FFMPEG, [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
  "-c:v", "libx264", "-preset", PREVIEW ? "veryfast" : "slow", "-crf", PREVIEW ? "23" : "15",
  "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS), "-movflags", "+faststart", out,
], { stdio: ["pipe", "ignore", "pipe"] });
let fferr = ""; ff.stderr.on("data", (d) => (fferr = (fferr + d).slice(-2000)));

let mouse = [W * 0.72, H * 1.3]; // off screen, below
let scrollY = 0;
let frame = 0;
const started = Date.now();
const smooth = (u) => u * u * (3 - 2 * u);
const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

async function shoot() {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: Math.round(mouse[0] * 10) / 10, y: Math.round(mouse[1] * 10) / 10 });
  // scrollY null: hands off, the page (a transition landing) owns its scroll
  const sy = scrollY == null ? "" : `window.scrollY !== ${Math.round(scrollY)} && window.scrollTo(0, ${Math.round(scrollY)}), `;
  await ev(`(${sy}window.__step(${DT}))`);
  const shot = await send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
  const buf = Buffer.from(shot.result.data, "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (++frame % 120 === 0) console.log(`${scene}: ${(frame / FPS).toFixed(0)}s of video, ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

/**
 * `sec` seconds of video. Optional: scroll to `y`, move the pointer through `path` (screen points, a
 * Catmull-Rom curve through them), each with its own ease; `wander` adds a slow drift so a resting hand
 * still looks alive.
 */
async function play(sec, { y, path, ease = inOut, mouseEase = smooth, wander = 0 } = {}) {
  const n = Math.max(1, Math.round(sec * FPS));
  if (y != null && scrollY == null) scrollY = await ev("scrollY");
  const y0 = scrollY;
  const pts = path ? [mouse, ...path] : null;
  for (let f = 1; f <= n; f++) {
    const u = f / n;
    if (y != null) scrollY = y0 + (y - y0) * ease(u);
    if (pts) mouse = curve(pts, mouseEase(u));
    if (wander) mouse = [mouse[0] + Math.sin(frame / 41) * wander * 0.05, mouse[1] + Math.cos(frame / 53) * wander * 0.04];
    await shoot();
  }
}
function curve(pts, u) {
  const segs = pts.length - 1;
  const s = Math.min(segs - 1e-9, u * segs);
  const i = Math.floor(s); const v = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
  const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * v + (2 * a - 5 * b + 4 * c - d) * v * v + (-a + 3 * b - 3 * c + d) * v * v * v);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}
async function click() {
  const [x, y] = mouse;
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}
/** glide to an element (resolved now), hover it a little, optionally click */
async function visit(sel, { sec = 0.9, rest = 0.6, press = false, i = 0, dx = 0, dy = 0 } = {}) {
  const c = await centre(sel, i);
  if (!c) { console.log("missing", sel); return; }
  await play(sec, { path: [[c[0] + dx, c[1] + dy]] });
  if (press) await click();
  await play(rest);
}
/** waits (in video time) for a route to arrive and the bands to clear */
async function arrive(path, maxSec = 6) {
  scrollY = null;
  for (let f = 0; f < maxSec * FPS; f++) {
    await shoot();
    if (await ev(`location.pathname === ${JSON.stringify(path)} && getComputedStyle(document.querySelector("canvas.fixed.z-\\\\[90\\\\]")).visibility === "hidden"`)) break;
  }
  scrollY = await ev("scrollY");
}

const scenes = {
  // the whole home page, from the intro to the footer
  async home() {
    // the intro plays with the hand away, then the hand comes in to the flower and across the headline
    await play(3.2);
    await play(1.4, { path: [[W * 0.62, H * 0.72], [W * 0.55, H * 0.45]] });
    await play(1.6, { path: [[W * 0.68, H * 0.38], [W * 0.5, H * 0.6]] });
    await play(1.4, { path: [[W * 0.12, H * 0.42], [W * 0.38, H * 0.44]] });
    await play(1.4, { path: [[W * 0.62, H * 0.58], [W * 0.88, H * 0.6]] });
    await play(0.8, { path: [[W * 0.7, H * 0.82]] });

    const stops = [];
    for (const s of ["#studio", "#services", "#work", "#principles"]) stops.push([s, await topOf(s)]);
    const world = await ev(`(() => { const e = [...document.querySelectorAll("section")].find((s) => /where are you from/i.test(s.textContent)); if (!e) return null; let y = 0, x = e; while (x) { y += x.offsetTop; x = x.offsetParent; } return y; })()`);
    const brief = await topOf("#brief");
    const end = await maxScroll();
    console.log("stops", stops, world, brief, end);

    // between stops the page moves at a reading pace (~700 css px/s), easing in and out at each one
    const go = async (to, extra = {}) => {
      const dist = Math.abs(to - scrollY);
      await play(Math.max(1.2, dist / 700), { y: to, wander: 30, ...extra });
    };
    // the hero's pin releases into the studio statement
    await go(stops[0][1]);
    await play(1.4, { wander: 30 });
    await go(stops[0][1] + H * 0.9);
    await play(1.2, { wander: 30 });
    // the seam into services, then the cards
    await go(stops[1][1]);
    await play(0.8);
    await visit("#services article, #services [data-card], #services li", { sec: 0.8, rest: 0.8 });
    await visit("#services article, #services [data-card], #services li", { sec: 0.6, rest: 0.8, i: 1 });
    await go(stops[1][1] + H * 1.1);
    await play(1.0, { wander: 30 });
    // the work index: its autoplay runs while the page holds
    await go(stops[2][1]);
    await play(2.4, { wander: 30 });
    await go(stops[2][1] + H * 1.0);
    await play(1.6, { wander: 30 });
    await go(stops[3][1]);
    await play(1.6, { wander: 30 });
    await go(stops[3][1] + H);
    await play(1.0, { wander: 30 });
    // the globe: pinned, it turns and settles on the bottom edge as the page goes on
    if (world) {
      await go(world);
      await play(1.6, { path: [[W * 0.52, H * 0.5]], wander: 30 });
      await go(world + H * 1.4, {});
      await play(1.0, { wander: 30 });
    }
    await go(brief);
    await play(2.0, { path: [[W * 0.45, H * 0.55]], wander: 30 });
    await go(end);
    await play(3.0, { path: [[W * 0.5, H * 0.5]], wander: 40 });
  },

  // the whole home page in one take: the intro, a pass over the headline, then one steady scroll to the
  // footer at a constant speed (eased only at its two ends), no stops; ScrollSmoother eases after it
  async flow() {
    await play(3.2);
    await play(1.4, { path: [[W * 0.62, H * 0.72], [W * 0.55, H * 0.45]] });
    await play(1.6, { path: [[W * 0.68, H * 0.38], [W * 0.5, H * 0.6]] });
    await play(1.4, { path: [[W * 0.12, H * 0.42], [W * 0.38, H * 0.44]] });
    await play(1.4, { path: [[W * 0.62, H * 0.58], [W * 0.88, H * 0.6]] });
    await play(0.8, { path: [[W * 0.66, H * 0.7]] });

    const end = await maxScroll();
    const SPEED = 240; // css px a second: a screen every ~3.4 s
    const sec = end / SPEED;
    const r = 2.2 / sec; // share of the run spent speeding up, and again slowing down
    const vmax = 1 / (1 - r);
    const ramp = (u) =>
      u < r ? (vmax * u * u) / (2 * r) : u > 1 - r ? 1 - (vmax * (1 - u) * (1 - u)) / (2 * r) : vmax * (u - r / 2);
    // the hand drifts slowly around the middle of the screen while the page goes by
    const loop = [];
    for (let k = 1; k <= Math.ceil(sec / 4); k++) loop.push([W * (0.5 + 0.22 * Math.sin(k * 1.7)), H * (0.5 + 0.2 * Math.cos(k * 1.3))]);
    console.log("flow", end, "px over", sec.toFixed(1), "s");
    await play(sec, { y: end, ease: ramp, path: loop, mouseEase: (u) => u });
    await play(3.0, { path: [[W * 0.5, H * 0.45]] });
  },

  // 9:16 (VW=1080 VH=1920 DPR=1): the hero full screen for the "is this a video?" hook. The intro plays
  // unrecorded, so the very first frame already holds the flower; then the hand comes in and proves it's live
  async herohook() {
    // the trail's size is a share of the viewport height: on a 1920px-tall window it buries the flower
    await ev(`(() => { const s = document.createElement("style"); s.textContent = ".mix-blend-difference{visibility:hidden!important}"; document.head.appendChild(s); })()`);
    for (let f = 0; f < 3.6 * FPS; f++) await ev(`window.__step(${DT})`);
    mouse = [1010, 1980];
    await play(0.9);
    await play(1.5, { path: [[960, 1450], [930, 1060], [915, 900]] }); // in to the bloom's heart: it leans
    await play(1.3, { path: [[760, 640], [1010, 470], [860, 760]] }); // round the head
    await play(0.5, { path: [[330, 1010]] }); // a quick swipe: a gust through the petals
    await play(1.9, { path: [[40, 850], [270, 840], [490, 852]] }, ); // across WE SWITCH
    await play(1.8, { path: [[600, 1072], [820, 1080], [1040, 1074]] }); // across THE THINGS
    await play(1.5, { path: [[600, 1330], [260, 1440]] }); // down to the small flower
    await play(1.0, { wander: 20 });
  },

  // home → menu → Projects → a case → About → back home, through the seams
  async tour() {
    await play(3.2);
    await play(1.6, { path: [[W * 0.6, H * 0.62], [W * 0.5, H * 0.48]] });
    await visit('button[aria-label="Open menu"]', { sec: 1.0, rest: 0.3, press: true });
    await play(1.4, { wander: 20 });
    await visit('#site-menu a[href="/projects"]', { sec: 0.9, rest: 0.5, press: true });
    await arrive("/projects");
    await play(1.6, { wander: 30 });
    // the pinned index snaps project to project, and back to the first: Jeeva
    const top = scrollY;
    for (let k = 1; k <= 2; k++) {
      await play(1.0, { y: top + H * 0.9 * k, wander: 30 });
      await play(1.1, { wander: 30 });
    }
    await play(1.4, { y: top, wander: 30 });
    await play(1.2, { wander: 30 });
    // the proof shot: a real client's case page
    if (await centre('main a[href="/projects/jeeva"]')) await visit('main a[href="/projects/jeeva"]', { sec: 1.0, rest: 0.4, press: true });
    else await visit('main a[href^="/projects/"]', { sec: 1.0, rest: 0.4, press: true });
    await arrive(await ev(`location.pathname.startsWith("/projects/") ? location.pathname : null`) ?? "/projects/");
    await play(1.4, { wander: 30 });
    await play(3.2, { y: H * 1.5, wander: 30 });
    await play(1.2, { wander: 30 });
    // the corner menu, from further down the page
    await visit('button[aria-label="Open menu"]', { sec: 1.0, rest: 0.3, press: true });
    await play(1.4, { wander: 20 });
    await visit('#corner-menu a[href="/about"], #site-menu a[href="/about"]', { sec: 0.9, rest: 0.5, press: true });
    await arrive("/about");
    // the strips slide with the pointer
    await play(1.4, { path: [[W * 0.3, H * 0.55], [W * 0.7, H * 0.6]] });
    await play(1.6, { path: [[W * 0.35, H * 0.5]] });
    await play(2.6, { y: H * 1.6, wander: 30 });
    await play(1.2, { wander: 30 });
    await visit('button[aria-label="Open menu"]', { sec: 1.0, rest: 0.3, press: true });
    await play(1.2, { wander: 20 });
    await visit('#corner-menu a[href="/"], #site-menu a[href="/"]', { sec: 0.9, rest: 0.5, press: true });
    await arrive("/");
    await play(3.0, { path: [[W * 0.55, H * 0.5]], wander: 30 });
  },
};

// the fresh page, waiting at its first frame
await load(base + "/");
// a short pre-roll, not recorded: the first screenshots can hold a frame painted before the clock started
for (let f = 0; f < 6; f++) { await ev(`window.__step(${DT})`); await send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true }); }
await scenes[scene]();
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
console.log("done", out, `${(frame / FPS).toFixed(1)}s`, "errors:", errs.length ? errs.slice(0, 5) : "none");
console.log(fferr.split("\n").slice(-4).join("\n"));
ws.close(); chrome.kill(); process.exit(0);
