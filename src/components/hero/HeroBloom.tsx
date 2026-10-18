"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { quiet } from "@/lib/renderer";
import { gsap, MENU_EASE, prefersReducedMotion, ScrollTrigger } from "@/lib/gsap";
import { BAYER, NOISE } from "@/lib/glsl";

/*
 * The hero's photograph, alive. The x-ray cosmos is drawn by a shader instead of an <img>:
 *
 *   intro   it assembles from the stem up in the section seams' own dots (DitherSeam): an 8px grid
 *           whose 2px sub-pixels switch from the ground to the photograph in 4×4 Bayer order. A band
 *           of them rises through the frame — solid at its foot, thinning to nothing at its top, its
 *           edge wandering and grained as a seam's is
 *   life    the whole flower sways a fraction of a degree about its stem, and the petals (not the
 *           stem) breathe on slow noise
 *   wind    on a loop, a gust comes in from the left every few seconds: it rises quickly and dies slowly,
 *           with a flutter on top and a faint breeze between gusts. It drives a loose spring (it swings
 *           back past rest before settling), which leans the flower about its root and carries its head
 *           further along x than its stem, and stirs the petals while it blows
 *   pointer the flower leans toward the cursor about its stem and its head drifts after it, the upper
 *           stem bending to follow; moving quickly stirs the petals like a gust. All three run on
 *           springs (slightly under-damped, so they settle with a little give), integrated at 240 Hz
 *           inside every frame, so the motion is just as smooth at 60 or 120 fps
 *
 * `mirror` draws the photograph flipped (the small flower at the hero's left); its wind still blows the
 * same way on screen. `lag` delays the wind for it, in seconds, as if the gust reached it later.
 *
 * The <img> stays underneath as the fallback (no WebGL2, reduced motion, a failed load) and for its alt
 * text; the texture is that same <img>, so nothing is downloaded twice. One draw per frame, only while the
 * hero can be seen.
 */

// `bloom` (#f9f9f7), the photograph's own flattened ground — as raw sRGB, like the texture: a THREE.Color
// would be converted to linear and come out greyer than the page around the box
const GROUND = new THREE.Vector3(249 / 255, 249 / 255, 247 / 255);
const SUB = 2; // CSS px per sub-pixel; 4 × 4 of them make the seams' 8px cell
const ASPECT = 0.5625; // the box is 9:16
const HEART = [0.35, 0.55] as const; // where the petals meet, box uv (y up)
const LEAN_MAX = 0.045; // radians (~2.6°) the flower leans toward the cursor
const PULL_MAX = 0.025; // box heights the head drifts toward the cursor (~20px on a laptop)
const STEP = 1 / 240; // spring integration step, s
const SPILL = 0.1; // the canvas reaches this share of the box's width past each side (see the host's classes)
const WIND_LEAN = 0.04; // radians the flower leans at a gust's height (~2.3°)
const WIND_DRIFT = 0.028; // box widths its head travels further along x
const GUST_EVERY = 6.5; // s between gusts

/** the wind's strength at time t (s): 0 at rest, ~1 at a gust's height — looping */
const windAt = (t: number) => {
  const phase = (((t % GUST_EVERY) + GUST_EVERY) % GUST_EVERY) / GUST_EVERY;
  // quick to rise (the first 18% of the loop), slow to die away
  const gust = phase < 0.18 ? Math.sin(((phase / 0.18) * Math.PI) / 2) : Math.exp(-(phase - 0.18) * 6);
  const flutter = 1 + 0.4 * (Math.sin(t * 2.3) * 0.6 + Math.sin(t * 3.7 + 1) * 0.4);
  return gust * flutter + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.4));
};

