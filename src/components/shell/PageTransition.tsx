"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { BAYER, NOISE } from "@/lib/glsl";
import { BAND, SUB } from "@/lib/dither";
import { gsap, holdScroll, prefersReducedMotion, ScrollSmoother, ScrollTrigger } from "@/lib/gsap";
import { WORK } from "@/lib/work";

/*
 * Moving between pages through a train of seams that never stops. Four fronts rise from the foot of the
 * screen one after another, slowly, each a level of the studio's dither in the seams' own dots (8px
 * cells of 2px sub-pixels, lit in Bayer order):
 *
 *   1  white            the old page goes under white
 *   2  halftone grey    half the dots black
 *   3  black
 *   4  the new page     it rises in behind the black
 *
 * The route swaps the moment the white has covered the old page — under a stack of white, grey and black
 * bands that are still climbing, never a held black screen — and the new page follows them up. (Only if
 * the next page is slow to arrive do the bands finish their climb and wait.) Each front is a band, solid
 * below and thinning above, whose edge drifts sideways and ripples as it rises.
 *
 * It owns every same-origin link click: a link to a section of this page glides there; a link to a
 * section another page has goes through the seams to that page and section; browser back / forward join
 * the train midway. One fragment shader on a full-screen canvas, drawn every frame while it runs.
 */

const VERT = /* glsl */ `#version 300 es
  void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `#version 300 es
  precision highp float;
  uniform vec2  uRes;    // device px
  uniform float uSub;    // device px per sub-pixel
  uniform float uTime;   // s: the fronts' drift and ripple
  uniform vec4  uFront;  // 0..1 per front (white, grey, black, the new page): how far it has risen
  out vec4 color;

  ${BAYER}
  ${NOISE}

  const float BAND = ${BAND.toFixed(2)};

  // a front at progress p: 1 below it, a band of thinning dots, 0 above (y: 1 at the foot, 0 at the top).
  // It starts a little below the foot and ends a little above the top, so the ripple never leaves dots
  // at either edge before it starts or after it is done
  float band(float y, float p, float jitter) {
    float ramp = clamp((y - 1.05 + p * (1.1 + BAND)) / BAND, 0.0, 1.0);
    return pow(ramp, 1.6) + jitter * 4.0 * ramp * (1.0 - ramp);
  }

  // each level's edge: a wander that drifts sideways as it climbs, its grain, and a slow ripple
  float edge(vec2 cell, float level, float seed) {
    float drift = uTime * (0.22 + 0.1 * level);
    float wander = valueNoise(vec3(cell.x / (12.0 + 4.0 * level) + drift, cell.y / 14.0, seed + level * 3.1)) - 0.5;
    float grain = hash3(vec3(cell, seed * 7.0 + level)) - 0.5;
    return wander * 0.36 + grain * 0.1;
  }

  void main() {
    vec2 sub = floor(gl_FragCoord.xy / uSub);
    vec2 cell = floor(sub / 4.0);
    float rows = max(ceil(uRes.y / (uSub * 4.0)) - 1.0, 1.0);
    float th = bayer4(sub);
    // which front has passed here last decides what shows: nothing, white, grey, black, the new page
    int passed = -1;
    for (int i = 0; i < 4; i++) {
      float level = float(i);
      // the ripple: each front rises a little unevenly across the width, and the unevenness travels
      float ripple = sin(cell.x * 0.035 + uTime * 1.1 + level * 2.1) * 0.018
                   + sin(cell.x * 0.011 - uTime * 0.6 + level) * 0.022;
      float y = 1.0 - cell.y / rows + ripple;
      if (band(y, uFront[i], edge(cell, level, 1.0)) > th) passed = i;
    }
    // grey is half the dots black, in Bayer order
    if (passed == 0) color = vec4(1.0);
    else if (passed == 1) color = th < 0.5 ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(1.0);
    else if (passed == 2) color = vec4(0.0, 0.0, 0.0, 1.0);
    else color = vec4(0.0);
  }
