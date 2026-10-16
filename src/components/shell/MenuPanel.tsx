"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { SOCIALS } from "@/lib/studio";
import BracketClock from "../BracketClock";

// the page's sections, plus what is still to come
const LINKS: { label: string; href?: string }[] = [
  { label: "Home", href: "#top" },
  { label: "Studio", href: "#studio" },
  { label: "Principles", href: "#principles" },
  { label: "Status", href: "#prime" },
  { label: "Work" },
  { label: "Contact", href: "#contact" },
];


/**
 * Lives behind the page. Opening the menu scales the page down and slides it below
 * this panel's top band (height --menu-h), the way cominvi.com.mx does it.
 */
export default function MenuPanel({
  open,
  panelRef,
  onNavigate,
}: {
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  onNavigate: () => void;
}) {
  return (
    <div
      id="site-menu"
      ref={panelRef}
      data-cursor="dark"
      inert={!open}
      aria-hidden={!open}
      className="fixed inset-0 z-0 bg-ink text-white"
    >
      <div className="flex h-[var(--menu-h,50vh)] flex-col px-[var(--gutter)] pb-5 pt-[calc(var(--nav-top)+var(--nav-h)+28px)]">
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-y-6 md:grid-cols-12 md:gap-x-6">
          <ul className="grid content-start grid-cols-1 gap-x-10 sm:grid-cols-2 md:col-span-8 lg:col-span-7">
            {LINKS.map(({ label, href }, i) => {
              const inner = (
                <>
                  <span className="w-6 font-mono text-[11px] tracking-normal text-white/40">0{i + 1}</span>
                  <span className="transition-transform duration-600 ease-prime group-hover:translate-x-2">{label}</span>
                  {!href && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">Soon</span>
                  )}
                </>
              );
              const cls =
                "group flex items-baseline gap-3 py-1 text-[clamp(2rem,4.2vw,3.75rem)] font-medium leading-[1.02] tracking-[-0.045em]";
              return (
                <li key={label} data-menu-item>
                  {href ? (
                    href.startsWith("#") ? (
                      <a href={href} className={cls} onClick={onNavigate}>
                        {inner}
                      </a>
                    ) : (
                      <Link href={href} className={cls} onClick={onNavigate}>
                        {inner}
                      </Link>
                    )
                  ) : (
                    <span aria-disabled className={`${cls} text-white/35`}>
                      {inner}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="hidden font-mono text-[11px] uppercase tracking-[0.08em] md:col-span-4 md:col-start-9 md:block">
            <p data-menu-item className="mb-3 text-white/55">
              [ Get in touch ]
            </p>
            <ul>
              {SOCIALS.map((s) => (
                <li key={s.label} data-menu-item className="border-t border-white/12 last:border-b">
                  <a href={s.href} className="group flex items-center justify-between py-3">
                    <span>{s.label}</span>
                    <span className="transition-transform duration-600 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          data-menu-item
          className="mt-4 flex items-center justify-between gap-4 border-t border-white/12 pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-white/55"
        >
          <span>© 2026 One Prime Studio</span>
          <BracketClock className="hidden text-white sm:inline" />
          <span className="text-right">Average is not an option.</span>
        </div>
      </div>
    </div>
  );
}
