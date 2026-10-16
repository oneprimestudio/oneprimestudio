"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "@/components/world/Globe";
import PlacePicker from "@/components/world/PlacePicker";
import { HOME, PLACES, distanceKm, offsetMinutes } from "@/lib/geo/places";
import { ensureSmoother, gsap, hoverScramble, MENU_EASE, prefersReducedMotion, ScrollTrigger, useGSAP } from "@/lib/gsap";

/*
 * Where we are — one screen, on home and /about. The globe owns the middle; the words keep to the corners:
 *
 *   top left      the label and one small sentence: Hyderabad, remote for everywhere
 *   top right     Hyderabad's clock and coordinates
 *   bottom left   what the line means once there is one: how far, how many hours apart, their 9 to 6 in ours
 *   bottom right  "Where are you from?"
 *
 * The screen pins for a while: the scroll carries the globe from small and centred to large and settled on
 * the bottom edge, its top half showing, turning it a little on the way (Globe reads `progress`). Choosing
 * a place lifts it back to the centre and swings it to the line.
 */

const label = "font-mono text-[10px] uppercase md:text-[11px]";
const top = "top-[calc(var(--nav-top)+var(--nav-h)+28px)]";

const hm = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
const span = (minutes: number) => {
  const a = Math.abs(minutes);
  const h = Math.floor(a / 60);
  const m = a % 60;
  return `${h} h${m ? ` ${m} m` : ""}`;
};

/** the time in Hyderabad, ticking (rendered only on the client: the server's clock isn't the visitor's) */
function useHomeTime() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: HOME.tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setNow(fmt.format(new Date()));
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export default function WorldSection({ index }: { index: string }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [placeId, setPlaceId] = useState("");
  const place = PLACES.find((p) => p.id === placeId) ?? null;
  const homeTime = useHomeTime();

  // what the line means: how far, how many hours apart, and where their working day lands in ours
  const facts = useMemo(() => {
    if (!place) return null;
    const ahead = offsetMinutes(HOME.tz) - offsetMinutes(place.tz);
    return {
      km: `${Math.round(distanceKm(HOME, place)).toLocaleString("en-IN")} km`,
      apart: ahead === 0 ? "Same time as us" : `Hyderabad is ${span(ahead)} ${ahead > 0 ? "ahead" : "behind"}`,
      day: `${hm(9 * 60 + ahead)} – ${hm(18 * 60 + ahead)} here`,
    };
  }, [place]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      ensureSmoother();
      const unScramble = hoverScramble(el);
      if (prefersReducedMotion()) {
        progress.current = 1;
        return unScramble;
      }
      const pin = ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=90%",
        pin: true,
        // the navbar's section triggers exist before this pin: its spacer has to be laid out first
        refreshPriority: 1,
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });
      progress.current = pin.progress;
      gsap.from(el.querySelectorAll("[data-corner]"), {
        y: 16,
        autoAlpha: 0,
        duration: 1,
        ease: MENU_EASE,
        stagger: 0.08,
        // played, never killed: a `once` trigger that fires during another trigger's refresh (a reload
        // part-way down the page) removes itself mid-loop and ScrollTrigger reads past the array's end
        scrollTrigger: { trigger: el, start: "top 65%", toggleActions: "play none none none" },
      });
      return unScramble;
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-cursor="light"
      data-nav-message="Where we are"
      className="relative z-10 h-[100svh] min-h-[600px] overflow-hidden bg-white text-ink"
    >
      <Globe place={place} progress={progress} />

      {/* top left: who and where, small */}
      <div data-corner className={`absolute left-[var(--gutter)] ${top} max-w-[30ch] md:max-w-[34ch]`}>
        <p data-hover-scramble className={`${label} text-stone`}>
          {index} — Where we are
        </p>
        <p className="mt-4 text-[15px] leading-[1.45] tracking-[-0.005em] text-graphite md:text-[16px]">
          We&rsquo;re based in Hyderabad, India, and work remotely with businesses all over the world. Tell us where
          you are — we&rsquo;ll draw the line.
        </p>
      </div>

      {/* top right: our clock */}
      <p data-corner className={`${label} absolute right-[var(--gutter)] ${top} hidden text-right text-stone md:block`}>
        Hyderabad <span className="tabular-nums text-ink">{homeTime ?? "--:--:--"}</span> IST
        <br />
        17.38° N · 78.49° E
      </p>

      {/* bottom left: what the line means — only once there is a line (the globe has lifted to the centre by
          then, so the settled globe's shoulder never runs under it) */}
      <div data-corner className="absolute bottom-[calc(var(--gutter)+8px)] left-[var(--gutter)] hidden w-[280px] md:block">
        <dl
          aria-live="polite"
          className={`text-[14px] transition-[opacity,transform] duration-700 ease-prime ${
            facts ? "opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {[
            ["Distance", facts?.km],
            ["Time apart", facts?.apart],
            ["Your 9 to 6", facts?.day],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6.5rem_1fr] border-t border-ink/10 py-2.5">
              <dt className={`${label} pt-0.5 text-stone`}>{k}</dt>
              <dd className="tabular-nums text-ink">{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* bottom right: where are you from — on white that feathers out over the settled globe's shoulder,
          which reaches this corner on narrower screens */}
      <div
        data-corner
        className="absolute bottom-[calc(var(--gutter)+8px)] left-[var(--gutter)] right-[var(--gutter)] bg-white pt-4 shadow-[0_0_36px_28px_#fff] md:left-auto md:w-[280px] md:pt-0 xl:w-[320px]"
      >
        <PlacePicker value={place} onChange={(p) => setPlaceId(p?.id ?? "")} />
        {facts && (
          <p className={`${label} mt-3 text-stone md:hidden`}>
            {facts.km} · {facts.apart}
          </p>
        )}
      </div>
    </section>
  );
}
