"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { quiet } from "@/lib/renderer";
import { BAYER } from "@/lib/glsl";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/*
 * Pointer trail in the manner of lamalama.com: the pointer stirs a coarse velocity field that
 * decays every frame, and the field is drawn as ordered sub-pixels on an 8px grid — so the trail
 * only exists while you move, and gets denser the faster you go.
 *
 *  splat:   v += ū · S · exp(−d²/r²)        d = distance to the pointer's path this frame
 *  decay:   v *= 1 − min(0.5, Δt/250ms)
 *  draw:    a cell lights rank(sub-pixel) < 9·min(|v|, 1) of its 4×4 Bayer-ordered sub-pixels,
 *           and nothing where |v| < 0.35 (the Gaussian's weak tail would otherwise draw a halo)
 */

const FIELD = 36; // CSS px per velocity texel; bilinear filtering smooths it back out
const CELL = 8; // CSS px grid the trail is drawn on
const RADIUS = "0.04"; // splat radius, in viewport heights
const STRENGTH = "0.04"; // velocity per px of pointer travel
const LEVELS = "9.0"; // most sub-pixels (of 16) a cell can light
const CUTOFF = "0.35"; // field strength below which nothing draws — removes the faint outer halo
const IDLE_MS = 1500; // stop drawing this long after the last move
const MAX_STROKE = 48; // px — longer jumps (entering the window, tab switches) are clamped
// Drawn in white and composited with mix-blend-mode: difference, so the trail is the inverse of
// whatever it passes over — dark on the sky and on sand, light on the grass and on ink — with no
// per-section colours to keep in step.
const WHITE: [number, number, number] = [1, 1, 1];

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SPLAT = /* glsl */ `
  uniform sampler2D uVel;
  uniform vec2 uA;       // segment start, uv
  uniform vec2 uB;       // segment end, uv
  uniform vec2 uVec;     // pointer travel, px (y up)
  uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec2 scale = vec2(uAspect, 1.0);
    vec2 p = vUv * scale, a = uA * scale, ab = uB * scale - a;
    float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    vec2 d = p - (a + ab * h);
    float influence = exp(-dot(d, d) / (${RADIUS} * ${RADIUS}));
    gl_FragColor = vec4(texture2D(uVel, vUv).xy + influence * uVec * ${STRENGTH}, 0.0, 1.0);
  }
`;

const DECAY = /* glsl */ `
  uniform sampler2D uVel;
  uniform float uKeep;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(uVel, vUv).xy * uKeep, 0.0, 1.0);
  }
`;

const DRAW = /* glsl */ `
  uniform sampler2D uVel;
  uniform vec2 uRes;    // device px
  uniform float uCell;  // device px, a multiple of 4
  uniform vec3 uColor;
  ${BAYER}
  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uCell);
    float m = length(texture2D(uVel, (cell + 0.5) * uCell / uRes).xy);
    if (m < ${CUTOFF}) discard; // only the trail's core, no sparse outer ring
    vec2 sub = floor(mod(gl_FragCoord.xy, uCell) / (uCell * 0.25));
    if (floor(bayer4(sub) * 16.0) >= min(m, 1.0) * ${LEVELS}) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

export default function CursorField() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!el || !finePointer || prefersReducedMotion()) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = quiet(new THREE.WebGLRenderer({ alpha: true, antialias: false }));
    } catch {
      return;
    }
    if (!renderer.extensions.has("EXT_color_buffer_float")) {
      renderer.dispose();
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    el.appendChild(renderer.domElement);

    const target = () =>
      new THREE.WebGLRenderTarget(2, 2, {
        type: THREE.HalfFloatType,
        format: THREE.RGFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
      });
    let read = target();
    let write = target();

    const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const splat = pass(SPLAT, {
      uVel: { value: null },
      uA: { value: new THREE.Vector2() },
      uB: { value: new THREE.Vector2() },
      uVec: { value: new THREE.Vector2() },
      uAspect: { value: 1 },
    });
    const decay = pass(DECAY, { uVel: { value: null }, uKeep: { value: 1 } });
    const draw = pass(DRAW, {
      uVel: { value: null },
      uRes: { value: new THREE.Vector2() },
      uCell: { value: CELL },
      uColor: { value: new THREE.Vector3(...WHITE) },
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, splat);
    const scene = new THREE.Scene();
    scene.add(quad);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // the three programs are compiled now, while the page settles, rather than on the first move of the
    // pointer — where the wait for the GPU to finish them showed as a hitch in the trail's first stroke.
    // Each against the target it will draw into, which is part of what makes the program
    const warm = (material: THREE.ShaderMaterial, into: THREE.WebGLRenderTarget | null) => {
      quad.material = material;
      renderer.setRenderTarget(into);
      renderer.compile(scene, camera);
    };
    warm(splat, write);
    warm(decay, write);
    warm(draw, null);
    quad.material = splat;

    // run one full-screen pass into the write buffer, then swap
    const step = (material: THREE.ShaderMaterial) => {
      material.uniforms.uVel.value = read.texture;
      quad.material = material;
      renderer.setRenderTarget(write);
      renderer.render(scene, camera);
      [read, write] = [write, read];
    };

    let W = 0;
    let H = 0;
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      const fw = Math.max(2, Math.round((W * dpr) / FIELD));
      const fh = Math.max(2, Math.round((H * dpr) / FIELD));
      read.setSize(fw, fh);
      write.setSize(fw, fh);
      splat.uniforms.uAspect.value = W / H;
      draw.uniforms.uRes.value.set(W * dpr, H * dpr);
      draw.uniforms.uCell.value = 4 * Math.max(1, Math.round((CELL / 4) * dpr));
    };
    resize();

    // pointer travel since the last frame, as path segments
    const segments: [number, number, number, number][] = [];
    let last: [number, number] | null = null;
    let lastMove = -Infinity;
    let drawing = false;

    // idle, the layer is taken out of rendering: a full-screen difference blend would otherwise be
    // composited over the whole page on every scrolled frame, even with nothing drawn in it
    const show = (on: boolean) => {
      el.style.visibility = on ? "visible" : "hidden";
    };
    show(false);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!drawing) show(true);
      const now: [number, number] = [e.clientX, e.clientY];
      if (last) segments.push([last[0], last[1], now[0], now[1]]);
      last = now;
      lastMove = performance.now();
      drawing = true;
    };
    const onLeave = () => {
      last = null;
    };

    const tick = (_time: number, deltaMs: number) => {
      if (!drawing) return;
      for (const [x0, y0, x1, y1] of segments) {
        splat.uniforms.uA.value.set(x0 / W, 1 - y0 / H);
        splat.uniforms.uB.value.set(x1 / W, 1 - y1 / H);
        splat.uniforms.uVec.value.set(x1 - x0, y0 - y1).clampLength(0, MAX_STROKE);
        step(splat);
      }
      segments.length = 0;
      decay.uniforms.uKeep.value = 1 - Math.min(0.5, deltaMs / 250);
      step(decay);

      renderer.setRenderTarget(null);
      renderer.clear();
      if (performance.now() - lastMove > IDLE_MS) {
        drawing = false; // field has faded; leave the canvas clear until the next move
        show(false);
        return;
      }
      draw.uniforms.uVel.value = read.texture;
      quad.material = draw;
      renderer.render(scene, camera);
    };

    gsap.ticker.add(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      [splat, decay, draw].forEach((m) => m.dispose());
      geometry.dispose();
      read.dispose();
      write.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} aria-hidden className="pointer-events-none fixed inset-0 z-[70] mix-blend-difference" />;
}
