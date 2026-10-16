"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PLACES, guessPlace, offsetMinutes, type Place } from "@/lib/geo/places";

/*
 * "Where are you from?" — a searchable list in place of the native select. Closed, it is one line of type
 * on a hairline with an ink button; open, a white sheet rises from the field (clip-path on the prime
 * curve) with a search box and every city, its UTC offset in mono at the right. The row under the cursor
 * or the arrow keys turns ink, the chosen one carries the blue square.
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

export default function PlacePicker({ value, onChange }: { value: Place | null; onChange: (p: Place | null) => void }) {
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
    return q ? PLACES.filter((p) => fold(`${p.name} ${p.city}`).includes(q)) : PLACES;
  }, [query]);
  // offsets follow daylight saving, so they're read when the sheet opens, on the visitor's clock
  const offsets = useMemo(
    () => (open ? new Map(PLACES.map((p) => [p.id, utc(offsetMinutes(p.tz))])) : null),
    [open],
  );

  const show = () => {
    setQuery("");
    setActive(Math.max(0, PLACES.findIndex((p) => p.id === value?.id)));
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
        className={`absolute bottom-full left-0 right-0 mb-4 bg-white text-ink shadow-[0_40px_80px_-40px_rgba(8,6,78,0.45)] ring-1 ring-ink/10 duration-700 ease-prime ${
          open
            ? "visible transition-[clip-path] [clip-path:inset(0_0_0_0)]"
            : "invisible transition-[clip-path,visibility] [clip-path:inset(100%_0_0_0)]"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-ink/10 px-5">
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-stone" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
            aria-label="Search a country or city"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Search a country or city"
            tabIndex={open ? 0 : -1}
            className="w-full bg-transparent py-4 text-[16px] tracking-[-0.01em] text-ink outline-none placeholder:text-mist"
          />
        </div>
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label="Places"
          data-own-scroll
          className="relative max-h-[min(42vh,340px)] overflow-y-auto overscroll-contain py-2"
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
                className={`grid cursor-pointer grid-cols-[6px_1fr_auto] items-center gap-3 px-5 py-2.5 transition-colors duration-200 ${
                  on ? "bg-ink text-white" : "text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 ${chosen ? "bg-accent" : on ? "bg-white" : "bg-transparent"}`}
                />
                <span className="truncate text-[15px] font-medium tracking-[-0.02em]">
                  {p.name} <span className={`font-normal ${on ? "text-white/60" : "text-stone"}`}>{p.city}</span>
                </span>
                <span className={`font-mono text-[10px] tabular-nums tracking-[0.06em] ${on ? "text-white/70" : "text-stone"}`}>
                  {offsets?.get(p.id)}
                </span>
              </li>
            );
          })}
          {!shown.length && <li className="px-5 py-4 text-[15px] text-stone">No match — try the country&rsquo;s name.</li>}
        </ul>
        <p className={`${label} flex justify-between border-t border-ink/10 px-5 py-3 text-stone`}>
          <span>↑↓ Move · ↵ Choose</span>
          <span>Esc</span>
        </p>
      </div>

      {/* the field */}
      <p className={`${label} flex justify-between text-stone`}>
        <span id={`${id}-label`}>Where are you from?</span>
        <span className="tabular-nums">{String(PLACES.length).padStart(3, "0")} Cities</span>
      </p>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? hide() : show())}
        className="group relative mt-3 flex w-full items-end justify-between gap-4 pb-3 text-left outline-none"
      >
        <span id={`${id}-value`} className="min-w-0">
          <span className="block truncate text-[clamp(1.25rem,1.6vw,1.625rem)] font-medium leading-[1.1] tracking-[-0.035em] text-ink">
            {value ? value.name : "Choose your country"}
          </span>
          <span className={`${label} mt-1.5 block text-stone`}>{value ? value.city : "Search or scroll the list"}</span>
        </span>
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-700 ease-prime group-hover:rotate-90 ${
            open ? "rotate-45 group-hover:rotate-45" : ""
          }`}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M6 1v10M1 6h10" />
          </svg>
        </span>
        {/* the hairline, and the ink that draws over it on hover */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-ink/25" />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ink transition-transform duration-700 ease-prime group-hover:scale-x-100 group-focus-visible:scale-x-100"
        />
      </button>
      <p className={`${label} mt-3 flex justify-between gap-4`}>
        <button
          type="button"
          onClick={() => {
            const guess = guessPlace();
            setMissed(!guess);
            if (guess) onChange(guess);
          }}
          className="text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"
        >
          {missed ? "Couldn’t tell — pick from the list" : "Guess from my time zone"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-stone transition-colors hover:text-ink">
            Clear ×
          </button>
        )}
      </p>
    </div>
  );
}
