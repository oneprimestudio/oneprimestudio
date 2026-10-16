"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ensureSmoother,
  gsap,
  MENU_CLOSE,
  MENU_EASE,
  MENU_OPEN,
  prefersReducedMotion,
  PRIME,
  holdScroll,
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";
import { onNavPlain } from "@/lib/navPlain";
import { EMAIL, SOCIALS } from "@/lib/studio";
import BracketClock from "../BracketClock";
import Logo from "../Logo";

// the site's pages only — never a section of one
const LINKS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
];

/** the link for the page on screen (a case page counts as Projects) */
const pageOf = (pathname: string) =>
  LINKS.findLast((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))?.href ?? "/";

const INK = "#08064e";

/** holds the page still while the menu is open (shared with the page transition, which may hold it too) */
const lockPage = (on: boolean) => holdScroll("menu", on);
const CHALK = "#f7f6f2";

/**
 * The floating navbar: mark · scrambling status line · toggle, on a sheet of the hero's own ground with a
 * hairline edge. The status line follows the section in view (its `data-nav-message`). Opening it doesn't
 * move the page — the pill itself grows downward and turns to dark ink over the dimmed page:
 * a mono "Menu" label, the sections at display size rising out of their masks, the socials and the
 * studio's details in two quiet columns, and one call to action across the foot. Escape, a click outside
 * or any link closes it again. On the work's pages (/projects and each case) the closed bar is plain type
 * across the full width between the gutters, and takes its sheet and narrows to the panel as it opens.
 */
