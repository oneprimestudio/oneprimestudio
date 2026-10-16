"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { Shot, Work } from "@/lib/work";

/*
 * The pieces the work is shown with, shared by the /projects index and each case page (/projects/[slug]):
 * the type tokens, a project's 4:5 card, its 16:9 cover, and one of its shots in a frame.
 */

export const label = "font-mono text-[10px] uppercase tracking-[0.14em] md:text-[11px]";
export const display = "font-normal tracking-[-0.045em]";
export const pad = (n: number) => String(n).padStart(2, "0");
export const shadow = "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]";

export function Bullet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`${label} flex items-center gap-2.5 text-ink ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
      {children}
    </p>
  );
}

/** text that rolls in from below whenever what it shows changes: `id` keys it; the page plays `data-swap` */
export function Swap({ id, className = "", children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <span key={id} data-swap className="block">
        {children}
      </span>
    </span>
  );
}

export const cardSizes = "(min-width: 1024px) 31vw, (min-width: 768px) 46vw, 92vw";
/** a project's 4:5 card and 16:9 cover: composed presentations of the live work (a phone, a browser window) */
export const cardSrc = (work: Work) => `/images/work/cards/${work.slug}.webp`;
export const coverSrc = (work: Work) => `/images/work/covers/${work.slug}.webp`;

/** what a card shows for each project, composed for 4:5 */
export function CardMedia({ work, sizes = cardSizes }: { work: Work; sizes?: string }) {
  return <Image src={cardSrc(work)} alt={`${work.title}: ${work.tag}`} fill sizes={sizes} className="object-cover" />;
}

/** a project's cover: 16:9 from md, its 4:5 card on a phone */
export function Cover({ work, sizes = "100vw", priority = false }: { work: Work; sizes?: string; priority?: boolean }) {
  return (
    <>
      <Image src={coverSrc(work)} alt={`${work.title}: ${work.tag}`} fill priority={priority} sizes={sizes} className="hidden object-cover md:block" />
      <Image src={cardSrc(work)} alt={`${work.title}: ${work.tag}`} fill priority={priority} sizes="100vw" className="object-cover md:hidden" />
    </>
  );
}

const RATIO: Record<Shot["ratio"], string> = { "16/10": "aspect-[16/10]", "4/5": "aspect-[4/5]", "900/580": "aspect-[900/580]" };

/** one of a case's pictures, in its frame: it opens through the mask as it scrolls in (`data-shot`) */
export function ShotFrame({ shot, n, canvas }: { shot: Shot; n: string; canvas: string }) {
  return (
    <figure data-shot className="group">
      <div data-shot-mask className={`relative overflow-hidden ${RATIO[shot.ratio]}`} style={{ background: canvas }}>
        <div data-shot-media className="absolute inset-0">
          {shot.video ? (
            <video
              src={shot.video}
              poster={shot.src}
              aria-label={shot.alt}
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={shot.src}
              alt={shot.alt}
              fill
              sizes="(min-width: 768px) 34vw, 92vw"
              className="object-cover object-top transition-transform duration-[1200ms] ease-prime group-hover:scale-[1.03]"
            />
          )}
        </div>
      </div>
      <figcaption className={`${label} mt-3 flex justify-between gap-4 text-stone`}>
        <span>Fig. {n}</span>
        <span className="text-right">{shot.caption}</span>
      </figcaption>
    </figure>
  );
}
