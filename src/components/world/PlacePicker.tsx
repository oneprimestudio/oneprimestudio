"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PLACES, guessPlace, offsetMinutes, type Place } from "@/lib/geo/places";

/*
 * "Where are you from?" — a searchable list in place of the native select, kept minimal. Closed, it is one
 * line of type on a hairline with a thin ring "+"; open, a plain white sheet fades in just above the field
 * (no clip, only a short fade and lift): a search row on a hairline, then the list — one row a place
 * between hairlines, a mono number at the left, the name with its city in grey, its UTC offset (or, for an
 * area, how far and which way from the centre) in mono at the right; no scrollbar, the list's edges fade
 * instead. The row under the cursor or the arrow keys takes a faint tint and a small arrow and steps in a
 * little; the chosen one carries a small ink dot.
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
        // only hidden once it has faded out
        className={`absolute bottom-full left-0 right-0 mb-3 bg-white text-ink shadow-[0_24px_48px_-32px_rgba(8,6,78,0.35)] ring-1 ring-ink/10 transition-[opacity,transform,visibility] duration-300 ease-out ${
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"
        }`}
      >
        <div className="flex h-10 items-center gap-2.5 border-b border-ink/10 px-4">
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
            className="w-full bg-transparent  text-[15px] tracking-[-0.01em] text-ink outline-none placeholder:text-mist"
          />
        </div>
        {/* no scrollbar: the list fades out at its edges instead, which says there is more */}
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={noun}
          data-own-scroll
          className="relative max-h-[min(36vh,280px)] overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,#000_10px,#000_calc(100%-18px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`grid cursor-pointer grid-cols-[1.75rem_1fr_auto] items-center gap-2 border-b border-ink/[0.06] px-4 py-2 text-ink transition-colors duration-200 last:border-b-0 ${
                  on ? "bg-ink/[0.04]" : ""
                }`}
              >
                <span className="flex items-center font-mono text-[9.5px] tabular-nums tracking-[0.06em] text-stone">
                  {chosen ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" /> : String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`truncate text-[13px] font-medium leading-[1.25] tracking-[-0.01em] transition-transform duration-300 ease-out ${
                    on ? "translate-x-1" : ""
                  }`}
                >
                  {primary(p)} <span className="font-normal text-stone">{secondary(p)}</span>
                </span>
                <span className="flex items-center gap-2 font-mono text-[9.5px] tabular-nums tracking-[0.06em] text-stone">
                  {metas?.get(p.id)}
                  <span
                    aria-hidden
                    className={`text-[11px] text-ink transition-[opacity,transform] duration-300 ease-out ${
                      on ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                    }`}
                  >
                    →
                  </span>
                </span>
              </li>
            );
          })}
          {!shown.length && <li className="px-4 py-3 text-[13px] text-stone">No match. Try another spelling.</li>}
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
          <span className="block truncate text-[clamp(1.125rem,1.35vw,1.375rem)] font-medium leading-[1.15] tracking-[-0.03em] text-ink">
            {value ? primary(value) : empty}
          </span>
          <span className={`${label} mt-1.5 block text-stone`}>{value ? secondary(value) : hint}</span>
        </span>
        <span
          aria-hidden
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink ring-1 ring-inset ring-ink/20 transition-[transform,background-color,color] duration-700 ease-prime group-hover:rotate-90 group-hover:bg-ink group-hover:text-white ${
            open ? "rotate-45 group-hover:rotate-45" : ""
          }`}
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
        <p className={`${label} mt-3 flex items-center justify-between gap-4`}>
          {guess ? (
            <button
              type="button"
              onClick={() => {
                const g = guessPlace();
                setMissed(!g);
                if (g) onChange(g);
              }}
              className="rounded-full px-2.5 py-[3px] text-ink ring-1 ring-inset ring-ink/20 transition-colors duration-500 ease-prime hover:bg-ink hover:text-white"
            >
              {missed ? "Couldn’t tell. Pick from the list" : "Guess from my time zone"}
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
