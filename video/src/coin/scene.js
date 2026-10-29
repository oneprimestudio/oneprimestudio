import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { coinGeometry, KNOB_OFF, KNOB_ON, KNOB_R, R0, SW } from "./geometry";
import { ditherInto, edge, face, switchFace } from "./faces";

/*
 * The coin, in three.js, drawn once per video frame from the time alone (no state carried between frames,
 * so Remotion can render frames in any order, in parallel tabs).
 *
 *   air      tumbling in slow motion; settles to show heads, then flips to tails
 *   toss     thrown again, falls, bounces twice and comes to rest standing on its edge, rocking
 *   switch   its face dithers into the studio's switch; it lifts, morphs into the switch, the knob throws on
 *   logo     it shrinks into the "O" of the wordmark, flattening to chalk, and hands over to the 2D logo
 *
 * `T` holds the voice-over's line starts (src/coin/vo.json), so every move lands on its words.
 */

export const NAVY = "#06053a";
const CHALK = new THREE.Color("#efede9");
const FLASH = new THREE.Color("#cfe0ff");
const FLOOR = -2.4;
const REST_Y = FLOOR + R0;
const TH = 0.14;
const FOV = 30;
export const LOGO_DIST = 16; // the camera's distance once the logo is on screen
export const PX_PER_UNIT = 1920 / (2 * LOGO_DIST * Math.tan((FOV / 2) * (Math.PI / 180)));

const clamp = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, u) => a + (b - a) * u;
const inOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const outCubic = (u) => 1 - Math.pow(1 - u, 3);
const outBack = (u, k = 1.7) => 1 + (k + 1) * Math.pow(u - 1, 3) + k * Math.pow(u - 1, 2);
// the site's own throw of the knob: cubic-bezier(0.34, 1.56, 0.64, 1)
function bezier(x1, y1, x2, y2) {
  const b = (a1, a2, s) => 3 * (1 - s) * (1 - s) * s * a1 + 3 * (1 - s) * s * s * a2 + s * s * s;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 32; i++) {
      const m = (lo + hi) / 2;
      if (b(x1, x2, m) < x) lo = m;
      else hi = m;
    }
    return b(y1, y2, (lo + hi) / 2);
  };
}
const THROW = bezier(0.34, 1.56, 0.64, 1);

/** the timeline the coin moves to, from the voice-over */
export function times(vo) {
  const at = Object.fromEntries(vo.lines.map((l) => [l.id, l.start]));
  const T = { ...at, total: vo.total };
  T.land1 = T.edge + 1.1; // first touch of the floor
  T.rest = T.land1 + 0.62; // standing, after two bounces
  T.lift = T.build + 0.8;
  T.morph = T.build + 1.35;
  T.knob = T.morph + 0.5;
  T.on = T.name - 0.33;
  T.hand = T.name + 0.68; // the 2D logo has taken over
  return T;
}

/** a smooth path through timed keys: Hermite segments with Catmull-Rom tangents (no stop at each key) */
function path(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i];
  const [t1, p1] = keys[i + 1];
  const h = t1 - t0;
  const tan = (k) => {
    if (k <= 0 || k >= n - 1) return p0.map(() => 0);
    const [ta, pa] = keys[k - 1];
    const [tb, pb] = keys[k + 1];
    return pa.map((_, d) => (pb[d] - pa[d]) / (tb - ta));
  };
  const m0 = tan(i);
  const m1 = tan(i + 1);
  const u = (t - t0) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
  const h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2;
  const h11 = u ** 3 - u ** 2;
  return p0.map((_, d) => h00 * p0[d] + h10 * h * m0[d] + h01 * p1[d] + h11 * h * m1[d]);
}

