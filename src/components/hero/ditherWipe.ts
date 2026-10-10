import { gsap } from "@/lib/gsap";
import { THRESHOLD as TH } from "@/lib/bayer";

/*
 * The studio's dither wipe — the same transition as the intro reel, on the 4×4 Bayer tile (5.png).
 * A front travels out from the origin (distance to the switch, with a 48 px block jitter so it reads
 * digital): an accent edge leads, the new ground follows and covers; the palette swaps under full
 * cover; then the front keeps travelling and uncovers the new state with the same accent edge.
 */
const CELL = 8; // CSS px per dot
const BLOCK = 48; // CSS px of the front's jitter
const SOFT = 0.12; // width of the dithered falloff at the front
const BAND = 0.14; // width of the accent edge

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const rgb = (color: string) => {
  const m = color.trim().match(/^#([0-9a-f]{6})$/i);
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

type Wipe = {
  canvas: HTMLCanvasElement;
  /** origin, in CSS px relative to the canvas */
  x: number;
  y: number;
  /** the incoming ground and the leading edge, as #rrggbb */
  ground: string;
  edge: string;
  /** called once, under full cover — swap the state here */
  onCover: () => void;
};

export function ditherWipe({ canvas, x, y, ground, edge, onCover }: Wipe) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    onCover();
    return Promise.resolve();
  }
  const img = ctx.createImageData(cols, rows);
  const data = img.data;
  const [gr, gg, gb] = rgb(ground);
  const [er, eg, eb] = rgb(edge);

  // every dot's place along the front, 0 at the switch, 1 at the farthest corner
  const far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
  const along = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) * CELL;
      const cy = (j + 0.5) * CELL;
      along[j * cols + i] =
        0.86 * (Math.hypot(cx - x, cy - y) / far) + 0.14 * hash(Math.floor(cx / BLOCK), Math.floor(cy / BLOCK));
    }
  }

  const front = { cover: 0, clear: -0.5 };
  const draw = () => {
    for (let j = 0; j < rows; j++) {
      const th = TH[j & 3];
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const g = along[k];
        const t = th[i & 3];
        const ground = Math.min(clamp01((front.cover - BAND - g) / SOFT), clamp01((g - front.clear - BAND) / SOFT));
        const lit = Math.min(clamp01((front.cover - g) / SOFT), clamp01((g - front.clear) / SOFT));
        const p = k * 4;
        if (ground > t) {
          data[p] = gr;
          data[p + 1] = gg;
          data[p + 2] = gb;
          data[p + 3] = 255;
        } else if (lit > t) {
          data[p] = er;
          data[p + 1] = eg;
          data[p + 2] = eb;
          data[p + 3] = 255;
        } else {
          data[p + 3] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  canvas.style.visibility = "visible";
  return new Promise<void>((resolve) => {
    gsap
      .timeline({
        onUpdate: draw,
        onComplete: () => {
          ctx.clearRect(0, 0, cols, rows);
          canvas.style.visibility = "hidden";
          resolve();
        },
      })
      .to(front, { cover: 1 + BAND + SOFT + 0.02, duration: 0.38, ease: "power2.in" })
      .call(onCover)
      .to(front, { clear: 1.02, duration: 0.56, ease: "power3.out" });
  });
}
