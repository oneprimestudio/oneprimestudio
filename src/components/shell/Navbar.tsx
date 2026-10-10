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
  ScrollTrigger,
  useGSAP,
} from "@/lib/gsap";
import BracketClock from "../BracketClock";
import Logo from "../Logo";

const MENU_MESSAGE = "[ Menu ]";

// the page's sections (by id), then what is still to come
const LINKS: { label: string; id?: string }[] = [
  { label: "Home", id: "top" },
  { label: "Studio", id: "studio" },
  { label: "Principles", id: "principles" },
  { label: "Status", id: "prime" },
  { label: "Work" },
  { label: "Contact" },
];

// TODO: replace "#" with the studio's real profile URLs
const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Behance", href: "#" },
];

// the hero's own measure, so the bar's edges line up with the type below it
const EDGE = "px-[max(var(--gutter),3.2vw)]";

/**
 * The navbar, as quiet as the hero: no box — the mark, a scrambling status line and "Menu", set in
 * the hero's ink on its measure. Its colour follows the ground under it (ink on light sections, sand
 * on dark ones); the status line follows the section in view (its `data-nav-message`). Opening it
 * lays a sheet of the hero's ground down from the top with the links on it, closing on a hairline and
 * a justified line of facts, the way the hero does. Escape, a click outside or any link closes it.
 */
