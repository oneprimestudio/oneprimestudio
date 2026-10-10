import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP for browsers without it
    formats: ["image/avif", "image/webp"],
    // 75 is the default; 90 keeps the hero photograph clean when it is drawn large
    qualities: [75, 90],
    // only the site's own images may be optimised — no other path, no query strings
    localPatterns: [{ pathname: "/images/**", search: "" }],
  },
};

export default nextConfig;
