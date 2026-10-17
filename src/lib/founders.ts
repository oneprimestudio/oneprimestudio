// The founders, for /about: the card and the drawer behind "More details" both read from here, so the
// words can be changed in one place. Roles are the founders' own; the quotes and the longer copy are
// drafts written from those roles — edit them to the founders' own words.

export type Founder = {
  slug: string;
  initials: string;
  /** their portrait (public/), and where in it the face sits, as a CSS object-position for a 4:5 frame */
  photo: string;
  focus: string;
  name: string;
  role: string;
  /** one line, for the card */
  line: string;
  quote: string;
  about: string[];
  does: string[];
  /** how they work, in short principles */
  how: string[];
  skills: { title: string; items: string[] }[];
};

export const FOUNDERS: Founder[] = [
  {
    slug: "nagaruthwik",
    initials: "MN",
    photo: "/images/ruthwik founder.jpeg",
    focus: "50% 82%",
    name: "M. Nagaruthwik",
    role: "founder · Full-stack engineer & creative designer",
    line: "Shapes the identity and the interface, then builds them end to end.",
    quote: "A brand isn’t finished until it works, and software isn’t finished until it feels like the brand.",
    about: [
      "Nagaruthwik works where design and engineering meet: shaping a business’s identity (the mark, the type, the voice), then designing the interface and building it, front to back.",
      "Because the same person draws it and codes it, nothing is lost between the mockup and the product: what you approve is what ships.",
    ],
    does: ["Brand & identity", "UI / UX design", "Front-end engineering", "Full-stack development", "Motion & interaction"],
    how: [
      "Design in the browser, not only in mockups.",
      "Every animation earns its place, and runs at sixty frames a second.",
      "Ship the smallest real thing first, then refine it.",
    ],
    skills: [
      { title: "Design", items: ["Identity systems", "Interface design", "Prototyping", "Motion"] },
      { title: "Engineering", items: ["Next.js & React", "TypeScript", "WebGL & three.js", "GSAP", "APIs & databases"] },
    ],
  },
  {
    slug: "vinith",
    initials: "AV",
    photo: "/images/vinith co founder.jpeg",
    focus: "50% 22%",
    name: "A. Vinith",
    role: "founder · Senior backend engineer & database administrator",
    line: "Builds the systems underneath: the APIs, the data and the databases that hold it.",
    quote: "The best backend is the one nobody notices: fast on the first day, and still fast a million rows later.",
    about: [
      "Vinith builds the part of a product people never see and always feel: the APIs and data models behind every system the studio ships, and the databases that hold them: their structure, speed, backups and security.",
      "When a CRM has to stay quick with years of records, or a store has to take every order without losing one, that is Vinith’s work.",
    ],
    does: ["Backend architecture", "API design", "Data modelling", "Database administration", "Performance & reliability"],
    how: [
      "Design the data first. The screens follow.",
      "Measure before optimising, and again after.",
      "A backup is only real once it has been restored.",
    ],
    skills: [
      { title: "Backend", items: ["API design", "Authentication & access", "Integrations", "Background jobs"] },
      { title: "Data", items: ["Schema design", "Query tuning & indexing", "Backup & recovery", "Monitoring"] },
    ],
  },
];
