import { useLayoutEffect, useRef } from "react";
import { clamp01, noise3, hash } from "./time";

/*
 * The site's page transition (PageTransition.tsx), as a film layer: a train of four fronts rising
 * from the bottom — white, halftone grey, black, then the next page — each a band of Bayer squares
 * thinning toward its top edge, its line bent by a slow noise. `start` is when the first front sets
 * off; the scene under it should swap at start + RISE, when the white has covered everything.
 *
 *   coverage = ramp^1.6 + jitter · 4·ramp·(1 − ramp),  ramp = clamp((y − 1 + p·(1 + BAND)) / BAND)
 */
export const RISE = 0.8;
export const STAGGER = 0.22;
export const SEAM_TOTAL = RISE + 3 * STAGGER;
const BAND = 0.45;
const SUB = 6; // px per square
const COLS = 1080 / SUB;
const ROWS = 1920 / SUB;
const B4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));
const ease = (x) => -(Math.cos(Math.PI * clamp01(x)) - 1) / 2; // sine.inOut, as on the site

// a cell's wander + grain: how far its squares run ahead of, or behind, the front
const JIT = new Float32Array((COLS / 4) * (ROWS / 4));
for (let j = 0; j < ROWS / 4; j++)
  for (let i = 0; i < COLS / 4; i++) JIT[j * (COLS / 4) + i] = (noise3(i / 14, j / 14, 3.1) - 0.5) * 0.5 + (hash(i, j, 9) - 0.5) * 0.35;

export function Seam({ t, start }) {
  const ref = useRef(null);
  const active = t >= start && t <= start + SEAM_TOTAL + 0.05;
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(COLS, ROWS);
    const buf = new Uint32Array(img.data.buffer);
    const ps = [0, 1, 2, 3].map((k) => ease((t - start - k * STAGGER) / RISE));
    const WHITE = 0xffffffff;
    const BLACK = 0xff000000;
    for (let r = 0; r < ROWS; r++) {
      const y = r / (ROWS - 1); // 0 top … 1 bottom
      for (let c = 0; c < COLS; c++) {
        const jit = JIT[(r >> 2) * (COLS / 4) + (c >> 2)];
        const th = B4[r & 3][c & 3];
        let top = -1;
        for (let k = 3; k >= 0; k--) {
          const pk = ps[k];
          if (pk <= 0) continue;
          const ramp = clamp01((y - 1 + pk * (1 + BAND)) / BAND);
          const cov = ramp ** 1.6 + jit * 4 * ramp * (1 - ramp);
          if (cov > th) {
            top = k;
            break;
          }
        }
        let px = 0;
        if (top === 0) px = WHITE;
        else if (top === 1) px = th < 0.5 ? BLACK : WHITE; // halftone grey
        else if (top === 2) px = BLACK;
        buf[r * COLS + c] = px;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [t, start]);
  if (!active) return null;
  return (
    <canvas
      ref={ref}
      width={COLS}
      height={ROWS}
      style={{ position: "absolute", inset: 0, width: 1080, height: 1920, imageRendering: "pixelated" }}
    />
  );
}
