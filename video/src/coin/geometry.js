import * as THREE from "three";

/*
 * The coin as one mesh whose outline morphs from a circle into the studio's switch. Every outline has the
 * same number of points, so the mesh keeps its topology and only its vertices move:
 *
 *   s = 0   a coin, radius 1
 *   s = 1   the switch of the logo: a stadium 1064 : 547 (as Logo.tsx draws it), half-height 0.8
 *
 * Caps are fans from the centre (both outlines are convex); the wall is a ring profile with rounded edges.
 * Cap UVs map world x/y straight onto a face texture that spans ±S, so a face can be painted in world units.
 */

export const R0 = 1;
export const SW = { hh: 0.8, hw: (0.8 * 1064) / 547 };
export const STROKE = (97.5 / 547) * 2 * SW.hh; // the switch outline's thickness
export const KNOB_R = (136 / 547) * 2 * SW.hh;
export const KNOB_OFF = ((137.5 + 136 - 532) / 547) * 2 * SW.hh;
export const KNOB_ON = ((137.5 + 136 + 517 - 532) / 547) * 2 * SW.hh;
export const S = 1.6; // a face texture spans −S…S in x and y

/** N points around the outline at morph `s`, evenly spaced by arc length: [x, y, nx, ny] */
export function outline(s, N) {
  const r = R0 + (SW.hh - R0) * s;
  const L = (SW.hw - SW.hh) * s;
  const P = 2 * Math.PI * r + 4 * L;
  const q = (Math.PI * r) / 2;
  const pts = new Array(N);
  for (let i = 0; i < N; i++) {
    let u = (i / N) * P;
    let a;
    if (u < q) {
      a = u / r;
      pts[i] = [L + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a)];
    } else if ((u -= q) < 2 * L) {
      pts[i] = [L - u, r, 0, 1];
    } else if ((u -= 2 * L) < Math.PI * r) {
      a = Math.PI / 2 + u / r;
      pts[i] = [-L + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a)];
    } else if ((u -= Math.PI * r) < 2 * L) {
      pts[i] = [-L + u, -r, 0, -1];
    } else {
      u -= 2 * L;
      a = -Math.PI / 2 + u / r;
      pts[i] = [L + r * Math.cos(a), r * Math.sin(a), Math.cos(a), Math.sin(a)];
    }
  }
  return pts;
}

/**
 * A coin of thickness `th` with edges rounded at radius `b`. Groups: 0 front cap (+z), 1 back cap, 2 wall.
 * `update(s)` moves it to morph `s`.
 */
export function coinGeometry(N = 192, th = 0.14, b = 0.03) {
  const STEPS = 5;
  const prof = []; // across the wall, front to back: [inset, z, xy-normal weight, z-normal]
  for (let k = 0; k < STEPS; k++) {
    const a = (k / (STEPS - 1)) * (Math.PI / 2);
    prof.push([b * (1 - Math.sin(a)), th / 2 - b + b * Math.cos(a), Math.sin(a), Math.cos(a)]);
  }
  for (let k = STEPS - 1; k >= 0; k--) {
    const a = (k / (STEPS - 1)) * (Math.PI / 2);
    prof.push([b * (1 - Math.sin(a)), -(th / 2 - b + b * Math.cos(a)), Math.sin(a), -Math.cos(a)]);
  }
  const M = prof.length;
  const cap = N + 1;
  const wall = (N + 1) * M; // the seam column is doubled so the wall's texture wraps cleanly
  const count = cap * 2 + wall;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const index = [];
  const W0 = cap * 2;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    index.push(0, 1 + i, 1 + j);
  }
  const front = index.length;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    index.push(cap, cap + 1 + j, cap + 1 + i);
  }
  const back = index.length - front;
  for (let c = 0; c < N; c++) {
    for (let m = 0; m < M - 1; m++) {
      const a = W0 + c * M + m;
      const bq = W0 + (c + 1) * M + m;
      const cq = bq + 1;
      const d = a + 1;
      index.push(a, cq, bq, a, d, cq);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(index);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.addGroup(0, front, 0);
  g.addGroup(front, back, 1);
  g.addGroup(front + back, index.length - front - back, 2);

  const put = (k, x, y, z, nx, ny, nz, u, v) => {
    pos[k * 3] = x;
    pos[k * 3 + 1] = y;
    pos[k * 3 + 2] = z;
    nor[k * 3] = nx;
    nor[k * 3 + 1] = ny;
    nor[k * 3 + 2] = nz;
    uv[k * 2] = u;
    uv[k * 2 + 1] = v;
  };
  let last = -1;
  const update = (s) => {
    if (s === last) return;
    last = s;
    const pts = outline(s, N);
    const f = (x) => x / (2 * S) + 0.5;
    put(0, 0, 0, th / 2, 0, 0, 1, 0.5, 0.5);
    put(cap, 0, 0, -th / 2, 0, 0, -1, 0.5, 0.5);
    for (let i = 0; i < N; i++) {
      const [x, y, nx, ny] = pts[i];
      const cx = x - nx * b;
      const cy = y - ny * b;
      put(1 + i, cx, cy, th / 2, 0, 0, 1, f(cx), f(cy));
      // seen after a half-turn about x, the back reads upright when its v runs the other way
      put(cap + 1 + i, cx, cy, -th / 2, 0, 0, -1, f(cx), f(-cy));
    }
    for (let c = 0; c <= N; c++) {
      const [x, y, nx, ny] = pts[c % N];
      for (let m = 0; m < M; m++) {
        const [inset, z, wxy, wz] = prof[m];
        put(W0 + c * M + m, x - nx * inset, y - ny * inset, z, nx * wxy, ny * wxy, wz, c / N, m / (M - 1));
      }
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.normal.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
    g.computeBoundingSphere();
  };
  update(0);
  return { geometry: g, update };
}
