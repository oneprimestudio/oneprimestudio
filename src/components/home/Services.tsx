"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  CARD_EASE,
  ensureSmoother,
  gsap,
  hoverScramble,
  MENU_EASE,
  ONCE,
  prefersReducedMotion,
  PRIME,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/lib/gsap";
import { gooHeadings } from "@/lib/goo";
import Logo from "@/components/Logo";

type Service = {
  title: string;
  tag: string;
  /** what the service provides, listed on the card */
  items: string[];
  body: string;
};

const SERVICES: Service[] = [
  {
    title: "Custom UI/UX.",
    tag: "Design",
    items: ["Research", "UI", "Prototypes"],
    body: "Interfaces shaped around the people who use them, every day.",
  },
  {
    title: "Custom Shopify.",
    tag: "Commerce",
    items: ["Themes", "Liquid", "Apps"],
    body: "Storefronts built from a blank file never from a theme store.",
  },
  {
    title: "E-Commerce.",
    tag: "Commerce",
    items: ["Storefront", "Checkout", "Payments"],
    body: "Catalogue to checkout, designed to turn visits into repeat buyers.",
  },
  {
    title: "CRM & ERP Systems.",
    tag: "Systems",
    items: ["Dashboards", "Workflows", "Reports"],
    body: "Internal tools your team actually wants to open.",
  },
  {
    title: "SaaS Products.",
    tag: "Product",
    items: ["MVP", "Billing", "Onboarding"],
    body: "From first MVP to scale, with an onboarding that counts.",
  },
  {
    title: "Brand & Logo Identity.",
    tag: "Brand",
    items: ["Logo", "Type", "Guidelines"],
    body: "An identity with a reason behind every curve.",
  },
];

const label = "font-mono text-[10px] uppercase tracking-[0.14em] md:text-[11px]";

/** the studio's hover: the "Start a project" bar's 0.7s on the prime curve, used in and out */
const HOVER = { ease: PRIME, duration: 0.7, overwrite: "auto" as const };

/**
 * What the studio makes: six square-cornered 4:5 cards in warm paper on the bloom, after a poster-card
 * reference — the name set huge and tight at the top, a small uppercase label and what the service provides
 * as a numbered list in the middle, and the studio's mark over a short paragraph at the foot. On wide
 * screens the row waits in the right 40% of the screen; the section pins and scrolling carries it leftward,
 * the cards trailing a little behind one another the faster it moves. On phones it swipes.
 *
 * Each card's list settles in as the row arrives. Hover, on the prime curve: the card lifts, its list rows
 * step aside one after another, and the mark's switch throws on.
 */
