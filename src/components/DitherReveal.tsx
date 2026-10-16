"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { bandVeil } from "@/lib/dither";
import { gsap, prefersReducedMotion, PRIME, ScrollTrigger, useGSAP } from "@/lib/gsap";

/**
 * Media that assembles out of the seams' dots: a veil of the page's ground covers the box, and a band
 * rising from its foot clears it, dot by dot in Bayer order (lib/dither). By default it plays once as
 * the box scrolls into view; given `replay`, it plays again each time that number changes instead.
 *
 * Until the veil has drawn, a plain cover of the same colour stands in, so nothing flashes uncovered
 * between the server's HTML and the first frame. Once clear, the canvas is taken out of rendering.
 */
export default function DitherReveal({
  children,
  className = "",
  color = "#f9f9f7",
  duration = 1.4,
  delay = 0,
  replay,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
  duration?: number;
  delay?: number;
  replay?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const play = useRef<() => void>(() => {});

  useGSAP(
    () => {
      const el = root.current;
      const canvas = el?.querySelector<HTMLCanvasElement>("[data-veil]");
      const cover = el?.querySelector<HTMLElement>("[data-veil-cover]");
      if (!el || !canvas || !cover) return;
      const clear = () => {
        cover.style.display = "none";
        canvas.style.visibility = "hidden";
      };
      if (prefersReducedMotion()) {
        clear();
        return;
      }

      const veil = bandVeil(canvas, color);
      const state = { p: 0 };
      const fit = () => {
        veil.size(el.clientWidth, el.clientHeight);
        veil.draw(state.p);
      };
      fit();
      cover.style.display = "none"; // the veil is drawn: it takes over from the plain cover
      const ro = new ResizeObserver(fit);
      ro.observe(el);

      let tween: gsap.core.Tween | null = null;
      play.current = () => {
        tween?.kill();
        state.p = 0;
        canvas.style.visibility = "visible";
        veil.draw(0);
        tween = gsap.to(state, {
          p: 1,
          duration,
          delay,
          ease: PRIME,
          onUpdate: () => veil.draw(state.p),
          onComplete: () => {
            canvas.style.visibility = "hidden";
          },
        });
      };

      if (replay === undefined) {
        ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => play.current() });
      }
      return () => ro.disconnect();
    },
    { scope: root },
  );

  // a new `replay` number plays the reveal again
  useEffect(() => {
    if (replay !== undefined && replay > 0) play.current();
  }, [replay]);

  return (
    <div ref={root} className={`relative overflow-hidden ${className}`}>
      {children}
      <span aria-hidden data-veil-cover className="pointer-events-none absolute inset-0" style={{ background: color }} />
      <canvas
        aria-hidden
        data-veil
        className="pointer-events-none absolute bottom-0 left-0 block [image-rendering:pixelated]"
      />
    </div>
  );
}
