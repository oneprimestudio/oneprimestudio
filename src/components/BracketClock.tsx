"use client";

import { useEffect, useRef, useState } from "react";

/** Visitor's local time as "[ ● 21 : 14 : 03 ]". Placeholder on the server avoids a hydration mismatch. */
export default function BracketClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);
  const dot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => setTime(fmt.format(new Date()).split(":").join(" : "));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // the dot blinks only while it can be seen: in a closed menu it would restyle the page every frame
  useEffect(() => {
    const el = dot.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      el.style.animationPlayState = e.isIntersecting ? "running" : "paused";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      [ <span ref={dot} className="blink inline-block text-accent">●</span> {time ?? "-- : -- : --"} ]
    </span>
  );
}
