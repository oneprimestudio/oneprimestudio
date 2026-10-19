import { makeGL, RISE, STAGGER, Train, type Fronts, type GL } from "./bands";

/*
 * The page transition's bands, drawn off the main thread. The page hands over its canvas (an
 * OffscreenCanvas) once; after that the train runs here on the worker's own frames, so it keeps flowing
 * while the main thread is busy mounting the next page under it — the moment it used to stall, just as the
 * black came up.
 *
 *   in   init { canvas, w, h, dpr } · resize { w, h, dpr } · enter { from } · pace { to, dur, ease } · exit
 *   out  ready { gl } · white (the old page is covered) · done (all fronts down, the canvas cleared)
 */

// the worker's own scope, typed by hand (the project's TypeScript lib is the DOM's, not the worker's)
const scope = self as unknown as {
  postMessage: (m: unknown) => void;
  onmessage: ((e: MessageEvent) => void) | null;
  requestAnimationFrame?: (cb: () => void) => number;
};

let gl: GL | null = null;
const train = new Train(RISE, STAGGER);
const now = () => performance.now() / 1000;
const raf = (cb: () => void) =>
  scope.requestAnimationFrame ? scope.requestAnimationFrame(cb) : setTimeout(cb, 1000 / 60);
let running = false;

const frame = () => {
  const t = now();
  const { white, done } = train.tick(t);
  gl?.draw(train.fronts, t);
  if (white) scope.postMessage({ type: "white" });
  if (done) {
    running = false;
    scope.postMessage({ type: "done" });
    return;
  }
  raf(frame);
};
const run = () => {
  if (running) return;
  running = true;
  raf(frame);
};

scope.onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "init") {
    gl = makeGL(m.canvas as OffscreenCanvas);
    gl?.resize(m.w, m.h, m.dpr);
    scope.postMessage({ type: "ready", gl: !!gl });
  } else if (m.type === "resize") {
    gl?.resize(m.w, m.h, m.dpr);
  } else if (m.type === "enter") {
    train.enter(m.from as Fronts, now());
    gl?.draw(train.fronts, now()); // the first frame at once, before the worker's next one
    run();
  } else if (m.type === "pace") {
    train.pace(m.to, m.dur, m.ease, now());
  } else if (m.type === "exit") {
    train.exit(now());
  }
};
