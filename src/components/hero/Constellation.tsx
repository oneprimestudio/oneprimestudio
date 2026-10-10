"use client";

import { useRef } from "react";
import { gsap, MENU_EASE, prefersReducedMotion, useGSAP } from "@/lib/gsap";

/*
 * The node field from the reference recording, with the motion fitted to it.
 *
 * Every satellite is a damped spring (Hooke + viscous drag) chasing a moving target:
 *
 *   anchor(t) = O + ρ(t)·u·(cos θ(t), sin θ(t))           polar rest pose about the fixed origin O
 *                                                         (O and u come from the card it lives in)
 *     θ(t) = θ₀ + SWAY·sin(2π f₁ t + φ₁)                   slow angular sway
 *     ρ(t) = r·(1 + BREATHE·sin(2π f₂ t + φ₂))            slow radial breathing
 *   target = anchor + PULL·d·exp(−|d|²/2σ²)                 d = cursor − anchor
 *   a = ω₀²(target − x) − 2ζω₀·v + Σ wells + Σ ring kicks
 *
 * The cursor term is a Gaussian-weighted attraction: zero at the anchor, strongest at |d| = σ
 * and fading to nothing far away — nodes lean toward the cursor instead of chasing it. σ spans the
 * hero, so the field feels the cursor anywhere on it; PULL is solved so the strongest lean is
 * LEAN·u (0.607·PULL·σ = LEAN·u). Rings and wells are scaled to u as well. Wander frequencies come from the
 * golden ratio, so no two nodes ever fall into step. Integration is semi-implicit Euler on a fixed
 * 120 Hz clock, so the motion is identical at any frame rate.
 */

const STEP = 1 / 120;
const OMEGA = 2 * Math.PI * 0.9; // natural frequency of each spring
const ZETA = 0.65; // damping ratio: under-damped, one soft overshoot
const K = OMEGA * OMEGA;
const C = 2 * ZETA * OMEGA;
const SIGMA = 0.3; // of the hero height
const LEAN = 0.15; // strongest lean toward the cursor, in card units u
const SWAY = 0.11; // rad
const BREATHE = 0.07;
const PHI = (1 + Math.sqrt(5)) / 2;

// in card units u (per second where it's a speed)
const RING_SPEED = 5.5;
const RING_LIFE = 0.8;
const RING_KICK = 3.5; // at birth, linear falloff
const WELL_LIFE = 6;
const WELL_GM = 0.63; // u³/s²
const WELL_SOFT = 0.1; // Plummer softening
const MAX_PLACED = 5;

// Rest pose measured from the recording: radius in card units, angle in degrees (screen y down).
const SEED = [
  { id: 1, r: 0.385, deg: -18 },
  { id: 2, r: 0.152, deg: -135 },
  { id: 3, r: 0.384, deg: 148 },
  { id: 4, r: 0.39, deg: 83 },
  { id: 5, r: 0.123, deg: 30 },
];

