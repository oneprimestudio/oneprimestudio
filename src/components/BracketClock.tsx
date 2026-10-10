"use client";

import { useEffect, useState } from "react";

/** Visitor's local time as "[ ● 21 : 14 : 03 ]". Placeholder on the server avoids a hydration mismatch. */
export default function BracketClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => setTime(fmt.format(new Date()).split(":").join(" : "));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      [ <span className="blink inline-block text-accent">●</span> {time ?? "-- : -- : --"} ]
    </span>
  );
}
