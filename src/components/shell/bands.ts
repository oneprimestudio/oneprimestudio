import { BAYER, NOISE } from "@/lib/glsl";
import { BAND, SUB } from "@/lib/dither";

/*
 * The page transition's bands, shared by the worker that draws them (bands.worker.ts) and the main-thread
 * fallback: the shader, a WebGL2 drawer that works on a DOM canvas or an OffscreenCanvas, and the train of
 * fronts as plain time-based motion (no GSAP), so the same curves run wherever the bands are drawn.
 */

export const RISE = 1.8; // s, each front's climb: slow
export const STAGGER = 0.46; // s between one front and the next

export const VERT = /* glsl */ `#version 300 es
  void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`;

export const FRAG = /* glsl */ `#version 300 es
  precision highp float;
  uniform vec2  uRes;    // device px
  uniform float uSub;    // device px per sub-pixel
  uniform float uTime;   // s: the fronts' drift and ripple
  uniform vec4  uFront;  // 0..1 per front (white, grey, black, the new page): how far it has risen
  out vec4 color;

  ${BAYER}
  ${NOISE}

  const float BAND = ${BAND.toFixed(2)};

  // a front at progress p: 1 below it, a band of thinning dots, 0 above (y: 1 at the foot, 0 at the top).
  // It starts a little below the foot and ends a little above the top, so the ripple never leaves dots
  // at either edge before it starts or after it is done
  float band(float y, float p, float jitter) {
    float ramp = clamp((y - 1.05 + p * (1.1 + BAND)) / BAND, 0.0, 1.0);
    return pow(ramp, 1.6) + jitter * 4.0 * ramp * (1.0 - ramp);
  }

  // each level's edge: a wander that drifts sideways as it climbs, its grain, and a slow ripple
  float edge(vec2 cell, float level, float seed) {
    float drift = uTime * (0.22 + 0.1 * level);
    float wander = valueNoise(vec3(cell.x / (12.0 + 4.0 * level) + drift, cell.y / 14.0, seed + level * 3.1)) - 0.5;
    float grain = hash3(vec3(cell, seed * 7.0 + level)) - 0.5;
    return wander * 0.36 + grain * 0.1;
  }

  void main() {
    vec2 sub = floor(gl_FragCoord.xy / uSub);
    vec2 cell = floor(sub / 4.0);
    float rows = max(ceil(uRes.y / (uSub * 4.0)) - 1.0, 1.0);
    float th = bayer4(sub);
    // which front has passed here last decides what shows: nothing, white, grey, black, the new page
    int passed = -1;
    for (int i = 0; i < 4; i++) {
      float level = float(i);
      // the ripple: each front rises a little unevenly across the width, and the unevenness travels
      float ripple = sin(cell.x * 0.035 + uTime * 1.1 + level * 2.1) * 0.018
                   + sin(cell.x * 0.011 - uTime * 0.6 + level) * 0.022;
      float y = 1.0 - cell.y / rows + ripple;
      if (band(y, uFront[i], edge(cell, level, 1.0)) > th) passed = i;
    }
    // grey is half the dots black, in Bayer order
    if (passed == 0) color = vec4(1.0);
    else if (passed == 1) color = th < 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(1.0);
    else if (passed == 2) color = vec4(0.0, 0.0, 0.0, 1.0);
    else color = vec4(0.0);
  }
`;

export type Fronts = [number, number, number, number];
export type GL = { draw: (f: Fronts, time: number) => void; resize: (w: number, h: number, dpr: number) => void; dispose: () => void };

