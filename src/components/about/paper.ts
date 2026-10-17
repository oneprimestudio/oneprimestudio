import * as THREE from "three";

/*
 * A sheet of white paper in three.js, for the founder drawer to arrive on, rolled in like paper fed up
 * over a roller just under the screen's edge: it rises straight up from fully below the screen, and while
 * it passes the lower third of the screen it leans gently back, the more the nearer the edge — a slight,
 * smooth bend. Its top edge carries a small curl. Both fade as it lands, flat in the drawer's place.
 *
 * The sheet is the drawer's own size, in pixels (the camera is placed so one unit is one CSS pixel at the
 * sheet's depth). One number drives it, `p`: 0 fully below the screen, 1 in place.
 *
 *   lean     depth only — z = −lean·d², d from 0 a third of the way up the screen to 1 at its bottom edge
 *            — so the bend never pulls any of the sheet up into view: it is seen only as it rises past
 *            the edge
 *   curl     the top edge bends toward you a little, ∝ (1 − p)
 *   light    shaded by its own curvature, a sheen along the bend, a fine grain
 *
 * The real drawer (DOM, white, the same rect) takes over the moment the sheet is in place.
 */

const VERT = /* glsl */ `
  uniform float uH;      // the sheet's height, px
  uniform float uEdge;   // the screen's bottom edge, in the sheet's own y (px)
  uniform float uZone;   // how far up the screen the bend reaches, px
  uniform float uLean;   // how far back the sheet leans at the edge, px (0 once landed)
  uniform float uCurl;   // 0..1: the top edge's curl
  uniform float uTime;
  varying vec3 vView;
  varying float vBend;
  void main() {
    vec3 p = position;
    vBend = 0.0;
    // the bend: low on the screen the sheet leans back, the more the nearer the bottom edge — a smooth
    // curve, like paper coming up over a roller just under the edge. Only depth changes, so nothing is
    // pulled up into view: the sheet is seen only once it has really risen past the edge
    float d = clamp((uEdge + uZone - p.y) / uZone, 0.0, 1.0);
    p.z -= uLean * d * d;
    vBend = d * step(1.0, uLean);
    // the top edge's curl: the upper eighth of the sheet bends toward you, gently
    float t = (position.y + uH * 0.5) / uH;
    float curl = smoothstep(0.86, 1.0, t);
    p.z += curl * curl * 46.0 * uCurl;
    p.y -= curl * curl * 10.0 * uCurl;
    // a breath of life across the width while it moves
    p.z += sin(position.x * 0.008 + uTime * 2.2) * 4.0 * uCurl * t;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vView = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vView;
  varying float vBend;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    if (!gl_FrontFacing) n = -n;
    vec3 l = normalize(vec3(-0.35, 0.65, 0.7));
    float diffuse = clamp(dot(n, l), 0.0, 1.0);
    float sheen = pow(clamp(dot(reflect(-l, n), normalize(-vView)), 0.0, 1.0), 14.0) * vBend;
    float grain = (hash(floor(gl_FragCoord.xy)) - 0.5) * 0.03;
    // flat and facing the viewer, diffuse = 0.688 and the shade comes to exactly 1: the drawer's own white
    vec3 c = uColor * (0.312 + diffuse);
    gl_FragColor = vec4(c + vec3(0.6, 0.65, 1.0) * sheen * 0.3 + grain, 1.0);
  }
`;

export type Paper = {
  /** the drawer's rect on screen, in CSS px */
  fit: (rect: DOMRect) => void;
  /** p: 0 below the screen, 1 in place */
  draw: (p: number, time: number) => void;
  dispose: () => void;
};

export function makePaper(canvas: HTMLCanvasElement): Paper | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // the colour is given as raw sRGB, as the CSS has it
  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
  const uniforms = {
    uH: { value: 1 },
    uEdge: { value: 0 },
    uZone: { value: 300 },
    uLean: { value: 0 },
    uCurl: { value: 1 },
    uTime: { value: 0 },
    uColor: { value: new THREE.Vector3(1, 1, 1) }, // white: the drawer's own sheet
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, side: THREE.DoubleSide });
  let geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  let landedY = 0;
  let drop = 0;
  let edge = 0; // the screen's bottom edge, in world y

  const fit = (rect: DOMRect) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // one unit = one CSS pixel at z = 0
    camera.position.set(0, 0, H / 2 / Math.tan(((FOV / 2) * Math.PI) / 180));
    camera.updateProjectionMatrix();
    geometry.dispose();
    geometry = new THREE.PlaneGeometry(rect.width, rect.height, 12, 200);
    mesh.geometry = geometry;
    uniforms.uH.value = rect.height;
    // the bend reaches a third of the way up the screen
    uniforms.uZone.value = H * 0.34;
    // its place: the rect's centre, from screen space (y down) to world space (y up, origin centre);
    // it starts with its top edge well under the screen's bottom edge, so nothing shows on the click
    mesh.position.x = rect.left + rect.width / 2 - W / 2;
    landedY = H / 2 - (rect.top + rect.height / 2);
    drop = H - rect.top + 160;
    edge = -H / 2;
  };

  const draw = (p: number, time: number) => {
    mesh.position.y = landedY - drop * (1 - p);
    // the edge, in the sheet's own coordinates; the lean fades out as the sheet lands, so it lies flat
    uniforms.uEdge.value = edge - mesh.position.y;
    uniforms.uLean.value = 150 * (1 - p);
    uniforms.uCurl.value = Math.max(0, 1 - p);
    uniforms.uTime.value = time;
    renderer.render(scene, camera);
  };

  return {
    fit,
    draw,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
