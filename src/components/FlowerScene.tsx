"use client";

import { useRef } from "react";
import * as THREE from "three";
import { BAYER, DOT, FULLSCREEN_VERT } from "@/lib/glsl";
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";

const PITCH = 4; // CSS px per dither cell
const PETALS = 5;
const OPEN = 0.34; // resting cup of each petal, radians toward the camera
const CLOSED = 1.45;
const VARY = [1, 0.94, 1.05, 0.97, 1.02]; // petals aren't identical

// Reads the lit 3D render (one texel per cell) and turns it into halftone squares.
const FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uCells;
  uniform float uPitch;
  uniform vec3 uInk;
  ${BAYER}
  ${DOT}
  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uPitch);
    vec3 rgb = texture2D(tScene, (cell + 0.5) / uCells).rgb;
    // the render is linear light; lift it toward perceived brightness before dithering
    float lum = pow(dot(rgb, vec3(0.299, 0.587, 0.114)), 0.8);
    float threshold = bayer4(cell) * 0.92 + 0.04;
    if (lum <= threshold || !insideDot(cell, lum, threshold)) discard;
    gl_FragColor = vec4(uInk, 1.0);
  }
`;

/**
 * A cupped petal: a subdivided plane bent into shape so it shades smoothly. Base at the origin, tip
 * along +y. Vertex colours make it denser toward the base and along the rim, like the badge print.
 */
function petalGeometry() {
  const geometry = new THREE.PlaneGeometry(1, 1, 18, 28);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5; // across
    const v = pos.getY(i) + 0.5; // along, base → tip
    const half = 0.38 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.8)), 0.62);
    const x = (u * 2 - 1) * half;
    const z = 0.32 * v * v + 1.1 * x * x + 0.025 * Math.sin(v * 9 + u * 5) * v;
    pos.setXYZ(i, x, v * 1.05, z);
    const rim = THREE.MathUtils.smoothstep(Math.abs(u * 2 - 1), 0.7, 1);
    const shade = Math.min(1, 0.42 + 0.58 * Math.pow(1 - v, 1.6) + 0.22 * rim);
    colors.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Five-point star for the dense centre, its points running along the petals. */
function starGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < PETALS * 2; i++) {
    const r = i % 2 ? 0.1 : 0.3;
    const a = Math.PI / 2 + (i / (PETALS * 2)) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ShapeGeometry(shape);
}

/**
 * The studio badge's halftone flower, rebuilt in 3D: a lit five-petal flower is rendered at one
 * texel per dither cell, then dithered into squares. It blooms on first view, turns with scroll,
 * tilts toward the pointer, spins up on hover and flutters on click.
 */
export default function FlowerScene({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useGSAP((_, contextSafe) => {
    const el = host.current;
    if (!el || !contextSafe) return;
    const reduced = prefersReducedMotion();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    el.appendChild(renderer.domElement);

    // --- the flower
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    camera.position.z = 4.9;
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(-2, 3, 4);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(3, -2, 1);
    scene.add(key, fill);

    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    const petalGeo = petalGeometry();
    const petalMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const petals = VARY.map((vary, i) => {
      const pivot = new THREE.Group();
      pivot.rotation.z = (i / PETALS) * Math.PI * 2;
      const mesh = new THREE.Mesh(petalGeo, petalMat);
      mesh.position.z = i * 0.004; // avoids z-fighting where petals overlap
      pivot.add(mesh);
      spin.add(pivot);
      return { mesh, vary };
    });
    const starGeo = starGeometry();
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.z = 0.16;
    spin.add(star);

    // --- dither pass
    const target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    const ditherMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: target.texture },
        uCells: { value: new THREE.Vector2(1, 1) },
        uPitch: { value: PITCH },
        uInk: { value: new THREE.Vector3(0.93, 0.94, 1) },
      },
    });
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const post = new THREE.Scene();
    post.add(new THREE.Mesh(quadGeo, ditherMat));
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const state = { spin: 0.14, spun: 0, scroll: 0, flutter: 0, tiltX: 0, tiltY: 0, star: reduced ? 1 : 0 };
    const blooms = petals.map(() => ({ v: reduced ? 1 : 0 }));

    const render = (t: number) => {
      spin.rotation.z = state.spun + state.scroll;
      tilt.rotation.x = state.tiltX + Math.sin(t * 0.5) * 0.06;
      tilt.rotation.y = state.tiltY + Math.cos(t * 0.4) * 0.06;
      petals.forEach(({ mesh, vary }, i) => {
        const b = blooms[i].v;
        mesh.rotation.x =
          CLOSED +
          (OPEN - CLOSED) * b +
          Math.sin(t * 1.2 + i * 1.3) * 0.035 +
          state.flutter * Math.sin(i * 2.1 + t * 9) * 0.25;
        const s = 0.15 + 0.85 * b;
        mesh.scale.set(s * vary, s * vary, s);
      });
      star.scale.setScalar(Math.max(state.star, 0.0001));
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post, postCam);
    };

    const resize = () => {
      const size = el.clientWidth;
      if (!size) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pitch = Math.max(2, Math.round(PITCH * dpr));
      const cells = Math.ceil((size * dpr) / pitch);
      renderer.setPixelRatio(dpr);
      renderer.setSize(size, size, false);
      target.setSize(cells, cells);
      ditherMat.uniforms.uPitch.value = pitch;
      ditherMat.uniforms.uCells.value.set(cells, cells);
      if (reduced) render(0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const dispose = () => {
      ro.disconnect();
      petalGeo.dispose();
      petalMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      quadGeo.dispose();
      ditherMat.dispose();
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
    if (reduced) return dispose;

    // only render while on screen
    let active = false;
    const tick = (time: number, deltaMs: number) => {
      if (!active) return;
      state.spun += state.spin * Math.min(deltaMs / 1000, 1 / 30);
      render(time);
    };
    gsap.ticker.add(tick);
    ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        active = self.isActive;
      },
    });

    // bloom the first time it comes into view, then let scroll turn it
    ScrollTrigger.create({
      trigger: el,
      start: "top 75%",
      once: true,
      onEnter: contextSafe(() => {
        gsap.to(blooms, { v: 1, duration: 2.2, ease: "elastic.out(1, 0.45)", stagger: 0.09 });
        gsap.to(state, { star: 1, duration: 1.4, ease: "back.out(2.5)", delay: 0.35 });
      }),
    });
    gsap.to(state, {
      scroll: Math.PI * 0.9,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
    });

    // pointer: tilt toward it, spin up on hover, flutter on click
    const tiltX = gsap.quickTo(state, "tiltX", { duration: 1, ease: "power3" });
    const tiltY = gsap.quickTo(state, "tiltY", { duration: 1, ease: "power3" });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tiltY(((e.clientX - r.left) / r.width - 0.5) * 0.9);
      tiltX(((e.clientY - r.top) / r.height - 0.5) * 0.7);
    };
    const onEnter = contextSafe(() => {
      gsap.to(state, { spin: 0.9, duration: 1.2, ease: "power2.out", overwrite: "auto" });
    });
    const onLeave = contextSafe(() => {
      tiltX(0);
      tiltY(0);
      gsap.to(state, { spin: 0.14, duration: 1.6, ease: "power2.out", overwrite: "auto" });
    });
    const onDown = contextSafe(() => {
      gsap.fromTo(state, { flutter: 1 }, { flutter: 0, duration: 1.6, ease: "power3.out" });
    });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);

    return () => {
      gsap.ticker.remove(tick);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      dispose();
    };
  });

  return <div ref={host} aria-hidden className={`aspect-square touch-pan-y ${className}`} />;
}
