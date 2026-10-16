"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import type { Shot, Work } from "@/lib/work";

/*
 * The pieces the work is shown with, shared by the /projects index and each case page (/projects/[slug]):
 * the type tokens, a project's 4:5 card picture, its cover, and one of its shots in a frame.
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

const C = "/images/work/clients";
/** the captures of a project's live site, by the prefix their files share */
const CAPTURED: Record<string, string> = { jeeva: "jeeva", maera: "maera", netha: "netha", site: "own" };

/** a project whose own screens are still to come: its canvas, a phone's outline and a plain note */
function Pending({ work, big = false }: { work: Work; big?: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div
        className={`relative flex aspect-[9/19] flex-col items-center justify-center rounded-[28px] border border-white/25 text-center text-white ${
          big ? "h-[78%]" : "h-[70%]"
        }`}
      >
        <span aria-hidden className="absolute top-3 h-1.5 w-10 rounded-full bg-white/25" />
        <span className="text-[clamp(1.25rem,2vw,2rem)] font-medium leading-none tracking-[-0.04em]">{work.title}</span>
        <span className={`${label} mt-3 text-white/60`}>Screens soon</span>
      </div>
    </div>
  );
}

export const cardSizes = "(min-width: 1024px) 31vw, (min-width: 768px) 46vw, 92vw";

/** what a grid card shows for each project, composed for 4:5 */
export function CardMedia({ work }: { work: Work }) {
  if (work.pending) return <Pending work={work} />;
  const prefix = CAPTURED[work.slug];
  if (prefix)
    return (
      <Image
        src={`${C}/${prefix}-card.webp`}
        alt={`${work.title}, on a phone`}
        fill
        sizes={cardSizes}
        className="object-cover object-top"
      />
    );
  switch (work.slug) {
    case "identity":
      return <Image src="/images/work/slide-logo.jpg" alt="The One Prime mark, from the studio's launch posts" fill sizes={cardSizes} className="object-cover" />;
    default:
      return (
        <video
          src="/videos/oneprime-logo-intro-540.mp4"
          poster="/images/work/film-04.jpg"
          aria-label="The One Prime logo film"
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      );
  }
}

/**
 * A case page's cover: the project at full width (4:5 on a phone, 16:9 from md) — the live site's first
 * screen where there is one. The page settles its `data-cover-media` layer from a slight zoom.
 */
export function Cover({ work }: { work: Work }) {
  if (work.pending) return <Pending work={work} big />;
  const prefix = CAPTURED[work.slug];
  if (prefix)
    return (
      <>
        <Image
          src={`${C}/${prefix}-cover.webp`}
          alt={`${work.title}: the first screen`}
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-top md:block"
        />
        <Image
          src={`${C}/${prefix}-card.webp`}
          alt={`${work.title}: the first screen, on a phone`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-top md:hidden"
        />
      </>
    );
  switch (work.slug) {
    case "identity":
      return (
        <>
          {/* the launch post as a field of colour only: blurred past reading, so its own wordmark can't echo */}
          <Image src="/images/work/slide-logo.jpg" alt="" fill priority sizes="100vw" className="scale-110 object-cover opacity-35 blur-[18px]" />
          <div className="absolute inset-0 grid place-items-center text-chalk">
            <Logo markOnly className="text-[clamp(6rem,18vw,18rem)]" />
          </div>
        </>
      );
    default:
      // the film in the middle, two of its frames either side
      return (
        <div className="absolute inset-0 flex items-center justify-center gap-[3%]">
          <div className="relative hidden aspect-[9/16] h-[72%] overflow-hidden rounded-[10px] opacity-50 md:block">
            <Image src="/images/work/film-01.jpg" alt="" fill sizes="20vw" className="object-cover" />
          </div>
          <div className="relative aspect-[9/16] h-[84%] overflow-hidden rounded-[10px] ring-1 ring-white/10">
            <video
              src="/videos/oneprime-logo-intro-540.mp4"
              poster="/images/work/film-04.jpg"
              aria-label="The One Prime logo film"
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative hidden aspect-[9/16] h-[72%] overflow-hidden rounded-[10px] opacity-50 md:block">
            <Image src="/images/work/film-03.jpg" alt="" fill sizes="20vw" className="object-cover" />
          </div>
        </div>
      );
  }
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
