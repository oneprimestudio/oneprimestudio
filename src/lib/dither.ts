import { THRESHOLD as TH } from "./bayer";

/*
 * The studio's dot, shared by every dithered hand-over: an 8px cell of 4 × 4 sub-pixels (2px each), lit
 * in Bayer order. A "band" is the seam's motion turned into a reveal — a soft front BAND of the frame
 * tall rises from the bottom; under it a cell is solid, inside it the dots thin out toward its top:
 *
 *   ramp = clamp((y − 1 + p·(1 + BAND)) / BAND, 0, 1)        y: 1 on the bottom row of cells, 0 the top
 *   v    = ramp^1.6 + jitter · 4·ramp·(1 − ramp)              a sub-pixel turns when v > THRESHOLD
 *
 * HeroBloom's intro and PageTransition draw the same curve in GLSL; DitherReveal draws it on a 2D canvas.
 */

export const SUB = 2; // CSS px per sub-pixel
export const BAND = 0.45;
export const WANDER = 14; // cells per step of the smooth noise that bends the front (~112px)

export const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** smooth value noise on a coarse grid: bilinear between hashed corners, eased */
export const smooth = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

/** a cell's wander + grain: how far its dots run ahead of, or behind, the front */
export const cellJitter = (i: number, j: number) =>
  (smooth(i / WANDER, j / WANDER) - 0.5) * 0.34 + (hash(i + 7919, j) - 0.5) * 0.1;

export const bandCoverage = (y: number, p: number, jitter: number) => {
  const ramp = Math.min(1, Math.max(0, (y - 1 + p * (1 + BAND)) / BAND));
  return ramp ** 1.6 + jitter * 4 * ramp * (1 - ramp);
};

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

/**
 * A veil of solid `color` over a box that the band clears, on a 2D canvas anchored to the box's foot.
 * Every texel clears at one step of the progress and stays clear, so the texels are bucketed by that
 * step once (`size`) and a frame (`draw`) only touches the buckets between the last step and this one.
 */
export function bandVeil(canvas: HTMLCanvasElement, color: string, steps = 120) {
  const ctx = canvas.getContext("2d");
  const [r, g, b] = rgb(color);
  let img: ImageData | null = null;
  let order = new Uint32Array(0);
  let start = new Uint32Array(steps + 3);
  let drawn = -1;

  const size = (width: number, height: number) => {
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = Math.max(1, Math.round(SUB * dpr)); // a whole number of device pixels per dot
    const cellCols = Math.ceil((width * dpr) / (px * 4));
    const cellRows = Math.ceil((height * dpr) / (px * 4));
    const cols = cellCols * 4;
    const rows = cellRows * 4;
    if (!cols || !rows) {
      img = null;
      return;
    }
    canvas.width = cols;
    canvas.height = rows;
    canvas.style.width = `${(cols * px) / dpr}px`;
    canvas.style.height = `${(rows * px) / dpr}px`;
    img = ctx.createImageData(cols, rows);
    const data = img.data;
    const NEVER = steps + 1;
    const at = new Uint16Array(cols * rows);
    const count = new Uint32Array(steps + 3);
    for (let cj = 0; cj < cellRows; cj++) {
      const y = 1 - cj / Math.max(1, cellRows - 1); // canvas rows run top-down: the last row of cells is y = 1
      for (let ci = 0; ci < cellCols; ci++) {
        const jitter = cellJitter(ci, cellRows - 1 - cj);
        for (let sj = 0; sj < 4; sj++) {
          for (let si = 0; si < 4; si++) {
            const th = TH[sj][si];
            // the first step at which this dot clears: the coverage only grows with the progress
            let lo = 0;
            let hi = NEVER;
            while (lo < hi) {
              const mid = (lo + hi) >> 1;
              if (bandCoverage(y, mid / steps, jitter) > th) hi = mid;
              else lo = mid + 1;
            }
            const idx = (cj * 4 + sj) * cols + ci * 4 + si;
            at[idx] = lo;
            count[lo]++;
            data[idx * 4] = r;
            data[idx * 4 + 1] = g;
            data[idx * 4 + 2] = b;
            data[idx * 4 + 3] = 255;
          }
        }
      }
    }
    start = new Uint32Array(steps + 3);
    for (let k = 0; k <= NEVER; k++) start[k + 1] = start[k] + count[k];
    const fill = start.slice();
    order = new Uint32Array(cols * rows);
    for (let i = 0; i < at.length; i++) order[fill[at[i]]++] = i;
    drawn = -1;
  };

  /** p: 0 = covered, 1 = clear */
  const draw = (p: number) => {
    if (!ctx || !img) return;
    const step = Math.round(Math.min(1, Math.max(0, p)) * steps);
    if (step === drawn) return;
    const data = img.data;
    // forward: the buckets after the last step drawn clear; backward: the ones after this step cover again
    const [from, to, alpha] = step > drawn ? [drawn + 1, step, 0] : [step + 1, drawn, 255];
    for (let i = start[from]; i < start[to + 1]; i++) data[order[i] * 4 + 3] = alpha;
    drawn = step;
    ctx.putImageData(img, 0, 0);
  };

  return { size, draw };
}
