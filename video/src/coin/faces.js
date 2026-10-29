import { R0, S, STROKE, SW } from "./geometry";

/*
 * The coin's faces, painted on 2D canvases in world units (a face texture spans −S…S). Each face is painted
 * twice with the same shapes: a colour map (silver field, brighter relief, navy enamel) and a height map for
 * the bump (mid-grey field, white relief, black enamel recess).
 *
 *   heads   a website wireframe with the placeholder picture every template ships with   "TEMPLATE"
 *   tails   an hourglass                                                                   "MONTHS OF WAITING"
 *   logo    the studio's switch, off, in navy enamel                                       "ONE PRIME STUDIO"
 *
 * `switchFace(s)` carries the logo face through the coin's morph into the switch: the rim band thickens into
 * the switch's outline, the lettering and the small switch fade, and the enamel spreads into its inside.
 */

export const TEX = 1024;
const K = TEX / (2 * S);
const X = (x) => TEX / 2 + x * K;
const Y = (y) => TEX / 2 - y * K;
const clamp = (v) => Math.max(0, Math.min(1, v));

const COLOR = { field: "#c3c6d1", relief: "#f5f6fa", enamel: "#0c0b44" };
const HEIGHT = { field: "#808080", relief: "#ffffff", enamel: "#1a1a1a" };

function stadium(ctx, L, r) {
  ctx.beginPath();
  if (L <= 1e-6) {
    ctx.arc(X(0), Y(0), r * K, 0, Math.PI * 2);
    return;
  }
  ctx.moveTo(X(-L), Y(r));
  ctx.lineTo(X(L), Y(r));
  ctx.arc(X(L), Y(0), r * K, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(X(-L), Y(-r));
  ctx.arc(X(-L), Y(0), r * K, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.closePath();
}

/** lettering around the rim, clockwise from the top, repeated to close the circle */
function rimText(ctx, text, radius, size, color) {
  ctx.save();
  ctx.font = `500 ${size * K}px Montreal`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rpx = radius * K;
  const unit = [...text].map((ch) => ctx.measureText(ch).width / rpx + 0.012);
  const one = unit.reduce((a, b) => a + b, 0);
  const reps = Math.max(1, Math.round((Math.PI * 2) / one));
  const stretch = (Math.PI * 2) / (one * reps);
  let a = 0;
  ctx.translate(X(0), Y(0));
  for (let k = 0; k < reps; k++) {
    [...text].forEach((ch, i) => {
      const w = unit[i] * stretch;
      ctx.save();
      ctx.rotate(a + w / 2);
      ctx.translate(0, -rpx);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += w;
    });
  }
  ctx.restore();
}

function beads(ctx, radius, n, size, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(X(radius * Math.cos(a)), Y(radius * Math.sin(a)), size * K, 0, Math.PI * 2);
    ctx.fill();
  }
}

function rim(ctx, pal, text, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  beads(ctx, 0.875, 84, 0.013, pal.relief);
  rimText(ctx, text, 0.775, 0.085, pal.relief);
  ctx.restore();
}

/** a website made from a template: browser frame, nav, the placeholder picture, three boxes */
function wireframe(ctx, pal) {
  const lw = 0.034 * K;
  ctx.save();
  ctx.strokeStyle = pal.relief;
  ctx.fillStyle = pal.relief;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const rr = (x0, y0, x1, y1, r) => {
    ctx.beginPath();
    ctx.roundRect(X(x0), Y(y1), (x1 - x0) * K, (y1 - y0) * K, r * K);
  };
  rr(-0.47, -0.33, 0.47, 0.36, 0.06);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(-0.47), Y(0.25));
  ctx.lineTo(X(0.47), Y(0.25));
  ctx.stroke();
  for (const dx of [-0.39, -0.32, -0.25]) {
    ctx.beginPath();
    ctx.arc(X(dx), Y(0.305), 0.022 * K, 0, Math.PI * 2);
    ctx.fill();
  }
  rr(-0.38, -0.02, 0.38, 0.17, 0.02);
  ctx.stroke();
  // the stock "image goes here" picture: a sun over two hills
  ctx.beginPath();
  ctx.arc(X(0.22), Y(0.115), 0.03 * K, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(-0.3), Y(-0.02));
  ctx.lineTo(X(-0.12), Y(0.12));
  ctx.lineTo(X(0.02), Y(0.02));
  ctx.lineTo(X(0.12), Y(0.08));
  ctx.lineTo(X(0.3), Y(-0.02));
  ctx.stroke();
  for (const x0 of [-0.38, -0.12, 0.14]) {
    rr(x0, -0.25, x0 + 0.24, -0.09, 0.02);
    ctx.stroke();
  }
  ctx.restore();
}

