"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap, holdScroll, prefersReducedMotion, ScrollSmoother, ScrollTrigger } from "@/lib/gsap";
import { WORK } from "@/lib/work";
import { makeGL, RISE, STAGGER, Train, type Fronts } from "./bands";

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
 * the train midway. One fragment shader on a full-screen canvas, drawn every frame while it runs, in a worker
 * (bands.worker.ts) where the browser allows: the page mounting under the bands can no longer stall them.
 */

const NAMES: Record<string, string> = {
  "/": "Home",
  "/projects": "Projects",
  "/about": "About",
  // each case page goes by its project
  ...Object.fromEntries(WORK.map((w) => [`/projects/${w.slug}`, w.title])),
};

/** the bands, wherever they are drawn: each call resolves at its moment in the train */
type Bands = {
  /** white, grey and black set off from `from`; resolves once the white is up */
  enter: (from: Fronts) => Promise<void>;
  /** ease the train's clock (a crawl while the next page is slow to arrive, and back) */
  pace: (to: number, dur: number, ease: "in" | "out") => void;
  /** the new page rises in behind the black; resolves once everything is put away */
  exit: () => Promise<void>;
  resize: () => void;
  dispose: () => void;
};

/** a pair of one-shot waits, for the train's two moments */
function moments() {
  let white: (() => void) | null = null;
  let done: (() => void) | null = null;
  return {
    onWhite: () => new Promise<void>((r) => (white = r)),
    onDone: () => new Promise<void>((r) => (done = r)),
    white: () => {
      white?.();
      white = null;
    },
    done: () => {
      done?.();
      done = null;
    },
  };
}

/**
 * Drawn on the main thread, on the gsap ticker: where the browser can't hand a canvas to a worker. Without
 * WebGL (or with reduced motion) the canvas is a flat white sheet that fades in and out.
 */
function mainBands(canvas: HTMLCanvasElement, still: boolean, gl = still ? null : makeGL(canvas)): Bands {
  const train = new Train(still ? 0.25 : RISE, still ? 0.05 : STAGGER);
  const at = moments();
  if (!gl) canvas.style.background = "#fff";
  const size = () => gl?.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
  size();
  const now = () => performance.now() / 1000;
  const render = () => {
    if (gl) gl.draw(train.fronts, now());
    else canvas.style.opacity = String(train.fronts[0] * (1 - train.fronts[3]));
  };
  const frame = () => {
    const { white, done } = train.tick(now());
    render();
    if (white) at.white();
    if (done) {
      gsap.ticker.remove(frame);
      at.done();
    }
  };
  return {
    enter: (from) => {
      const w = at.onWhite();
      train.enter(from, now());
      render();
      gsap.ticker.add(frame);
      return w;
    },
    pace: (to, dur, ease) => train.pace(to, dur, ease, now()),
    exit: () => {
      const d = at.onDone();
      train.exit(now(), still ? 0 : 0.1);
      return d;
    },
    resize: size,
    dispose: () => {
      gsap.ticker.remove(frame);
      gl?.dispose();
    },
  };
}

// a canvas can be handed to a worker only once: a remount (React's development double-run) finds its worker here
const workers = new WeakMap<HTMLCanvasElement, Worker>();

/**
 * Drawn in a worker, on an OffscreenCanvas: the train keeps its pace while the main thread mounts the next
 * page under it. Falls back to the flat sheet if the worker can't get WebGL2.
 */
function workerBands(canvas: HTMLCanvasElement): Bands {
  const size = () => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio });
  let worker = workers.get(canvas);
  if (!worker) {
    worker = new Worker(new URL("./bands.worker.ts", import.meta.url), { type: "module" });
    const offscreen = canvas.transferControlToOffscreen();
    worker.postMessage({ type: "init", canvas: offscreen, ...size() }, [offscreen]);
    workers.set(canvas, worker);
  }
  const w = worker;
  const at = moments();
  let flat: Bands | null = null; // the fallback, once the worker has said it has no WebGL2
  w.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "ready" && !m.gl) flat = mainBands(canvas, false, null);
    else if (m.type === "white") at.white();
    else if (m.type === "done") at.done();
  };
  const onResize = () => w.postMessage({ type: "resize", ...size() });
  return {
    enter: (from) => {
      if (flat) return flat.enter(from);
      const p = at.onWhite();
      w.postMessage({ type: "enter", from });
      return p;
    },
    pace: (to, dur, ease) => (flat ? flat.pace(to, dur, ease) : w.postMessage({ type: "pace", to, dur, ease })),
    exit: () => {
      if (flat) return flat.exit();
      const p = at.onDone();
      w.postMessage({ type: "exit" });
      return p;
    },
    resize: () => (flat ? flat.resize() : onResize()),
    dispose: () => {
      w.onmessage = null;
      flat?.dispose();
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
    // in a worker where the browser can hand it the canvas, so the train never waits on the page mounting
    // under it; on the main thread otherwise
    const bands =
      !still && typeof Worker !== "undefined" && "transferControlToOffscreen" in canvas
        ? workerBands(canvas)
        : mainBands(canvas, still);
    const onResize = () => bands.resize();
    window.addEventListener("resize", onResize);

    let busy = false;
    let pending: { path: string; resolve: () => void } | null = null;
    const show = (on: boolean) => {
      canvas.style.visibility = on ? "visible" : "hidden";
      canvas.style.pointerEvents = on ? "auto" : "none";
    };
    const enter = (from: Fronts = [0, 0, 0, 0]) => {
      show(true);
      return bands.enter(from);
    };
    const exit = async () => {
      await bands.exit();
      show(false);
    };

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
        bands.pace(0.12, 0.5, "out");
      }, 60);
      await arrived;
      window.clearTimeout(crawl);
      if (waited) bands.pace(1, 0.5, "in");
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
      window.clearTimeout(idle);
      bands.dispose();
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
