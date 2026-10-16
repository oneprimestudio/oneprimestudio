"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import DitherReveal from "@/components/DitherReveal";
import Logo from "@/components/Logo";
import { THRESHOLD } from "@/lib/bayer";
import type { Work } from "@/lib/work";

/*
 * The pieces the work is shown with, shared by the /projects index and each case page (/projects/[slug]):
 * the type tokens, the spec-sheet figures (numbered, measured by a ruler, assembling out of the seams'
 * dots as they arrive), and what a 4:5 card or a case's cover shows for each project.
 */

export const label = "font-mono text-[10px] uppercase tracking-[0.14em] md:text-[11px]";
export const display = "font-normal tracking-[-0.045em]";
export const pad = (n: number) => String(n).padStart(2, "0");

export function Bullet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`${label} flex items-center gap-2.5 text-ink ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
      {children}
    </p>
  );
}

/** a hairline with a tick every tenth, the long ones every half: the figures' measure */
export function Ruler() {
  return (
    <div data-ruler aria-hidden className="relative mb-2.5 flex h-[7px] origin-left items-end justify-between">
      <span className="absolute inset-x-0 bottom-0 h-px bg-ink/20" />
      {Array.from({ length: 11 }, (_, i) => (
        <span key={i} className={`w-px bg-ink/30 ${i % 5 === 0 ? "h-[7px]" : "h-[4px]"}`} />
      ))}
    </div>
  );
}

export function Figure({
  n,
  caption,
  dims,
  className = "",
  frame,
  frameStyle,
  children,
}: {
  n: string;
  caption: string;
  dims?: string;
  className?: string;
  frame: string;
  frameStyle?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <figure className={`group ${className}`}>
      <figcaption className={`${label} mb-3 flex items-end justify-between gap-4 text-stone`}>
        <span data-hover-scramble>
          {dims ? `Fig. ${n} — ${caption}` : `${n} · ${caption}`}
        </span>
        {dims && <span className="shrink-0 tabular-nums">{dims}</span>}
      </figcaption>
      <Ruler />
      <DitherReveal className={frame}>
        <div className="absolute inset-0" style={frameStyle}>
          {children}
        </div>
      </DitherReveal>
    </figure>
  );
}

export const shadow = "shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]";

/** Fig. 3.2: the dot itself — the 4 × 4 Bayer ranks, each cell as dark as its turn comes late */
export function BayerDiagram() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-[12%] h-[76%] w-[76%] text-ink" aria-hidden>
      {THRESHOLD.map((row, j) =>
        row.map((t, i) => (
          <g key={`${i}-${j}`}>
            <rect
              x={i * 50 + 1}
              y={j * 50 + 1}
              width={48}
              height={48}
              fill="currentColor"
              fillOpacity={0.06 + t * 0.9}
            />
            <text
              x={i * 50 + 25}
              y={j * 50 + 29}
              textAnchor="middle"
              className="font-mono"
              fontSize={11}
              fill={t > 0.5 ? "#f9f9f7" : "currentColor"}
            >
              {Math.round(t * 16 - 0.5)}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}

/** Fig. 3.3: the one curve every move runs on, with its handles */
export function CurveDiagram() {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-[12%] h-[76%] w-[76%] overflow-visible text-ink" aria-hidden>
      <path d="M0 200H200V0" fill="none" stroke="currentColor" strokeOpacity={0.15} />
      <path d="M0 200L174 200M200 0L26 0" fill="none" stroke="currentColor" strokeOpacity={0.35} strokeDasharray="2 3" />
      <path data-curve d="M0 200C174 200 26 0 200 0" fill="none" stroke="currentColor" strokeWidth={2} pathLength={1} />
      <circle cx={174} cy={200} r={4} fill="#f9f9f7" stroke="currentColor" />
      <circle cx={26} cy={0} r={4} fill="#f9f9f7" stroke="currentColor" />
      <circle cx={0} cy={200} r={3} fill="currentColor" />
      <circle cx={200} cy={0} r={3} fill="currentColor" />
    </svg>
  );
}

/** each project's figures, in its own arrangement */
export function Figures({ work, n }: { work: Work; n: number }) {
  switch (work.slug) {
    case "maera":
      return (
        <>
          <Figure n={`${n}.1`} caption="The day, at a glance" dims="16 : 10" frame="aspect-[16/10]" frameStyle={{ background: work.canvas }}>
            <div data-speed="auto" className="absolute inset-x-0 -top-[6%] h-[112%]">
              <div className="absolute left-[6%] top-[12%] w-[46%] opacity-60 transition-transform duration-700 ease-prime group-hover:-translate-x-2 group-hover:-rotate-1">
                <Image src="/images/work/maera-cal.jpg" alt="" width={880} height={560} sizes="(min-width: 768px) 26vw, 44vw" className={`h-auto w-full rounded-[6px] ${shadow}`} />
              </div>
              <div className="absolute right-[6%] top-[20%] w-[60%] transition-transform duration-700 ease-prime group-hover:-translate-y-2">
                <Image
                  src="/images/work/maera-dash.jpg"
                  alt="Maéra's dashboard: today's takings, the chairs in use and the appointments"
                  width={860}
                  height={560}
                  sizes="(min-width: 768px) 34vw, 58vw"
                  className={`h-auto w-full rounded-[6px] ${shadow}`}
                />
              </div>
            </div>
          </Figure>
          <div className="mt-[14vh] grid gap-y-[10vh] md:grid-cols-2 md:gap-x-6">
            <Figure n={`${n}.2`} caption="Invoice & reminder" dims="900 × 580" frame="aspect-[900/580]">
              <Image src="/images/work/maera-bill.jpg" alt="A Maéra tax invoice beside the appointment reminder sent to the client" fill sizes="(min-width: 768px) 28vw, 92vw" className="object-cover" />
            </Figure>
            <Figure n={`${n}.3`} caption="Storefront" dims="860 × 560" frame="aspect-[860/560]" className="md:mt-[18vh]">
              <Image src="/images/work/maera-shop.jpg" alt="Maéra's storefront: services by category, with prices and durations" fill sizes="(min-width: 768px) 28vw, 92vw" className="object-cover" />
            </Figure>
          </div>
        </>
      );
    case "identity":
      return (
        <>
          <Figure n={`${n}.1`} caption="The mark — hover to throw it" dims="1.064 : 0.547 em" frame="aspect-[16/10]" frameStyle={{ background: work.canvas }}>
            <div className="absolute inset-0 grid place-items-center text-chalk">
              <Logo markOnly className="text-[clamp(5rem,13vw,12rem)]" />
            </div>
          </Figure>
          <div className="mt-[14vh] grid grid-cols-3 gap-3 md:gap-6">
            {[
              ["Introducing", "slide-logo"],
              ["Services", "slide-services"],
              ["Let's build", "slide-cta"],
            ].map(([name, file], k) => (
              <Figure key={file} n={`${n}.${k + 2}`} caption={name} frame="aspect-[4/5]" className={["", "mt-[6vh]", "mt-[12vh]"][k]}>
                <Image src={`/images/work/${file}.jpg`} alt={`The “${name}” post from the studio's launch`} fill sizes="(min-width: 768px) 18vw, 30vw" className="object-cover" />
              </Figure>
            ))}
          </div>
        </>
      );
    case "site":
      return (
        <>
          <Figure n={`${n}.1`} caption="The bloom, inverted" dims="2160 × 3840" frame="aspect-[16/10]" frameStyle={{ background: work.canvas }}>
            <div data-speed="auto" className="absolute inset-x-0 -top-[8%] h-[116%] [mask-image:linear-gradient(to_bottom,#000_55%,transparent_92%)]">
              <Image src="/images/hero-bloom-4k.webp" alt="The x-ray cosmos from the homepage, inverted" fill sizes="(min-width: 768px) 56vw, 92vw" className="object-cover object-[50%_30%] invert" />
            </div>
          </Figure>
          <div className="mt-[14vh] grid gap-y-[10vh] md:grid-cols-2 md:gap-x-6">
            <Figure n={`${n}.2`} caption="The dot — Bayer order" dims="4 × 4 × 2 px" frame="aspect-square border border-ink/10">
              <BayerDiagram />
            </Figure>
            <Figure n={`${n}.3`} caption="The curve" dims="0.87, 0, 0.13, 1" frame="aspect-square border border-ink/10" className="md:mt-[18vh]">
              <CurveDiagram />
            </Figure>
          </div>
        </>
      );
    default:
      return (
        <>
          <Figure n={`${n}.1`} caption="Launch film" dims="9 : 16 · 0:25" frame="aspect-[16/10]" frameStyle={{ background: work.canvas }}>
            <div className="absolute left-1/2 top-[8%] aspect-[9/16] h-[84%] -translate-x-1/2 overflow-hidden rounded-[10px] ring-1 ring-white/10">
              <video
                src="/videos/oneprime-logo-intro-540.mp4"
                aria-label="The One Prime logo film"
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            </div>
          </Figure>
          <div className="mt-[14vh] grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
            {["0:01.5", "0:02.9", "0:04.5", "0:06.0"].map((t, k) => (
              <Figure key={t} n={`${n}.${k + 2}`} caption={t} frame="aspect-[4/5]" className={k % 2 ? "md:mt-[8vh]" : ""}>
                <Image src={`/images/work/film-0${k + 1}.jpg`} alt="" fill sizes="(min-width: 768px) 14vw, 46vw" className="object-cover" />
              </Figure>
            ))}
          </div>
        </>
      );
  }
}

