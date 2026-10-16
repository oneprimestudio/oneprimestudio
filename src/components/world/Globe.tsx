"use client";

import { type RefObject, useEffect, useRef } from "react";
import * as THREE from "three";
import { BAYER } from "@/lib/glsl";
import { LAND_DOTS } from "@/lib/geo/land";
import { HOME, type Place } from "@/lib/geo/places";
import { gsap, prefersReducedMotion, PRIME } from "@/lib/gsap";

/*
 * The globe of the "where we are" stage (home and /about): a 3D object drawn as vectors. three.js draws
 * the land in the dither seam's finest grain (half a CSS px a square) and a graticule of hairlines, each
 * thinning as it turns away so the far side reads as depth through the near one;
 * an SVG layer over it draws the nodes and the connection — Hyderabad, the visitor's place, and the
 * great-circle arc between them lifted off the surface — as crisp vector strokes, projected from the
 * same 3D points every frame and clipped where the globe hides them.
 *
 * It fills its stage. Where it sits and how big it is is a "frame" (centre + silhouette radius, in CSS px)
 * applied as a 2D shift and scale of the projection — the sphere itself never moves, so the dither grain
 * stays one device pixel and the occlusion maths stays a unit sphere at the origin:
 *   intro    centred, small — the stage as it arrives
 *   settled  large, its centre on the stage's bottom edge: only the top half shows — the end of the scroll
 *   focus    centred again, once a place is chosen, turned to face the line
 * The scroll (0–1, from the stage's pin) carries it from intro to settled and turns it a little on the way.
 * It sways on its own and can be dragged. Choosing a place swings it to face the middle of the arc, which
 * then draws itself from Hyderabad out to the visitor, and a pulse keeps travelling along it.
 */

const RADIUS = 1;
const FOV = 26;
const DISTANCE = 5.6;
const SAMPLES = 96; // points along the arc
const INK = new THREE.Color("#08064e");
const SUB = 0.5; // CSS px per dither square on the land — the dither seam's sub-pixel, at its finest

type Frame = { x: number; y: number; r: number };
/** where the globe sits in a W×H stage, at each of its three states */
const frames = (W: number, H: number) => {
  const narrow = W < 768;
  return {
    intro: { x: W / 2, y: H * 0.52, r: narrow ? W * 0.4 : Math.min(W * 0.34, H * 0.3) },
    settled: narrow
      ? { x: W / 2, y: H * 0.74, r: W * 0.64 }
      : { x: W / 2, y: H, r: Math.min(W * 0.26, H * 0.68) }, // its shoulders clear the bottom corners
    focus: { x: W / 2, y: H * (narrow ? 0.48 : 0.52), r: narrow ? W * 0.38 : Math.min(W * 0.3, H * 0.33) },
  };
};
const mixFrame = (a: Frame, b: Frame, t: number): Frame => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  r: a.r + (b.r - a.r) * t,
});
// the turn the scroll gives it: from west of Hyderabad, tipped north, to Hyderabad riding the middle of
// the top half (the centre of the view sits south of it, so India clears the stage's bottom edge)
const scrollView = (p: number) => ({ lat: 18 + (-16 - 18) * p, lon: HOME.lon - 36 + 36 * p });
const ease = (t: number) => t * t * (3 - 2 * t);

/** lat/lon (degrees) → a point on the sphere: lon 0 faces the camera when the globe isn't turned */
const toVec = (lat: number, lon: number, r = RADIUS) => {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(φ) * Math.sin(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.cos(λ));
};

