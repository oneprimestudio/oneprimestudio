import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteShell from "@/components/shell/SiteShell";
import "./globals.css";

// Only the two weights the site uses ship, as WOFF2 (the OTF masters stay in src/fonts).
const neueMontreal = localFont({
  src: [
    { path: "../fonts/ppneuemontreal-book.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ppneuemontreal-medium.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-neue-montreal",
  display: "swap",
});

const gtMono = localFont({
  src: [{ path: "../fonts/GTAmericaMono-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-gt-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "One Prime Studio | Getting ready for prime",
  description:
    "A design & development studio built on one belief: average is not an option. The full site is under construction.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${neueMontreal.variable} ${gtMono.variable} antialiased`}
    >
      <body>
        <noscript>
          <style>{"[data-intro]{visibility:visible}"}</style>
        </noscript>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
