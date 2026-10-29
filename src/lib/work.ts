// The studio's work, shared by the home page's Work row, the /projects index and each case page. Facts
// only: what was made, for whom, and what the screens show — no invented figures or quotes. Client facts
// (places, departments, courses, collections) are as each client's own site states them.

export const KINDS = ["Software", "Web", "App", "Brand", "Motion"] as const;
export type Kind = (typeof KINDS)[number];

/** a picture of the work: a capture of the live site, a product screen, a post or a film */
export type Shot = {
  src: string;
  alt: string;
  /** the frame it is shown in */
  ratio: "4/5" | "900/580";
  caption: string;
  /** a film rather than a still (src is then its poster) */
  video?: string;
};

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
  /** where the client is */
  place?: string;
  /** the live site, when there is one */
  url?: string;
  /** what the studio did, as short tags */
  scope: string[];
  /** the case study's paragraph */
  summary: string;
  /** the case page's story, part by part — written only from what the work itself shows */
  story: { title: string; text: string }[];
  /** the case page's pictures, in order */
  shots: Shot[];
  /** the work's own pictures are still to come: cards and the cover draw a placeholder */
  pending?: boolean;
  /** a card's dark canvas */
  canvas: string;
};

const C = "/images/work/clients";

export const WORK: Work[] = [
  {
    slug: "jeeva",
    kind: "Software",
    title: "Jeeva Multispeciality Hospital",
    line: "The software that runs a multispeciality hospital, and the website patients meet it through.",
    tag: "Hospital software · Website",
    year: "2026",
    client: "Jeeva Multispeciality Hospital",
    place: "Hanamkonda, Warangal",
    url: "https://www.jeevamultispecialityhospital.com/",
    scope: ["Hospital management software", "Website", "Product design", "Engineering"],
    summary:
      "Both sides of a multispeciality hospital in Hanamkonda: the entire managing system behind it — sixteen departments and a panel of nineteen-plus consultants, run from one place around one record for every patient — and the website in front of it.",
    story: [
      {
        title: "One record",
        text: "Every visit, prescription, scan and bill on one hospital ID — so a doctor reads a patient's history instead of asking for it, even years later.",
      },
      {
        title: "The panel",
        text: "Each consultant with their specialty, days, OPD hours and fee, booked into live slots instead of a pooled queue.",
      },
      {
        title: "The departments",
        text: "Sixteen departments under one roof, from child care to neurosurgery — each with its consultants, its rooms and its published ward rates.",
      },
      {
        title: "The website",
        text: "We built the site too, so the front door and the system behind it are one design: find a doctor, pick a live slot, see every room's price, or call the 24×7 emergency line.",
      },
    ],
    shots: [
      { src: `${C}/jeeva-1.webp`, alt: "Jeeva's site: “Care that remembers you”, beside the hospital building and its figures", ratio: "16/10", caption: "Care that remembers you" },
      { src: `${C}/jeeva-2.webp`, alt: "Jeeva on a phone: one building, one record, one ID for life; 16 departments, 19+ consultants", ratio: "4/5", caption: "One record, on a phone" },
      { src: `${C}/jeeva-3.webp`, alt: "Jeeva's departments, each with its consultants, from child care to surgical care", ratio: "16/10", caption: "Every specialty" },
      { src: `${C}/jeeva-4.webp`, alt: "Jeeva on a phone: find a doctor, book an appointment, rooms and prices, emergency 24×7", ratio: "4/5", caption: "The front door" },
      { src: `${C}/jeeva-5.webp`, alt: "Jeeva's site: one hospital ID for life, and booking a consultant's slot", ratio: "16/10", caption: "Pick your consultant, pick your slot" },
    ],
    canvas: "#0f2a25",
  },
  {
    slug: "maera",
    kind: "Web",
    title: "Maéra Makeover & Academy",
    line: "An aesthetic website for a women-only studio and academy.",
    tag: "Website",
    year: "2026",
    client: "Maéra Makeover & Academy",
    place: "Uppal, Hyderabad",
    url: "https://www.maeraacademy.com/",
    scope: ["Website", "Website design", "Engineering"],
    summary:
      "An aesthetic website for Maéra's bridal, salon and academy work in Uppal, Hyderabad: the studio's makeovers and rituals, and the academy's certified courses, with admissions a tap away.",
    story: [
      {
        title: "The website",
        text: "Bridal, HD and party makeovers, skin and hair rituals, and the academy's certified courses — told as an editorial, in Maéra's own pink and serif.",
      },
      {
        title: "The academy",
        text: "Forty-five-day courses taught on live models, weekday and weekend batches, and a free career-counselling call a tap away: admissions are the site's other job.",
      },
    ],
    shots: [
      { src: `${C}/maera-1.webp`, alt: "Maéra's site: “Welcome to Maéra — become a certified makeup artist in 45 days”", ratio: "16/10", caption: "Welcome to Maéra" },
      { src: `${C}/maera-2.webp`, alt: "Maéra's site on a phone: the studio's welcome and its booking button", ratio: "4/5", caption: "The studio, on a phone" },
      { src: `${C}/maera-3.webp`, alt: "Maéra's site: “Become a certified makeup artist”, the academy's offer", ratio: "16/10", caption: "The academy" },
      { src: `${C}/maera-4.webp`, alt: "Maéra's academy on a phone: 45 days, live-model practice, certification", ratio: "4/5", caption: "Admissions" },
      { src: `${C}/maera-5.webp`, alt: "Maéra's courses: makeup artistry, bridal makeup, skin and medi-facials", ratio: "16/10", caption: "Learn the craft, hands-on" },
    ],
    canvas: "#2a2227",
  },
  {
    slug: "maera-crm",
    kind: "Software",
    title: "Maéra CRM",
    line: "The CRM that runs Maéra's studio floor, from the day's bookings to the invoice.",
    tag: "CRM",
    year: "2026",
    client: "Maéra Makeover & Academy",
    place: "Uppal, Hyderabad",
    scope: ["CRM", "Booking", "Billing", "Product design"],
    summary:
      "The system behind Maéra's studio and academy in Uppal, Hyderabad: every artist's day and every chair in one view, the day's takings, and tax invoices raised from the appointment itself.",
    story: [
      {
        title: "The day",
        text: "A day calendar for every artist and every chair: who is in, when, and for what — the whole floor in one view.",
      },
      {
        title: "The money",
        text: "A dashboard of the day's takings, and tax invoices raised from the appointment itself, with reminders that go out to clients on their own.",
      },
    ],
    shots: [
      { src: "/images/work/maera-crm.png", alt: "Maéra's CRM dashboard: today's takings, the chairs in use and the appointments", ratio: "900/580", caption: "The day's takings" },
      { src: "/images/work/maera-client.png", alt: "Maéra's CRM calendar: each artist's day", ratio: "900/580", caption: "The calendar" },
      { src: "/images/work/maera-bill.jpg", alt: "A Maéra tax invoice beside the appointment reminder sent to the client", ratio: "900/580", caption: "Invoice & reminder" },
    ],
    canvas: "#1c1d22",
  },
  {
    slug: "maera-app",
    kind: "App",
    title: "Maéra App",
    line: "Our second project with Maéra: the studio, in an app.",
    tag: "App",
    year: "2026",
    client: "Maéra Makeover & Academy",
    place: "Uppal, Hyderabad",
    scope: ["App", "Product design", "Engineering"],
    summary:
      "After the website and the CRM, Maéra came back to us for a second project: an app for the studio and its academy.",
    story: [
      {
        title: "The second project",
        text: "A client returning is the best brief there is. After the website and the CRM, Maéra asked for an app — this case fills in as its screens are ready to show.",
      },
    ],
    shots: [],
    pending: true,
    canvas: "#3a1f2a",
  },
  {
    slug: "netha",
    kind: "Web",
    title: "Netha Silks & Co.",
    line: "An online store for handwoven silk sarees from Pochampally.",
    tag: "Online store",
    year: "2026",
    client: "Netha Silks & Co.",
    place: "Bhoodan Pochampally, Telangana",
    url: "https://www.nethasilksandco.com/",
    scope: ["E-commerce", "Website design", "Engineering", "Catalogue"],
    summary:
      "The online store we designed and built for handloom weavers in Bhoodan Pochampally, Telangana, weaving since 1987: every saree woven by hand, on one loom, by one weaver — now browsed, wishlisted and bought online.",
    story: [
      {
        title: "The heritage",
        text: "Handloom weavers since 1987 — one loom, one weaver, several weeks for a saree. The site opens on that story before it opens the shop.",
      },
      {
        title: "The collections",
        text: "Eight silks, each its own series: Paithani, Patola, Tussar, Banarasi, Chanderi, Kanchipuram, Mysore and Organza.",
      },
      {
        title: "The shop",
        text: "New arrivals with their silk, their name and their price, a wishlist, an account and a bag — from the loom to the doorstep.",
      },
    ],
    shots: [
      { src: `${C}/netha-1.webp`, alt: "Netha Silks: “luxurious comfort made for you”, a handwoven saree in teal", ratio: "16/10", caption: "Luxurious comfort" },
      { src: `${C}/netha-2.webp`, alt: "Netha Silks on a phone: the Banarasi silk series", ratio: "4/5", caption: "A series, on a phone" },
      { src: `${C}/netha-3.webp`, alt: "Netha Silks' new arrivals, each with its silk, name and price", ratio: "16/10", caption: "New arrivals" },
      { src: `${C}/netha-4.webp`, alt: "Netha Silks on a phone: the collection, heritage and craftsmanship", ratio: "4/5", caption: "The collection" },
    ],
    canvas: "#3a1714",
  },
  {
    slug: "site",
    kind: "Web",
    title: "oneprimestudio.com",
    line: "A living WebGL bloom and dithered motion, at 60 fps.",
    tag: "Web · WebGL",
    year: "2026",
    client: "In-house",
    place: "Hyderabad",
    url: "/",
    scope: ["Design", "Next.js", "WebGL", "Motion"],
    summary:
      "This site. An x-ray cosmos drawn by a shader that sways, breathes and leans toward your cursor; sections handed over through Bayer-dithered seams; every move on one curve, held to sixty frames a second.",
    story: [
      { title: "The bloom", text: "An x-ray cosmos drawn live by a shader. It sways, breathes and leans toward your cursor — a picture that behaves like a living thing." },
      { title: "The seams", text: "Sections don't cut; they hand over. The next colour arrives through the current one as Bayer-dithered squares, and the same dots carry you between pages." },
      { title: "The curve", text: "Every move runs on one curve — 0.87, 0, 0.13, 1 — and the whole site is held to sixty frames a second." },
    ],
    shots: [
      { src: `${C}/own-1.webp`, alt: "The home page: “Average is not an option”, with the studio's facts and services", ratio: "16/10", caption: "The studio" },
      { src: `${C}/own-4.webp`, alt: "The home page on a phone", ratio: "4/5", caption: "On a phone" },
      { src: `${C}/own-2.webp`, alt: "The services: white cards over the poppy, carried by the scroll", ratio: "16/10", caption: "What we make" },
      { src: `${C}/own-3.webp`, alt: "The about page's globe, drawing the line from Hyderabad", ratio: "16/10", caption: "The globe" },
    ],
    canvas: "#060608",
  },
  {
    slug: "identity",
    kind: "Brand",
    title: "One Prime Studio",
    line: "An identity whose mark is a switch — hover it.",
    tag: "Brand · Logo",
    year: "2026",
    client: "In-house",
    place: "Hyderabad",
    scope: ["Identity", "Logo", "Type", "Social"],
    summary:
      "Our own mark: the “o” of “one” drawn as a switch, sized and spaced exactly as the letter would be, so it reads as a word first and a control second. It throws on when you hover it, and it carries through every post we publish.",
    story: [
      { title: "The mark", text: "The “o” of “one” drawn as a switch, sized and spaced exactly as the letter would be, so it reads as a word first and a control second." },
      { title: "The behaviour", text: "It throws on when you hover it. A logo that does something says what the studio does: things that work, not only things that look right." },
      { title: "The system", text: "The switch carries through every post we publish. The launch set the order — introduce the studio, show the services, invite the first project." },
    ],
    shots: [
      { src: "/images/work/slide-logo.jpg", alt: "The “Introducing” post from the studio's launch", ratio: "4/5", caption: "Introducing" },
      { src: "/images/work/slide-services.jpg", alt: "The “Services” post from the studio's launch", ratio: "4/5", caption: "Services" },
      { src: "/images/work/slide-cta.jpg", alt: "The “Let's build” post from the studio's launch", ratio: "4/5", caption: "Let's build" },
    ],
    canvas: "#08064e",
  },
  {
    slug: "films",
    kind: "Motion",
    title: "Launch films",
    line: "Kinetic type, the switch and the dither wipe, scored.",
    tag: "Motion · Film",
    year: "2026",
    client: "In-house",
    place: "Hyderabad",
    scope: ["Motion", "Type", "Sound"],
    summary:
      "The films that introduced the studio: kinetic type, the switch throwing on, and the dither wipe that became the site's signature — cut for vertical screens and scored.",
    story: [
      { title: "Kinetic type", text: "The studio's words set in motion: lines that arrive, hold and leave on the same curve the site moves on." },
      { title: "The switch", text: "The mark throws on as the films' turning point — the identity's one idea, said in motion." },
      { title: "The dither wipe", text: "Scenes change through the dither wipe that became the site's signature. Cut for vertical screens and scored." },
    ],
    shots: [
      { src: "/images/work/film-04.jpg", video: "/videos/oneprime-logo-intro-540.mp4", alt: "The One Prime logo film", ratio: "4/5", caption: "The logo film" },
      { src: "/images/work/film-01.jpg", alt: "", ratio: "4/5", caption: "0:01.5" },
      { src: "/images/work/film-02.jpg", alt: "", ratio: "4/5", caption: "0:02.9" },
      { src: "/images/work/film-03.jpg", alt: "", ratio: "4/5", caption: "0:04.5" },
    ],
    canvas: "#141b15",
  },
];

export const workBySlug = (slug: string) => WORK.find((w) => w.slug === slug);

/** The brands the studio has worked with: their own sites, and what each one is, as they describe themselves. */
export const BRANDS: { name: string; field: string; url: string; slug: string; app?: boolean }[] = [
  { name: "Netha Silks & Co.", field: "Handloom silks", url: "https://www.nethasilksandco.com/", slug: "netha" },
  { name: "Jeeva Multispeciality Hospital", field: "Healthcare", url: "https://www.jeevamultispecialityhospital.com/", slug: "jeeva" },
  { name: "Maéra Makeover & Academy", field: "Studio & academy", url: "https://www.maeraacademy.com/", slug: "maera", app: true },
];