function hourglass(ctx, pal) {
  ctx.save();
  ctx.strokeStyle = pal.relief;
  ctx.fillStyle = pal.relief;
  ctx.lineWidth = 0.036 * K;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(X(-0.26), Y(0.36));
  ctx.lineTo(X(0.26), Y(0.36));
  ctx.moveTo(X(-0.26), Y(-0.36));
  ctx.lineTo(X(0.26), Y(-0.36));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(-0.2), Y(0.36));
  ctx.bezierCurveTo(X(-0.2), Y(0.12), X(-0.03), Y(0.06), X(-0.03), Y(0));
  ctx.bezierCurveTo(X(-0.03), Y(-0.06), X(-0.2), Y(-0.12), X(-0.2), Y(-0.36));
  ctx.moveTo(X(0.2), Y(0.36));
  ctx.bezierCurveTo(X(0.2), Y(0.12), X(0.03), Y(0.06), X(0.03), Y(0));
  ctx.bezierCurveTo(X(0.03), Y(-0.06), X(0.2), Y(-0.12), X(0.2), Y(-0.36));
  ctx.stroke();
  // the sand, mostly run through
  ctx.beginPath();
  ctx.moveTo(X(-0.15), Y(-0.33));
  ctx.quadraticCurveTo(X(0), Y(-0.12), X(0.15), Y(-0.33));
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(X(-0.08), Y(0.16));
  ctx.lineTo(X(0.08), Y(0.16));
  ctx.lineTo(X(0), Y(0.05));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** the logo's switch, small, off: a relief outline round navy enamel, the knob at the left */
function smallSwitch(ctx, pal, alpha) {
  const hh = 0.2;
  const hw = (hh * 1064) / 547;
  const stroke = (97.5 / 547) * 2 * hh;
  const kr = (136 / 547) * 2 * hh;
  const kx = -hw + (273.5 / 1064) * 2 * hw;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pal.relief;
  stadium(ctx, hw - hh, hh);
  ctx.fill();
  ctx.fillStyle = pal.enamel;
  stadium(ctx, hw - hh, hh - stroke);
  ctx.fill();
  ctx.fillStyle = pal.relief;
  ctx.beginPath();
  ctx.arc(X(kx), Y(0), kr * K, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** the coin's raised rim band, and the field inside it */
function band(ctx, pal, L, r, w) {
  ctx.fillStyle = pal.field;
  ctx.fillRect(0, 0, TEX, TEX);
  ctx.fillStyle = pal.relief;
  stadium(ctx, L, r + 0.05);
  ctx.fill();
  ctx.fillStyle = pal.field;
  stadium(ctx, L, r - w);
  ctx.fill();
}

const paint = {
  heads: (ctx, pal) => {
    band(ctx, pal, 0, R0, 0.07);
    rim(ctx, pal, "TEMPLATE · ");
    wireframe(ctx, pal);
  },
  tails: (ctx, pal) => {
    band(ctx, pal, 0, R0, 0.07);
    rim(ctx, pal, "MONTHS OF WAITING · ");
    hourglass(ctx, pal);
  },
  logo: (ctx, pal) => switchPaint(ctx, pal, 0),
};

function switchPaint(ctx, pal, s) {
  const r = R0 + (SW.hh - R0) * s;
  const L = (SW.hw - SW.hh) * s;
  const w = 0.07 + (STROKE - 0.07) * s;
  band(ctx, pal, L, r, w);
  const fade = clamp(1 - s / 0.35);
  if (fade > 0) {
    rim(ctx, pal, "ONE PRIME STUDIO · HYDERABAD · ", fade);
    smallSwitch(ctx, pal, fade);
  }
  const fill = clamp((s - 0.3) / 0.45);
  if (fill > 0) {
    ctx.save();
    ctx.globalAlpha = fill;
    ctx.fillStyle = pal.enamel;
    stadium(ctx, L, r - w);
    ctx.fill();
    ctx.restore();
  }
}

const canvas = () => {
  const c = document.createElement("canvas");
  c.width = TEX;
  c.height = TEX;
  return c;
};

/** both maps of one face, as canvases */
export function face(kind) {
  const color = canvas();
  const height = canvas();
  paint[kind](color.getContext("2d"), COLOR);
  paint[kind](height.getContext("2d"), HEIGHT);
  return { color, height };
}

/** the logo face at morph `s`, painted into existing canvases */
export function switchFace(target, s) {
  switchPaint(target.color.getContext("2d"), COLOR, s);
  switchPaint(target.height.getContext("2d"), HEIGHT, s);
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/**
 * `from` turning into `to` as the studio's seam does: a front of Bayer-dithered 8px cells rising from the
 * bottom of the face, `p` 0 → 1
 */
export function ditherInto(target, from, to, p) {
  const CELL = 8;
  const n = TEX / CELL;
  for (const key of ["color", "height"]) {
    const ctx = target[key].getContext("2d");
    ctx.drawImage(from[key], 0, 0);
    for (let j = 0; j < n; j++) {
      const up = 1 - (j + 0.5) / n;
      const field = (p * 1.45 - up) / 0.45;
      if (field <= 0) continue;
      for (let i = 0; i < n; i++) {
        if (field > BAYER[(j % 4) * 4 + (i % 4)]) ctx.drawImage(to[key], i * CELL, j * CELL, CELL, CELL, i * CELL, j * CELL, CELL, CELL);
      }
    }
  }
}

/** the milled edge: fine ridges round the rim */
export function edge() {
  const color = document.createElement("canvas");
  const height = document.createElement("canvas");
  for (const c of [color, height]) {
    c.width = 2048;
    c.height = 32;
  }
  const cc = color.getContext("2d");
  cc.fillStyle = "#cfd2dc";
  cc.fillRect(0, 0, 2048, 32);
  const hc = height.getContext("2d");
  hc.fillStyle = "#808080";
  hc.fillRect(0, 0, 2048, 32);
  hc.fillStyle = "#ffffff";
  const ridges = 220;
  for (let i = 0; i < ridges; i++) hc.fillRect((i / ridges) * 2048, 0, 4, 32);
  return { color, height };
}
