import { useLayoutEffect, useRef } from "react";
import { LAND_DOTS } from "./land";
import { A, SANS, clamp01, lerp } from "./time";

/*
 * The /about globe, drawn per frame for the film: land in the site's fine ordered dither (2 px
 * squares, Bayer 8×8), dense where it faces the camera and thinning to the limb, the far side a
 * sparse scatter seen through; a graticule of hairlines; and an SVG layer for the nodes and the
 * great-circle arcs from Hyderabad — gradient stroke on a white keyline, a pulse riding each one,
 * a pill for each city.
 *
 * Orthographic: a view (lat, lon) is the point at the centre of the disc.
 */
export const HOME = { name: "Hyderabad", lat: 17.385, lon: 78.4867 };
const D2R = Math.PI / 180;
const SQ = 2; // px per dither square
const INK = [8, 6, 78];

// the land as an equirectangular mask (1024 × 512), drawn from the baked land dots and softened
let MASK = null;
function landMask() {
  if (MASK) return MASK;
  const W = 1024;
  const H = 512;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  const bytes = Uint8Array.from(atob(LAND_DOTS), (c) => c.charCodeAt(0));
  const pairs = new Int16Array(bytes.buffer);
  for (let i = 0; i < pairs.length / 2; i++) {
    const lat = pairs[i * 2] / 100;
    const lon = pairs[i * 2 + 1] / 100;
    const h = (1.6 / 180) * H;
    const w = Math.min(W / 8, h / Math.max(0.2, Math.cos(lat * D2R)));
    ctx.fillRect(((lon + 180) / 360) * W - w / 2, ((90 - lat) / 180) * H - h / 2, w, h);
  }
  // soften once, as a whole (a filter on every square would blur 5,500 draws)
  const soft = document.createElement("canvas");
  soft.width = W;
  soft.height = H;
  const sctx = soft.getContext("2d");
  sctx.filter = "blur(1.4px)";
  sctx.drawImage(cv, 0, 0);
  const data = sctx.getImageData(0, 0, W, H).data;
  const m = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = data[i * 4] / 255;
  MASK = { m, W, H };
  return MASK;
}

const B8 = (() => {
  const b2 = [
    [0, 2],
    [3, 1],
  ];
  const out = [];
  for (let y = 0; y < 8; y++) {
    const row = [];
    for (let x = 0; x < 8; x++) {
      const v = 16 * b2[y & 1][x & 1] + 4 * b2[(y >> 1) & 1][(x >> 1) & 1] + b2[(y >> 2) & 1][(x >> 2) & 1];
      row.push((v + 0.5) / 64);
    }
    out.push(row);
  }
  return out;
})();

const smooth = (a, b, x) => {
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/** local lat/lon → unit vector (lon 0 faces the camera when the view is 0,0) */
export const toVec = (lat, lon) => {
  const φ = lat * D2R;
  const λ = lon * D2R;
  return [Math.cos(φ) * Math.sin(λ), Math.sin(φ), Math.cos(φ) * Math.cos(λ)];
};
/** local → camera space, for a view centred on (lat0, lon0) */
export function toCam([x, y, z], view) {
  const b = -view.lon * D2R; // Ry(−λ0)
  const x1 = x * Math.cos(b) + z * Math.sin(b);
  const z1 = -x * Math.sin(b) + z * Math.cos(b);
  const a = view.lat * D2R; // Rx(φ0)
  return [x1, y * Math.cos(a) - z1 * Math.sin(a), y * Math.sin(a) + z1 * Math.cos(a)];
}
/** camera → local (the inverse) */
function toLocal(x, y, z, view) {
  const a = -view.lat * D2R;
  const y1 = y * Math.cos(a) - z * Math.sin(a);
  const z1 = y * Math.sin(a) + z * Math.cos(a);
  const b = view.lon * D2R;
  return [x * Math.cos(b) + z1 * Math.sin(b), y1, -x * Math.sin(b) + z1 * Math.cos(b)];
}
function landAt(lx, ly, lz) {
  const { m, W, H } = MASK;
  const lat = Math.asin(Math.max(-1, Math.min(1, ly)));
  const lon = Math.atan2(lx, lz);
  const u = ((lon / (2 * Math.PI) + 0.5) * W) | 0;
  const v = ((0.5 - lat / Math.PI) * H) | 0;
  return m[Math.min(H - 1, Math.max(0, v)) * W + (((u % W) + W) % W)];
}

export const angleBetween = (a, b) => {
  const va = toVec(a.lat, a.lon);
  const vb = toVec(b.lat, b.lon);
  return Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
};
export const km = (a, b) => Math.round(angleBetween(a, b) * 6371);

/** points along the great circle a → b, lifted off the surface in an arch */
function arcPoints(a, b, n = 64) {
  const va = toVec(a.lat, a.lon);
  const vb = toVec(b.lat, b.lon);
  const ω = angleBetween(a, b);
  const lift = 0.06 + 0.22 * (ω / Math.PI);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const k1 = Math.sin((1 - s) * ω) / Math.sin(ω);
    const k2 = Math.sin(s * ω) / Math.sin(ω);
    const r = 1 + lift * Math.sin(Math.PI * s);
    pts.push([(va[0] * k1 + vb[0] * k2) * r, (va[1] * k1 + vb[1] * k2) * r, (va[2] * k1 + vb[2] * k2) * r]);
  }
  return pts;
}

