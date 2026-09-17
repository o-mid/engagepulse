"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  value?: number | null;
  className?: string;
  duration?: number;
  fallback?: string;
};

export function AnimatedNumber({
  value,
  className,
  duration = 0.7,
  fallback = "—",
}: Props) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value ?? null);

  useEffect(() => {
    if (value == null) {
      setDisplay(null);
      return;
    }
    if (reduce) {
      setDisplay(value);
      return;
    }
    const from = display ?? 0;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const ms = duration * 1000;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last shown value
  }, [value, duration, reduce]);

  return (
    <motion.span
      key={value == null ? "empty" : "num"}
      initial={reduce ? false : { opacity: 0.55 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      {display == null ? fallback : display.toLocaleString()}
    </motion.span>
  );
}
