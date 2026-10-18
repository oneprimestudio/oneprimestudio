"use client";

import { useEffect, useRef } from "react";
import { THRESHOLD } from "@/lib/bayer";
import { prefersReducedMotion } from "@/lib/gsap";

/*
 * A word at the full width of its box, set in the page transition's own dither: 8px cells of 2px sub-pixels
 * in black, lit in the 4×4 Bayer order, so every tone is a share of each cell's dots. The type is painted
 * once into an offscreen mask; only the sub-pixels inside a letter can ever light.
 *
 *   rest     the letters hold a light halftone (a quarter of the dots)
 *   arrival  the first time it is seen, the tone rises into the letters from their foot as a band, solid
 *            below and thinning above, the way the transition's fronts climb the screen
 *   lamp     a soft lamp follows the cursor anywhere over the word's parent (it sits behind other content):
 *            under it the dots fill in toward solid black, thinning back to the halftone at its edge, its
 *            rim grained like a seam's. It trails the pointer a little and fades out once it leaves
 *
 * One small canvas (a texel per sub-pixel, scaled up pixelated), redrawn only while something moves.
 */

const SUB = 2; // CSS px per sub-pixel, as the seams' and the transition's
const REST = 0.25; // the letters' resting tone
const LAMP = 150; // CSS px, the lamp's radius
const FOLLOW = 0.14; // how far the lamp closes on the pointer each frame
const ARRIVE = 1.6; // s
const BAND = 0.45; // the arrival band, as a share of the word's height