/**
 * view: { lat, lon };  size: disc diameter (px);  routes: [{ to, draw 0..1, pulse 0..1, label 0..1 }];
 * home: 0..1 (the Hyderabad node);  reveal: 0..1 (the land grain fills in from the centre)
 */
export function Globe({ view, size = 860, cx = 540, cy = 980, routes = [], home = 1, reveal = 1, rings = 0, time = 0 }) {
  const ref = useRef(null);
  const R = size / 2;
  const N = Math.round(size / SQ);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    landMask();
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(N, N);
    const buf = new Uint32Array(img.data.buffer);
    const ink = (255 << 24) | (INK[2] << 16) | (INK[1] << 8) | INK[0];
    for (let j = 0; j < N; j++) {
      const y = 1 - ((j + 0.5) / N) * 2;
      for (let i = 0; i < N; i++) {
        const x = ((i + 0.5) / N) * 2 - 1;
        const r2 = x * x + y * y;
        if (r2 >= 1) continue;
        // the grain fills in from the centre out
        if (Math.sqrt(r2) > reveal * 1.25 - 0.05 * B8[j & 7][i & 7]) continue;
        const z = Math.sqrt(1 - r2);
        const th = B8[j & 7][i & 7];
        const f = toLocal(x, y, z, view);
        const front = landAt(f[0], f[1], f[2]);
        let v = smooth(0.25, 0.65, front) * (0.1 + 0.68 * smooth(-0.15, 0.7, z));
        if (v <= th) {
          const b = toLocal(x, y, -z, view);
          v = smooth(0.25, 0.65, landAt(b[0], b[1], b[2])) * 0.1;
        }
        if (v > th) buf[j * N + i] = ink;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [view.lat, view.lon, N, reveal]);

  const project = (v) => {
    const [x, y, z] = toCam(v, view);
    return { x: cx + x * R, y: cy - y * R, z, hidden: z < 0 && x * x + y * y < 1 };
  };

  // graticule as SVG hairlines, faded by facing
  const grat = [];
  const seg = (a, b, key) => {
    const pa = project(a);
    const pb = project(b);
    const zf = (pa.z + pb.z) / 2;
    grat.push(
      <line key={key} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={A.ink} strokeWidth={1.2} strokeOpacity={lerp(0.035, 0.2, smooth(-0.15, 0.35, zf)) * reveal} />,
    );
  };
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = -180; lon < 180; lon += 6) seg(toVec(lat, lon), toVec(lat, lon + 6), `a${lat}_${lon}`);
  for (let lon = -180; lon < 180; lon += 30) for (let lat = -84; lat < 84; lat += 6) seg(toVec(lat, lon), toVec(lat + 6, lon), `o${lon}_${lat}`);

  const hp = project(toVec(HOME.lat, HOME.lon));
  const homeO = home * clamp01(hp.z / 0.25 + 0.2);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={ref}
        width={N}
        height={N}
        style={{ position: "absolute", left: cx - R, top: cy - R, width: size, height: size, imageRendering: "pixelated" }}
      />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          {routes.map((r, i) => {
            const a = project(toVec(HOME.lat, HOME.lon));
            const b = project(toVec(r.to.lat, r.to.lon));
            return (
              <linearGradient key={i} id={`arc${i}`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
                <stop offset="0" stopColor={A.accent} />
                <stop offset="1" stopColor={A.ink} />
              </linearGradient>
            );
          })}
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={A.ink} strokeOpacity={0.14 * reveal} strokeWidth={1.5} />
        {grat}
        {routes.map((r, i) => {
          const pts = arcPoints(HOME, r.to).map(project);
          const n = pts.length - 1;
          const upto = Math.round(n * clamp01(r.draw));
          if (upto < 1) return null;
          // split the drawn part into visible runs (the globe hides what passes behind it)
          const runs = [];
          let cur = [];
          for (let k = 0; k <= upto; k++) {
            if (pts[k].hidden) {
              if (cur.length > 1) runs.push(cur);
              cur = [];
            } else cur.push(pts[k]);
          }
          if (cur.length > 1) runs.push(cur);
          const d = runs.map((run) => "M" + run.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("L")).join(" ");
          const pk = Math.min(upto, Math.round(n * clamp01(r.pulse)));
          const pp = pts[pk];
          const end = pts[n];
          const endO = r.draw >= 1 ? clamp01(end.z / 0.25 + 0.3) : 0;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
              <path d={d} fill="none" stroke={`url(#arc${i})`} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
              {r.pulse > 0 && r.pulse < 1 && !pp.hidden && (
                <>
                  <circle cx={pp.x} cy={pp.y} r={14} fill={A.accent} fillOpacity={0.18} />
                  <circle cx={pp.x} cy={pp.y} r={5.5} fill={A.accent} stroke="#fff" strokeWidth={2.4} />
                </>
              )}
              <g transform={`translate(${end.x} ${end.y})`} opacity={endO}>
                {r.label > 0 && r.label < 1 && <circle r={10 + 46 * r.label} fill="none" stroke={A.accent} strokeWidth={3} opacity={1 - r.label} />}
                <circle r={8.5} fill="#ffffff" stroke={A.accent} strokeWidth={3.4} />
                <circle r={2.8} fill={A.ink} />
                <g opacity={clamp01(r.label)} transform={`translate(0 ${(1 - clamp01(r.label)) * 8})`}>
                  <path d="M7 -7L20 -20" stroke={A.ink} strokeOpacity={0.5} strokeWidth={1.5} />
                  <rect x={20} y={-56} height={40} width={r.to.name.length * 13.2 + 32} rx={20} fill="#ffffff" stroke={A.ink} strokeOpacity={0.15} strokeWidth={1.5} />
                  <text x={36} y={-29} fill={A.ink} style={{ fontFamily: SANS, fontWeight: 500, fontSize: 23, letterSpacing: "-0.01em" }}>
                    {r.to.name}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
        {/* Hyderabad: rings breathing out from a blue core, its name in a pill on a leader line */}
        <g transform={`translate(${hp.x} ${hp.y})`} opacity={homeO}>
          {[0, 0.5].map((off) => {
            const k = (time * 0.8 + off) % 1;
            return <circle key={off} r={8 + 26 * k} fill="none" stroke={A.accent} strokeWidth={2} opacity={rings * 0.6 * (1 - k)} />;
          })}
          <circle r={9} fill={A.accent} stroke="#ffffff" strokeWidth={3.2} transform={`scale(${lerp(0.4, 1, home)})`} />
          <circle r={2.6} fill="#ffffff" />
          <path d="M8 -8L22 -22" stroke={A.ink} strokeOpacity={0.5} strokeWidth={1.5} />
          <rect x={22} y={-60} height={44} width={162} rx={22} fill="#ffffff" stroke={A.ink} strokeOpacity={0.15} strokeWidth={1.5} />
          <text x={40} y={-31} fill={A.ink} style={{ fontFamily: SANS, fontWeight: 500, fontSize: 26, letterSpacing: "-0.01em" }}>
            Hyderabad
          </text>
        </g>
      </svg>
    </div>
  );
}
