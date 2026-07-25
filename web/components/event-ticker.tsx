"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { StoryEvent } from "@/lib/demo-script";

type Props = {
  stories: StoryEvent[];
  totalAccepted: number;
  showAll: boolean;
  onToggle: () => void;
  allLabels: string[];
};

export function EventTicker({
  stories,
  totalAccepted,
  showAll,
  onToggle,
  allLabels,
}: Props) {
  if (totalAccepted === 0) {
    return (
      <div className="glass-panel corner-frame relative rounded-sm px-4 py-4">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
          key moments
        </p>
        <p className="mono mt-3 text-[12px] text-[var(--fog-mute)]">
          A few labeled beats will appear here — not every packet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-sm px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
          key moments
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--fog-dim)] underline-offset-2 hover:underline"
        >
          {showAll ? "hide full tape" : `show all ${totalAccepted} packets`}
        </button>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        <AnimatePresence initial={false}>
          {stories.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="mono flex items-start justify-between gap-3 rounded-sm border border-[var(--line)] px-3 py-2 text-[12px]"
            >
              <div>
                <span
                  style={{
                    color: s.tenant === "acme" ? "var(--copper)" : "var(--teal)",
                  }}
                >
                  {s.tenant === "acme" ? "ACME" : "NOVA"}
                </span>{" "}
                <span className="text-[var(--fog)]">{s.label}</span>
                <p className="mt-1 text-[11px] text-[var(--fog-mute)]">{s.detail}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {showAll ? (
        <div className="ticker mt-3 overflow-hidden border-t border-[var(--line)] pt-3">
          <div className="marquee-track flex gap-3">
            {[...allLabels, ...allLabels].map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="mono shrink-0 rounded-sm border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--fog-mute)]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
