"use client";

import Image from "next/image";
import { type ReactNode, useRef } from "react";
import { THRESHOLD } from "@/lib/bayer";
import { gsap, useGSAP } from "@/lib/gsap";

// The cursor trail's dither (shell/CursorField): an 8 px tone cell split into 4 × 4 sub-pixels of
// 2 px, as many lit as the tone asks for, in Bayer order — fine grain, never big blocks.
const CELL = 8; // CSS px per tone cell
const SUBS = 4; // sub-pixels per cell side
const LAMP = 210; // px radius of the developed circle
const INK: [number, number, number] = [8, 6, 78];
const CHALK: [number, number, number] = [247, 246, 242];

/**
 * A photograph drawn in the studio's dither — the cursor trail's sub-pixel grain, ink on chalk, lit in
 * the order of the 4×4 Bayer tile — cropped exactly like `object-fit: cover` at `focus`, and drawn at
 * the screen's own pixel density so every grain is a crisp square. Under the cursor (or a finger) a
 * soft lamp develops the real photograph through it.
 */
export default function DitherPhoto({
  src,
  toneSrc = src,
  alt,
  focus = [0.5, 0.5],
  sizes,
  className = "",
  children,
}: {
  src: string;
  /** a plain (non-srcset) copy to read tones from — its pixel size is unambiguous; small is fine */
  toneSrc?: string;
  alt: string;
  /** cover-crop focus, 0..1 on each axis (same as object-position percentages) */
  focus?: [number, number];
  sizes: string;
  className?: string;
  children?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!wrap || !canvas || !ctx) return;

      // ---- draw the dither once per size (it is a still). Tones come from a plain copy of the photograph:
      // a srcset image reports density-corrected natural sizes, which would throw the cover crop off.
      const photo = new window.Image();
      photo.decoding = "async";
      const draw = () => {
        if (!photo.naturalWidth) return;
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        // each sub-pixel is a whole number of device pixels and the canvas maps 1:1 to the screen, so the
        // cell is CELL rounded to the device grid (9.6 CSS px at 125% zoom, 8 at 100% and 200%)
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const dot = Math.max(1, Math.round((CELL / SUBS) * dpr));
        const cell = (dot * SUBS) / dpr;
        const cols = Math.ceil(w / cell);
        const rows = Math.ceil(h / cell);
        // one tone per cell: the band's cover crop, averaged down to the cell grid. The grid overhangs
        // the band by under a cell, so it samples the matching overhang and stays registered with the
        // photograph underneath.
        const s = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
        const sx = (photo.naturalWidth - w / s) * focus[0];
        const sy = (photo.naturalHeight - h / s) * focus[1];
        const probe = document.createElement("canvas");
        probe.width = cols;
        probe.height = rows;
        const pctx = probe.getContext("2d", { willReadFrequently: true });
        if (!pctx) return;
        pctx.drawImage(photo, sx, sy, (cols * cell) / s, (rows * cell) / s, 0, 0, cols, rows);
        const tone = pctx.getImageData(0, 0, cols, rows).data;
        // tone per cell, 0 (sky) … 1 (solid): dark = dense. Cells of the overhang that fall past the
        // photograph's edge come back transparent; they take their neighbour's tone instead of reading black.
        const value = new Float32Array(cols * rows).fill(-1);
        for (let k = 0; k < cols * rows; k++) {
          if (tone[k * 4 + 3] < 128) continue;
          const luma = (0.299 * tone[k * 4] + 0.587 * tone[k * 4 + 1] + 0.114 * tone[k * 4 + 2]) / 255;
          value[k] = Math.min(1, Math.max(0, (0.95 - luma) * 1.3));
        }
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const k = j * cols + i;
            if (value[k] >= 0) continue;
            value[k] = i > 0 && value[k - 1] >= 0 ? value[k - 1] : j > 0 ? value[k - cols] : 0;
          }
        }

        const cw = cols * SUBS * dot;
        const ch = rows * SUBS * dot;
        canvas.width = cw;
        canvas.height = ch;
        canvas.style.width = `${cw / dpr}px`;
        canvas.style.height = `${ch / dpr}px`;

        const out = ctx.createImageData(cw, ch);
        const d = out.data;
        for (let p = 0; p < d.length; p += 4) {
          d[p] = CHALK[0];
          d[p + 1] = CHALK[1];
          d[p + 2] = CHALK[2];
          d[p + 3] = 255;
        }
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const v = value[j * cols + i];
            for (let sy2 = 0; sy2 < SUBS; sy2++) {
              const th = THRESHOLD[sy2];
              for (let sx2 = 0; sx2 < SUBS; sx2++) {
                if (v <= th[sx2]) continue;
                const x0 = (i * SUBS + sx2) * dot;
                const y0 = (j * SUBS + sy2) * dot;
                for (let yy = 0; yy < dot; yy++) {
                  let p = ((y0 + yy) * cw + x0) * 4;
                  for (let xx = 0; xx < dot; xx++, p += 4) {
                    d[p] = INK[0];
                    d[p + 1] = INK[1];
                    d[p + 2] = INK[2];
                  }
                }
              }
            }
          }
        }
        ctx.putImageData(out, 0, 0);
      };
      photo.onload = draw;
      photo.src = toneSrc;
      const ro = new ResizeObserver(draw);
      ro.observe(wrap);

      // ---- the lamp: follows the pointer, opens on enter, closes on leave
      const setX = gsap.quickSetter(canvas, "--lx", "px");
      const setY = gsap.quickSetter(canvas, "--ly", "px");
      const at = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        setX(e.clientX - r.left);
        setY(e.clientY - r.top);
      };
      const open = (e: PointerEvent) => {
        at(e);
        gsap.to(canvas, { "--lamp": `${LAMP}px`, duration: 0.9, ease: "power3.out", overwrite: true });
      };
      const close = () => gsap.to(canvas, { "--lamp": "0px", duration: 0.7, ease: "power2.inOut", overwrite: true });
      // touch: the lamp follows the finger while it is down
      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") open(e);
      };
      const onUp = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") close();
      };
      const onEnter = (e: PointerEvent) => {
        if (e.pointerType === "mouse") open(e);
      };
      wrap.addEventListener("pointerenter", onEnter);
      wrap.addEventListener("pointermove", at);
      wrap.addEventListener("pointerleave", close);
      wrap.addEventListener("pointerdown", onDown);
      wrap.addEventListener("pointerup", onUp);
      wrap.addEventListener("pointercancel", onUp);

      return () => {
        photo.onload = null;
        ro.disconnect();
        wrap.removeEventListener("pointerenter", onEnter);
        wrap.removeEventListener("pointermove", at);
        wrap.removeEventListener("pointerleave", close);
        wrap.removeEventListener("pointerdown", onDown);
        wrap.removeEventListener("pointerup", onUp);
        wrap.removeEventListener("pointercancel", onUp);
      };
    },
    { scope: wrapRef, dependencies: [toneSrc, focus[0], focus[1]] },
  );

  return (
    <div ref={wrapRef} data-dither-photo className={`relative touch-pan-y overflow-hidden bg-chalk ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={90}
        className="object-cover"
        style={{ objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%` }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="dither-lamp absolute left-0 top-0 [image-rendering:pixelated]"
      />
      {children}
    </div>
  );
}
