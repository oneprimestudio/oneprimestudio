"use client";

import { useEffect, useRef, useState } from "react";
import { THRESHOLD } from "@/lib/bayer";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

/** the letters on a canvas, read back as coverage per grid cell, kept where it clears the Bayer threshold */
function trace(text: string, N: number) {
  const scale = 8;
  const c = document.createElement("canvas");
  c.width = c.height = N * scale;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  const family = getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${N * scale * 0.62}px ${family}`;
  ctx.fillText(text, (N * scale) / 2, (N * scale) / 2 + N * scale * 0.04);
  const data = ctx.getImageData(0, 0, N * scale, N * scale).data;
  const out: [number, number][] = [];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let y = 0; y < scale; y++)
        for (let x = 0; x < scale; x++) sum += data[((j * scale + y) * N * scale + (i * scale + x)) * 4 + 3];
      if (sum / (scale * scale * 255) > THRESHOLD[j % 4][i % 4]) out.push([i, j]);
    }
  return out;
}

/**
 * Initials drawn in the studio's dot: the letters are set on a small canvas, read back as coverage, and
 * each cell of a grid becomes a square dot when its coverage clears that cell's Bayer threshold — so the
 * edges come out dithered, like the seams. On hover the dots fall back to the threshold and come again.
 */
export default function DotMonogram({ text, className = "text-ink" }: { text: string; className?: string }) {
  const [cells, setCells] = useState<[number, number][]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const N = 28; // grid cells per side

  useEffect(() => {
    let alive = true;
    // after the fonts load, so the letters are the site's own
    document.fonts.ready.then(() => {
      if (alive) setCells(trace(text, N));
    });
    return () => {
      alive = false;
    };
  }, [text]);

  const stir = () => {
    if (prefersReducedMotion() || !svgRef.current) return;
    gsap.fromTo(
      svgRef.current.querySelectorAll("rect"),
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: "power2.out", stagger: { each: 0.004, from: "random" }, overwrite: true },
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${N} ${N}`}
      aria-hidden
      onPointerEnter={stir}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={N} height={N} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.08} />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.12} y={y + 0.12} width={0.76} height={0.76} fill="currentColor" />
      ))}
    </svg>
  );
}
