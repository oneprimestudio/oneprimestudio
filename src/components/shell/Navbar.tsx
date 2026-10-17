"use client";

import { usePathname } from "next/navigation";
import { type RefObject, useEffect, useRef, useState } from "react";
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

/** holds the page still while the menu is open (shared with the page transition, which may hold it too) */
const lockPage = (on: boolean) => holdScroll("menu", on);

// how far the page scrolls before the bar leaves, and how much of the first screen (the hero, or a screen
// on pages without one) has to pass before the corner pill arrives
const LEAVE_AFTER = 48;
const ARRIVE_AT = 0.85;

/** the pill's shape: the hero's tags — the site's pill height (--pill-h), fully round; solid navy, no edge */
const PILL = "rounded-[calc(var(--pill-h)/2)] border-ink/80 border-2 ";
/** a toggle's circle, concentric with the pill's round end: 4px in from the top, the foot and the end */
const DOT = "grid h-[calc(var(--pill-h)-8px)] w-[calc(var(--pill-h)-8px)] place-items-center rounded-full";

/**
 * The navbar comes in two pills, both shaped like the hero's tags — fully rounded, solid navy:
 *
 *   the bar      at the top of the page: mark · scrambling status line · toggle. The status line follows
 *                the section in view (its `data-nav-message`). It leaves upward as soon as the page scrolls.
 *   the corner   once the hero has gone by, a small "Menu" pill drops in at the top right.
 *
 * Opening either doesn't move the page — the pill itself grows (the bar downward, the corner down and to
 * the left, its radius kept) over the dimmed page: a mono "Menu" label, the pages at
 * display size rising out of their masks, the socials and the studio's details in two quiet columns, and
 * one call to action across the foot. Escape, a click outside or any link closes it again. On the work's
 * pages (/projects and each case) the closed bar is plain type across the full width between the gutters,
 * and takes its sheet and narrows to the panel as it opens.
 */
