"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { ONCE } from "@/lib/gsap";
import React, { useRef } from "react";

/**
 * Line-by-line reveal for running text.
 *
 * SplitText cuts the element into lines and masks each one, then the lines rise
 * out of their own masks on a stagger. It is the body-copy counterpart to the
 * masked display lines the headings already use — same gesture, applied to the
 * paragraph instead of the headline.
 *
 * Wrap a single element:
 *
 *     <Text><p className={lead}>…</p></Text>
 *
 * …or a container of several, marked `data-copy-wrapper`, to split each child
 * separately (so a two-paragraph block staggers as two blocks, not as one run
 * of lines):
 *
 *     <Text><div data-copy-wrapper className={copy}><p>…</p><p>…</p></div></Text>
 *
 * Anything wrapped here must NOT also carry `rv` — that is the site's other
 * reveal primitive (see lib/motion) and the two would animate the same element
 * against each other.
 */

/* Registration is guarded because this module is evaluated on the server too
   during SSR, where there is no document for the plugins to attach to. */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
  /* The house curve: a long flat hold, then a single unhurried sweep to rest.
     Named rather than inlined so every reveal on the site can ask for the same
     motion by name. */
  CustomEase.create("reveal.wipe", "M0,0 C0.4,0 0.2,1 1,1");
}

type EaseType =
  | "reveal.wipe"
  | "power4.out"
  | "power3.out"
  | "power2.out"
  | "expo.out"
  | "elastic.out(1,0.5)"
  | "back.out(1.7)"
  | "circ.out";

type AnimationVariant =
  | "slideUp"
  | "slideDown"
  | "reveal"
  | "cascade"
  | "drift"
  | "spring"
  | "glide";

interface TextYProps {
  children: React.ReactElement | React.ReactElement[];
  animateOnScroll?: boolean;
  delay?: number;
  variant?: AnimationVariant;
  stagger?: number;
  duration?: number;
  ease?: EaseType;
  scrollStart?: string;
  indentLines?: Record<number, string>;
  /**
   * Justify the passage — set both edges flush, the last line left as it falls.
   *
   * This has to be a prop rather than a `text-justify` class on the child, and
   * that is not a matter of taste. SplitText turns one paragraph into a STACK
   * of block-level lines, and `text-align: justify` never justifies the last
   * line of a block — so once every line is its own block, every line is a
   * last line and the declaration quietly stops doing anything at all. The
   * class would still be sitting on the element, computing to `justify`, with
   * nothing justified. Forcing it back on means `text-align-last`, per line,
   * applied AFTER the split and skipping each element's real final line —
   * which is work only this component is in a position to do.
   *
   * Worth using only where the measure can afford it. A justified column
   * narrower than about forty characters spends the spacing it cannot absorb
   * on rivers instead, which is why components/FactStrip dropped it when its
   * record moved into a half-width column.
   */
  justify?: boolean;
}

