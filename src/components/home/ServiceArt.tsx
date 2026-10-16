import type { ReactNode } from "react";

export type ArtKind = "screen" | "bag" | "cart" | "chart" | "layers" | "pen";

/*
 * Hand-drawn line art for the service cards, in the manner of the reference doodles: one weight of
 * round-capped line, dotted circles, little faces. Services.tsx animates it through data attributes —
 *   data-draw          strokes that draw themselves in when the row arrives (pathLength 1)
 *   data-h             moves on hover: data-hx / data-hy (px), data-hr (deg), data-hs (scale),
 *                      data-hsy (scaleY), data-hd (delay, s), data-o (transform origin)
 *   data-pop           hidden at rest, pops in on hover
 *   data-fill          solid fill that floods in on hover
 *   data-redraw        strokes that draw again on hover
 */

const draw = { "data-draw": "", pathLength: 1 } as const;
const dotted = { strokeDasharray: "2 3.2", strokeWidth: 1.3 } as const;
const Dot = ({ x, y, r = 1.5 }: { x: number; y: number; r?: number }) => (
  <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
);

const ART: Record<ArtKind, ReactNode> = {
  // Custom UI/UX — a window with a face in it; the cursor travels over and presses the button
  screen: (
    <>
      <rect {...draw} x="10" y="10" width="90" height="64" rx="6" />
      <path {...draw} d="M10 22h90" />
      <Dot x={17} y={16} r={1.3} />
      <Dot x={22.5} y={16} r={1.3} />
      <Dot x={28} y={16} r={1.3} />
      <path {...draw} d="M21 35h28M21 43h20" />
      <circle data-pop cx="34" cy="58" r="14" {...dotted} />
      <g data-h data-hs="0.92" data-hd="0.42">
        <rect data-fill x="21" y="53" width="26" height="10" rx="5" fill="currentColor" fillOpacity="0" stroke="none" />
        <rect {...draw} x="21" y="53" width="26" height="10" rx="5" />
      </g>
      <g data-h data-hr="-14" data-hy="-2" data-hd="0.1">
        <circle {...draw} cx="78" cy="45" r="11" />
        <Dot x={74.5} y={42.5} />
        <Dot x={81.5} y={42.5} />
        <path {...draw} d="M73.5 48.5q4.5 4.2 9 0" />
      </g>
      <g data-h data-hx="-58" data-hy="-24">
        <path {...draw} d="M92 82v15l4.2-4 4.4 7.2 2.8-1.5-4.2-7.1 6-.4z" fill="#fff" />
      </g>
    </>
  ),

  // Custom Shopify — a bag with a face, lifted by its handle; the price tag swings
  bag: (
    <>
      <g data-pop>
        <path d="M18 22l-6-6M13 32H5M26 14V6" />
      </g>
      <path {...draw} d="M68 31Q86 14 99 27" />
      <g data-h data-hr="18" data-o="50% 0%" data-hd="0.06">
        <path {...draw} d="M93 27h12v15l-6 6-6-6z" />
        <circle cx="99" cy="32" r="1.6" />
      </g>
      <g data-h data-hy="-7" data-hr="-5" data-o="50% 100%">
        <path {...draw} d="M44 39v-7a12 12 0 0 1 24 0v7" />
        <path {...draw} d="M30 39h52l6 48H24z" />
        <Dot x={48} y={56} />
        <Dot x={64} y={56} />
        <path {...draw} d="M48 64q8 7 16 0" />
      </g>
      <circle data-pop cx="102" cy="78" r="8" {...dotted} />
    </>
  ),

  // E-Commerce — a loaded cart that rolls forward; the boxes hop, the wheels turn
  cart: (
    <>
      <g data-pop>
        <path d="M2 46h9M0 54h6M4 62h8" />
      </g>
      <g data-h data-hx="12">
        <g data-h data-hy="-10" data-hr="-8" data-hd="0.05">
          <rect {...draw} x="34" y="13" width="18" height="21" />
          <path {...draw} d="M40 13v21M46 13v21" />
        </g>
        <g data-h data-hy="-16" data-hr="12" data-hd="0.12">
          <rect {...draw} x="56" y="18" width="21" height="16" />
          <path {...draw} d="M56 26h21" />
        </g>
        <path {...draw} d="M6 22h12l10 44h56" />
        <path {...draw} d="M21 34h76l-8 22H26" />
        <g data-h data-hr="240">
          <circle {...draw} cx="36" cy="73" r="6" />
          <path d="M36 68v10" />
        </g>
        <g data-h data-hr="240">
          <circle {...draw} cx="78" cy="73" r="6" />
          <path d="M78 68v10" />
        </g>
        <path d="M4 86h10M22 86h48M78 86h22" {...dotted} />
      </g>
    </>
  ),

  // CRM & ERP — a dashboard whose bars rise and whose trend line draws again
  chart: (
    <>
      <rect {...draw} x="8" y="8" width="104" height="80" rx="5" />
      <path {...draw} d="M18 20h20" />
      <Dot x={100} y={20} r={1.3} />
      <Dot x={94} y={20} r={1.3} />
      <path {...draw} d="M20 76h80" />
      <rect {...draw} data-h data-hsy="1.7" data-o="50% 100%" x="27" y="62" width="9" height="14" />
      <rect {...draw} data-h data-hsy="1.3" data-o="50% 100%" data-hd="0.04" x="43" y="52" width="9" height="24" />
      <rect {...draw} data-h data-hsy="1.9" data-o="50% 100%" data-hd="0.08" x="59" y="58" width="9" height="18" />
      <rect {...draw} data-h data-hsy="1.4" data-o="50% 100%" data-hd="0.12" x="75" y="46" width="9" height="30" />
      <path {...draw} data-redraw d="M24 46l16-10 16 6 34-22" />
      <Dot x={90} y={20} r={2.2} />
      <circle data-pop cx="90" cy="20" r="7.5" {...dotted} />
    </>
  ),

  // SaaS Products — a stack of layers with a face on top; hovering opens the stack
  layers: (
    <>
      <g data-pop>
        <path d="M100 12l5-5M104 22h8M92 7V0" />
      </g>
      <path {...draw} d="M24 62l36 16 36-16" />
      <g data-h data-hy="-7" data-hd="0.05">
        <path {...draw} d="M24 48l36 16 36-16" />
      </g>
      <g data-h data-hy="-15" data-hr="-3">
        <path {...draw} d="M60 16l36 16-36 16-36-16z" />
        <Dot x={54} y={29} />
        <Dot x={66} y={29} />
        <path {...draw} d="M55 34.5q5 4 10 0" />
      </g>
      <circle data-pop cx="16" cy="22" r="7" {...dotted} />
    </>
  ),

  // Brand & Logo Identity — a bezier with its handles; the pencil leans in and the curve draws again
  pen: (
    <>
      <path d="M12 80L28 28M94 38L64 92" {...dotted} />
      <path {...draw} data-redraw d="M12 80C28 28 64 92 94 38" />
      <rect data-h data-hs="1.5" x="25.5" y="25.5" width="5" height="5" fill="#fff" />
      <rect data-h data-hs="1.5" data-hd="0.06" x="61.5" y="89.5" width="5" height="5" fill="#fff" />
      <circle cx="12" cy="80" r="2.6" fill="#fff" />
      <g transform="translate(94 38) rotate(32)">
        <g data-h data-hr="-16" data-o="50% 100%">
          <path {...draw} d="M-5.5-11V-44h11V-11" />
          <path {...draw} d="M-5.5-11L0 0l5.5-11" />
          <path {...draw} d="M-5.5-37h11" />
          <path d="M-1.8-3.6L0 0l1.8-3.6z" fill="currentColor" />
        </g>
      </g>
      <circle data-pop cx="12" cy="80" r="8" {...dotted} />
    </>
  ),
};

export default function ServiceArt({ kind, className = "" }: { kind: ArtKind; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`overflow-visible ${className}`}
    >
      {ART[kind]}
    </svg>
  );
}
