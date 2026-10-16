"use client";

import { useRef } from "react";
import { THRESHOLD as TH } from "@/lib/bayer";
import { hash, smooth } from "@/lib/dither";
import { prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";

/*
 * The hand-over between two sections, in the manner of lamalama.com: a band (35svh at least) of the
 * outgoing section's colour, into which the incoming section's colour is added in the cursor trail's
 * own dots — an 8px grid whose cells light their 2px sub-pixels in 4×4 Bayer order — sparse at the
 * top, solid at the bottom, so the next section seems to assemble itself inside this one. As the band
 * crosses the screen the dots keep arriving: the coverage curve slides from "mostly the old colour" to
 * "mostly the new", its edge wandering softly like the trail's.
 *
 *   a cell's coverage, row y (0 top … 1 bottom):  v = y^γ + wander + grain,  γ = 2^(2.2 − 4.4·progress)
 *   a sub-pixel takes the new colour when         v > THRESHOLD[j mod 4][i mod 4]
 *
 * — so a cell lights round(16·v) of its sub-pixels, the same ordering as CursorField. The top row of
 * cells is always the old colour and the bottom row always the new one, so both edges are seamless.
 * Drawn one texel per sub-pixel, each a whole number of device pixels so the dots stay crisp; redrawn
 * only while on screen and only when the progress has moved a step.
 */

const SUB = 2; // CSS px per sub-pixel; 4 × 4 of them make the trail's 8px cell
const WANDER = 14; // cells per step of the smooth noise that bends the edge (~112px)
const STEPS = 160; // progress is quantised: no redraw for a change too small to move a dot

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

export default function DitherSeam({ from, to }: { from: string; to: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const canvas = el?.querySelector("canvas");
      const ctx = canvas?.getContext("2d");
      if (!el || !canvas || !ctx) return;
      const [r, g, b] = rgb(to);

      let cols = 0; // texels (sub-pixels)
      let rows = 0;
      let img: ImageData | null = null;
      // every texel's dot arrives at one step of the progress and stays from then on (the coverage only
      // grows with it), so the texels are bucketed by that step once, and a redraw only touches the
      // buckets between the last step drawn and this one
      let order = new Uint32Array(0); // texel indices, sorted by the step they light at
      let start = new Uint32Array(STEPS + 3); // order[start[k] .. start[k + 1]) light at step k
      let drawn = -1;

      const size = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        // a sub-pixel is a whole number of device pixels, or the 2px dots would come out uneven
        const px = Math.max(1, Math.round(SUB * dpr));
        const cellCols = Math.ceil((el.clientWidth * dpr) / (px * 4));
        const cellRows = Math.ceil((el.clientHeight * dpr) / (px * 4));
        cols = cellCols * 4;
        rows = cellRows * 4;
        // not laid out yet (a hidden tab, a collapsed frame): nothing to draw until it has a size
        if (!cols || !rows) {
          img = null;
          return;
        }
        canvas.width = cols;
        canvas.height = rows;
        // anchored to the band's foot, so the bottom row of cells lines up with the next section exactly;
        // any spare fraction of a cell falls off the top
        canvas.style.width = `${(cols * px) / dpr}px`;
        canvas.style.height = `${(rows * px) / dpr}px`;
        img = ctx.createImageData(cols, rows);
        const data = img.data;

        // the step each texel lights at: the first step where  y^γ + jitter > threshold,
        // with γ = 2^(2.2 − 4.4·step/STEPS)  →  step > (2.2 − log2(ln t / ln y)) · STEPS / 4.4,  t = threshold − jitter
        const NEVER = STEPS + 1;
        const at = new Uint16Array(cols * rows);
        const count = new Uint32Array(STEPS + 3);
        for (let cj = 0; cj < cellRows; cj++) {
          const y = cj / Math.max(1, cellRows - 1); // exactly 0 on the top row of cells, 1 on the bottom
          const lnY = Math.log(y);
          for (let ci = 0; ci < cellCols; ci++) {
            // strongest mid-band, none at either edge, so the edges stay seamless
            const wander = (smooth(ci / WANDER, cj / WANDER) - 0.5) * 0.34;
            const grain = (hash(ci + 7919, cj) - 0.5) * 0.1;
            const jitter = (wander + grain) * 4 * y * (1 - y);
            for (let sj = 0; sj < 4; sj++) {
              const th = TH[sj];
              for (let si = 0; si < 4; si++) {
                const t = th[si] - jitter;
                let k: number;
                if (t < 0) k = 0;
                else if (t >= 1 || y <= 0) k = NEVER;
                else if (y >= 1) k = 0;
                else {
                  const limit = Math.log(t) / lnY; // γ must fall below this
                  k = limit <= 0 ? NEVER : Math.floor(((2.2 - Math.log2(limit)) * STEPS) / 4.4) + 1;
                  k = Math.min(NEVER, Math.max(0, k));
                }
                const idx = (cj * 4 + sj) * cols + ci * 4 + si;
                at[idx] = k;
                count[k]++;
                data[idx * 4] = r;
                data[idx * 4 + 1] = g;
                data[idx * 4 + 2] = b;
              }
            }
          }
        }
        start = new Uint32Array(STEPS + 3);
        for (let k = 0; k <= NEVER; k++) start[k + 1] = start[k] + count[k];
        const fill = start.slice();
        order = new Uint32Array(cols * rows);
        for (let i = 0; i < at.length; i++) order[fill[at[i]]++] = i;
        drawn = -1;
      };

      const draw = (progress: number) => {
        const step = Math.round(progress * STEPS);
        if (!img || step === drawn) return;
        const data = img.data;
        // forward: the buckets after the last step drawn light up; backward: the ones after this step go out
        const [from, to, alpha] = step > drawn ? [drawn + 1, step, 255] : [step + 1, drawn, 0];
        for (let i = start[from]; i < start[to + 1]; i++) data[order[i] * 4 + 3] = alpha;
        drawn = step;
        ctx.putImageData(img, 0, 0);
      };

      size();
      if (prefersReducedMotion()) {
        draw(0.5);
        const ro = new ResizeObserver(() => {
          size();
          draw(0.5);
        });
        ro.observe(el);
        return () => ro.disconnect();
      }

      // the dots keep arriving while the band crosses the screen, from its top entering to its foot leaving
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => draw(self.progress),
        onRefresh: (self) => draw(self.progress),
      });
      const ro = new ResizeObserver(() => {
        size();
        draw(st.progress);
      });
      ro.observe(el);
      return () => ro.disconnect();
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      aria-hidden
      className="relative z-10 -my-px h-[55svh] min-h-[270px] overflow-hidden"
      // the last 2px are already the new colour: at fractional device-pixel ratios the canvas can fall a
      // hair short of the band's foot, and the old colour must never show through as a line
      style={{ background: `linear-gradient(${from} calc(100% - 2px), ${to} calc(100% - 2px))` }}
    >
      <canvas className="absolute bottom-0 left-0 block [image-rendering:pixelated]" />
    </div>
  );
}
