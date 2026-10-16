"use client";

import { useEffect, useState } from "react";

/** The visitor's local time, ticking. Renders a placeholder on the server to avoid a hydration mismatch. */
export default function LocalTime({ className = "text-white" }: { className?: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <span className={`tabular-nums ${className}`}>{time ?? "--:--:--"}</span>;
}