interface AnimationConfig {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

const VARIANT_CONFIGS: Record<AnimationVariant, AnimationConfig> = {
  slideUp: {
    from: { y: "110%", opacity: 1 },
    to: { y: "0%", opacity: 1, ease: "reveal.wipe", duration: 1 },
  },
  slideDown: {
    from: { y: "-110%", opacity: 1 },
    to: { y: "0%", opacity: 1, ease: "power4.out", duration: 0.9 },
  },
  reveal: {
    from: { y: "105%", scaleY: 1.12, opacity: 0 },
    to: { y: "0%", scaleY: 1, opacity: 1, ease: "expo.out", duration: 0.85 },
  },
  cascade: {
    from: { y: "100%", filter: "blur(12px)", opacity: 0 },
    to: { y: "0%", filter: "blur(0px)", opacity: 1, ease: "power3.out", duration: 1.1 },
  },
  drift: {
    from: { y: "80%", x: "-6px", opacity: 0, rotation: 1.5 },
    to: { y: "0%", x: "0px", opacity: 1, rotation: 0, ease: "circ.out", duration: 1.4 },
  },
  spring: {
    from: { y: "100%", scaleX: 0.92, opacity: 0 },
    to: { y: "0%", scaleX: 1, opacity: 1, ease: "elastic.out(1,0.5)", duration: 1.3 },
  },
  glide: {
    from: { y: "100%", skewY: 3, opacity: 0 },
    to: { y: "0%", skewY: 0, opacity: 1, ease: "power4.out", duration: 1.05 },
  },
};

const Text: React.FC<TextYProps> = ({
  children,
  animateOnScroll = true,
  delay = 0,
  variant = "slideUp",
  stagger,
  duration,
  ease,
  scrollStart = "top 75%",
  indentLines,
  justify = false,
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const elementRef = useRef<HTMLElement[]>([]);
  const splitRef = useRef<SplitText[]>([]);
  const lines = useRef<HTMLElement[]>([]);

  useGSAP(
    () => {
      /* `cancelled` and the hoisted cleanup are the one change from the
         reference implementation. The build has to wait on document.fonts —
         splitting before the real face has loaded cuts the lines at the
         fallback's metrics and they re-wrap underneath the mask — but a
         cleanup returned from inside that promise callback is returned to the
         promise, not to useGSAP, so the splits would never be reverted. On a
         route change that leaks the split DOM and leaves stale ScrollTriggers
         pointing at detached nodes. */
      let cancelled = false;

      document.fonts.ready.then(() => {
        if (cancelled || !containerRef.current) return;

        splitRef.current = [];
        elementRef.current = [];
        lines.current = [];

        const container = containerRef.current;
        const config = VARIANT_CONFIGS[variant];

        const toVars: gsap.TweenVars = {
          ...config.to,
          duration: duration ?? (config.to.duration as number),
          ease: ease ?? (config.to.ease as string),
          stagger: stagger ?? 0.1,
          delay,
        };

        const elements: HTMLElement[] = container.hasAttribute("data-copy-wrapper")
          ? (Array.from(container.children) as HTMLElement[])
          : [container];

        elements.forEach((element) => {
          elementRef.current.push(element);

          /* Read the indent BEFORE splitting, and clear our own inline value
             first.

             Both halves matter. This effect re-runs — StrictMode's double
             invoke, a resize, any dependency change — and the `textIndent = 0`
             written at the bottom of this block is an inline style that
             SplitText's revert does not undo, because we set it, not SplitText.
             So on the second run `getComputedStyle` read back "0px", the branch
             below never fired, and the indent was gone for good: the class was
             still on the element but computed to nothing. Clearing it restores
             whatever the class actually asks for.

             Reading before `create()` also means the split measures the lines
             with the indent still live, which is what makes the first line
             break in the right place rather than a word or two late. */
          element.style.textIndent = "";
          const textIndent = window.getComputedStyle(element).textIndent;

          const split = SplitText.create(element, {
            type: "lines",
            mask: "lines",
            linesClass: "line++",
          });

          splitRef.current.push(split);

          /* `text-indent` is inherited, and the split turns one paragraph into
             a stack of block-level lines — each its own block container with a
             first line of its own. Left on the element it would indent EVERY
             line, which reads as a block shifted right rather than an indent.
             So it moves onto the first line as padding and is zeroed here. */
          if (textIndent && textIndent !== "0px") {
            if (split.lines.length > 0) {
              (split.lines[0] as HTMLElement).style.paddingLeft = textIndent;
            }
            element.style.textIndent = "0";
          }

          /* Justification, re-applied to the lines the split just made.
             Every line but the element's own last one is forced flush with
             `text-align-last`; the real final line is left alone so the
             paragraph still ends where the words end rather than being
             stretched across the measure. Done per ELEMENT, inside this loop,
             because "the last line" is only meaningful per paragraph — a
             `data-copy-wrapper` holding three of them has three last lines,
             and reading the flat list afterwards would justify the end of the
             first two. */
          if (justify) {
            const own = split.lines as HTMLElement[];
            own.forEach((line, i) => {
              line.style.textAlign = "justify";
              if (i < own.length - 1) line.style.textAlignLast = "justify";
            });
          }

          lines.current.push(...(split.lines as HTMLElement[]));
        });

        if (indentLines) {
          lines.current.forEach((line, i) => {
            if (indentLines[i] !== undefined) line.style.paddingLeft = indentLines[i];
          });
        }

        /* A reader who has asked for less motion still gets the text — the
           split stands, the reveal does not. */
        if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
          gsap.set(lines.current, { ...config.to, duration: 0, delay: 0, stagger: 0 });
          return;
        }

        // each line on its own layer while it rises (and, for the cascade, while its blur clears), so the page
        // around it isn't repainted every frame; back to normal once it has landed
        const promote = "filter" in config.from ? "transform, opacity, filter" : "transform, opacity";
        gsap.set(lines.current, { ...config.from, willChange: promote });
        toVars.onComplete = () => gsap.set(lines.current, { willChange: "auto" });

        if (animateOnScroll) {
          gsap.to(lines.current, {
            ...toVars,
            scrollTrigger: { trigger: container, start: scrollStart, ...ONCE },
          });
        } else {
          gsap.to(lines.current, toVars);
        }
      });

      return () => {
        cancelled = true;
        splitRef.current.forEach((split) => split?.revert());
        splitRef.current = [];
      };
    },
    {
      scope: containerRef as React.RefObject<HTMLElement>,
      dependencies: [
        animateOnScroll,
        delay,
        variant,
        stagger,
        duration,
        ease,
        scrollStart,
        indentLines,
        justify,
      ],
    }
  );

  if (React.Children.count(children) === 1) {
    const child = children as React.ReactElement;
    return React.cloneElement(child, { ref: containerRef } as any);
  }

  return null;
};

export default Text;