export default function Navbar() {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const msgRef = useRef<HTMLSpanElement>(null);
  const current = useRef("We switch the things");
  const tl = useRef<gsap.core.Timeline | null>(null);
  const say = useRef<(text: string) => void>(() => {});
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("top");
  const [ground, setGround] = useState<"light" | "dark">("light");

  // navigating closes the menu (state reset on change, during render — no effect needed)
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  useGSAP(
    () => {
      const msg = msgRef.current;
      const bar = barRef.current;
      const panel = panelRef.current;
      const toggle = toggleRef.current;
      if (!msg || !bar || !panel || !toggle) return;
      ensureSmoother();
      const still = prefersReducedMotion();

      say.current = (text: string) =>
        gsap.to(msg, {
          duration: still ? 0 : 0.8,
          ease: "none",
          overwrite: true,
          scrambleText: { text, chars: "upperCase", speed: 0.6 },
        });

      // the section in view: its message on the status line, its id the active link
      const sections = document.querySelectorAll<HTMLElement>("[data-nav-message]");
      sections.forEach((section) => {
        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            if (!self.isActive) return;
            current.current = section.dataset.navMessage ?? current.current;
            if (section.id) setActive(section.id);
            if (!root.current?.hasAttribute("data-open")) say.current(current.current);
          },
        });
      });
      if (sections[0]?.dataset.navMessage) current.current = sections[0].dataset.navMessage;
      say.current(current.current);

      // the section under the bar itself: its ground (data-cursor) decides the bar's colour
      document.querySelectorAll<HTMLElement>("[data-cursor]").forEach((section) => {
        ScrollTrigger.create({
          trigger: section,
          start: () => `top ${bar.offsetHeight / 2}px`,
          end: () => `bottom ${bar.offsetHeight / 2}px`,
          onToggle: (self) => {
            if (self.isActive) setGround(section.dataset.cursor === "dark" ? "dark" : "light");
          },
        });
      });

      // the sheet grows to the panel's height, the bars cross, the rows settle in
      const bars = toggle.querySelectorAll("[data-bar]");
      gsap.set(panel, { height: 0 });
      const timeline = gsap
        .timeline({ paused: true, defaults: { ease: MENU_EASE, duration: still ? 0 : MENU_OPEN } })
        .to(panel, { height: "auto" }, 0)
        .fromTo(
          panel.querySelectorAll("[data-menu-item]"),
          { y: 14, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.04, duration: still ? 0 : 0.7 },
          still ? 0 : 0.12,
        );
      if (bars.length === 2) timeline.to(bars[0], { y: 3, rotate: 45 }, 0).to(bars[1], { y: -3, rotate: -45 }, 0);
      tl.current = timeline;

      // the bar's three parts drop in with the hero's intro
      if (!still) {
        gsap.from(bar.children, { yPercent: -120, autoAlpha: 0, duration: 1.1, ease: MENU_EASE, stagger: 0.08, delay: 0.3 });
      }
    },
    { scope: root },
  );

  // play / reverse with the state; the status line reads "[ Menu ]" while it is open
  useEffect(() => {
    const timeline = tl.current;
    if (!timeline) return;
    if (open) {
      timeline.timeScale(1).play();
      say.current(MENU_MESSAGE);
    } else if (timeline.progress() > 0) {
      timeline.timeScale(MENU_OPEN / MENU_CLOSE).reverse();
      say.current(current.current);
    }
  }, [open]);

  // Escape or a click anywhere outside the sheet closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      ref={root}
      data-open={open ? "" : undefined}
      // the bar is see-through: only its mark and button take clicks until the sheet is open
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 transition-colors duration-500 ease-prime ${
        ground === "dark" && !open ? "text-sand" : "text-ink"
      }`}
    >
      <nav
        ref={navRef}
        aria-label="Primary"
        className={`transition-[background-color,box-shadow] duration-500 ease-prime ${
          open ? "pointer-events-auto bg-bloom shadow-[0_24px_60px_-30px_rgba(8,6,78,0.25)]" : "bg-transparent"
        }`}
      >
        <div ref={barRef} className={`grid h-[var(--nav-h)] grid-cols-[1fr_auto_1fr] items-center ${EDGE}`}>
          <a
            href="#top"
            aria-label="One Prime Studio — home"
            className="group pointer-events-auto justify-self-start text-[17px] md:text-[19px]"
          >
            <Logo markOnly />
          </a>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-75 md:text-[11px]" aria-live="polite">
            <span ref={msgRef}>We switch the things</span>
          </p>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="pointer-events-auto flex cursor-pointer items-center gap-2.5 justify-self-end py-2 text-[13px] font-medium tracking-[-0.01em] md:text-[15px]"
          >
            {/* the label rolls over to "Close", the two bars cross */}
            <span className="block h-[1.2em] overflow-hidden">
              <span
                className={`block transition-transform duration-500 ease-prime ${open ? "-translate-y-1/2" : "translate-y-0"}`}
              >
                <span className="block leading-[1.2em]">Menu</span>
                <span className="block leading-[1.2em]">Close</span>
              </span>
            </span>
            <span aria-hidden className="relative block h-[7px] w-4">
              <span data-bar className="absolute left-0 top-0 h-px w-full bg-current" />
              <span data-bar className="absolute bottom-0 left-0 h-px w-full bg-current" />
            </span>
          </button>
        </div>

        {/* the sheet's body */}
        <div ref={panelRef} id="site-menu" inert={!open} className="h-0 overflow-hidden">
          <div className={`pb-[max(20px,3svh)] pt-6 md:pt-10 ${EDGE}`}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-12">
              <ul className="md:col-span-7">
                {LINKS.map(({ label, id }, i) => {
                  const index = (
                    <span className="w-6 font-mono text-[10px] tracking-normal text-stone">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  );
                  return (
                    <li key={label} data-menu-item>
                      {id ? (
                        <a
                          href={`#${id}`}
                          onClick={close}
                          aria-current={active === id ? "location" : undefined}
                          className="group flex items-center gap-3 py-0.5 text-[26px] tracking-[-0.02em]"
                        >
                          {index}
                          <span className="transition-transform duration-500 ease-prime group-hover:translate-x-1">{label}</span>
                          {active === id && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />}
                        </a>
                      ) : (
                        <span aria-disabled className="flex items-center gap-3 py-0.5 text-[26px] tracking-[-0.02em] text-ink/30">
                          {index}
                          {label}
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent">Soon</span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="text-[11px] uppercase md:col-span-4 md:col-start-9">
                <p data-menu-item className="mb-2 font-mono tracking-tight text-stone">
                  [ Get in touch ]
                </p>
                <ul>
                  {SOCIALS.map((s) => (
                    <li key={s.label} data-menu-item className="border-t border-ink/15 last:border-b">
                      <a href={s.href} className="group flex items-center justify-between py-1.5 tracking-wider">
                        <span>{s.label}</span>
                        <span className="transition-transform duration-500 ease-prime group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* the hero's closing line: a hairline, and the facts justified across it */}
            <div
              data-menu-item
              className="mt-12 flex items-center justify-between gap-4 border-t border-ink/25 pt-4 text-[13px] font-medium tracking-[-0.01em] text-ink/85 md:mt-16 md:text-[15px]"
            >
              <span>© One Prime Studio</span>
              <span className="hidden sm:inline">Hyderabad</span>
              <BracketClock className="font-mono text-[10px] tracking-[0.08em] md:text-[11px]" />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
