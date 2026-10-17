import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP only. AVIF is encoded on demand the first time each size is asked for, and that encode is slow
    // (measured 1.3–1.8 s an image cold, against ~0.5 s for WebP), so a first visit sat on blank frames
    // while the images queued behind it. Our sources are already compressed WebP/JPEG, so AVIF saved little
    formats: ["image/webp"],
    // 75 is the default; 90 keeps the hero photograph clean when it is drawn large
    qualities: [75, 90],
    // only the site's own images may be optimised — no other path, no query strings
    localPatterns: [{ pathname: "/images/**", search: "" }],
  },
};

export default nextConfig;
