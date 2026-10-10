// Render review stills: node scripts/stills.mjs 1.2 4.6 16.1 …  (seconds) → out/stills/<sec>.png
import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const secs = process.argv.slice(2).map(Number);
const scale = Number(process.env.SCALE ?? 0.5);
const out = path.join(root, "out", "stills");
fs.mkdirSync(out, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.jsx") });
const browser = await openBrowser("chrome");
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "Intro", puppeteerInstance: browser });
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
  const file = path.join(out, `${s.toFixed(2)}.png`);
  await renderStill({ composition, serveUrl, output: file, frame, scale, puppeteerInstance: browser, imageFormat: "png" });
  console.log("still", s.toFixed(2), "→", path.relative(root, file));
}
await browser.close({ silent: true });
