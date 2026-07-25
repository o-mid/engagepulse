"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  { id: "acme", label: "Acme", plain: "VIP path", detail: "score · welcome" },
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
  const current = stepIndex(beat);
  const armed = beat === "idle";
  const done = beat === "payoff";
  const fault = beat === "error";

  return (
    <div className="glass-panel corner-frame relative overflow-hidden rounded-sm px-4 py-4 md:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--fog-mute)]">
          pipeline
        </p>
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fog-mute)]">
          {fault ? "fault" : done ? "locked" : armed ? "armed" : "live"}
        </p>
      </div>

      <div className="relative grid grid-cols-5 gap-2">
        <div className="absolute left-[10%] right-[10%] top-[18px] h-px bg-[var(--line)]" />
        <motion.div
          className="absolute left-[10%] top-[18px] h-px origin-left bg-gradient-to-r from-[var(--copper)] via-[var(--gold)] to-[var(--teal)]"
          animate={{
            width:
              fault || armed
                ? "0%"
                : done
                  ? "80%"
                  : `${Math.max(0, (current / 4) * 80)}%`,
          }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* traveling packet */}
        {!armed && !fault && current >= 0 && current < STEPS.length ? (
          <motion.span
            className="absolute top-[14px] h-2 w-2 rounded-full bg-[var(--gold)]"
            style={{ boxShadow: "0 0 12px var(--copper)" }}
            animate={{
              left: `${10 + (current / 4) * 80}%`,
            }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        ) : null}

        {STEPS.map((s, i) => {
          const reached = done || (current >= 0 && i <= current);
          const now = !done && current === i;
          return (
            <div
              key={s.id}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <motion.div
                className={`flex h-9 w-9 items-center justify-center rounded-sm border mono text-[11px] ${
                  now ? "pipeline-node-active" : ""
                }`}
                animate={{
                  borderColor: reached
                    ? "color-mix(in oklab, var(--gold) 55%, transparent)"
                    : "var(--line)",
                  background: reached
                    ? "color-mix(in oklab, var(--ink-elevated) 90%, var(--copper))"
                    : "rgba(0,0,0,0.25)",
                  color: reached ? "var(--fog)" : "var(--fog-mute)",
                  scale: now ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              >
                {String(i + 1).padStart(2, "0")}
              </motion.div>
              <p className="display mt-2 text-sm text-[var(--fog)]">{s.plain}</p>
              <p className="mono mt-0.5 hidden text-[9px] uppercase tracking-[0.14em] text-[var(--fog-mute)] sm:block">
                {s.detail}
              </p>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={caption}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mono mt-4 border-t border-[var(--line)] pt-3 text-[12px] leading-relaxed text-[var(--fog-dim)]"
        >
          {caption}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
