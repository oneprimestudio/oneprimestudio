import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { H_, W_ } from "./core";

/*
 * The studio's dither pixel. `5.png` is a 4×4 ordered-dither tile — its grey levels are the Bayer
 * ranks 0–15 (15, 31, 46 … 255 = (rank + 1)·16 − 1). That matrix, verbatim, is the threshold map:
 *
 *   a dot at grid cell (i, j) lights when  field(i, j) > (M[j mod 4][i mod 4] + 0.5) / 16
 *
 * so any continuous value field (a gradient, a photo, a shape's SDF, a transition front) comes
 * out as the same crisp, ordered pixel texture.
 */
const M = [
  [0, 12, 3, 15],
  [8, 4, 11, 7],
  [2, 14, 1, 13],
  [10, 6, 9, 5],
];
export const TH = M.map((row) => row.map((r) => (r + 0.5) / 16));

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * field(i, j, x, y) → value 0..1 per dot; (x, y) is the dot centre in px of the 1080×1920 frame.
 * `px` is the dot size. Drawn into a tiny canvas and scaled up with nearest-neighbour sampling.
 */
export function Dither({ field, px = 6, color = "#ffffff", opacity = 1, width = W_, height = H_, left = 0, top = 0, style }) {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  const cols = Math.ceil(width / px);
  const rows = Math.ceil(height / px);

  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(cols, rows);
    const d = img.data;
    const [r, g, b] = rgb(color);
    for (let j = 0; j < rows; j++) {
      const th = TH[j & 3];
      const y = top + (j + 0.5) * px;
      for (let i = 0; i < cols; i++) {
        const v = field(i, j, left + (i + 0.5) * px, y);
        if (v > th[i & 3]) {
          const k = (j * cols + i) * 4;
          d[k] = r;
          d[k + 1] = g;
          d[k + 2] = b;
          d[k + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  return (
    <canvas
      ref={ref}
      data-frame={frame}
      width={cols}
      height={rows}
      style={{
        position: "absolute",
        left,
        top,
        width: cols * px,
        height: rows * px,
        imageRendering: "pixelated",
        opacity,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