`;

const RISE = 1.8; // s, each front's climb: slow
const STAGGER = 0.46; // s between one front and the next
const EASE = "sine.inOut";
const NAMES: Record<string, string> = {
  "/": "Home",
  "/projects": "Projects",
  "/about": "About",
  // each case page goes by its project
  ...Object.fromEntries(WORK.map((w) => [`/projects/${w.slug}`, w.title])),
};

type Fronts = [number, number, number, number];
type GL = { draw: (f: Fronts, time: number) => void; resize: () => void; dispose: () => void };

/** the shader on a WebGL2 canvas, or null where there is none (a plain fade stands in) */
function makeGL(canvas: HTMLCanvasElement): GL | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const vao = gl.createVertexArray();
  const U = Object.fromEntries(
    ["uRes", "uSub", "uTime", "uFront"].map((n) => [n, gl.getUniformLocation(program, n)]),
  );

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uSub, Math.max(1, Math.round(SUB * dpr)));
  };
  resize();
  return {
    resize,
    draw: (f, time) => {
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(U.uTime, time);
      gl.uniform4f(U.uFront, ...f);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // the context stays: a remount (React's development double-run) asks the same canvas for it again
    dispose: () => {
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    },
  };
}

const frames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (k: number) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
    step(n);
  });

/** the page's own scroll, through the smoother when there is one; `glide` eases there instead of jumping */
function scrollToTarget(hash: string, glide = false) {
  const smoother = ScrollSmoother.get();
  // "#top" is the page's very top: the hero is pinned, and its own box sits further down the spacer
  const target = hash && hash !== "#" && hash !== "#top" ? document.querySelector(hash) : null;
  // a position string only with an element: scrollTo(0, …, "top top") leaves the smoother stuck at 0
  if (smoother) {
    if (target) smoother.scrollTo(target, glide, "top top");
    else smoother.scrollTo(0, glide);
  }
  else if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}

export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const api = useRef<{ arrive: (path: string) => void } | null>(null);
  const shown = useRef(pathname); // the page on screen, so the first render isn't taken for a navigation

  useEffect(() => {
    const canvas = canvasRef.current;
    const label = labelRef.current;
    if (!canvas || !label) return;
    const still = prefersReducedMotion();
    const gl = still ? null : makeGL(canvas);
    const fronts: Fronts = [0, 0, 0, 0];
    // no WebGL (or reduced motion): the canvas is a flat white sheet that fades in and out
    if (!gl) canvas.style.background = "#fff";
    const render = (time = gsap.ticker.time) => {
      if (gl) gl.draw(fronts, time);
      else canvas.style.opacity = String(fronts[0] * (1 - fronts[3]));
    };
    const onResize = () => gl?.resize();
    window.addEventListener("resize", onResize);
    // drawn every frame while it runs, so the fronts keep drifting even while the route loads
    const frame = (time: number) => render(time);

    let busy = false;
    let pending: { path: string; resolve: () => void } | null = null;
    const show = (on: boolean) => {
      canvas.style.visibility = on ? "visible" : "hidden";
      canvas.style.pointerEvents = on ? "auto" : "none";
      if (on) gsap.ticker.add(frame);
      else gsap.ticker.remove(frame);
    };
    const rise = still ? 0.25 : RISE;
    const stagger = still ? 0.05 : STAGGER;
    let train: gsap.core.Timeline | null = null;

    /** white, grey and black set off one after another from `from`; resolves once the white is up */
    const enter = (from: Fronts = [0, 0, 0, 0]) =>
      new Promise<void>((resolve) => {
        fronts.splice(0, 4, ...from);
        show(true);
        render();
        train?.kill();
        train = gsap.timeline();
        [0, 1, 2].forEach((i) => {
          const left = 1 - fronts[i]; // a train joined midway (back / forward) runs only what is left
          if (left <= 0) return;
          train!.to(fronts, { [i]: 1, duration: rise * left, ease: EASE }, Math.max(0, i * stagger - (rise - rise * left)));
        });
        if (fronts[0] >= 1) resolve();
        else train.call(resolve, undefined, rise * (1 - from[0]));
      });

    /** the new page rises in behind the black; then everything is put away */
    const exit = () =>
      new Promise<void>((resolve) => {
        gsap.to(fronts, {
          3: 1,
          duration: rise,
          // a beat behind the black, so it never overtakes a band still picking up its pace
          delay: still ? 0 : 0.1,
          ease: EASE,
          onComplete: () => {
            train?.kill();
            train = null;
            fronts.splice(0, 4, 0, 0, 0, 0);
            render();
            show(false);
            resolve();
          },
        });
      });

    /** the new page is in: settle its scroll and triggers under the bands, then let it rise */
    const land = async (hash: string) => {
      await frames(1);
      holdScroll("transition", false);
      scrollToTarget(hash);
      ScrollTrigger.refresh();
      // after a route swap the smoother can keep its old content offset and stop following the scroll
      // until it is moved by hand: one pixel and back re-syncs it, invisibly, under the bands
      const smoother = ScrollSmoother.get();
      if (smoother) {
        const y = smoother.scrollTop();
        smoother.scrollTo(y + 1, false);
        smoother.scrollTo(y, false);
      }
      scrollToTarget(hash); // again, once the refreshed pins have their spacers
      await exit();
      busy = false;
    };

    const go = async (url: URL) => {
      if (busy) return;
      busy = true;
      holdScroll("transition", true);
      router.prefetch(url.pathname);
      label.textContent = `Going to ${NAMES[url.pathname] ?? "One Prime"}`;
      await enter();
      // the old page is under white: swap now, while grey and black are still climbing
      const arrived = new Promise<void>((resolve) => {
        pending = { path: url.pathname, resolve };
        window.setTimeout(resolve, 6000); // never strand the visitor under the bands
      });
      router.push(url.pathname + url.hash, { scroll: false });
      // while the page is on its way, the bands slow to a crawl rather than finish into a black screen;
      // they take up their pace again the moment it arrives
      let waited = false;
      const crawl = window.setTimeout(() => {
        waited = true;
        if (train) gsap.to(train, { timeScale: 0.12, duration: 0.5, ease: "sine.out", overwrite: true });
      }, 60);
      await arrived;
      window.clearTimeout(crawl);
      if (waited && train) gsap.to(train, { timeScale: 1, duration: 0.5, ease: "sine.in", overwrite: true });
      pending = null;
      await land(url.hash);
    };

    // a pathname change: ours (resolve the wait), or the browser's back / forward (cover at once, uncover)
    api.current = {
      arrive: (path) => {
        if (pending) {
          if (pending.path === path) pending.resolve();
          return;
        }
        if (busy) return;
        busy = true;
        label.textContent = `Going to ${NAMES[path] ?? "One Prime"}`;
        // the page has already changed: join the train where the white is up and grey and black are on
        // their way, so the new page still arrives from behind the bands
        void enter([1, 0.7, 0.4, 0]).then(() => land(window.location.hash));
      },
    };

    // every same-origin link, caught on the way down (capture), before next/link or React handle it
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.protocol.startsWith("mailto")) return;
      e.preventDefault();
      if (url.pathname === window.location.pathname) {
        const hash = url.hash;
        if (!hash || hash === "#" || document.querySelector(hash)) {
          scrollToTarget(hash, true); // a section of this page: glide there
          return;
        }
        // a section this page doesn't have lives on the home page
        e.stopPropagation();
        void go(new URL(`/${hash}`, window.location.href));
        return;
      }
      // another page: ours to take there (a next/link would otherwise navigate at once, without the seam)
      e.stopPropagation();
      void go(url);
    };
    window.addEventListener("click", onClick, true);

    // the routes a visitor is likely to take next, fetched ahead
    const idle = window.setTimeout(() => {
      router.prefetch("/");
      router.prefetch("/projects");
      router.prefetch("/about");
    }, 2500);

    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(frame);
      train?.kill();
      window.clearTimeout(idle);
      gl?.dispose();
      holdScroll("transition", false);
    };
  }, [router]);

  useEffect(() => {
    if (shown.current === pathname) return;
    shown.current = pathname;
    api.current?.arrive(pathname);
  }, [pathname]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="invisible fixed inset-0 z-[90] block h-full w-full"
      />
      <p
        ref={labelRef}
        aria-live="polite"
        className="sr-only"
      />
    </>
  );
}
