"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { DemoBeat } from "@/lib/demo-script";

const STEPS: {
  id: DemoBeat;
  label: string;
  plain: string;
  detail: string;
}[] = [
  { id: "sign", label: "Sign", plain: "Secure sign", detail: "HMAC in BFF" },
  { id: "ingest", label: "Accept", plain: "Accept", detail: "outbox save" },
  { id: "stream", label: "Process", plain: "Process", detail: "Kafka worker" },
  { id: "acme", label: "Acme", plain: "VIP path", detail: "score, welcome" },
  { id: "nova", label: "Nova", plain: "Flag path", detail: "velocity watch" },
];

function stepIndex(beat: DemoBeat) {
  if (beat === "idle") return -1;
  if (beat === "payoff") return STEPS.length;
  if (beat === "error") return -1;
  return STEPS.findIndex((s) => s.id === beat);
}

type Props = {
  beat: DemoBeat;
  caption: string;
};

export function PipelineRail({ beat, caption }: Props) {
  const reduce = useReducedMotion();
  const current = stepIndex(beat);
  const done = beat === "payoff";
  const fault = beat === "error";
  const status = fault ? "fault" : done ? "complete" : "running";

  return (
    <div className="glass-panel relative overflow-hidden rounded-sm px-4 py-4 md:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="display text-lg text-[var(--fog)]">This run</h2>
        <p className="mono text-[11px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
          {status}
        </p>
      </div>

      <ol className="relative grid grid-cols-5 gap-2">
        <div className="absolute left-[10%] right-[10%] top-[18px] h-px bg-[var(--line)]" />
        <motion.div
          className="absolute left-[10%] top-[18px] h-px origin-left bg-[var(--copper)]"
          animate={{
            width: fault ? "0%" : done ? "80%" : `${Math.max(0, (current / 4) * 80)}%`,
          }}
          transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {STEPS.map((s, i) => {
          const reached = done || (current >= 0 && i <= current);
          const now = !done && current === i;
          return (
            <li
              key={s.id}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-sm border mono text-[11px] ${
                  now ? "pipeline-node-active" : ""
                }`}
                style={{
                  borderColor: reached
                    ? "color-mix(in oklab, var(--gold) 55%, transparent)"
                    : "var(--line)",
                  background: reached
                    ? "color-mix(in oklab, var(--ink-elevated) 90%, var(--copper))"
                    : "rgba(0,0,0,0.25)",
                  color: reached ? "var(--fog)" : "var(--fog-mute)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="display mt-2 text-sm text-[var(--fog)]">{s.plain}</p>
              <p className="mono mt-0.5 hidden text-[9px] uppercase tracking-[0.12em] text-[var(--fog-mute)] sm:block">
                {s.detail}
              </p>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.p
          key={caption}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="mt-4 border-t border-[var(--line)] pt-3 text-sm leading-relaxed text-[var(--fog-dim)]"
        >
          {caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