/**
 * A case page's cover: the project at full width (4:5 on a phone, 16:9 from md). Its inner layer is
 * `data-cover-media`, which the page settles from a slight zoom as the frame's mask opens.
 */
export function Cover({ work }: { work: Work }) {
  const wide = "(min-width: 768px) 100vw, 100vw";
  switch (work.slug) {
    case "maera":
      // the calendar behind, the dashboard in front, both running off the foot of the frame
      return (
        <>
          <div className="absolute left-[-14%] top-[22%] w-[110%] opacity-50 md:left-[10%] md:top-[14%] md:w-[46%]">
            <Image src="/images/work/maera-cal.jpg" alt="" width={880} height={560} sizes="(min-width: 768px) 46vw, 110vw" className={`h-auto w-full rounded-[8px] ${shadow}`} />
          </div>
          <div className="absolute left-[12%] top-[40%] w-[120%] md:left-auto md:right-[8%] md:top-[24%] md:w-[58%]">
            <Image
              src="/images/work/maera-dash.jpg"
              alt="Maéra's dashboard: today's takings, the chairs in use and the appointments"
              width={860}
              height={560}
              priority
              sizes="(min-width: 768px) 58vw, 120vw"
              className={`h-auto w-full rounded-[8px] ${shadow}`}
            />
          </div>
        </>
      );
    case "identity":
      return (
        <>
          {/* the launch post as a field of colour only: blurred past reading, so its own wordmark can't echo */}
          <Image src="/images/work/slide-logo.jpg" alt="" fill priority sizes={wide} className="scale-110 object-cover opacity-35 blur-[18px]" />
          <div className="absolute inset-0 grid place-items-center text-chalk">
            <Logo markOnly className="text-[clamp(6rem,18vw,18rem)]" />
          </div>
        </>
      );
    case "site":
      return (
        <Image
          src="/images/hero-bloom-4k.webp"
          alt="The x-ray cosmos from the homepage, inverted"
          fill
          priority
          sizes={wide}
          className="object-cover object-[50%_30%] invert"
        />
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

export const cardSizes = "(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw";

/** what a grid card shows for each project, composed for 4:5 */
export function CardMedia({ work }: { work: Work }) {
  switch (work.slug) {
    case "maera":
      // the dashboard on the salon's dark canvas, bleeding off the right edge
      return (
        <>
          <div className="absolute left-[10%] top-[30%] w-[150%] opacity-50">
            <Image src="/images/work/maera-cal.jpg" alt="" width={880} height={560} sizes={cardSizes} className={`h-auto w-full rounded-[6px] ${shadow}`} />
          </div>
          <div className="absolute left-[18%] top-[44%] w-[150%]">
            <Image
              src="/images/work/maera-dash.jpg"
              alt="Maéra's dashboard: today's takings, the chairs in use and the appointments"
              width={860}
              height={560}
              sizes={cardSizes}
              className={`h-auto w-full rounded-[6px] ${shadow}`}
            />
          </div>
        </>
      );
    case "identity":
      return <Image src="/images/work/slide-logo.jpg" alt="The One Prime mark, from the studio's launch posts" fill sizes={cardSizes} className="object-cover" />;
    case "site":
      return (
        <Image
          src="/images/hero-bloom-4k.webp"
          alt="The x-ray cosmos from the homepage, inverted"
          fill
          sizes={cardSizes}
          className="object-cover object-[50%_28%] invert"
        />
      );
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
