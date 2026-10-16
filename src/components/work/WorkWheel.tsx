"use client";

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap, PRIME } from "@/lib/gsap";
import { cardSrc } from "@/components/work/parts";
import { WORK } from "@/lib/work";

/*
 * The /projects index's wheel, drawn by three.js: the projects' 4:5 cards bent onto a drum that turns
 * about a level axis. The card at the front faces you square, at exactly the size of the frame drawn
 * around it (`frameSize`); the ones before and after curve away over the top and under the bottom,
 * smaller, tilted and grey, fading as they turn out of sight. The page turns it: `pos.at` is the
 * project in front as a fraction (2.5 = halfway from the third to the fourth).
 *
 * Moving fast bows the cards outward and splits their colour a touch, then everything settles. Pointing
 * at the front card (`pos.hover`) eases its picture in.
 */

export type WheelPos = { at: number; hover: number };

/** the frame's width in px for a stage of w × h — the page's CSS uses the same rule (--w) */
export const frameSize = (w: number, h: number) => Math.min(w * 0.24, h * 0.46);

const vertex = /* glsl */ `
  uniform vec2 uSize;     // the card in px
  uniform float uAngle;   // where its middle sits on the drum, radians (0 = facing you)
  uniform float uR;       // the drum's radius in px
  uniform float uVel;     // the turn's speed, -1..1
  varying vec2 vUv;
  varying float vAngle;
  void main() {
    vUv = uv;
    // the card wrapped onto the drum: its height becomes an arc
    float a = uAngle + position.y * uSize.y / uR;
    // speed bows the card outward, most at its middle
    float bow = sin(uv.y * 3.14159) * uVel * 70.0;
    vec3 p = vec3(position.x * uSize.x, (uR + bow) * sin(a), (uR + bow) * cos(a) - uR);
    vAngle = a;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uStep;    // the angle between two cards
  uniform float uVel;
  uniform float uHover;
  uniform float uShow;    // 0..1, the intro
  varying vec2 vUv;
  varying float vAngle;
  void main() {
    // the picture eases in when the front card is pointed at
    vec2 uv = (vUv - 0.5) * (1.0 - 0.05 * uHover) + 0.5;
    // a colour split along the turn, only while it moves
    float split = uVel * 0.012;
    vec3 c = vec3(
      texture2D(uTex, uv + vec2(0.0, split)).r,
      texture2D(uTex, uv).g,
      texture2D(uTex, uv - vec2(0.0, split)).b
    );
    // grey and faded the further it has turned from the front
    float d = clamp(abs(vAngle) / uStep, 0.0, 1.0);
    float g = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(g), d);
    c = mix(c, vec3(1.0), d * 0.35);
    float alpha = (1.0 - smoothstep(0.55, 1.45, abs(vAngle))) * uShow;
    gl_FragColor = vec4(c * alpha, alpha);
  }
`;

export default function WorkWheel({ pos, onFail }: { pos: RefObject<WheelPos>; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";

    const scene = new THREE.Scene();
    const D = 1600; // the camera's distance: at the drum's front, one unit is one px
    const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);
    camera.position.z = D;

    const loader = new THREE.TextureLoader();
    const geometry = new THREE.PlaneGeometry(1, 1, 1, 64);
    const shared = {
      uSize: { value: new THREE.Vector2(300, 375) },
      uR: { value: 600 },
      uStep: { value: 1 },
      uVel: { value: 0 },
      uShow: { value: 0 },
    };
    const meshes = WORK.map((w) => {
      const tex = loader.load(cardSrc(w), () => render());
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const material = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthTest: false,
        uniforms: { ...shared, uTex: { value: tex }, uAngle: { value: 0 }, uHover: { value: 0 } },
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      return mesh;
    });

    // ---- size: the front card matches the DOM frame; the drum's radius follows the screen ----
    let step = 1;
    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = (2 * Math.atan(height / 2 / D) * 180) / Math.PI;
      camera.updateProjectionMatrix();
      const fw = frameSize(width, height);
      const fh = fw * 1.25;
      const R = height * 0.62;
      step = (fh + height * 0.1) / R; // the arc from one card's middle to the next
      shared.uSize.value.set(fw, fh);
      shared.uR.value = R;
      shared.uStep.value = step;
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ---- each frame: turn the drum to the page's position, let the speed rise and settle ----
    let shown = -1;
    let vel = 0;
    let hover = 0;
    let last = pos.current?.at ?? 0;
    let visible = true;
    function render() {
      const at = pos.current?.at ?? 0;
      meshes.forEach((m, i) => {
        const u = (m.material as THREE.ShaderMaterial).uniforms;
        u.uAngle.value = (at - i) * step - (1 - shared.uShow.value) * 0.9;
        u.uHover.value = i === Math.round(at) ? hover : 0;
        // the cards out of sight are not drawn at all; the nearer the front, the later it's drawn
        m.visible = Math.abs(u.uAngle.value) < 1.6;
        m.renderOrder = -Math.round(Math.abs(u.uAngle.value) * 100);
      });
      renderer.render(scene, camera);
    }
    const tick = (_t: number, dt: number) => {
      if (!visible) return;
      const at = pos.current?.at ?? 0;
      const k = Math.min(dt / 16.7, 4);
      const speed = ((at - last) / Math.max(dt, 1)) * 1000; // cards per second
      last = at;
      vel += (Math.max(-1, Math.min(1, speed * 0.35)) - vel) * 0.12 * k;
      hover += ((pos.current?.hover ?? 0) - hover) * 0.1 * k;
      shared.uVel.value = vel;
      if (at !== shown || Math.abs(vel) > 0.001 || Math.abs(hover - (pos.current?.hover ?? 0)) > 0.001 || shared.uShow.value < 1) {
        shown = at;
        render();
      }
    };
    gsap.ticker.add(tick);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    // the cards turn up into place from under the frame
    const intro = gsap.to(shared.uShow, { value: 1, duration: 1.8, ease: PRIME, delay: 0.15 });

    return () => {
      intro.kill();
      gsap.ticker.remove(tick);
      io.disconnect();
      ro.disconnect();
      meshes.forEach((m) => {
        const mat = m.material as THREE.ShaderMaterial;
        (mat.uniforms.uTex.value as THREE.Texture).dispose();
        mat.dispose();
      });
      geometry.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [pos, onFail]);

  return <div ref={box} aria-hidden className="pointer-events-none absolute inset-0" />;
}
