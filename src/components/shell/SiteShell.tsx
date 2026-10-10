"use client";

import { ensureSmoother, ScrollSmoother, useGSAP } from "@/lib/gsap";
import CursorField from "./CursorField";
import Navbar from "./Navbar";

/**
 * The site's persistent frame. Every page renders as `children` inside the smooth-scrolled layer;
 * the navbar (which opens in place, without moving the page) and the cursor trail stay mounted
 * across routes.
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  useGSAP(() => {
    ensureSmoother();

    // in-page anchors glide instead of jumping
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href") ?? "#";
      const target = hash === "#" ? 0 : document.querySelector(hash);
      if (target === null) return;
      e.preventDefault();
      const smoother = ScrollSmoother.get();
      if (smoother) smoother.scrollTo(target, true, "top top");
      else if (target === 0) window.scrollTo({ top: 0 });
      else target.scrollIntoView();
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      ScrollSmoother.get()?.kill();
    };
  });

  return (
    <>
      <CursorField />
      <Navbar />
      <div id="smooth-wrapper" className="relative z-10 bg-sand">
        <div id="smooth-content">{children}</div>
      </div>
    </>
  );
}