export default function Navbar() {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const cornerRef = useRef<HTMLElement>(null);
  const cornerPanelRef = useRef<HTMLDivElement>(null);
  const cornerToggleRef = useRef<HTMLButtonElement>(null);
  const cornerLabelRef = useRef<HTMLSpanElement>(null);
  const msgRef = useRef<HTMLSpanElement>(null);
  const current = useRef("We switch the things");
  const barTl = useRef<gsap.core.Timeline | null>(null);
  const cornerTl = useRef<gsap.core.Timeline | null>(null);
  const say = useRef<(text: string) => void>(() => {});
  const [open, setOpen] = useState(false);
  // the pill that opens (and so the one that closes)
  const [which, setWhich] = useState<"bar" | "corner">("bar");
  const toggleFrom = (pill: "bar" | "corner") => {
    if (!open) setWhich(pill);
    setOpen((o) => !o);
  };
  // the bar has left the top of the page; the corner pill is in
  const [away, setAway] = useState(false);
  const [corner, setCorner] = useState(false);
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
      const cPill = cornerRef.current;
      const cPanel = cornerPanelRef.current;
      const cToggle = cornerToggleRef.current;
      if (!msg || !pill || !panel || !toggle || !cPill || !cPanel || !cToggle) return;
      ensureSmoother();
      const still = prefersReducedMotion();
      const d = (s: number) => (still ? 0 : s);

      say.current = (text: string) =>
        gsap.to(msg, {
          duration: d(0.8),
          ease: "none",
          overwrite: true,
          scrambleText: { text, chars: "upperCase", speed: 0.6 },
        });

      // what both pills do as they open, on the "Start a project" hover's curve: the panel grows to its
      // height, the two bars meet in the middle and turn into the close cross, and the
      // links rise out of their masks
      const opening = (pill: HTMLElement, panel: HTMLElement, toggle: HTMLElement) => {
        gsap.set(panel, { height: 0 });
        const bars = toggle.querySelectorAll("[data-bar]");
        const timeline = gsap
          .timeline({ paused: true, defaults: { ease: PRIME, duration: d(MENU_OPEN) } })
          .to(panel, { height: "auto" }, 0)
          .fromTo(
            panel.querySelectorAll("[data-menu-line]"),
            { yPercent: 110 },
            { yPercent: 0, stagger: 0.05, duration: d(0.9) },
            d(0.1),
          )
          .fromTo(
            panel.querySelectorAll("[data-menu-item]"),
            { y: 14, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, stagger: 0.04, duration: d(0.7) },
            d(0.3),
          );
        if (bars.length === 2) {
          timeline
            // the bars are 5px apart (centre to centre): each travels half of it to meet in the middle
            .to(bars, { y: (i) => (i === 0 ? 2.5 : -2.5), duration: d(0.4) }, 0)
            .to(bars, { rotate: (i) => (i === 0 ? 45 : -45), duration: d(0.55) }, d(0.3));
        }
        return timeline;
      };

      // the bar: besides, the mark and status line close their width away
      barTl.current = opening(pill, panel, toggle)
        .fromTo(
          pill.querySelector("[data-collapse='start']"),
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 100% 0% 0%)", duration: d(0.7) },
          0,
        )
        .fromTo(
          pill.querySelector("[data-collapse='center']"),
          { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 50% 0% 50%)", duration: d(0.7) },
          0,
        );

      // the corner: it also widens to the panel's width, anchored at the right, so it grows down and left
      const openWidth = () => {
        const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gutter")) || 20;
        return Math.min(440, window.innerWidth - 2 * gutter);
      };
      cornerTl.current = opening(cPill, cPanel, cToggle).fromTo(
        cPill,
        // measured as it first opens (once the fonts have set the label)
        { width: () => cPill.offsetWidth },
        { width: openWidth, duration: d(MENU_OPEN), immediateRender: false },
        0,
      );
      // the open width follows the screen: measured again on the next open
      const onResize = () => {
        if (cornerTl.current?.progress() === 0) cornerTl.current.invalidate();
      };
      window.addEventListener("resize", onResize);

      if (!still) gsap.from(pill, { yPercent: -160, duration: 1.2, ease: MENU_EASE, delay: 0.25 });
      return () => window.removeEventListener("resize", onResize);
    },
    { scope: root },
  );

  // the section in view: its message on the status line — found again on every page, since the navbar
  // outlives them. And the two pills' hand-over: the bar leaves once the page moves, the corner pill
  // arrives once the hero (or the first screen) has gone by
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

      const hero = document.getElementById("top");
      ScrollTrigger.create({
        start: LEAVE_AFTER,
        end: "max",
        onToggle: (self) => setAway(self.isActive),
        onRefresh: (self) => setAway(self.isActive),
      });
      ScrollTrigger.create({
        start: () => (hero?.offsetHeight ?? window.innerHeight) * ARRIVE_AT,
        end: "max",
        onToggle: (self) => setCorner(self.isActive),
        onRefresh: (self) => setCorner(self.isActive),
      });
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  // play / reverse with the state — the pill on screen opens, and the one that opened closes; closing, the
  // status line scrambles back to the section in view
  useEffect(() => {
    lockPage(open);
    const veil = root.current?.querySelector("[data-veil]");
    const still = prefersReducedMotion();
    const timeline = which === "corner" ? cornerTl.current : barTl.current;
    if (!timeline) return;
    if (open) {
      timeline.timeScale(1).play();
    } else if (timeline.progress() > 0) {
      timeline.timeScale(MENU_OPEN / MENU_CLOSE).reverse();
      say.current(current.current);
    } else return;
    if (veil) {
      gsap.to(veil, {
        autoAlpha: open ? 1 : 0,
        ease: PRIME,
        duration: still ? 0 : open ? MENU_OPEN : MENU_CLOSE,
        overwrite: true,
      });
    }
    if (which === "corner" && cornerLabelRef.current) {
      gsap.to(cornerLabelRef.current, {
        duration: still ? 0 : 0.6,
        ease: "none",
        overwrite: true,
        scrambleText: { text: open ? "Close" : "Menu", chars: "upperCase", speed: 0.6 },
      });
    }
    // `which` is set in the same click as `open`, and doesn't change while the menu is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape or a click anywhere outside the open pill closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      (which === "corner" ? cornerToggleRef : toggleRef).current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!pillRef.current?.contains(target) && !cornerRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, which]);

  // a link closes the menu: release the page at once, so the anchor glide that follows the click can move it
  const close = () => {
    lockPage(false);
    setOpen(false);
  };

  const barOpen = open && which === "bar";
  const cornerOpen = open && which === "corner";
  // the bar is out of sight once the page has moved (unless it's the one open)
  const barGone = away && !barOpen;
  const cornerIn = corner || cornerOpen;

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

      {/* the bar, which leaves upward on the prime curve once the page scrolls */}
      <div
        inert={barGone}
        className={`flex w-full justify-center transition-[translate,opacity] duration-[900ms] ease-prime motion-reduce:transition-none ${
          barGone ? "-translate-y-[calc(100%+var(--nav-top)+12px)] opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <nav
          ref={pillRef}
          aria-label="Primary"
          className={`relative w-full overflow-hidden transition-[max-width,background-color,color] ease-prime motion-reduce:transition-none ${PILL} ${
            wide && !open ? "max-w-[calc(100vw-2*var(--gutter))] duration-[850ms]" : "max-w-[560px] duration-[1000ms]"
          } ${
            plain
              ? // plain: just the type along the top of the page's grid
                "bg-transparent text-ink"
              : "bg-ink text-chalk"
          } ${barGone ? "" : "pointer-events-auto"}`}
        >
          {/* plain, the mark and the toggle's bars sit exactly on the gutters */}
          <div
            className={`relative grid h-[var(--pill-h)] grid-cols-[1fr_auto_1fr] items-center transition-[padding] duration-[850ms] ease-prime ${
              plain ? "pl-0 pr-0" : "pl-3.5 pr-1"
            }`}
          >
            <a
              data-collapse="start"
              href="/"
              inert={open}
              aria-label="One Prime Studio — home"
              className="group justify-self-start text-[19px] md:text-[20px]"
            >
              <Logo markOnly />
            </a>
            <p
              data-collapse="center"
              className="font-mono text-[11px] uppercase tracking-tight opacity-70"
              aria-live="polite"
            >
              <span ref={msgRef}>We switch the things</span>
            </p>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => toggleFrom("bar")}
              aria-expanded={barOpen}
              aria-controls="site-menu"
              aria-label={barOpen ? "Close menu" : "Open menu"}
              className={`${DOT} cursor-pointer justify-self-end transition-[background-color,margin] duration-500 ease-prime hover:bg-current/10 ${
                plain ? "-mr-[calc((var(--pill-h)-8px-18px)/2)]" : ""
              }`}
            >
              <Bars />
            </button>
          </div>

          {/* the expanding part of the pill */}
          <MenuBody id="site-menu" panelRef={panelRef} shown={barOpen} active={active} onNavigate={close} />
        </nav>
      </div>

      {/* the corner pill: drops in at the top right once the hero has gone by, and opens down and to the left */}
      <div
        inert={!cornerIn}
        className={`absolute right-[var(--gutter)] top-0 transition-[translate,opacity] duration-[900ms] ease-prime motion-reduce:transition-none ${
          cornerIn ? "translate-y-0 opacity-100" : "-translate-y-[calc(100%+var(--nav-top)+12px)] opacity-0"
        }`}
      >
        <nav
          ref={cornerRef}
          aria-label="Menu"
          className={`relative ml-auto overflow-hidden bg-ink text-chalk ${PILL} ${cornerIn ? "pointer-events-auto" : ""}`}
        >
          <button
            ref={cornerToggleRef}
            type="button"
            onClick={() => toggleFrom("corner")}
            aria-expanded={cornerOpen}
            aria-controls="corner-menu"
            aria-label={cornerOpen ? "Close menu" : "Open menu"}
            className="group/corner relative flex h-[var(--pill-h)] w-full cursor-pointer items-center justify-between gap-3 pl-3.5 pr-1"
          >
            {/* the label rolls up on hover, a copy rolling in from below */}
            <span className="relative block overflow-hidden text-[13px] font-medium leading-[1.2] tracking-[-0.01em] md:text-[14px]">
              <span className="block transition-transform duration-700 ease-prime group-hover/corner:-translate-y-full">
                <span ref={cornerLabelRef}>Menu</span>
              </span>
              <span
                aria-hidden
                className="absolute inset-0 block translate-y-full transition-transform duration-700 ease-prime group-hover/corner:translate-y-0"
              >
                {cornerOpen ? "Close" : "Menu"}
              </span>
            </span>
            <span className={`${DOT} transition-colors duration-500 ease-prime group-hover/corner:bg-current/10`}>
              <Bars />
            </span>
          </button>
          <MenuBody id="corner-menu" panelRef={cornerPanelRef} shown={cornerOpen} active={active} onNavigate={close} fixed />
        </nav>
      </div>
    </header>
  );
}

/** the toggle's two bars, which meet and cross as the menu opens */
function Bars() {
  return (
    <span className="relative block h-[6px] w-[18px]">
      <span data-bar className="absolute left-0 top-0 h-px w-full bg-current" />
      <span data-bar className="absolute bottom-0 left-0 h-px w-full bg-current" />
    </span>
  );
}

/**
 * The menu inside either pill. In the corner pill (`fixed`) it is laid out at the open width from the
 * start and pinned to the right, so the pill uncovers it as it widens instead of the type reflowing.
 */
function MenuBody({
  id,
  panelRef,
  shown,
  active,
  onNavigate,
  fixed = false,
}: {
  id: string;
  panelRef: RefObject<HTMLDivElement | null>;
  shown: boolean;
  active: string;
  onNavigate: () => void;
  fixed?: boolean;
}) {
  return (
    <div
      ref={panelRef}
      id={id}
      inert={!shown}
      // fixed, it adds no width of its own to the closed pill (w-0), and fills the pill as it widens
      className={`relative h-0 overflow-hidden text-chalk ${fixed ? "flex w-0 min-w-full justify-end" : ""}`}
    >
      <div
        className={`px-5 pb-5 pt-5 md:px-6 md:pb-6 ${
          fixed ? "w-[min(440px,100vw-2*var(--gutter))] shrink-0" : ""
        }`}
      >
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
                onClick={onNavigate}
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

        {/* the one call to action: a solid pill across the foot; the accent sweeps in under it on hover */}
        <a
          data-menu-item
          href="#contact"
          onClick={onNavigate}
          className="group relative mt-8 flex h-12 items-center justify-center gap-3 overflow-hidden rounded-full bg-[#04032e] font-mono text-[11px] uppercase tracking-[0.16em] text-chalk"
        >
          <span
            aria-hidden
            className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-prime group-hover:scale-x-100"
          />
          <span aria-hidden className="relative transition-transform duration-500 ease-prime group-hover:translate-x-1">
            ↳
          </span>
          <span className="relative">Start a project</span>
        </a>
      </div>
    </div>
  );
}