const hexRgb = (hex: string) => {
  const n = parseInt(hex.trim().replace("#", ""), 16) || 0;
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

type Node = {
  id: number;
  r: number;
  theta: number;
  f1: number;
  f2: number;
  p1: number;
  p2: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  placed: boolean;
  dying: number; // time it started fading, or -1
};
type Ring = { x: number; y: number; born: number };
type Well = { x: number; y: number; born: number };

const frac = (v: number) => v - Math.floor(v);
const easeOutBack = (t: number) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

function makeNode(id: number, r: number, theta: number, x: number, y: number, now: number, placed: boolean): Node {
  // golden-ratio spaced frequencies and phases: quasi-periodic, never in step with each other
  return {
    id,
    r,
    theta,
    f1: 0.07 + 0.035 * frac(id * PHI),
    f2: 0.1 + 0.05 * frac(id * PHI * PHI),
    p1: 2 * Math.PI * frac(id * PHI * 3),
    p2: 2 * Math.PI * frac(id * PHI * 5),
    x,
    y,
    vx: 0,
    vy: 0,
    born: now,
    placed,
    dying: -1,
  };
}

export default function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const canvas = canvasRef.current;
    const cross = crossRef.current;
    const hero = canvas?.parentElement;
    const fieldEl = hero?.querySelector<HTMLElement>("[data-field]");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !cross || !hero || !fieldEl || !ctx) return;

    const reduced = prefersReducedMotion();
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    // the hero's readouts: the live node count, and the hint that retires once the field has been used
    const readout = hero.querySelector<HTMLElement>("[data-nodes]");
    const hint = hero.querySelector<HTMLElement>("[data-hint]");
    const coords = cross.querySelector<HTMLElement>("[data-cross-label]");
    // the lights switch lives at the origin; it follows the field (intro, resize, scroll-out)
    const anchor = hero.querySelector<HTMLElement>("[data-switch-anchor]");
    const setAnchorX = anchor ? gsap.quickSetter(anchor, "x", "px") : null;
    const setAnchorY = anchor ? gsap.quickSetter(anchor, "y", "px") : null;
    const knobBox = anchor?.firstElementChild as HTMLElement | null;

    // the palette is read from the hero's tokens, so lights-off re-colours the canvas too
    const pal = { ink: "8, 6, 78", label: "#3b3a56" };
    const readPalette = () => {
      const css = getComputedStyle(hero);
      pal.ink = hexRgb(css.getPropertyValue("--color-ink"));
      // labels sit over the photograph's sky, so they take the darker graphite (4.3:1 on the sky's top)
      pal.label = css.getPropertyValue("--color-graphite").trim() || pal.label;
    };
    readPalette();
    const ink = (alpha: number) => `rgba(${pal.ink}, ${alpha})`;
    const mono =
      getComputedStyle(document.documentElement).getPropertyValue("--font-gt-mono").trim() || "ui-monospace, monospace";

    // geometry, in CSS px relative to the hero
    let W = 0;
    let H = 0;
    const field = { x: 0, y: 0, w: 0, h: 0 }; // the card the nodes live in
    let ox = 0;
    let oy = 0;
    let u = 1;

    const state = { spread: reduced ? 1 : 0, presence: 0, time: 0 };
    const pointer = { x: 0, y: 0, inField: false, inHero: false };
    let nodes: Node[] = SEED.map((s) => makeNode(s.id, s.r, (s.deg * Math.PI) / 180, 0, 0, 0, false));
    let nextId = SEED.length + 1;
    const rings: Ring[] = [];
    const wells: Well[] = [];

    // the card can move (intro, scroll-out), so its box is re-read every frame — two rect reads
    const locateField = () => {
      const hr = hero.getBoundingClientRect();
      const fr = fieldEl.getBoundingClientRect();
      field.x = fr.left - hr.left;
      field.y = fr.top - hr.top;
      field.w = fr.width;
      field.h = fr.height;
      ox = field.x + field.w / 2;
      oy = field.y + field.h / 2;
      if (setAnchorX && setAnchorY) {
        setAnchorX(ox);
        setAnchorY(oy);
      }
      // the unit the rest pose is measured in, sized so the labels stay inside the card
      u = Math.min(field.h, field.w * 0.8);
    };
    const measure = () => {
      // the canvas covers the hero's first screen — the field never leaves it
      W = hero.getBoundingClientRect().width;
      H = canvas.clientHeight;
      locateField();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const anchorOf = (n: Node, t: number) => {
      const theta = n.theta + SWAY * Math.sin(2 * Math.PI * n.f1 * t + n.p1);
      const rho = n.r * (1 + BREATHE * Math.sin(2 * Math.PI * n.f2 * t + n.p2)) * u * state.spread;
      return [ox + rho * Math.cos(theta), oy + rho * Math.sin(theta)] as const;
    };

    const wellStrength = (w: Well, t: number) => {
      const age = t - w.born;
      return Math.max(0, Math.min(1, age / 0.4, (WELL_LIFE - age) / 1.5));
    };

    // one fixed physics step
    const integrate = (t: number, dt: number) => {
      const sigma = SIGMA * H;
      const sigma2 = 2 * sigma * sigma;
      const pull = (LEAN * u) / (0.607 * sigma);
      const ringSpeed = RING_SPEED * u;
      const gm = WELL_GM * u * u * u;
      const soft2 = (WELL_SOFT * u) ** 2;
      for (const n of nodes) {
        const [ax, ay] = anchorOf(n, t);
        let tx = ax;
        let ty = ay;
        if (state.presence > 0) {
          const dx = pointer.x - ax;
          const dy = pointer.y - ay;
          const w = pull * state.presence * Math.exp(-(dx * dx + dy * dy) / sigma2);
          tx += dx * w;
          ty += dy * w;
        }
        let fx = K * (tx - n.x) - C * n.vx;
        let fy = K * (ty - n.y) - C * n.vy;
        for (const w of wells) {
          const s = wellStrength(w, t);
          if (s <= 0) continue;
          const dx = w.x - n.x;
          const dy = w.y - n.y;
          const inv = Math.pow(dx * dx + dy * dy + soft2, -1.5);
          fx += gm * s * dx * inv;
          fy += gm * s * dy * inv;
        }
        // ring fronts that swept past this node during the step kick it outward
        for (const r of rings) {
          const age = t - r.born;
          const dx = n.x - r.x;
          const dy = n.y - r.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d > ringSpeed * (age - dt) && d <= ringSpeed * age) {
            const kick = RING_KICK * u * (1 - age / RING_LIFE);
            n.vx += (dx / d) * kick;
            n.vy += (dy / d) * kick;
          }
        }
        n.vx += fx * dt;
        n.vy += fy * dt;
        n.x += n.vx * dt;
        n.y += n.vy * dt;
      }
    };

    const label = (n: Node) => `${n.id}  ${Math.round(n.x - ox)},${Math.round(oy - n.y)}`;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      // fade in with the first quarter of the unfold, so nothing sits on the card before it opens
      const reveal = Math.min(1, state.spread * 4);
      if (reveal <= 0) return;
      ctx.save();
      ctx.globalAlpha = reveal;
      ctx.beginPath();
      ctx.rect(field.x, field.y, field.w, field.h);
      ctx.clip();

      // gravity wells: concentric dashed rings drifting inward
      for (const w of wells) {
        const s = wellStrength(w, t);
        ctx.strokeStyle = ink(0.4 * s);
        ctx.setLineDash([2, 4]);
        ctx.lineDashOffset = t * 18;
        for (const k of [0, 1, 2]) {
          const radius = 12 + ((k * 16 + (1 - frac(t * 0.6)) * 16) % 48);
          ctx.beginPath();
          ctx.arc(w.x, w.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.fillStyle = ink(0.8 * s);
        ctx.fillRect(w.x - 1.5, w.y - 1.5, 3, 3);
      }

      // burst rings
      for (const r of rings) {
        const age = (t - r.born) / RING_LIFE;
        ctx.strokeStyle = ink(0.55 * (1 - age));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, RING_SPEED * u * RING_LIFE * age, 0, Math.PI * 2);
        ctx.stroke();
      }

      // spokes
      ctx.lineWidth = 1;
      for (const n of nodes) {
        const fade = n.dying >= 0 ? Math.max(0, 1 - (t - n.dying) / 0.4) : 1;
        ctx.strokeStyle = ink(0.5 * fade);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }

      // origin: the lights switch sits here (a DOM button over the canvas); only its label is drawn
      const sw = knobBox ? knobBox.offsetWidth / 2 : 7;
      const sh = knobBox ? knobBox.offsetHeight / 2 : 7;
      ctx.font = `10px ${mono}`;
      ctx.textBaseline = "middle";
      ctx.fillStyle = pal.label;
      ctx.fillText("0,0", ox + sw + 8, oy - sh - 6);

      // satellites
      for (const n of nodes) {
        const grow = n.placed ? easeOutBack(Math.min(1, (t - n.born) / 0.5)) : 1;
        const fade = n.dying >= 0 ? Math.max(0, 1 - (t - n.dying) / 0.4) : 1;
        ctx.globalAlpha = fade * reveal;
        ctx.fillStyle = ink(1);
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4 * Math.max(0, grow), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.label;
        // labels sit right of their node, but slide left rather than run off the card
        const text = label(n);
        const lx = Math.min(n.x + 9, field.x + field.w - ctx.measureText(text).width - 6);
        ctx.fillText(text, lx, n.y + 0.5);
      }
      ctx.globalAlpha = reveal;
      ctx.restore();
    };

    // --- clock: fixed-step physics, drawing once per frame
    let acc = 0;
    let visible = true;
    let shownCount = -1;
    const tick = (_time: number, deltaMs: number) => {
      if (!visible) return;
      acc += Math.min(deltaMs / 1000, 0.1);
      while (acc >= STEP) {
        state.time += STEP;
        integrate(state.time, STEP);
        acc -= STEP;
      }
      const t = state.time;
      for (let i = rings.length - 1; i >= 0; i--) if (t - rings[i].born > RING_LIFE) rings.splice(i, 1);
      for (let i = wells.length - 1; i >= 0; i--) if (t - wells[i].born > WELL_LIFE) wells.splice(i, 1);
      nodes = nodes.filter((n) => n.dying < 0 || t - n.dying < 0.4);
      locateField();
      draw(t);
      const live = nodes.reduce((sum, n) => sum + (n.dying < 0 ? 1 : 0), 0);
      if (readout && live !== shownCount) {
        shownCount = live;
        readout.textContent = String(live).padStart(2, "0");
      }
    };

    const settle = () => {
      // reduced motion: place every node at its anchor and draw a still frame
      for (const n of nodes) [n.x, n.y] = anchorOf(n, 0);
      draw(0);
    };

    measure();
    for (const n of nodes) {
      n.x = ox;
      n.y = oy;
    }
    const ro = new ResizeObserver(() => {
      measure();
      if (reduced) settle();
    });
    ro.observe(hero);
    if (reduced) settle();
    else gsap.ticker.add(tick);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(hero);

    // --- interactions: click places a point, double-click bursts a ring, right-click / long-press a well
    const local = (e: PointerEvent | MouseEvent) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const inField = x >= field.x && x <= field.x + field.w && y >= field.y && y <= field.y + field.h;
      return { x, y, inField };
    };

    // the hint has done its job the moment the field is used — fade it out for good
    let hinted = false;
    const used = () => {
      if (hinted || !hint) return;
      hinted = true;
      gsap.to(hint, { autoAlpha: 0, duration: 0.6, ease: "power2.out" });
    };

    const place = (x: number, y: number) => {
      used();
      const node = makeNode(nextId++, Math.hypot(x - ox, y - oy) / u, Math.atan2(y - oy, x - ox), x, y, state.time, true);
      nodes.push(node);
      const placed = nodes.filter((n) => n.placed && n.dying < 0);
      if (placed.length > MAX_PLACED) placed[0].dying = state.time;
      if (reduced) settle();
      return node;
    };
    const burst = (x: number, y: number) => {
      used();
      rings.push({ x, y, born: state.time });
    };
    const well = (x: number, y: number) => {
      used();
      wells.push({ x, y, born: state.time });
      if (wells.length > 3) wells.shift();
    };

    let lastTap: { x: number; y: number; at: number; node: Node } | null = null;
    let press: { x: number; y: number; moved: boolean; held: boolean; timer: number } | null = null;

    // buttons and links in the hero are UI, not field: they never place points
    const onUi = (e: Event) => !!(e.target as Element | null)?.closest?.("[data-ui]");

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || onUi(e)) return;
      const p = local(e);
      if (!p.inField) return;
      press = { x: p.x, y: p.y, moved: false, held: false, timer: 0 };
      if (e.pointerType !== "mouse") {
        const current = press;
        current.timer = window.setTimeout(() => {
          current.held = true;
          well(current.x, current.y);
        }, 520);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.button !== 0) return;
      const { x, y, moved, held, timer } = press;
      window.clearTimeout(timer);
      press = null;
      if (moved || held || reduced) {
        if (reduced && !moved && !held) place(x, y);
        return;
      }
      const now = performance.now();
      if (lastTap && now - lastTap.at < 300 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) {
        // the second tap of a double: take back the point the first one placed, burst instead
        lastTap.node.dying = state.time;
        burst(x, y);
        lastTap = null;
        return;
      }
      lastTap = { x, y, at: now, node: place(x, y) };
    };
    const onContext = (e: MouseEvent) => {
      if (onUi(e)) return;
      const p = local(e);
      if (!p.inField) return;
      e.preventDefault();
      well(p.x, p.y);
    };

    const setX = gsap.quickSetter(cross, "x", "px");
    const setY = gsap.quickSetter(cross, "y", "px");
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      if (press && Math.hypot(p.x - press.x, p.y - press.y) > 8) {
        press.moved = true;
        window.clearTimeout(press.timer);
      }
      pointer.inField = p.inField;
      if (!pointer.inHero) {
        // the field leans toward the cursor anywhere on the hero
        pointer.inHero = true;
        gsap.to(state, { presence: 1, duration: 0.8, ease: "power2.out", overwrite: true });
        if (finePointer && e.pointerType === "mouse") gsap.to(cross, { autoAlpha: 1, duration: 0.2, overwrite: true });
      }
      if (finePointer && e.pointerType === "mouse") {
        setX(p.x);
        setY(p.y);
        // the crosshair reads out its position in the field, or names the control under it
        const ui = (e.target as Element | null)?.closest?.<HTMLElement>("[data-cross]");
        if (coords) {
          coords.textContent = ui ? (ui.dataset.cross ?? "") : p.inField ? `${Math.round(p.x - ox)},${Math.round(oy - p.y)}` : "";
        }
        cross.dataset.hot = ui ? "true" : "false";
      }
    };
    const onLeave = () => {
      pointer.inHero = false;
      pointer.inField = false;
      gsap.to(state, { presence: 0, duration: 0.8, ease: "power2.out", overwrite: true });
      gsap.to(cross, { autoAlpha: 0, duration: 0.2, overwrite: true });
    };

    const onReset = () => {
      for (const n of nodes) if (n.placed && n.dying < 0) n.dying = state.time;
      wells.length = 0;
      rings.push({ x: ox, y: oy, born: state.time });
      if (reduced) settle();
    };
    const onLights = () => {
      readPalette();
      rings.push({ x: ox, y: oy, born: state.time });
      if (reduced) settle();
    };
    hero.addEventListener("hero:reset", onReset);
    hero.addEventListener("hero:lights", onLights);

    hero.addEventListener("pointerdown", onDown);
    hero.addEventListener("pointerup", onUp);
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("contextmenu", onContext);

    // intro: once the card has opened, the field unfolds from the origin; the springs add the settle
    if (!reduced) gsap.to(state, { spread: 1, duration: 1.4, ease: MENU_EASE, delay: 0.95 });

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      if (press) window.clearTimeout(press.timer);
      hero.removeEventListener("pointerdown", onDown);
      hero.removeEventListener("pointerup", onUp);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("contextmenu", onContext);
      hero.removeEventListener("hero:reset", onReset);
      hero.removeEventListener("hero:lights", onLights);
    };
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        data-field-canvas
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[max(100svh,600px)] w-full"
      />
      {/* the recording's "+" cursor, reading out its own position inside the field */}
      <div
        ref={crossRef}
        aria-hidden
        data-hot="false"
        className="group pointer-events-none invisible absolute left-0 top-0 z-40 opacity-0 mix-blend-difference"
      >
        {/* over a control the mark turns a quarter and grows, and its name drops clear of the control */}
        <span className="absolute left-0 top-0 block transition-transform duration-300 ease-prime group-data-[hot=true]:rotate-90 group-data-[hot=true]:scale-150">
          <span className="absolute -left-[12px] -top-px h-[1.5px] w-6 bg-white" />
          <span className="absolute -left-px -top-[12px] h-6 w-[1.5px] bg-white" />
        </span>
        <span
          data-cross-label
          className="absolute left-[15px] top-[7px] whitespace-nowrap font-mono text-[10px] uppercase tabular-nums tracking-[0.08em] text-white transition-transform duration-300 ease-prime group-data-[hot=true]:translate-x-[18px] group-data-[hot=true]:translate-y-[24px]"
        />
      </div>
    </>
  );
}