export function createScene(canvas, T) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1080, 1920, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NAVY);
  scene.fog = new THREE.Fog(NAVY, 9, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(FOV, 1080 / 1920, 0.1, 100);

  const key = new THREE.DirectionalLight("#ffffff", 2.6);
  key.position.set(3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 22 });
  key.shadow.bias = -0.0004;
  key.target.position.set(0, REST_Y, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight("#9db8ff", 2.4);
  rim.position.set(-4, 2.5, -5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight("#ffffff", 0.45);
  fill.position.set(-2, -1, 6);
  scene.add(fill);

  // the floor is only light and shadow: a soft pool of light under the coin that fades to nothing at its
  // edge (unlit, so it never glares, and no plane edge to show a horizon), and a shadow catcher
  const pool = document.createElement("canvas");
  pool.width = pool.height = 512;
  const pc = pool.getContext("2d");
  const grad = pc.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, "rgba(46, 44, 160, 0.6)");
  grad.addColorStop(0.35, "rgba(30, 28, 120, 0.28)");
  grad.addColorStop(1, "rgba(6, 5, 58, 0)");
  pc.fillStyle = grad;
  pc.fillRect(0, 0, 512, 512);
  const poolTex = new THREE.CanvasTexture(pool);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  const floorMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  scene.add(floor);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.55, transparent: true });
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), shadowMat);
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = FLOOR + 0.002;
  shade.receiveShadow = true;
  scene.add(shade);

  // ---- the coin ----
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const heads = face("heads");
  const tails = face("tails");
  const logo = face("logo");
  // the front face's live canvases: heads, the dither into the logo, then the morph
  const front = face("heads");
  const frontMaps = { color: tex(front.color, true), height: tex(front.height, false) };
  const ed = edge();
  const metal = (maps, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: maps.color,
      bumpMap: maps.height,
      bumpScale: 3,
      emissiveMap: maps.color,
      emissive: "#000000",
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: 1.25,
      // the coin stays crisp when the camera pulls back for the logo; only the floor fades into the fog
      fog: false,
      ...extra,
    });
  const mats = [
    metal(frontMaps),
    metal({ color: tex(tails.color, true), height: tex(tails.height, false) }),
    metal({ color: tex(ed.color, true), height: tex(ed.height, false) }, { bumpScale: 1.5, roughness: 0.3 }),
  ];
  const coin = coinGeometry(192, TH, 0.03);
  const mesh = new THREE.Mesh(coin.geometry, mats);
  mesh.castShadow = true;
  const knobMat = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: 0.16, envMapIntensity: 1.4, emissive: "#cfe0ff", emissiveIntensity: 0, fog: false });
  const knobGeo = coinGeometry(96, 0.3, 0.12);
  const knob = new THREE.Mesh(knobGeo.geometry, knobMat);
  knob.castShadow = true;
  const group = new THREE.Group();
  group.rotation.order = "YXZ";
  group.add(mesh, knob);
  scene.add(group);

  const spin = 2 * Math.PI * 1.15;
  const angA = spin * T.heads; // spin when the voice reaches "heads"
  const angH = 2 * Math.PI * Math.ceil((angA + 3.5) / (2 * Math.PI)); // heads to the camera
  const angC = angH + Math.PI; // tails
  const angD = 2 * Math.PI * Math.ceil((angC + 4 * Math.PI) / (2 * Math.PI)) - angC; // the toss: lands upright
  const extent = (ang) => R0 * Math.abs(Math.cos(ang)) + (TH / 2) * Math.abs(Math.sin(ang));
  const G = 7.02;
  const V = 2.4;

  /** the coin's pose at time t */
  function pose(t) {
    let ang;
    let yaw = 0;
    let roll = 0;
    let y = 0;
    let z = 0;
    const drift = 0.05 * Math.sin(1.1 * t);
    if (t < T.heads) {
      ang = spin * t;
      yaw = 0.35 * Math.sin(1.3 * t + 0.4);
      roll = 0.12 * Math.sin(0.9 * t);
      y = 0.08 * Math.sin(2 * t);
    } else if (t < T.tails) {
      const u = clamp((t - T.heads) / 0.7);
      const v0T = spin * 0.7;
      const delta = angH - angA;
      ang = u < 1 ? angA + v0T * (u - 2 * u * u + u ** 3) + delta * (3 * u * u - 2 * u ** 3) : angH;
      ang += drift * inOut(u);
      yaw = mix(0.35 * Math.sin(1.3 * t + 0.4), 0.14 * Math.sin(0.7 * t), inOut(u));
      roll = mix(0.12 * Math.sin(0.9 * t), 0, inOut(u));
      y = 0.08 * Math.sin(2 * t);
    } else if (t < T.edge) {
      const u = clamp((t - T.tails) / 0.6);
      ang = angH + Math.PI * outBack(u, 1.2) + drift;
      yaw = 0.14 * Math.sin(0.7 * t);
      y = 0.08 * Math.sin(2 * t);
    } else if (t < T.rest) {
      const u = (t - T.edge) / (T.rest - T.edge);
      ang = angC + angD * outCubic(u);
      const y0 = 0.08 * Math.sin(2 * T.edge);
      yaw = 0.14 * Math.sin(0.7 * T.edge) * (1 - outCubic(u));
      const ground = FLOOR + extent(ang);
      const tau = t - T.edge;
      if (t < T.land1) {
        // thrown up, falling to wherever the edge meets the floor at the first touch
        const yl = FLOOR + extent(angC + angD * outCubic((T.land1 - T.edge) / (T.rest - T.edge)));
        const g = (2 * (V * (T.land1 - T.edge) - (yl - y0))) / (T.land1 - T.edge) ** 2;
        y = Math.max(ground, y0 + V * tau - 0.5 * g * tau * tau);
      } else if (t < T.land1 + 0.42) {
        const s = t - T.land1;
        y = ground + Math.max(0, G * 0.21 * s - 0.5 * G * s * s);
      } else {
        const s = t - T.land1 - 0.42;
        y = ground + Math.max(0, G * 0.1 * s - 0.5 * G * s * s);
      }
    } else {
      // standing on its edge, rocking about the point where it touches the floor
      const s = t - T.rest;
      const phi = 0.14 * Math.exp(-s / 0.55) * Math.sin(2 * Math.PI * 2.4 * s);
      ang = angC + angD + phi;
      y = FLOOR + R0 * Math.cos(phi);
      z = R0 * Math.sin(phi);
      // lifted off the floor to the middle of the screen
      const lift = inOut(clamp((t - T.lift) / 0.8));
      y = mix(y, 0, lift);
      z = mix(z, 0, lift);
    }
    return { ang, yaw, roll, y, z };
  }

  // the camera follows the toss up, pulls back and down to watch the coin land on the floor, circles it to
  // show the edge, comes round to the face for the switch, and backs off to frame the logo
  const cam = [
    [0, [0, 0.2, 7.6, 0, -0.55, 0]],
    [T.heads, [0, 0.1, 7.0, 0, -0.5, 0]],
    [T.tails, [0.3, 0.05, 6.7, 0, -0.5, 0]],
    [T.edge, [0.1, 0.05, 6.8, 0, -0.5, 0]],
    [T.edge + 0.4, [0.4, 0.2, 7.6, 0, -0.3, 0]],
    [T.land1, [4.0, -0.7, 9.0, 0, -2.0, 0]],
    [T.land, [5.6, -0.75, 8.2, 0, -2.05, 0]],
    [T.build - 0.15, [6.6, -0.85, 6.4, 0, -2.05, 0]],
    [T.build + 0.7, [0, -1.25, 7.4, 0, -1.85, 0]],
    [T.build + 1.65, [0, 0, 11, 0, 0, 0]],
    [T.name, [0, 0, 11.6, 0, 0, 0]],
    [T.name + 0.6, [0, 0, LOGO_DIST, 0, 0, 0]],
    [T.total + 1, [0, 0, LOGO_DIST, 0, 0, 0]],
  ];

  let painted = "";
  /** draw time `t`; `target` is the 2D logo's switch on screen, {x, y, w, h} in px */
  function render(t, target) {
    const p = pose(t);
    // ---- the front face ----
    let state;
    const dp = clamp((t - T.build) / 0.8);
    const s = inOut(clamp((t - T.morph) / 0.6));
    if (dp <= 0) state = "heads";
    else if (dp < 1) state = `dither${dp.toFixed(4)}`;
    else if (s <= 0) state = "logo";
    else state = `morph${s.toFixed(4)}`;
    if (state !== painted) {
      if (state === "heads") switchCopy(front, heads);
      else if (state === "logo") switchCopy(front, logo);
      else if (state.startsWith("dither")) ditherInto(front, heads, logo, dp);
      else switchFace(front, s);
      frontMaps.color.needsUpdate = true;
      frontMaps.height.needsUpdate = true;
      painted = state;
    }
    coin.update(s);

    // ---- the knob: pops in on the left, then throws on ----
    const pop = outBack(clamp((t - T.knob) / 0.18), 2.2);
    const on = THROW(clamp((t - T.on) / 0.33));
    knob.visible = pop > 0.001;
    knob.scale.set(KNOB_R * pop, KNOB_R * pop, 0.4 * Math.max(pop, 0.001));
    knob.position.set(mix(KNOB_OFF, KNOB_ON, on), 0, TH / 2 + 0.03);
    const flash = t >= T.name ? Math.exp(-(t - T.name) / 0.18) : on >= 0.98 ? 1 : 0;
    knobMat.emissive.set(FLASH); // set every frame: a tab may render its frames in any order
    knobMat.emissiveIntensity = 2.2 * flash;
    renderer.toneMappingExposure = 1.05 + 0.3 * flash;

    // ---- into the wordmark: to the 2D switch's place, flattening to chalk ----
    const g = inOut(clamp((t - T.name) / 0.6));
    const flat = clamp((t - T.name - 0.05) / 0.5);
    let gx = 0;
    let gy = p.y;
    let gz = p.z;
    let scale = 1;
    if (target && g > 0) {
      const tx = (target.x + target.w / 2 - 540) / PX_PER_UNIT;
      const ty = (960 - (target.y + target.h / 2)) / PX_PER_UNIT;
      const ts = target.h / (2 * SW.hh * PX_PER_UNIT);
      gx = mix(0, tx, g);
      gy = mix(p.y, ty, g);
      gz = mix(p.z, 0, g);
      scale = mix(1, ts, g);
    }
    group.visible = t < T.hand;
    group.position.set(gx, gy, gz);
    // flattened to a plate as it lands, so no side shows where the 2D logo takes over
    group.scale.set(scale, scale, scale * mix(1, 0.03, flat));
    group.rotation.set(p.ang, p.yaw, p.roll);
    // lit metal → flat print: the lighting fades out (colour to black) as the chalk glow fades in, so the
    // outline ends chalk and the enamel navy, as the 2D logo draws them
    for (const m of [...mats, knobMat]) {
      m.metalness = 1 - flat;
      m.roughness = mix(m === knobMat ? 0.16 : 0.24, 1, flat);
      m.color.setRGB(1 - flat, 1 - flat, 1 - flat);
      if (m !== knobMat) {
        m.emissive.copy(CHALK);
        m.emissiveIntensity = flat;
      }
    }
    if (flat > 0) {
      knobMat.emissive.copy(CHALK);
      knobMat.emissiveIntensity = Math.max(knobMat.emissiveIntensity, flat);
    }
    floorMat.opacity = 1 - clamp((t - T.build - 0.9) / 0.6);
    // no shadow while the coin is high in the air: it would lie far below as a stray dark shape
    shadowMat.opacity = 0.55 * floorMat.opacity * clamp((t - T.edge - 0.3) / 0.5);

    // ---- the camera ----
    const c = path(cam, t);
    camera.position.set(c[0], c[1], c[2]);
    camera.lookAt(c[3], c[4], c[5]);
    renderer.render(scene, camera);
  }

  return { render, dispose: () => renderer.dispose() };
}

function switchCopy(target, from) {
  for (const key of ["color", "height"]) target[key].getContext("2d").drawImage(from[key], 0, 0);
}
