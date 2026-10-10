"use client";

import Image from "next/image";
import { useRef } from "react";
import { ensureSmoother, gsap, MENU_EASE, prefersReducedMotion, SplitText, useGSAP } from "@/lib/gsap";

/*
 * A quiet hero: one flower on an open ground, and three things at the bottom — a justified line of
 * facts over a hairline, the headline at the left, the description at the right.
 *
 * The photograph (an x-ray cosmos, 9:16) is a 2160 × 3840 master whose ground was flattened to exactly
 * `bloom` (#f9f9f7), so its edges vanish into the section and it never has to cover the screen. It is
 * drawn in a box of its own aspect, never larger than it was made and never through a transform:
 *   desktop  the screen's full height, its stem leaving the bottom edge, the bloom's centre at 68% of
 *            the width, so the stem falls in the gap between the headline and the description:
 *            left = max(68vw − 28.125svh, 54vw − 2.8svh) — the second term keeps the stem (at 5% of the
 *            box) clear of the headline's end (~49vw) on screens squarer than 16:10
 *   phones   the screen's full width from the top (the bloom clears the navbar); the stem fades out
 *            behind the type
 */

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const hero = root.current;
      if (!hero || !contextSafe) return;
      ensureSmoother();
      if (prefersReducedMotion()) return;
      const ease = MENU_EASE;

      // pinned while the next section slides over it; the type drifts up and fades on the way out
      gsap
        .timeline({
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", pin: true, pinSpacing: false, scrub: true },
        })
        .to("[data-hero-copy]", { yPercent: -10, opacity: 0, ease: "none" }, 0);

      // a letter of the headline flips over when the cursor crosses it (once the intro has landed)
      const title = hero.querySelector<HTMLElement>("[data-hero-title]");
      const rolling = new WeakSet<Element>();
      let rollReady = false;
      const onRoll = contextSafe((e: PointerEvent) => {
        const char = (e.target as Element | null)?.closest?.(".hero-char");
        if (!rollReady || !char || rolling.has(char)) return;
        rolling.add(char);
        gsap
          .timeline({ onComplete: () => void rolling.delete(char) })
          .to(char, { yPercent: -110, duration: 0.22, ease: "power2.in" })
          .set(char, { yPercent: 110 })
          .to(char, { yPercent: 0, duration: 0.6, ease: "expo.out" });
      });
      title?.addEventListener("pointerover", onRoll);

      let alive = true;
      const intro = contextSafe(() => {
        const desc = hero.querySelector<HTMLElement>("[data-hero-desc]");
        const rule = hero.querySelector<HTMLElement>("[data-hero-rule]");
        const bloom = hero.querySelector<HTMLElement>("[data-hero-bloom]");
        if (!alive || !title || !desc || !rule || !bloom) return;

        // the flower is uncovered from the stem up — a clip, so its pixels are never resampled
        gsap.set(bloom, { visibility: "visible" });
        gsap.fromTo(
          bloom,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 2.2, ease, clearProps: "clipPath" },
        );
        // the hairline draws out from the left, the facts settle on it
        gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease, delay: 0.2 });
        gsap.fromTo(
          hero.querySelectorAll("[data-hero-fact]"),
          { yPercent: 110 },
          { yPercent: 0, duration: 1, ease, stagger: 0.08, delay: 0.45 },
        );
        // the headline rises letter by letter out of its line masks, the description line by line
        SplitText.create(title, {
          type: "lines, chars",
          mask: "lines",
          linesClass: "split-line",
          charsClass: "hero-char",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.chars, { yPercent: 120, duration: 1.2, ease, stagger: 0.03, delay: 0.55 }),
        });
        SplitText.create(desc, {
          type: "lines",
          mask: "lines",
          linesClass: "split-line",
          autoSplit: true,
          onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.1, ease, stagger: 0.07, delay: 0.85 }),
        });
        gsap.set([title, desc, rule.parentElement], { visibility: "visible" });
        gsap.delayedCall(2, () => {
          rollReady = true;
        });
      });
      document.fonts.ready.then(intro);

      return () => {
        alive = false;
        title?.removeEventListener("pointerover", onRoll);
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="top"
      data-cursor="light"
      data-nav-message="We switch the things"
      className="relative z-0 h-[100svh] min-h-[600px] w-full overflow-hidden bg-bloom text-ink"
    >
      {/* the photograph, in a box of its own 9:16 */}
      <div
        data-intro
        data-hero-bloom
        className="absolute inset-x-0 top-0 mx-auto aspect-[9/16] w-[min(100%,56.25svh)] [mask-image:linear-gradient(to_bottom,#000_62%,transparent_92%)] lg:inset-x-auto lg:bottom-0 lg:left-[max(68%-28.125svh,54%-2.8svh)] lg:top-auto lg:mx-0 lg:h-full lg:w-auto lg:[mask-image:none]"
      >
        <Image
          src="/images/hero-bloom-4k.webp"
          alt="An x-ray photograph of a single cosmos flower, its translucent petals veined in fine black lines"
          fill
          // phones: the full width; desktop: 9/16 of the screen's height
          sizes="(min-width: 1024px) 57vh, 100vw"
          quality={90}
          fetchPriority="high"
          loading="eager"
          className="object-cover"
        />
      </div>

      <div data-hero-copy className="absolute inset-x-0 bottom-0 px-[max(var(--gutter),3.2vw)] pb-[max(24px,4svh)]">
        {/* the facts, justified across a hairline */}
        <div data-intro className="relative">
          <div className="flex items-end justify-between pb-4 text-[13px] font-medium tracking-[-0.01em] text-ink/85 md:text-[15px]">
            {["2024©", "Prime Studio", "Hyderabad"].map((fact) => (
              <span key={fact} className="block overflow-hidden">
                <span data-hero-fact className="block">
                  {fact}
                </span>
              </span>
            ))}
          </div>
          <span data-hero-rule className="absolute inset-x-0 bottom-0 block h-px origin-left bg-ink/25" />
        </div>

        {/* the headline at the left, the description at the right */}
        <div className="mt-8 flex flex-col gap-7 lg:mt-7 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <h1
            data-intro
            data-hero-title
            className="font-sans text-[clamp(3.25rem,13.5vw,5.5rem)] font-medium uppercase leading-[0.86] tracking-[-0.05em] lg:text-[clamp(5rem,8.6vw,10rem)]"
          >
            We switch
            <br />
            the things
          </h1>
          <p
            data-intro
            data-hero-desc
            className="group max-w-[34ch] text-[15px] font-medium leading-[1.4] text-graphite md:text-[17px] lg:mb-[0.6em] lg:max-w-[30ch]"
          >
            A design &amp; development studio built on one belief —{" "}
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat text-ink transition-[background-size] duration-700 ease-prime group-hover:bg-[length:100%_1px]">
              average is not an option.
            </span>{" "}
            We take ideas from zero and push them to their most refined, most premium form.
          </p>
        </div>
      </div>
    </section>
  );
}
