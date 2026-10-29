// A still of a page at a device's viewport and density, in headless Chrome over CDP — for project banners.
//
//   node capture.mjs <url> <out.png> <width> <height> <dpr> [--wait=ms] [--crm-login=<origin>] [--mobile]
//                    [--headed --until=<host/path prefix>]
//
// --crm-login signs in to a local Maéra CRM first with the staff account from that project's own seed
// file (prisma/seed.ts), so no credentials live here or on the command line.
// --headed opens a visible window instead, for a portal whose sign-in a person does themselves: the
// still is taken once the page reaches --until (e.g. admin.localhost:3000/admin) and has settled.
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [url, out, w, h, dpr] = process.argv.slice(2);
const flag = (name) => process.argv.find((a) => a.startsWith(`--${name}`))?.split("=")[1];
const WAIT = +(flag("wait") ?? 2500);
const LOGIN = flag("crm-login");
const MOBILE = process.argv.includes("--mobile");
const HEADED = process.argv.includes("--headed");
const UNTIL = flag("until");
const PORT = 9500 + Math.floor(Math.random() * 200);

const chrome = spawn(CHROME, [
  ...(HEADED ? [] : ["--headless=new"]), `--remote-debugging-port=${PORT}`, `--window-size=${w},${h}`,
  "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--hide-scrollbars", "--mute-audio",
  "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${process.env.TEMP}/banner-capture-${PORT}`, "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  // the blank page this script opened, not a tab Chrome adds of its own when it has a window
  try { target = (await (await fetch(`http://localhost:${PORT}/json/list`)).json()).find((t) => t.type === "page" && t.url === "about:blank"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onclose = () => { console.error("lost the page (was its window closed?)"); process.exit(1); };
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg), pending.delete(msg.id); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (u) => { await send("Page.navigate", { url: u }); await sleep(800); for (let i = 0; i < 80 && (await ev("document.readyState")) !== "complete"; i++) await sleep(250); };

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: +dpr, mobile: MOBILE });
if (MOBILE) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

if (LOGIN) {
  const seed = readFileSync("C:/Users/ruthw/Documents/SaaS/maera-crm/prisma/seed.ts", "utf8");
  const password = seed.match(/bcrypt\.hash\("([^"]+)"/)[1];
  const email = seed.match(/email: "([^"]+)"/)[1];
  await go(`${LOGIN}/crm/staff`);
  const status = await ev(`fetch("/crm/api/auth/login", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(${JSON.stringify({ email, password })}) }).then((r) => r.status)`);
  console.log("login", status);
}

await go(url);
// a dev server's own overlay (Next's "N" badge) is not part of the work
await ev(`document.head.append(Object.assign(document.createElement("style"), { textContent: "nextjs-portal { display: none !important; }" }))`);
if (UNTIL) {
  console.log(`waiting for ${UNTIL} (sign in in the Chrome window)`);
  // up to 10 minutes for the person to sign in
  for (let i = 0; i < 1200; i++) {
    const at = await ev("location.host + location.pathname");
    if (at?.startsWith(UNTIL) && (await ev("document.readyState")) === "complete") break;
    await sleep(500);
  }
}
await sleep(WAIT);
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("wrote", out, await ev("location.pathname"));
ws.close();
chrome.kill();
process.exit(0);