/** a stable grain per cell, 0..1 */
const grain = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export default function DitherWord({ text, className = "" }: { text: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    const area = box?.parentElement; // where the lamp listens: the word sits behind its parent's content
    const canvas = box?.querySelector("canvas");
    const ctx = canvas?.getContext("2d");
    if (!box || !area || !canvas || !ctx) return;
    const still = prefersReducedMotion();

    // the letters' sub-pixels: where each sits (CSS px), its Bayer threshold, its height in the word and a
    // grain for the lamp's rim
    let idx = new Uint32Array(0); // into the texel grid
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let th = new Float32Array(0);
    let up = new Float32Array(0); // 1 at the word's foot, 0 at its top
    let gr = new Float32Array(0);
    let img: ImageData | null = null;
    let W = 0;
    let H = 0;

    const build = () => {
      W = box.clientWidth;
      if (!W) return;
      const style = getComputedStyle(box);
      const font = (size: number) => `${style.fontWeight} ${size}px ${style.fontFamily}`;
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.font = font(100);
      const m = probe.measureText(text);
      const size = (100 * W) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
      const ascent = (m.actualBoundingBoxAscent * size) / 100;
      const descent = (m.actualBoundingBoxDescent * size) / 100;
      const cellPx = SUB * 4;
      H = Math.ceil((ascent + descent) / cellPx) * cellPx + cellPx;
      box.style.height = `${H}px`;

      const mask = document.createElement("canvas");
      mask.width = W;
      mask.height = H;
      const mc = mask.getContext("2d", { willReadFrequently: true })!;
      mc.font = font(size);
      mc.fillText(text, (m.actualBoundingBoxLeft * size) / 100, cellPx / 2 + ascent);
      const alpha = mc.getImageData(0, 0, W, H).data;

      // a texel per sub-pixel; on a high-density screen each is a whole number of device pixels, scaled up
      // pixelated, so the dots stay crisp squares
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const dev = Math.max(1, Math.round(SUB * dpr));
      const cols = Math.ceil(W / SUB);
      const rows = Math.ceil(H / SUB);
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.width = `${(cols * dev) / dpr}px`;
      canvas.style.height = `${(rows * dev) / dpr}px`;
      img = ctx.createImageData(cols, rows); // black, transparent until lit

      const ii: number[] = [];
      const xs: number[] = [];
      const ys: number[] = [];
      const ts: number[] = [];
      const us: number[] = [];
      const gs: number[] = [];
      for (let j = 0; j < rows; j++) {
        const y = j * SUB + SUB / 2;
        for (let i = 0; i < cols; i++) {
          const x = i * SUB + SUB / 2;
          if (alpha[(Math.min(H - 1, Math.floor(y)) * W + Math.min(W - 1, Math.floor(x))) * 4 + 3] < 128) continue;
          ii.push(j * cols + i);
          xs.push(x);
          ys.push(y);
          ts.push(THRESHOLD[j % 4][i % 4]);
          us.push(1 - y / H);
          gs.push(grain(Math.floor(i / 4), Math.floor(j / 4)));
        }
      }
      idx = Uint32Array.from(ii);
      px = Float32Array.from(xs);
      py = Float32Array.from(ys);
      th = Float32Array.from(ts);
      up = Float32Array.from(us);
      gr = Float32Array.from(gs);
    };

    // ---- the frame ----
    let arrived = still ? 1 : 0;
    let arriveFrom = -1;
    const aim = { x: 0, y: 0, on: false }; // the pointer, in the word's own CSS px
    const lamp = { x: 0, y: 0, a: 0 }; // where the lamp is, and how strong (it fades in and out)
    let raf = 0;

    const draw = () => {
      if (!img) return;
      const data = img.data;
      // the arrival band: everything under it at the resting tone, thinning above it (y up from the foot)
      const front = arrived * (1 + BAND);
      for (let k = 0; k < idx.length; k++) {
        const ramp = Math.min(1, Math.max(0, (up[k] - 1 + front) / BAND));
        let tone = REST * ramp ** 1.6;
        if (lamp.a > 0.001) {
          const d = Math.hypot(px[k] - lamp.x, py[k] - lamp.y) / LAMP;
          // the rim is grained per cell, so the lamp's edge breaks up like a seam's instead of a clean circle
          const f = Math.max(0, 1 - d + (gr[k] - 0.5) * 0.22);
          tone = Math.max(tone, Math.min(1, f * 1.35) ** 1.3 * lamp.a * ramp);
        }
        data[idx[k] * 4 + 3] = tone > th[k] ? 255 : 0;
      }
      ctx.putImageData(img, 0, 0);
    };

    const frame = (now: number) => {
      raf = 0;
      if (arrived < 1) {
        if (arriveFrom < 0) arriveFrom = now;
        const p = Math.min(1, (now - arriveFrom) / (ARRIVE * 1000));
        arrived = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2; // in and out, as the transition's climb
      }
      lamp.x += (aim.x - lamp.x) * FOLLOW;
      lamp.y += (aim.y - lamp.y) * FOLLOW;
      lamp.a += ((aim.on ? 1 : 0) - lamp.a) * 0.12;
      const settled =
        arrived >= 1 &&
        Math.abs(aim.x - lamp.x) < 0.5 &&
        Math.abs(aim.y - lamp.y) < 0.5 &&
        Math.abs((aim.on ? 1 : 0) - lamp.a) < 0.002;
      if (settled && !aim.on) lamp.a = 0;
      draw();
      if (!settled) wake();
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    // ---- arrival, the first time it is seen ----
    let seen = still;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !seen) {
          seen = true;
          wake();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(box);

    // ---- the lamp, over the whole parent (the content in front of the word would hide it from the word) ----
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect(); // the footer drifts as it scrolls in: measured per move
      aim.x = e.clientX - r.left;
      aim.y = e.clientY - r.top;
      if (!aim.on) {
        aim.on = true;
        if (lamp.a < 0.01) {
          lamp.x = aim.x; // it lights where the pointer comes in, rather than sliding over from the last place
          lamp.y = aim.y;
        }
      }
      if (seen) wake();
    };
    const onLeave = () => {
      aim.on = false;
      wake();
    };
    if (fine && !still) {
      area.addEventListener("pointermove", onMove, { passive: true });
      area.addEventListener("pointerleave", onLeave);
    }

    let lastW = -1;
    const rebuild = () => {
      build();
      if (seen) {
        draw();
        if (arrived < 1) wake();
      }
    };
    const ro = new ResizeObserver(() => {
      if (box.clientWidth === lastW) return;
      lastW = box.clientWidth;
      rebuild();
    });
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      rebuild();
      ro.observe(box);
    });

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
    };
  }, [text]);

  return (
    <div ref={host} aria-hidden className={`w-full font-sans font-medium ${className}`}>
      <canvas className="absolute left-0 top-0 block [image-rendering:pixelated]" />
    </div>
  );
}