type Spring = { x: number; v: number };
/** one semi-implicit Euler step of a damped spring: stiffness k (1/s²), damping ratio zeta */
const spring = (s: Spring, target: number, k: number, zeta: number, h: number) => {
  s.v += (k * (target - s.x) - 2 * Math.sqrt(k) * zeta * s.v) * h;
  s.x += s.v * h;
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2  uRes;     // drawing-buffer px
  uniform float uSub;     // INTEGER device px per sub-pixel
  uniform float uTime;
  uniform float uReveal;  // 0..1, intro
  uniform float uLean;    // radians, toward the cursor
  uniform vec2  uPull;    // box uv, the head's drift toward the cursor
  uniform float uGust;    // 0..1, from the pointer's speed
  uniform vec3  uGround;
  uniform float uMirror;  // 1: the photograph drawn flipped
  varying vec2 vUv;

  ${BAYER}
  ${NOISE}

  const float ASPECT = 0.5625;          // the box is 9:16
  const vec2  HEART  = vec2(0.35, 0.55); // where the petals meet
  const vec2  ROOT   = vec2(0.05, 0.0);  // where the stem leaves the frame
  const float BAND   = 0.45;             // the intro's band of dots, as a share of the height
  const float SPILL  = ${SPILL.toFixed(2)};               // the canvas runs this far past the box on each side

  vec2 rotateAbout(vec2 p, vec2 o, float a) {
    vec2 q = (p - o) * vec2(ASPECT, 1.0);
    q = mat2(cos(a), sin(a), -sin(a), cos(a)) * q;
    return q / vec2(ASPECT, 1.0) + o;
  }

  // where in the photograph this point looks, once the flower has swayed and breathed
  vec2 living(vec2 uv) {
    float sway = sin(uTime * 0.55) * 0.0035 + sin(uTime * 0.23 + 1.3) * 0.0025 + uLean;
    uv = rotateAbout(uv, ROOT, -sway);
    float r = length((uv - HEART) * vec2(ASPECT, 1.0));
    // the head drifts toward the cursor, most at its heart and less at the petal tips; the upper stem
    // bends to carry it, the lower stem stays rooted
    float head = smoothstep(0.22, 0.52, uv.y);
    uv -= uPull * head * (1.0 - 0.5 * smoothstep(0.05, 0.45, r));
    float petals = smoothstep(0.40, 0.52, uv.y); // the stem stays put, the bloom breathes
    float amp = 0.006 * (1.0 + uGust * 2.5) * petals * smoothstep(0.02, 0.3, r);
    vec3 p = vec3(uv * 2.4, uTime * 0.18);
    return uv + (vec2(valueNoise(p), valueNoise(p + vec3(5.2, 1.3, 0.0))) - 0.5) * amp;
  }

  void main() {
    // intro: the seams' dots, the photograph arriving from the stem's row up
    if (uReveal < 1.0) {
      vec2 sub = floor(gl_FragCoord.xy / uSub);
      vec2 cell = floor(sub / 4.0);
      float rows = max(ceil(uRes.y / (uSub * 4.0)) - 1.0, 1.0);
      float y = 1.0 - cell.y / rows; // 1 on the bottom row of cells, 0 on the top
      // the edge wanders and grains as the seam's does, most mid-band and not at all at either end
      float jitter = (valueNoise(vec3(cell / 14.0, 0.0)) - 0.5) * 0.34 + (hash3(vec3(cell, 7.0)) - 0.5) * 0.1;
      // a band (BAND of the height) rises from below the frame to above it: under it the photograph is
      // whole, over it the ground is bare, and inside it the dots thin out toward its top, as in a seam
      float ramp = clamp((y - 1.0 + uReveal * (1.0 + BAND)) / BAND, 0.0, 1.0);
      float v = pow(ramp, 1.6) + jitter * 4.0 * ramp * (1.0 - ramp);
      if (v <= bayer4(sub)) { gl_FragColor = vec4(uGround, 1.0); return; }
    }
    // the canvas is wider than the box, so a leaning petal is never cut off at the box's edge
    vec2 at = vec2(uMirror > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
    vec2 uv = living(vec2(at.x * (1.0 + 2.0 * SPILL) - SPILL, at.y));
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(uGround, 1.0); return; }
    gl_FragColor = vec4(texture2D(uTex, uv).rgb, 1.0);
  }
`;

// false once a renderer could not be made: the other flower doesn't try again
let support = true;
/**
 * WebGL2 and motion allowed. Not probed with a throwaway context, which costs a whole context's creation
 * (and a wait on the GPU) during the page's load: the renderer itself throws where there is no WebGL2,
 * and the flower falls back to its <img> then, before the hero's intro has run.
 */
export function heroGL() {
  if (typeof window === "undefined" || prefersReducedMotion()) return false;
  return support && typeof WebGL2RenderingContext !== "undefined";
}

export default function HeroBloom({ mirror = false, lag = 0 }: { mirror?: boolean; lag?: number }) {
  const host = useRef<HTMLDivElement>(null);

  // a layout effect, so the box is marked before the hero's intro (which waits on the fonts) can run
  useLayoutEffect(() => {
    const el = host.current;
    const box = el?.parentElement;
    const img = box?.querySelector("img");
    const section = box?.closest("section");
    if (!el || !box || !img || !section || !heroGL()) return;
    if (getComputedStyle(box).display === "none") return; // a flower this screen doesn't show
    box.dataset.gl = "on"; // hides the <img> (globals.css) and tells the hero to skip its clip reveal
    const fallback = () => delete box.dataset.gl;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = quiet(new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" }));
    } catch {
      support = false;
      fallback();
      return;
    }
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the shader works in sRGB, as the CSS does
    // asked now, while the GPU is idle: it is a round trip to the GPU, and asked when the texture arrives it
    // waited (over half a second) behind the page's first paint
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    el.appendChild(renderer.domElement);

    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uSub: { value: SUB },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uLean: { value: 0 },
      uPull: { value: new THREE.Vector2() },
      uGust: { value: 0 },
      uGround: { value: GROUND },
      uMirror: { value: mirror ? 1 : 0 },
    };
    const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let sized = "";
    const resize = () => {
      // 1.5× is past what the photograph's grain can show, and spares a retina screen ~45% of the pixels
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      // resizing a WebGL canvas reallocates its buffer and waits on the GPU, even at the same size (the
      // observer's first report repeats the mount's): only a real change is applied, and in one step
      if (`${w}x${h}@${dpr}` === sized) return;
      sized = `${w}x${h}@${dpr}`;
      renderer.setDrawingBufferSize(w, h, dpr);
      uniforms.uRes.value.set(Math.round(w * dpr), Math.round(h * dpr));
      // a sub-pixel is a whole number of device pixels, or the 2px dots would come out uneven
      uniforms.uSub.value = Math.max(1, Math.round(SUB * dpr));
    };
    resize();
    let rect = box.getBoundingClientRect();
    const ro = new ResizeObserver(() => {
      resize();
      rect = box.getBoundingClientRect();
    });
    ro.observe(box);

    // ---- pointer: where the cursor is (box uv), and a gust from how fast it moves ----
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const aim: { x: number; y: number; on: boolean } = { x: HEART[0], y: HEART[1], on: false };
    let gustAim = 0;
    let last: { x: number; y: number; t: number } | null = null;
    const onEnter = () => {
      rect = box.getBoundingClientRect(); // the hero is pinned, so its box only moves on resize
    };
    const onMove = (e: PointerEvent) => {
      // in the photograph's own terms, so a mirrored flower still leans toward the cursor
      const x = (e.clientX - rect.left) / rect.width;
      aim.x = mirror ? 1 - x : x;
      aim.y = 1 - (e.clientY - rect.top) / rect.height;
      aim.on = true;
      const now = performance.now();
      if (last && now > last.t) {
        const speed = Math.hypot(e.clientX - last.x, e.clientY - last.y) / (now - last.t); // px per ms
        gustAim = Math.max(gustAim, Math.min(1, speed / 2.5));
      }
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const onLeave = () => {
      aim.on = false;
      last = null;
    };
    if (fine) {
      section.addEventListener("pointerenter", onEnter);
      section.addEventListener("pointermove", onMove, { passive: true });
      section.addEventListener("pointerleave", onLeave);
    }
    const lean: Spring = { x: 0, v: 0 };
    const pullX: Spring = { x: 0, v: 0 };
    const pullY: Spring = { x: 0, v: 0 };
    const gust: Spring = { x: 0, v: 0 };
    const wind: Spring = { x: 0, v: 0 };
    // the wind blows toward +x on screen: in a mirrored photograph's own terms that is the other way
    const side = mirror ? 1 : -1;
    let clock = 0;

    /** advance the springs by dt seconds, in fixed 240 Hz steps */
    const settle = (dt: number) => {
      // toward the cursor: lean by its side of the heart, drift by its offset, both capped
      const dx = (aim.x - HEART[0]) * ASPECT; // in box heights
      const dy = aim.y - HEART[1];
      const leanAim = aim.on ? gsap.utils.clamp(-LEAN_MAX, LEAN_MAX, -dx * 0.05) : 0;
      const d = Math.hypot(dx, dy);
      const reach = aim.on && d > 0 ? Math.min(PULL_MAX, d * 0.06) / d : 0;
      const steps = Math.max(1, Math.ceil(dt / STEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        clock += h;
        spring(wind, windAt(clock - lag), 9, 0.32, h); // loose: it swings back past rest
        spring(lean, leanAim, 26, 0.7, h); // heavy and slow: the whole flower
        spring(pullX, (dx * reach) / ASPECT, 42, 0.68, h); // lighter: the head
        spring(pullY, dy * reach, 42, 0.68, h);
        spring(gust, gustAim, 30, 1, h);
        gustAim *= Math.exp(-h * 2.5); // the gust dies down once the pointer slows
      }
      uniforms.uLean.value = lean.x + side * wind.x * WIND_LEAN;
      uniforms.uPull.value.set(pullX.x - side * wind.x * WIND_DRIFT, pullY.x);
      uniforms.uGust.value = Math.max(0, gust.x, wind.x * 0.6);
    };

    // ---- scroll: once the next section has covered the pinned hero, stop drawing it ----
    let covered = false;
    const leave = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        covered = self.progress > 0.995;
      },
    });

    // ---- the frame ----
    let ready = false;
    const tick = (time: number, deltaMs: number) => {
      if (!ready || covered) return;
      settle(Math.min(deltaMs, 64) / 1000);
      uniforms.uTime.value = time;
      renderer.render(scene, camera);
    };
    gsap.ticker.add(tick);

    // ---- the texture is the <img> the page already loaded ----
    let alive = true;
    let texture: THREE.Texture | null = null;
    const loaded =
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => reject(), { once: true });
          });
    // no img.decode(): it waits for the page to render, and uploading the texture decodes the image anyway
    // an ImageBitmap of the image's exact size, made off the main thread (next/image's <img> reports its
    // laid-out size, which three would allocate the texture at). The old route, a 4K canvas copy, blocked
    // the page for a long frame and could read the pixels back from the GPU on upload. Flipped here, since
    // WebGL ignores flipY for bitmaps
    const bitmap = (): Promise<THREE.Texture> =>
      typeof createImageBitmap === "function"
        ? createImageBitmap(img, { imageOrientation: "flipY" }).then((bmp) => {
            const t = new THREE.Texture(bmp);
            t.flipY = false;
            return t;
          })
        : Promise.resolve().then(() => {
            const copy = document.createElement("canvas");
            copy.width = img.naturalWidth;
            copy.height = img.naturalHeight;
            copy.getContext("2d")?.drawImage(img, 0, 0);
            return new THREE.CanvasTexture(copy);
          });
    // the shader compiles in the background meanwhile (KHR_parallel_shader_compile), so the first frame
    // never stops the page waiting for the GPU to finish it
    const compiled = renderer.compileAsync(scene, camera);
    loaded
      .then(() => Promise.all([bitmap(), compiled]))
      .then(([made]) => {
        if (!alive) {
          made.dispose();
          return;
        }
        texture = made;
        texture.colorSpace = THREE.NoColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.anisotropy = anisotropy;
        texture.needsUpdate = true;
        uniforms.uTex.value = texture;
        ready = true;
        // develops with the rest of the hero's intro, once the fonts are in
        return document.fonts.ready.then(() => {
          if (alive) gsap.to(uniforms.uReveal, { value: 1, duration: 2.6, ease: MENU_EASE });
        });
      })
      .catch(fallback);

    return () => {
      alive = false;
      gsap.ticker.remove(tick);
      gsap.killTweensOf(uniforms.uReveal);
      leave.kill();
      ro.disconnect();
      section.removeEventListener("pointerenter", onEnter);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      texture?.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      fallback();
    };
  }, [mirror, lag]);

  // 10% wider than the box on each side: SPILL
  return <div ref={host} aria-hidden className="pointer-events-none absolute inset-y-0 -left-[10%] w-[120%]" />;
}
