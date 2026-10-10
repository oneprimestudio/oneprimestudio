"use client";

import { useEffect, useRef } from "react";

const FRAMES = ["|", "/", "-", "\\"];

/** ASCII spinner that ticks on its own, without re-rendering its parent. */
export default function Spinner({ offset = 0 }: { offset?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = offset;
    const id = window.setInterval(() => {
      frame += 1;
      if (ref.current) ref.current.textContent = FRAMES[frame % FRAMES.length];
    }, 110);
    return () => window.clearInterval(id);
  }, [offset]);

  return (
    <span ref={ref} aria-hidden>
      {FRAMES[offset % FRAMES.length]}
    </span>
  );
}
