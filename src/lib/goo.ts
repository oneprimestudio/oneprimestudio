import { gsap, ONCE, prefersReducedMotion, SplitText } from "./gsap";

/*
 * Headings that arrive as ink, after bleibtgleich.dev: each line starts as a heavy blur run through an
 * alpha threshold — so it shows as a few liquid blobs, not a haze — and as the blur falls away the blobs
 * pull together into crisp letters. One SVG filter per line (its blur is what animates), removed once
 * the line is sharp, so nothing is filtered at rest.
 *
 *   alpha' = 19·alpha − 9      the threshold: soft edges become hard, a blur becomes a blob
 */

const NS = "http://www.w3.org/2000/svg";
let count = 0;

function filter() {
  const id = `goo-${++count}`;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  svg.innerHTML =
    `<filter id="${id}" x="-15%" y="-60%" width="130%" height="220%" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="0"/>` +
    `<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"/>` +
    `</filter>`;
  document.body.appendChild(svg);
  return { id, blur: svg.querySelector("feGaussianBlur")!, remove: () => svg.remove() };
}

/**
 * One element (a line, a word) firms up out of blobs. Returns the timeline; `from` is the starting blur
 * in px, as a share of the element's font size if it is under 1.
 */
export function gooIn(el: HTMLElement, { from = 0.2, duration = 1.25, delay = 0 } = {}) {
  // the filter exists only while the element is firming up: made when it starts, removed when sharp
  let f: ReturnType<typeof filter> | null = null;
  const blur = { v: 0 };
  const done = () => {
    el.style.filter = "";
    f?.remove();
    f = null;
  };
  return gsap
    .timeline({
      delay,
      onStart: () => {
        f = filter();
        const size = parseFloat(getComputedStyle(el).fontSize) || 40;
        blur.v = from < 1 ? size * from : from;
        f.blur.setAttribute("stdDeviation", blur.v.toFixed(2));
        el.style.filter = `url(#${f.id})`;
      },
      onComplete: done,
      onInterrupt: done,
    })
    .fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: duration * 0.25, ease: "none" }, 0)
    .to(
      blur,
      {
        v: 0,
        duration,
        ease: "power3.out",
        onUpdate: () => f?.blur.setAttribute("stdDeviation", blur.v.toFixed(2)),
      },
      0,
    );
}

/** a heading's lines come in one after another as it scrolls into view */
const play = (node: HTMLElement, lines: HTMLElement[]) => {
  gsap.set(lines, { autoAlpha: 0 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: node, start: "top 86%", ...ONCE } });
  lines.forEach((line, i) => tl.add(gooIn(line), i * 0.12));
  return tl;
};

/**
 * Every `[data-goo]` heading inside `scope` comes in line by line as it scrolls into view: split into
 * lines by SplitText, or — `data-goo="blocks"`, for a heading already set as one element per line (and
 * holding things React manages, like form fields, which must not be re-wrapped) — by its own children.
 * Call from a section's useGSAP (its context reverts the splits and triggers).
 */
export function gooHeadings(scope: Element) {
  if (prefersReducedMotion()) return;
  scope.querySelectorAll<HTMLElement>("[data-goo]").forEach((node) => {
    gsap.set(node, { autoAlpha: 1 });
    if (node.dataset.goo === "blocks") {
      play(node, Array.from(node.children) as HTMLElement[]);
      return;
    }
    SplitText.create(node, {
      type: "lines",
      linesClass: "goo-line",
      autoSplit: true,
      onSplit: (self) => play(node, self.lines as HTMLElement[]),
    });
  });
}