/** the land as an equirectangular mask (white on black), painted from the land dots and softened */
function landMask() {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.filter = "blur(1.6px)";
  ctx.fillStyle = "#fff";
  const bytes = Uint8Array.from(atob(LAND_DOTS), (c) => c.charCodeAt(0));
  const pairs = new Int16Array(bytes.buffer);
  for (let i = 0; i < pairs.length / 2; i++) {
    const lat = pairs[i * 2] / 100;
    const lon = pairs[i * 2 + 1] / 100;
    // each dot stands for ~1.4° of land: a square that much wider near the poles, where rows are sparser
    const h = (1.6 / 180) * H;
    const w = Math.min(W / 8, h / Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
    ctx.fillRect(((lon + 180) / 360) * W - w / 2, ((90 - lat) / 180) * H - h / 2, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function graticule() {
  const pts: number[] = [];
  const seg = (a: THREE.Vector3, b: THREE.Vector3) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  for (let lat = -60; lat <= 60; lat += 30)
    for (let lon = -180; lon < 180; lon += 4) seg(toVec(lat, lon), toVec(lat, lon + 4));
  for (let lon = -180; lon < 180; lon += 30)
    for (let lat = -84; lat < 84; lat += 4) seg(toVec(lat, lon), toVec(lat + 4, lon));
  return new Float32Array(pts);
}

// the hairlines: ink that fades as the surface turns away from the camera
const VERT = /* glsl */ `
  uniform float uSize;
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vFacing = dot(n, normalize(-mv.xyz));
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uNear;
  uniform float uFar;
  varying float vFacing;
  void main() {
    gl_FragColor = vec4(uColor, mix(uFar, uNear, smoothstep(-0.15, 0.35, vFacing)));
  }
`;

// the land: the same fade, as density instead of alpha — a sphere drawn from both sides, its land
// dithered in 8×8 Bayer order at the finest grain, dense on the near side, sparse on the far side
const LAND_VERT = /* glsl */ `
  varying vec3 vObject;
  varying float vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vObject = position;
    vFacing = dot(normalize(normalMatrix * normal), normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
  }
`;
const LAND_FRAG = /* glsl */ `
  uniform sampler2D uLand;
  uniform vec3 uColor;
  uniform float uNear;
  uniform float uFar;
  uniform float uPx; // device px per dither square
  varying vec3 vObject;
  varying float vFacing;
  ${BAYER}
  void main() {
    vec3 p = normalize(vObject);
    vec2 uv = vec2(atan(p.x, p.z) / 6.2831853 + 0.5, asin(clamp(p.y, -1.0, 1.0)) / 3.1415927 + 0.5);
    float land = smoothstep(0.25, 0.6, texture2D(uLand, uv).r);
    float value = land * mix(uFar, uNear, smoothstep(-0.15, 0.35, vFacing));
    if (value <= bayer8(floor(gl_FragCoord.xy / uPx))) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

export default function Globe({ place, progress }: { place: Place | null; progress: RefObject<number> }) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const api = useRef<{ show: (p: Place | null) => void } | null>(null);

  useEffect(() => {
    const el = host.current;
    const svg = svgRef.current;
    if (!el || !svg) return;
    const still = prefersReducedMotion();
    const q = <T extends SVGElement>(s: string) => svg.querySelector<T>(s)!;
    const outline = q<SVGCircleElement>("[data-outline]");
    const arcBase = q<SVGPathElement>("[data-arc-base]");
    const arc = q<SVGPathElement>("[data-arc]");
    const keyline = q<SVGPathElement>("[data-arc-keyline]");
    const gradient = q<SVGLinearGradientElement>("[data-arc-gradient]");
    const glow = q<SVGCircleElement>("[data-pulse-glow]");
    const pulse = q<SVGCircleElement>("[data-pulse]");
    const homeNode = q<SVGGElement>("[data-home]");
    const placeNode = q<SVGGElement>("[data-place]");
    const placeLabel = q<SVGTextElement>("[data-place-label]");

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    el.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20);
    camera.position.set(0, 0, DISTANCE);
    const globe = new THREE.Group();
    scene.add(globe);

    const material = (size: number, near: number, far: number) =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uSize: { value: size },
          uColor: { value: INK },
          uNear: { value: near },
          uFar: { value: far },
        },
      });
    const land = landMask();
    const landGeo = new THREE.SphereGeometry(RADIUS, 128, 96);
    const landMat = new THREE.ShaderMaterial({
      vertexShader: LAND_VERT,
      fragmentShader: LAND_FRAG,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uLand: { value: land },
        uColor: { value: INK },
        uNear: { value: 0.72 },
        uFar: { value: 0.1 },
        uPx: { value: 1 },
      },
    });
    globe.add(new THREE.Mesh(landGeo, landMat));
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(graticule(), 3));
    const lineMat = material(1, 0.16, 0.03);
    globe.add(new THREE.LineSegments(lineGeo, lineMat));

    // ---- size ----
    let W = 1;
    let H = 1;
    let r0 = 1; // the silhouette's radius in px with the projection unshifted
    let stage = frames(W, H);
    const baseProjection = new THREE.Matrix4();
    const resize = () => {
      W = Math.max(1, el.clientWidth);
      H = Math.max(1, el.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      baseProjection.copy(camera.projectionMatrix);
      // a dither square is a whole number of device pixels, or the grain comes out uneven
      landMat.uniforms.uPx.value = Math.max(1, Math.round(SUB * dpr));
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      // the silhouette: the sphere's edge as the camera sees it
      const angular = Math.asin(RADIUS / DISTANCE);
      r0 = (Math.tan(angular) / Math.tan(((FOV / 2) * Math.PI) / 180)) * (H / 2);
      stage = frames(W, H);
      frame = null; // snap to the new layout rather than glide across it
    };

    // ---- where it sits: the eased frame chases the scroll's frame, pulled to the centre by `focus` ----
    let frame: Frame | null = null;
    const shift = new THREE.Matrix4();
    /** move and scale the picture in clip space: x' = s·x + tx·w, so after the divide x/w → s·x/w + tx */
    const place2D = (f: Frame) => {
      const s = f.r / r0;
      shift.set(s, 0, 0, (f.x / W) * 2 - 1, 0, s, 0, 1 - (f.y / H) * 2, 0, 0, 1, 0, 0, 0, 0, 1);
      camera.projectionMatrix.multiplyMatrices(shift, baseProjection);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      outline.setAttribute("cx", f.x.toFixed(1));
      outline.setAttribute("cy", f.y.toFixed(1));
      outline.setAttribute("r", f.r.toFixed(1));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // ---- where it looks: the eased view chases a target (lat/lon at the centre) ----
    // the target is the scroll's turn, pulled toward the chosen place's by `focus`, plus what a drag added
    const start = scrollView(0);
    const view = { lat: start.lat, lon: start.lon };
    const aim = { lat: start.lat, lon: start.lon }; // facing the chosen place's line
    const dragged = { lat: 0, lon: 0 };
    const mode = { focus: 0 };
    let swaying = !still;

    // ---- projection and occlusion, for the SVG layer ----
    const tmp = new THREE.Vector3();
    const project = (world: THREE.Vector3) => {
      tmp.copy(world).project(camera);
      return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H] as const;
    };
    const cam = camera.position;
    /** is this world point hidden behind the sphere, as the camera sees it? */
    const hidden = (p: THREE.Vector3) => {
      const dir = tmp.subVectors(p, cam);
      const len = dir.length();
      dir.divideScalar(len);
      const b = cam.dot(dir);
      const c = cam.lengthSq() - RADIUS * RADIUS;
      const disc = b * b - c;
      if (disc <= 0) return false;
      return -b - Math.sqrt(disc) < len - 1e-3;
    };
    const world = (local: THREE.Vector3) => local.clone().applyMatrix4(globe.matrixWorld);

    // ---- the connection ----
    let arcLocal: THREE.Vector3[] = [];
    let placeLocal: THREE.Vector3 | null = null;
    const homeLocal = toVec(HOME.lat, HOME.lon);
    const state = { draw: 0, pulse: 0 };
    let pulseTween: gsap.core.Tween | null = null;

    const buildArc = (p: Place) => {
      const a = toVec(HOME.lat, HOME.lon).normalize();
      const b = toVec(p.lat, p.lon).normalize();
      const angle = a.angleTo(b);
      const lift = 0.06 + 0.32 * (angle / Math.PI); // longer flights rise higher
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES;
        // slerp along the great circle, then lift off the surface
        const s = angle < 1e-6 ? a.clone() : a.clone().multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle))
          .add(b.clone().multiplyScalar(Math.sin(t * angle) / Math.sin(angle)));
        pts.push(s.normalize().multiplyScalar(RADIUS * (1 + lift * Math.sin(Math.PI * t))));
      }
      return pts;
    };

    /** swing to the centre of the stage, facing (lat, lon) */
    const focusOn = (lat: number, lon: number) => {
      while (lon - view.lon > 180) lon -= 360;
      while (lon - view.lon < -180) lon += 360;
      lat = gsap.utils.clamp(-35, 35, lat);
      const d = still ? 0 : 1.6;
      swaying = false;
      gsap.killTweensOf([aim, dragged, mode]);
      // from the scroll's view the whole swing rides `focus`; from another place, the aim itself travels
      if (mode.focus < 0.02) gsap.set(aim, { lat, lon });
      else gsap.to(aim, { lat, lon, duration: d, ease: PRIME });
      gsap.to(dragged, { lat: 0, lon: 0, duration: d, ease: PRIME });
      gsap.to(mode, { focus: 1, duration: d, ease: PRIME });
    };

    api.current = {
      show: (p) => {
        pulseTween?.kill();
        if (!p) {
          // nothing chosen: back down to where the scroll left it
          arcLocal = [];
          placeLocal = null;
          placeLabel.textContent = "";
          fitPill(placeNode);
          state.draw = 0;
          gsap.killTweensOf([aim, dragged, mode]);
          gsap.to(mode, { focus: 0, duration: still ? 0 : 1.4, ease: PRIME });
          swaying = !still;
          return;
        }
        if (p.lat === HOME.lat && p.lon === HOME.lon) {
          arcLocal = [];
          placeLocal = toVec(p.lat, p.lon);
          placeLabel.textContent = p.city;
          fitPill(placeNode);
          state.draw = 0;
          focusOn(HOME.lat, HOME.lon);
          return;
        }
        arcLocal = buildArc(p);
        placeLocal = toVec(p.lat, p.lon);
        placeLabel.textContent = p.city;
        fitPill(placeNode);
        // face the middle of the flight
        const mid = arcLocal[Math.floor(SAMPLES / 2)].clone().normalize();
        focusOn((Math.asin(mid.y) * 180) / Math.PI, (Math.atan2(mid.x, mid.z) * 180) / Math.PI);
        state.draw = 0;
        gsap.to(state, { draw: 1, duration: still ? 0 : 1.8, delay: still ? 0 : 0.5, ease: PRIME });
        state.pulse = 0;
        if (!still) {
          pulseTween = gsap.fromTo(
            state,
            { pulse: 0 },
            { pulse: 1, duration: 2.6, ease: "sine.inOut", repeat: -1, repeatDelay: 0.5, delay: 2.4 },
          );
        }
      },
    };

    // ---- drag to turn ----
    // the stage is the whole section, so only a press on the sphere itself takes hold of it
    let drag: { x: number; y: number; lat: number; lon: number } | null = null;
    const onSphere = (e: PointerEvent) => {
      if (!frame) return false;
      const box = el.getBoundingClientRect();
      return Math.hypot(e.clientX - box.left - frame.x, e.clientY - box.top - frame.y) < frame.r;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !onSphere(e)) return;
      drag = { x: e.clientX, y: e.clientY, lat: dragged.lat, lon: dragged.lon };
      gsap.killTweensOf(dragged);
      swaying = false;
      el.style.cursor = "grabbing";
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) {
        if (e.pointerType === "mouse") el.style.cursor = onSphere(e) ? "grab" : "";
        return;
      }
      dragged.lon = drag.lon - (e.clientX - drag.x) * 0.3;
      dragged.lat = gsap.utils.clamp(-50, 50, drag.lat + (e.clientY - drag.y) * 0.2);
    };
    const onUp = () => {
      drag = null;
      el.style.cursor = "";
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    // ---- the frame ----
    // a node sits on the surface, where an occlusion ray is ambiguous: it is seen while the surface under
    // it faces the camera, fading out over the last stretch before the limb
    const toCam = new THREE.Vector3();
    const setNode = (node: SVGGElement, local: THREE.Vector3 | null) => {
      if (!local) {
        node.style.opacity = "0";
        return;
      }
      const w = world(local);
      const [x, y] = project(w);
      const facing = w.clone().normalize().dot(toCam.subVectors(cam, w).normalize());
      node.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      node.style.opacity = String(gsap.utils.clamp(0, 1, facing / 0.25));
    };
    // the pills behind the labels fit their text
    const fitPill = (g: SVGGElement) => {
      const text = g.querySelector<SVGTextElement>("text");
      const pill = g.querySelector<SVGRectElement>("[data-pill]");
      if (!text || !pill) return;
      const w = text.textContent ? text.getComputedTextLength() : 0;
      pill.setAttribute("width", String(w ? w + 14 : 0));
    };
    fitPill(homeNode);
    // and again once the mono face has loaded, which sets the text's real width
    void document.fonts.ready.then(() => {
      fitPill(homeNode);
      fitPill(placeNode);
    });
    const tick = (time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 64) / 1000;
      const k = 1 - Math.exp(-dt * 4);
      const p = ease(gsap.utils.clamp(0, 1, progress.current ?? 0));
      const f = mode.focus;

      // where it sits: the frame follows the scroll closely (it is the scroll), the view a little behind
      const want = mixFrame(mixFrame(stage.intro, stage.settled, p), stage.focus, f);
      if (!frame) frame = want;
      else frame = mixFrame(frame, want, 1 - Math.exp(-dt * 10));
      place2D(frame);

      const turn = scrollView(p);
      const sway = swaying ? Math.sin(time * 0.25) * 8 * (1 - f) : 0;
      const lat = gsap.utils.clamp(-50, 50, turn.lat + (aim.lat - turn.lat) * f + dragged.lat);
      const lon = turn.lon + (aim.lon - turn.lon) * f + dragged.lon + sway;
      view.lat += (lat - view.lat) * k;
      view.lon += (lon - view.lon) * k;
      globe.rotation.set((view.lat * Math.PI) / 180, (-view.lon * Math.PI) / 180, 0, "XYZ");
      globe.updateMatrixWorld();
      renderer.render(scene, camera);

      setNode(homeNode, homeLocal);
      setNode(placeNode, placeLocal);
      if (!arcLocal.length) {
        arcBase.setAttribute("d", "");
        arc.setAttribute("d", "");
        keyline.setAttribute("d", "");
        pulse.style.opacity = "0";
        return;
      }
      // the arc's projected path, broken where the globe hides it; the drawn part grows with `draw`
      const upTo = state.draw * SAMPLES;
      let full = "";
      let drawn = "";
      let penFull = false;
      let penDrawn = false;
      arcLocal.forEach((local, i) => {
        const w = world(local);
        const visible = !hidden(w);
        const [x, y] = project(w);
        const pt = `${x.toFixed(1)} ${y.toFixed(1)}`;
        full += visible ? `${penFull ? "L" : "M"}${pt}` : "";
        penFull = visible;
        const inDraw = i <= upTo;
        drawn += visible && inDraw ? `${penDrawn ? "L" : "M"}${pt}` : "";
        penDrawn = visible && inDraw;
      });
      arcBase.setAttribute("d", full);
      arc.setAttribute("d", drawn);
      keyline.setAttribute("d", drawn);
      const [ax, ay] = project(world(arcLocal[0]));
      const [bx, by] = project(world(arcLocal[SAMPLES]));
      gradient.setAttribute("x1", ax.toFixed(1));
      gradient.setAttribute("y1", ay.toFixed(1));
      gradient.setAttribute("x2", bx.toFixed(1));
      gradient.setAttribute("y2", by.toFixed(1));
      // the pulse rides the finished arc
      if (state.draw >= 1 && state.pulse > 0 && state.pulse < 1) {
        const w = world(arcLocal[Math.round(state.pulse * SAMPLES)]);
        const [x, y] = project(w);
        pulse.setAttribute("cx", x.toFixed(1));
        pulse.setAttribute("cy", y.toFixed(1));
        glow.setAttribute("cx", x.toFixed(1));
        glow.setAttribute("cy", y.toFixed(1));
        const o = hidden(w) ? "0" : String(Math.sin(Math.PI * state.pulse));
        pulse.style.opacity = o;
        glow.style.opacity = o;
      } else pulse.style.opacity = "0";
    };

    // drawn only while on screen
    let running = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) {
        gsap.ticker.add(tick);
        running = true;
      } else if (!e.isIntersecting && running) {
        gsap.ticker.remove(tick);
        running = false;
      }
    });
    io.observe(el);
    tick(0, 16);

    return () => {
      io.disconnect();
      gsap.ticker.remove(tick);
      gsap.killTweensOf([aim, dragged, mode, state]);
      pulseTween?.kill();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      landGeo.dispose();
      land.dispose();
      lineGeo.dispose();
      landMat.dispose();
      lineMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, [progress]);

  useEffect(() => {
    api.current?.show(place);
  }, [place]);

  return (
    <div
      ref={host}
      className="absolute inset-0 touch-pan-y select-none"
      role="img"
      aria-label={
        place
          ? `A globe with a line drawn from Hyderabad, India to ${place.city}, ${place.name}`
          : "A globe marking Hyderabad, India"
      }
    >
      <svg ref={svgRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <circle data-outline fill="none" stroke="#08064e" strokeOpacity={0.14} strokeWidth={1} />
        <defs>
          {/* along the flight: the studio's blue at Hyderabad, ink at the visitor's end */}
          <linearGradient data-arc-gradient id="globe-arc" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f6bff" />
            <stop offset="1" stopColor="#08064e" />
          </linearGradient>
        </defs>
        <path data-arc-base fill="none" stroke="#08064e" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="1 5" strokeLinecap="round" />
        <path data-arc-keyline fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <path data-arc fill="none" stroke="url(#globe-arc)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle data-pulse-glow r={9} fill="#2f6bff" fillOpacity={0.18} style={{ opacity: 0 }} />
        <circle data-pulse r={3.5} fill="#2f6bff" stroke="#ffffff" strokeWidth={1.5} style={{ opacity: 0 }} />

        {/* Hyderabad: two rings breathing out from a blue core, and its name in a pill on a leader line */}
        <g data-home>
          {[0, 1.2].map((begin) => (
            <circle key={begin} r={5} fill="none" stroke="#2f6bff" strokeWidth={1.25} opacity={0}>
              <animate attributeName="r" values="5;20" dur="2.4s" begin={`${begin}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="2.4s" begin={`${begin}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <circle r={5.5} fill="#2f6bff" stroke="#ffffff" strokeWidth={2} />
          <circle r={1.6} fill="#ffffff" />
          <path d="M5 -5L14 -14" stroke="#08064e" strokeOpacity={0.5} strokeWidth={1} />
          <g transform="translate(14 -24)">
            <rect data-pill height={18} rx={2} fill="#ffffff" stroke="#08064e" strokeOpacity={0.15} />
            <text x={7} y={12.5} className="fill-ink font-mono text-[10px] uppercase tracking-[0.14em]">
              Hyderabad
            </text>
          </g>
        </g>

        {/* the visitor: a white core ringed in blue, and their city in the same pill */}
        <g data-place style={{ opacity: 0 }}>
          <circle r={5.5} fill="#ffffff" stroke="#2f6bff" strokeWidth={2.25} />
          <circle r={1.8} fill="#08064e" />
          <path d="M5 -5L14 -14" stroke="#08064e" strokeOpacity={0.5} strokeWidth={1} />
          <g transform="translate(14 -24)">
            <rect data-pill height={18} rx={2} fill="#ffffff" stroke="#08064e" strokeOpacity={0.15} />
            <text data-place-label x={7} y={12.5} className="fill-ink font-mono text-[10px] uppercase tracking-[0.14em]" />
          </g>
        </g>
      </svg>
    </div>
  );
}