export default function Navbar() {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const msgRef = useRef<HTMLSpanElement>(null);
  const current = useRef("We switch the things");
  const tl = useRef<gsap.core.Timeline | null>(null);
  const say = useRef<(text: string) => void>(() => {});
  const [open, setOpen] = useState(false);
  const active = pageOf(pathname);
  // the work's pages set everything to the page's grid: there, closed, the bar spans gutter to gutter (mark
  // at the left edge, toggle at the right) and narrows into the centred panel as it opens. While the page
  // holds a screen still (its pinned stage, which keeps everything clear of the bar) it is plain type, with
  // no sheet; once the page scrolls on under it, the sheet comes back
  const wide = active === "/projects";
  const [held, setHeld] = useState(false);
  useEffect(() => onNavPlain(setHeld), []);
  const plain = wide && held && !open;

  // navigating closes the menu (state reset on change, during render — no effect needed)
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  useGSAP(
    () => {
      const msg = msgRef.current;
      const pill = pillRef.current;
      const panel = panelRef.current;
      const toggle = toggleRef.current;
      if (!msg || !pill || !panel || !toggle) return;
      ensureSmoother();
      const still = prefersReducedMotion();

      say.current = (text: string) =>
        gsap.to(msg, {
          duration: still ? 0 : 0.8,
          ease: "none",
          overwrite: true,
          scrambleText: { text, chars: "upperCase", speed: 0.6 },
        });

      // on the "Start a project" hover's curve: the pill grows to the panel's height and darkens, the mark and
      // status line close their width away, the two bars meet in the middle and turn into the close cross,
      // and the links rise out of their masks
      const bars = toggle.querySelectorAll("[data-bar]");
      gsap.set(panel, { height: 0 });
      const timeline = gsap
        .timeline({ paused: true, defaults: { ease: PRIME, duration: still ? 0 : MENU_OPEN } })
        .to(panel, { height: "auto" }, 0)
        .fromTo(
          pill.querySelector("[data-collapse='start']"),
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 100% 0% 0%)", duration: still ? 0 : 0.7 },
          0,
        )
        .fromTo(
          pill.querySelector("[data-collapse='center']"),
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 50% 0% 50%)", duration: still ? 0 : 0.7 },
          0,
        )
        .to(pill.querySelector("[data-dark]"), { opacity: 1 }, 0)
        .to(root.current!.querySelector("[data-veil]"), { autoAlpha: 1 }, 0)
        .fromTo(pill.querySelector("[data-bar-row]"), { color: INK }, { color: CHALK }, 0)
        .fromTo(
          panel.querySelectorAll("[data-menu-line]"),
          { yPercent: 110 },
          { yPercent: 0, stagger: 0.05, duration: still ? 0 : 0.9 },
          still ? 0 : 0.1,
        )
        .fromTo(
          panel.querySelectorAll("[data-menu-item]"),
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.04, duration: still ? 0 : 0.7 },
          still ? 0 : 0.3,
        );
      if (bars.length === 2) {
        const meet = still ? 0 : 0.4;
        const turn = still ? 0 : 0.55;
        timeline
          .to(bars, { y: (i) => (i === 0 ? 4 : -4), duration: meet }, 0)
          .to(bars, { rotate: (i) => (i === 0 ? 45 : -45), duration: turn }, still ? 0 : 0.3);
      }
      tl.current = timeline;

      if (!still) gsap.from(pill, { yPercent: -160, duration: 1.2, ease: MENU_EASE, delay: 0.25 });
    },
    { scope: root },
  );

  // the section in view: its message on the status line — found again on every page, since the navbar
  // outlives them
  useGSAP(
    () => {
      const sections = document.querySelectorAll<HTMLElement>("[data-nav-message]");
      sections.forEach((section) => {
        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            if (!self.isActive) return;
            current.current = section.dataset.navMessage ?? current.current;
            if (!root.current?.hasAttribute("data-open")) say.current(current.current);
          },
        });
      });
      if (sections[0]?.dataset.navMessage) current.current = sections[0].dataset.navMessage;
      say.current(current.current);
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  // play / reverse with the state; closing, the status line scrambles back to the section in view
  useEffect(() => {
    lockPage(open);
    const timeline = tl.current;
    if (!timeline) return;
    if (open) {
      timeline.timeScale(1).play();
    } else if (timeline.progress() > 0) {
      timeline.timeScale(MENU_OPEN / MENU_CLOSE).reverse();
      say.current(current.current);
    }
  }, [open]);

  // Escape or a click anywhere outside the pill closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // a link closes the menu: release the page at once, so the anchor glide that follows the click can move it
  const close = () => {
    lockPage(false);
    setOpen(false);
  };

  return (
    <header
      ref={root}
      data-open={open ? "" : undefined}
      className="pointer-events-none fixed inset-x-0 top-[var(--nav-top)] z-50 flex justify-center px-[var(--gutter)]"
    >
      {/* open, the page behind dims and darkens; it also takes the click that closes the menu */}
      <div
        data-veil
        aria-hidden
        className={`invisible fixed inset-0 bg-black/50 opacity-0 backdrop-brightness-[0.7] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      />
      <nav
        ref={pillRef}
        aria-label="Primary"
        className={`pointer-events-auto relative w-full overflow-hidden text-ink ring-ink/10 transition-[max-width,background-color,box-shadow] ease-prime motion-reduce:transition-none ${
          wide && !open ? "max-w-[calc(100vw-2*var(--gutter))] duration-[850ms]" : "max-w-[560px] duration-[1000ms]"
        } ${
          plain
            ? // plain: just the type along the top of the page's grid
              "bg-transparent ring-0"
            : "bg-bloom/95 shadow-[0_14px_36px_-22px_rgba(8,6,78,0.4)] ring-1"
        }`}
      >
        {/* open, the whole pill turns to dark frosted ink — a layer that fades in, so it stays on the GPU */}
        <span data-dark aria-hidden className="pointer-events-none absolute inset-0 bg-ink/[0.95] opacity-0" />

        {/* plain, the mark and the toggle's bars sit exactly on the gutters */}
        <div
          data-bar-row
          className={`relative grid h-[var(--nav-h)] grid-cols-[1fr_auto_1fr] items-center transition-[padding] duration-[850ms] ease-prime ${
            plain ? "pl-0 pr-0" : "pl-4 pr-1.5"
          }`}
        >
          <a
            data-collapse="start"
            href="/"
            inert={open}
            aria-label="One Prime Studio — home"
            className="group justify-self-start text-[21px] md:text-[23px]"
          >
            <Logo markOnly />
          </a>
          <p
            data-collapse="center"
            className="font-mono text-[11px] uppercase tracking-[0.08em] opacity-70"
            aria-live="polite"
          >
            <span ref={msgRef}>We switch the things</span>
          </p>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`grid h-10 w-10 cursor-pointer place-items-center justify-self-end rounded-md transition-[background-color,margin] duration-500 ease-prime hover:bg-current/10 ${plain ? "-mr-[11px]" : ""}`}
          >
            <span className="relative block h-[9px] w-[18px]">
              <span data-bar className="absolute left-0 top-0 h-px w-full bg-current" />
              <span data-bar className="absolute bottom-0 left-0 h-px w-full bg-current" />
            </span>
          </button>
        </div>

        {/* the expanding part of the pill */}
        <div ref={panelRef} id="site-menu" inert={!open} className="relative h-0 overflow-hidden text-chalk">
          <div className="px-5 pb-5 pt-5 md:px-6 md:pb-6">
            <p data-menu-item className="font-mono text-[10px] uppercase tracking-[0.14em] text-chalk/55">
              Menu
            </p>

            {/* the pages at display size; hovering one quiets the rest */}
            <ul className="group/links mt-4">
              {LINKS.map(({ label, href }) => (
                <li key={href} className="overflow-hidden">
                  <a
                    data-menu-line
                    href={href}
                    onClick={close}
                    aria-current={active === href ? "page" : undefined}
                    className="group flex items-center gap-3 py-[2px] text-[clamp(2rem,7.4vw,2.75rem)] font-medium leading-[1.06] tracking-[-0.035em] transition-colors duration-500 ease-prime group-hover/links:text-chalk/35 hover:!text-chalk"
                  >
                    <span className="transition-transform duration-500 ease-prime group-hover:translate-x-1.5">
                      {label}
                    </span>
                    {active === href && <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />}
                  </a>
                </li>
              ))}
            </ul>

            {/* two quiet columns: where to follow, and how to reach */}
            <div className="mt-9 grid grid-cols-[auto_1fr] gap-x-10 text-[15px] leading-[1.45] md:text-[16px]">
              <ul>
                {SOCIALS.map((s) => (
                  <li key={s.label} data-menu-item>
                    <a
                      href={s.href}
                      className="group inline-flex items-center gap-1.5 text-chalk/55 transition-colors duration-500 ease-prime hover:text-chalk"
                    >
                      {s.label}
                      <span
                        aria-hidden
                        className="-translate-x-1 text-[12px] opacity-0 transition-[transform,opacity] duration-500 ease-prime group-hover:translate-x-0 group-hover:opacity-100"
                      >
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="min-w-0">
                <li data-menu-item>
                  <a
                    href={`mailto:${EMAIL}`}
                    className="block truncate text-chalk/80 transition-colors duration-500 ease-prime hover:text-chalk"
                  >
                    {EMAIL}
                  </a>
                </li>
                <li data-menu-item className="text-chalk/55">
                  Hyderabad, India
                </li>
                <li data-menu-item>
                  <BracketClock className="font-mono text-[10px] tracking-[0.08em] text-chalk/55" />
                </li>
              </ul>
            </div>

            {/* the one call to action: a solid bar across the foot; the accent sweeps in under it on hover */}
            <a
              data-menu-item
              href="#contact"
              onClick={close}
              className="group relative mt-8 flex h-12 items-center justify-center gap-3 overflow-hidden rounded-[4px] bg-[#04032e] font-mono text-[11px] uppercase tracking-[0.16em] text-chalk"
            >
              <span
                aria-hidden
                className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-prime group-hover:scale-x-100"
              />
              <span
                aria-hidden
                className="relative transition-transform duration-500 ease-prime group-hover:translate-x-1"
              >
                ↳
              </span>
              <span className="relative">Start a project</span>
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
