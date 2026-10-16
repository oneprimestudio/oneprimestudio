"use client";

import { ensureSmoother, ScrollSmoother, useGSAP } from "@/lib/gsap";
import CursorField from "./CursorField";
import Footer from "./Footer";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";

/**
 * The site's persistent frame. Every page renders as `children` inside the smooth-scrolled layer, above
 * the footer; the navbar (which opens in place, without moving the page), the cursor trail and the page
 * transition (which also owns link clicks: anchors glide, other pages arrive through a dither seam) stay
 * mounted across routes.
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  useGSAP(() => {
    ensureSmoother();
    return () => ScrollSmoother.get()?.kill();
  });

  return (
    <>
      <CursorField />
      <Navbar />
      <PageTransition />
      <div id="smooth-wrapper" className="relative z-10 bg-sand">
        <div id="smooth-content">
          {children}
          <Footer />
        </div>
      </div>
    </>
  );
}