export default function Services() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) return unScramble;

      const frame = el.querySelector<HTMLElement>("[data-pin]")!;
      const scroller = el.querySelector<HTMLElement>("[data-scroller]")!;
      const track = el.querySelector<HTMLElement>("[data-track]")!;
      const hint = el.querySelector<HTMLElement>("[data-hint]")!;
      const items = Array.from(el.querySelectorAll<HTMLElement>("[data-item]"));
      const cards = items.map((item) => item.querySelector<HTMLElement>("[data-card]")!);
      const cleanups: (() => void)[] = [];

      // headings arrive as ink: blobs that firm up into letters (lib/goo); body copy rises line by line
      gooHeadings(el);
      el.querySelectorAll<HTMLElement>("[data-lines]").forEach((node) => {
        SplitText.create(node, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: MENU_EASE,
              stagger: 0.08,
              scrollTrigger: { trigger: node, start: "top 85%", ...ONCE },
            }),
        });
      });

      gsap.from(el.querySelectorAll("[data-reveal]"), {
        y: 24,
        autoAlpha: 0,
        duration: 1,
        ease: MENU_EASE,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: "top 70%", ...ONCE },
      });

      // the row rises in card by card, then each card's list settles in, row by row
      const arrive = gsap.timeline({ scrollTrigger: { trigger: track, start: "top 92%", ...ONCE } });
      arrive.from(items, { y: 90, autoAlpha: 0, duration: 1.2, ease: PRIME, stagger: 0.1 }, 0);
      cards.forEach((card, i) =>
        arrive.from(card.querySelectorAll("[data-li]"), { yPercent: 100, duration: 1, ease: PRIME, stagger: 0.06 }, 0.45 + i * 0.1),
      );

      // wide screens: the row starts in the right 40%, then the pinned scroll carries it through
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        // the hint's runner (the hint only shows on wide screens): a short dash that slides along its rail,
        // over and over — but only while the hint can be seen, the section on screen and the hint not yet
        // faded by the pin: a loop left running unseen would repaint the page on every frame for nothing
        const runner = gsap.fromTo(
          el.querySelector("[data-runner]"),
          { xPercent: -100 },
          { xPercent: 300, duration: 1.6, ease: CARD_EASE, repeat: -1, repeatDelay: 0.4, paused: true },
        );
        let onScreen = false;
        let hinted = true;
        const run = () => (onScreen && hinted ? runner.resume() : runner.pause());
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            onScreen = self.isActive;
            run();
          },
        });

        gsap.set(scroller, { overflow: "visible" });
        const pad = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const from = () => scroller.clientWidth * 0.6 - pad();
        const to = () => -Math.max(0, track.scrollWidth - scroller.clientWidth);
        gsap
          .timeline({
            scrollTrigger: {
              trigger: frame,
              start: "top top",
              end: () => `+=${from() - to()}`,
              pin: true,
              scrub: true,
              invalidateOnRefresh: true,
              // the navbar's section triggers exist before this pin: its spacer has to be laid out first
              refreshPriority: 1,
              // the hint is gone once the first 12% of the pin has passed (below)
              onUpdate: (self) => {
                if (hinted === self.progress < 0.12) return;
                hinted = !hinted;
                run();
              },
            },
          })
          .fromTo(track, { x: from }, { x: to, ease: "none", duration: 1 }, 0)
          .to(hint, { autoAlpha: 0, x: -24, ease: "none", duration: 0.12 }, 0);

        // inertia: the faster the row moves, the further each card trails the one before it
        const lag = items.map((item) => gsap.quickTo(item, "x", { duration: 0.7, ease: "power3.out" }));
        let last = gsap.getProperty(track, "x") as number;
        let resting = true;
        const tick = () => {
          const x = gsap.getProperty(track, "x") as number;
          const v = gsap.utils.clamp(-12, 12, (x - last) / gsap.ticker.deltaRatio());
          last = x;
          // a still row asks nothing of the cards: one call sends them home, then the tick is idle
          if (v === 0 && resting) return;
          resting = v === 0;
          // the trailing cards are the ones behind the direction of travel: the gaps open, never close
          lag.forEach((q, i) => q(-v * (v < 0 ? i : lag.length - 1 - i) * 1.2));
        };
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
      });

      // ---- hover: the card lifts and its illustration acts out the service ----
      const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const live = new Set<number>();
      const num = (v: string | undefined, fallback = 0) => (v === undefined ? fallback : parseFloat(v));

      const enter = (i: number) => {
        const card = cards[i];
        const q = (s: string) => card.querySelectorAll<SVGElement | HTMLElement>(s);
        live.add(i);
        gsap.to(card, { y: -12, ...HOVER });
        gsap.to(q("[data-shadow]"), { opacity: 1, ...HOVER });
        gsap.to(q("[data-body]"), { color: "#08064e", ...HOVER });
        gsap.to(q("[data-roll]"), { yPercent: -50, ...HOVER });
        gsap.fromTo(q("[data-arrow]"), { x: -10, y: 10, opacity: 0 }, { x: 0, y: 0, opacity: 1, ...HOVER, delay: 0.12 });
        q("[data-h]").forEach((node) => {
          const d = node.dataset;
          gsap.to(node, {
            x: num(d.hx),
            y: num(d.hy),
            rotation: num(d.hr),
            scale: num(d.hs, 1),
            scaleY: num(d.hsy, num(d.hs, 1)),
            transformOrigin: d.o ?? "50% 50%",
            delay: num(d.hd),
            ...HOVER,
          });
        });
        gsap.to(q("[data-pop]"), { scale: 1, opacity: 1, ...HOVER, delay: 0.25, stagger: 0.06 });
        gsap.to(q("[data-fill]"), { attr: { "fill-opacity": 1 }, ...HOVER, delay: 0.42 });
        gsap.fromTo(
          q("[data-redraw]"),
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, ...HOVER, duration: 0.9, delay: 0.1 },
        );
      };

      const leave = (i: number) => {
        const card = cards[i];
        const q = (s: string) => card.querySelectorAll<SVGElement | HTMLElement>(s);
        const back = { ...HOVER, duration: 0.6 };
        live.delete(i);
        gsap.to(card, { y: 0, ...back });
        gsap.to(q("[data-shadow]"), { opacity: 0, ...back });
        gsap.to(q("[data-body]"), { color: "rgba(8, 6, 78, 0.8)", ...back });
        gsap.to(q("[data-roll]"), { yPercent: 0, ...back });
        gsap.to(q("[data-arrow]"), { x: 10, y: -10, opacity: 0, ...back, duration: 0.4 });
        // the parts go home in the reverse order to the way they left
        const moved = Array.from(q("[data-h]"));
        moved.forEach((node, k) =>
          gsap.to(node, { x: 0, y: 0, rotation: 0, scale: 1, scaleY: 1, ...back, delay: (moved.length - 1 - k) * 0.02 }),
        );
        gsap.to(q("[data-pop]"), { scale: 0.4, opacity: 0, ...back, duration: 0.45 });
        gsap.to(q("[data-fill]"), { attr: { "fill-opacity": 0 }, ...back, duration: 0.4 });
      };


      if (hoverable) {
        cards.forEach((card, i) => {
          const on = () => enter(i);
          const off = () => leave(i);
          card.addEventListener("pointerenter", on);
          card.addEventListener("pointerleave", off);
          cleanups.push(() => {
            card.removeEventListener("pointerenter", on);
            card.removeEventListener("pointerleave", off);
          });
        });
      } else {
        // touch: whichever card sits fully in view plays as if hovered
        const io = new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              const i = cards.indexOf(e.target as HTMLElement);
              if (e.isIntersecting) enter(i);
              else if (live.has(i)) leave(i);
            }),
          { root: scroller, threshold: 0.9 },
        );
        cards.forEach((c) => io.observe(c));
        cleanups.push(() => io.disconnect());
      }

      return () => {
        cleanups.forEach((fn) => fn());
        mm.revert();
        unScramble();
      };
    },
    { scope: root },
  );

  return (
    <section
      id="services"
      ref={root}
      data-cursor="dark"
      data-nav-message="What we make"
      className="relative z-10 bg-[#171e17] text-chalk"
    >
      {/* the pinned frame sits inside the section, so the section's own height spans the whole pin */}
      <div
        data-pin
        className="relative flex flex-col overflow-hidden pb-1 md:pb-10 pt-[calc(var(--nav-top)+var(--nav-h)+28px)] md:h-svh md:min-h-[720px] md:pb-[max(28px,4svh)]"
      >
        {/* the bloom, rebuilt at 4K from service.jpg: a 16:9 window on wide screens, the whole portrait on phones */}
        {/* raised a little on wide screens, so the flower's head clears the row of cards */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-full [transform:translateZ(0)] md:-top-[14%] md:h-[114%]">
          <Image
            src="/images/services-bloom-4k.webp"
            alt=""
            fill
            sizes="100vw"
            quality={90}
            className="hidden object-cover brightness-75 md:block"
          />
          <Image
            src="/images/services-bloom-portrait-4k.webp"
            alt=""
            fill
            sizes="100vw"
            quality={90}
            className="object-cover object-[50%_30%] brightness-75 md:hidden"
          />
        </div>
        {/* the photograph's top edge, settled to exactly the colour the seam above hands over */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-[8svh] bg-gradient-to-b from-[#171e17] to-transparent" />

        <div className="relative px-[var(--gutter)]">


          <div className="mt-8 grid items-end gap-y-2 md:mt-0.5 md:grid-cols-12 md:gap-x-6">
            <h2
              data-goo
              className="text-[clamp(2.75rem,6.4vw,7rem)] font-medium leading-[0.86] tracking-[-0.05em] md:col-span-5"
            >
              What we
              <br />
              make.
            </h2>
            <p
              data-reveal
              className="max-w-[34ch] text-[12px] leading-[1.2] text-chalk/75 md:col-span-3 md:col-start-10 md:text-[16px]"
            >
              Design and engineering under one roof the brand, the product and the code made by the same hands.
            </p>
          </div>
        </div>

        {/* wide screens: the space left of the waiting row says what to do, and goes as the row arrives */}
        <div
          data-hint
          aria-hidden
          className="absolute bottom-[max(12px,2svh)] md:bottom-[max(28px,4svh)] left-[var(--gutter)] hidden items-center gap-3 md:flex"
        >
          <span className={`${label} text-chalk/60`}>({String(SERVICES.length).padStart(2, "0")})</span>
          <span className="relative block h-px w-14 overflow-hidden bg-chalk/20">
            <span data-runner className="absolute inset-y-0 left-0 w-1/3 bg-chalk" />
          </span>
          <span className={`${label} text-chalk/80`}>Scroll to explore</span>
        </div>

        {/* the row: native swipe on phones, slid by the pinned scroll on wide screens */}
        <div
          data-scroller
          className="relative mt-12 snap-x  overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:mt-auto [&::-webkit-scrollbar]:hidden"
        >
          <ul data-track className="flex w-max gap-2 py-[2rem] mb-[1.1rem] md:mb-[5rem] pb-0 px-[var(--gutter)] will-change-transform md:gap-4">
            {SERVICES.map((s) => (
              <li key={s.title} data-item className="snap-start scroll-ml-[var(--gutter)] will-change-transform">
                <article
                  data-card
                  className="group relative flex aspect-[4/5] w-[58vw] max-w-[350px] flex-col bg-[#ffffff] p-6 text-ink md:h-[min(43svh,350px)] md:w-auto md:max-w-none md:p-4"
                >
                  {/* a soft resting shadow, and a deeper one that fades in as the card lifts */}



                  <h3 className="relative text-[clamp(2.25rem,2.3vw,3.5rem)] font-medium leading-[0.9] tracking-[-0.055em]">
                    {s.title}
                  </h3>

                  {/* what it is, and what it provides */}


                  {/* the mark, which throws on as the card is hovered, over the paragraph */}

                  <div className="relative mt-auto">

                    <p className="text-[11px] mt-3 font-light text-start uppercase tracking-[0.06em]">{s.tag}</p>
                    <ul className=" text-[14px] leading-none flex items-start justify-start flex-col  md:text-[15px]">
                      {s.items.map((item, k) => (
                        <li key={item} className="overflow-hidden mt-2 ">
                          <span
                            data-li
                            data-h
                            className="flex items-baseline font-semibold "
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="relative mt-auto">
                      <p data-body className="mt-3 max-w-[32ch] text-[11px] mt-2 md:mt-[2rem] font-medium leading-[1.01] text-ink/80 md:text-[15px]">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative px-[var(--gutter)]">

          <div className="mt-8 grid items-end gap-y-2 md:mt-0.5 md:grid-cols-12 md:gap-x-6">

            <p
              data-reveal
              className="max-w-[34ch] text-[12px] leading-[1.2] text-chalk/75 md:col-span-3 md:col-start-10 md:text-[16px]"
            >
              Design and engineering under one roof the brand, the product and the code made by the same hands.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
