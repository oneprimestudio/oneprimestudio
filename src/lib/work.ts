// The studio's work, shared by the home page's Work row and the /projects index. Facts only: what was
// made, for whom, and what the screens show — no invented clients, figures or quotes.

export const KINDS = ["App", "Brand", "Web", "Motion"] as const;
export type Kind = (typeof KINDS)[number];

export type Work = {
  slug: string;
  title: string;
  /** one line, for cards */
  line: string;
  tag: string;
  /** the /projects filter it falls under */
  kind: Kind;
  year: string;
  client: string;
  /** what the studio did, as short mono tags */
  scope: string[];
  /** the case study's paragraph */
  summary: string;
  /** the case page's story, part by part — written only from what the work itself shows */
  story: { title: string; text: string }[];
  /** a card's dark canvas */
  canvas: string;
};

export const WORK: Work[] = [
  {
    slug: "maera",
    kind: "App",
    title: "Maéra Makeover & Academy",
    line: "Booking, billing and a storefront for a salon and academy.",
    tag: "CRM · SaaS",
    year: "2026",
    client: "Maéra Makeover & Academy",
    scope: ["Product design", "Web app", "Billing", "Storefront"],
    summary:
      "One system for a salon and its academy: a day calendar for every artist and chair, a dashboard of the day's takings, tax invoices and appointment reminders that go out on their own, and a storefront for the menu of services.",
    story: [
      { title: "The day", text: "A day calendar for every artist and every chair: who is in, when, and for what — the whole floor in one view, so the front desk books into real gaps instead of guessing." },
      { title: "The money", text: "A dashboard of the day's takings, and tax invoices raised from the appointment itself, so what was done and what was billed never drift apart." },
      { title: "The reminders", text: "Appointment reminders go out on their own. Clients hear from the salon before they forget, and nobody at the desk has to chase them." },
      { title: "The storefront", text: "The menu of services, by category with prices and durations, published as a storefront — the same list the calendar books from." },
    ],
    canvas: "#2a2227",
  },
  {
    slug: "identity",
    kind: "Brand",
    title: "One Prime Studio",
    line: "An identity whose mark is a switch — hover it.",
    tag: "Brand · Logo",
    year: "2026",
    client: "In-house",
    scope: ["Identity", "Logo", "Type", "Social"],
    summary:
      "Our own mark: the “o” of “one” drawn as a switch, sized and spaced exactly as the letter would be, so it reads as a word first and a control second. It throws on when you hover it, and it carries through every post we publish.",
    story: [
      { title: "The mark", text: "The “o” of “one” drawn as a switch, sized and spaced exactly as the letter would be, so it reads as a word first and a control second." },
      { title: "The behaviour", text: "It throws on when you hover it. A logo that does something says what the studio does: things that work, not only things that look right." },
      { title: "The system", text: "The switch carries through every post we publish. The launch set the order — introduce the studio, show the services, invite the first project." },
    ],
    canvas: "#08064e",
  },
  {
    slug: "site",
    kind: "Web",
    title: "oneprimestudio.com",
    line: "A living WebGL bloom and dithered motion, at 60 fps.",
    tag: "Web · WebGL",
    year: "2026",
    client: "In-house",
    scope: ["Design", "Next.js", "WebGL", "Motion"],
    summary:
      "This site. An x-ray cosmos drawn by a shader that sways, breathes and leans toward your cursor; sections handed over through Bayer-dithered seams; every move on one curve, held to sixty frames a second.",
    story: [
      { title: "The bloom", text: "An x-ray cosmos drawn live by a shader. It sways, breathes and leans toward your cursor — a picture that behaves like a living thing." },
      { title: "The seams", text: "Sections don't cut; they hand over. The next colour arrives through the current one as Bayer-dithered squares, and the same dots carry you between pages." },
      { title: "The curve", text: "Every move runs on one curve — 0.87, 0, 0.13, 1 — and the whole site is held to sixty frames a second." },
    ],
    canvas: "#060608",
  },
  {
    slug: "films",
    kind: "Motion",
    title: "Launch films",
    line: "Kinetic type, the switch and the dither wipe, scored.",
    tag: "Motion · Film",
    year: "2026",
    client: "In-house",
    scope: ["Motion", "Type", "Sound"],
    summary:
      "The films that introduced the studio: kinetic type, the switch throwing on, and the dither wipe that became the site's signature — cut for vertical screens and scored.",
    story: [
      { title: "Kinetic type", text: "The studio's words set in motion: lines that arrive, hold and leave on the same curve the site moves on." },
      { title: "The switch", text: "The mark throws on as the films' turning point — the identity's one idea, said in motion." },
      { title: "The dither wipe", text: "Scenes change through the dither wipe that became the site's signature. Cut for vertical screens and scored." },
    ],
    canvas: "#141b15",
  },
];

/** The brands the studio has worked with, as the user named them. `field` is only what the name itself says. */
export const BRANDS: { name: string; field: string; app?: boolean }[] = [
  { name: "Nethasilks & Co.", field: "Silks" },
  { name: "Jeeva Multispeciality Hospital", field: "Healthcare" },
  { name: "Maéra Makeover & Academy", field: "Salon & academy", app: true },
];
