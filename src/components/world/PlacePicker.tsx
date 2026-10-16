"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PLACES, guessPlace, offsetMinutes, type Place } from "@/lib/geo/places";

/*
 * "Where are you from?" — a searchable list in place of the native select. Closed, it is one line of type
 * on a hairline with an ink button; open, a white sheet rises from the field (clip-path on the prime
 * curve) with a search box and a compact list: one line a place, its UTC offset (or, for an area, how far
 * and which way from the centre) in mono at the right, no scrollbar — the list's edges fade instead. The
 * row under the cursor or the arrow keys turns ink, the chosen one carries the blue square.
 *
 * The same picker asks the second question once Hyderabad is chosen: which part of it (`places`, `title`…).
 *
 * Keyboard: the search box is an ARIA combobox — ↑↓ move, ↵ chooses, Esc closes and hands focus back.
 */

const label = "font-mono text-[10px] uppercase md:text-[11px]";
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const utc = (m: number) => {
  const a = Math.abs(m);
  return `UTC${m < 0 ? "−" : "+"}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, "0")}` : ""}`;
};

// module-level, so the defaults keep their identity between renders (they key the list's memo)
const byName = (p: Place) => p.name;
const byCity = (p: Place) => p.city;

export default function PlacePicker({
  value,
  onChange,
  places = PLACES,
  title = "Where are you from?",
  noun = "Cities",
  empty = "Choose your country",
  hint = "Search or scroll the list",
  search = "Search a country or city",
  primary = byName,
  secondary = byCity,
  meta,
  guess = true,
  openOnMount = false,
}: {
  value: Place | null;
  onChange: (p: Place | null) => void;
  places?: Place[];
  title?: string;
  noun?: string;
  empty?: string;
  hint?: string;
  search?: string;
  primary?: (p: Place) => string;
  secondary?: (p: Place) => string;
  /** the mono column at the right of a row; a UTC offset unless given */
  meta?: (p: Place) => string;
  guess?: boolean;
  /** open the sheet as soon as the picker appears (the follow-up question) */
  openOnMount?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [missed, setMissed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return q ? places.filter((p) => fold(`${primary(p)} ${secondary(p)}`).includes(q)) : places;
  }, [query, places, primary, secondary]);
  // offsets follow daylight saving, so they're read when the sheet opens, on the visitor's clock
  const metas = useMemo(
    () => (open ? new Map(places.map((p) => [p.id, meta ? meta(p) : utc(offsetMinutes(p.tz))])) : null),
    [open, places, meta],
  );

  const show = () => {
    setQuery("");
    setActive(Math.max(0, places.findIndex((p) => p.id === value?.id)));
    setOpen(true);
  };
  const hide = (refocus = false) => {
    setOpen(false);
    if (refocus) button.current?.focus({ preventScroll: true });
  };
  const pick = (p: Place) => {
    onChange(p);
    setMissed(false);
    hide(true);
  };

  // the follow-up question opens itself, a beat after it appears (once the globe has started its swing)
  useEffect(() => {
    if (!openOnMount) return;
    const t = window.setTimeout(show, 500);
    return () => window.clearTimeout(t);
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // open: the search box takes focus (without scrolling the page); a press anywhere else closes it
  useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  // the active row stays in view inside the list (never scrolling the page around it)
  useEffect(() => {
    const ul = list.current;
    const li = ul?.children[active] as HTMLElement | undefined;
    if (!open || !ul || !li) return;
    if (li.offsetTop < ul.scrollTop) ul.scrollTop = li.offsetTop;
    else if (li.offsetTop + li.offsetHeight > ul.scrollTop + ul.clientHeight)
      ul.scrollTop = li.offsetTop + li.offsetHeight - ul.clientHeight;
  }, [active, open, shown]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => Math.min(Math.max(0, a + step), Math.max(0, shown.length - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide(true);
    } else if (e.key === "Tab") hide();
  };

  return (
    <div ref={box} className="relative">
      {/* the sheet */}
      <div
        // visible at once on open (a box mid-way through a visibility transition can't take focus), and
        // only hidden once the clip has closed
        className={`absolute bottom-full left-0 right-0 mb-3 p-5 bg-white text-ink shadow-[0_40px_80px_-40px_rgba(8,6,78,0.45)] ring-1 ring-ink/10 duration-700 ease-prime ${
          open
            ? "visible transition-[clip-path] [clip-path:inset(0_0_0_0)]"
            : "invisible transition-[clip-path,visibility] [clip-path:inset(100%_0_0_0)]"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-ink/10 px-4">
          <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-stone" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" />
          </svg>
          <input
            ref={input}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={shown[active] ? `${id}-${shown[active].id}` : undefined}
            aria-label={search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder={search}
            tabIndex={open ? 0 : -1}
            className="w-full bg-transparent py-3 text-[15px] tracking-[-0.01em] text-ink outline-none placeholder:text-mist"
          />
        </div>
        {/* no scrollbar: the list fades out at its edges instead, which says there is more */}
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={noun}
          data-own-scroll
          className="relative max-h-[min(36vh,288px)] overflow-y-auto overscroll-contain py-1 [mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-22px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((p, i) => {
            const on = i === active;
            const chosen = p.id === value?.id;
            return (
              <li
                key={p.id}
                id={`${id}-${p.id}`}
                role="option"
                aria-selected={chosen}
                onPointerMove={() => setActive(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={`grid cursor-pointer grid-cols-[5px_1fr_auto] items-center gap-2.5 px-4 py-[7px] transition-colors duration-200 ${
                  on ? "bg-ink text-white" : "text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-[5px] w-[5px] ${chosen ? "bg-accent" : on ? "bg-white" : "bg-transparent"}`}
                />
                <span className="truncate text-[14px] font-medium leading-[1.2] tracking-[-0.015em]">
                  {primary(p)} <span className={`font-normal ${on ? "text-white/60" : "text-stone"}`}>{secondary(p)}</span>
                </span>
                <span className={`font-mono text-[9.5px] tabular-nums tracking-[0.06em] ${on ? "text-white/70" : "text-stone"}`}>
                  {metas?.get(p.id)}
                </span>
              </li>
            );
          })}
          {!shown.length && <li className="px-4 py-3 text-[14px] text-stone">No match — try another spelling.</li>}
        </ul>
        <p className={`${label} flex justify-between border-t border-ink/10 px-4 py-2 text-stone`}>
          <span>↑↓ Move · ↵ Choose</span>
          <span>Esc</span>
        </p>
      </div>

      {/* the field */}
      <p className={`${label} flex justify-between text-stone`}>
        <span id={`${id}-label`}>{title}</span>
        <span className="tabular-nums">
          {String(places.length).padStart(3, "0")} {noun}
        </span>
      </p>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? hide() : show())}
        className="group relative mt-2.5 flex w-full items-end justify-between gap-4 pb-2.5 text-left outline-none"
      >
        <span id={`${id}-value`} className="min-w-0">
          <span className="block truncate text-[clamp(1.25rem,1.6vw,1.625rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
            {value ? primary(value) : empty}
          </span>
          <span className={`${label} mt-1.5 block text-stone`}>{value ? secondary(value) : hint}</span>
        </span>
        <span
          aria-hidden
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-700 ease-prime group-hover:rotate-90 ${
            open ? "rotate-45 group-hover:rotate-45" : ""
          }`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 1v10M1 6h10" />
          </svg>
        </span>
        {/* the hairline, and the ink that draws over it on hover */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ink transition-transform duration-700 ease-prime group-hover:scale-x-100 group-focus-visible:scale-x-100"
        />
      </button>
      {(guess || value) && (
        <p className={`${label} mt-2.5 flex justify-between gap-4`}>
          {guess ? (
            <button
              type="button"
              onClick={() => {
                const g = guessPlace();
                setMissed(!g);
                if (g) onChange(g);
              }}
              className="text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"
            >
              {missed ? "Couldn’t tell — pick from the list" : "Guess from my time zone"}
            </button>
          ) : (
            <span />
          )}
          {value && (
            <button type="button" onClick={() => onChange(null)} className="text-stone transition-colors hover:text-ink">
              Clear ×
            </button>
          )}
        </p>
      )}
    </div>
  );
}