/** the shader on a WebGL2 canvas (DOM or offscreen), or null where there is none */
export function makeGL(canvas: HTMLCanvasElement | OffscreenCanvas): GL | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false }) as WebGL2RenderingContext | null;
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const vao = gl.createVertexArray();
  // not called as gl.useProgram(…) inside the functions below: React Refresh (development) takes any use…()
  // call for a hook and wraps the function, and in a worker that wrapper comes out undefined
  const select = gl.useProgram.bind(gl);
  const U = Object.fromEntries(["uRes", "uSub", "uTime", "uFront"].map((n) => [n, gl.getUniformLocation(program, n)]));
  return {
    // w, h in CSS px; the drawing buffer is capped at 1.5x, as the dots never need more
    resize: (w, h, dpr) => {
      const d = Math.min(dpr || 1, 1.5);
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      gl.viewport(0, 0, canvas.width, canvas.height);
      select(program);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uSub, Math.max(1, Math.round(SUB * d)));
    },
    draw: (f, time) => {
      select(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(U.uTime, time);
      gl.uniform4f(U.uFront, ...f);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose: () => {
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}

const sineInOut = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const sineOut = (p: number) => Math.sin((p * Math.PI) / 2);
const sineIn = (p: number) => 1 - Math.cos((p * Math.PI) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The train of fronts, in time. White, grey and black set off one after another (each climbs `rise` s, a
 * `stagger` apart, on a sine in-out) from wherever they were; the train's own clock can be slowed to a crawl
 * and sped up again while the next page is on its way. The new page's front (3) rises on real time, a beat
 * behind. `tick(now)` (seconds) moves everything and reports when the white is up and when it is all done.
 */
export class Train {
  fronts: Fronts = [0, 0, 0, 0];
  private legs: { i: number; from: number; start: number; dur: number }[] = [];
  private local = 0; // the train's own clock, s
  private last = -1;
  private scale = 1;
  private pacing: { from: number; to: number; start: number; dur: number; ease: (p: number) => number } | null = null;
  private whiteAt = -1;
  private exitAt = -1; // real time the last front sets off, s
  active = false;

  constructor(private rise: number, private stagger: number) {}

  enter(from: Fronts, now: number) {
    this.fronts = [...from] as Fronts;
    this.legs = [];
    this.local = 0;
    this.last = now;
    this.scale = 1;
    this.pacing = null;
    this.exitAt = -1;
    [0, 1, 2].forEach((i) => {
      const left = 1 - from[i]; // a train joined midway (back / forward) runs only what is left
      if (left <= 0) return;
      this.legs.push({ i, from: from[i], start: Math.max(0, i * this.stagger - (this.rise - this.rise * left)), dur: this.rise * left });
    });
    this.whiteAt = this.rise * (1 - from[0]);
    this.active = true;
  }

  /** ease the train's clock to `to` × over `dur` s: "out" to slow down, "in" to pick up again */
  pace(to: number, dur: number, ease: "in" | "out", now: number) {
    this.pacing = { from: this.scale, to, start: now, dur, ease: ease === "in" ? sineIn : sineOut };
  }

  /** the new page rises in behind the black, a beat behind it */
  exit(now: number, delay = 0.1) {
    this.exitAt = now + delay;
  }

  /** returns what happened this frame */
  tick(now: number): { white: boolean; done: boolean } {
    const dt = Math.max(0, now - this.last);
    this.last = now;
    if (this.pacing) {
      const p = clamp01((now - this.pacing.start) / this.pacing.dur);
      this.scale = this.pacing.from + (this.pacing.to - this.pacing.from) * this.pacing.ease(p);
      if (p >= 1) this.pacing = null;
    }
    this.local += dt * this.scale;
    for (const l of this.legs) {
      const p = clamp01((this.local - l.start) / l.dur);
      this.fronts[l.i] = l.from + (1 - l.from) * sineInOut(p);
    }
    let white = false;
    if (this.whiteAt >= 0 && this.local >= this.whiteAt) {
      white = true;
      this.whiteAt = -1;
    }
    let done = false;
    if (this.exitAt >= 0 && now >= this.exitAt) {
      const p = clamp01((now - this.exitAt) / this.rise);
      this.fronts[3] = sineInOut(p);
      if (p >= 1) {
        this.fronts = [0, 0, 0, 0];
        this.legs = [];
        this.exitAt = -1;
        this.active = false;
        done = true;
      }
    }
    return { white, done };
  }
}
