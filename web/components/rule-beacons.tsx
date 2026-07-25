"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/animated-number";

const RULES = [
  {
    id: "welcome_offer",
    label: "welcome",
    hint: "first deposit credit",
    accent: "var(--gold)",
  },
  {
    id: "vip_score",
    label: "vip score",
    hint: "tier from activity",
    accent: "var(--copper)",
  },
  {
    id: "integrity_velocity",
    label: "velocity",
    hint: "burst integrity flag",
    accent: "var(--ember)",
  },
] as const;

type Props = {
  lit: Record<string, boolean>;
  /** This-run deltas */
  deltas: Record<string, number>;
  welcomeAlready?: boolean;
  velocityOnPlayer?: boolean;
};

export function RuleBeacons({
  lit,
  deltas,
  welcomeAlready,
  velocityOnPlayer,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {RULES.map((rule, i) => {
        const on = !!lit[rule.id];
        const delta = deltas[`rule_${rule.id}`] ?? 0;
        return (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i }}
            className={`glass-panel relative overflow-hidden rounded-sm px-3 py-3 ${
              on ? "rule-lit" : ""
            }`}
          >
            <motion.span
              className="absolute inset-x-0 top-0 h-[2px]"
              animate={{
                background: on
                  ? `linear-gradient(90deg, transparent, ${rule.accent}, transparent)`
                  : "transparent",
                opacity: on ? 1 : 0.15,
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
                rule
              </p>
              <motion.span
                className="h-1.5 w-1.5 rounded-full"
                animate={{
                  backgroundColor: on ? rule.accent : "var(--fog-mute)",
                  scale: on ? [1, 1.35, 1] : 1,
                }}
                transition={
                  on
                    ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
              />
            </div>
            <p className="display mt-1 text-lg capitalize text-[var(--fog)]">
              {rule.label}
            </p>
            <p className="mt-1 text-xs text-[var(--fog-dim)]">{rule.hint}</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
                this run
              </p>
              <AnimatedNumber
                value={delta}
                className="display text-xl tabular-nums"
              />
            </div>
            {rule.id === "welcome_offer" && welcomeAlready ? (
              <p className="mono mt-2 text-[10px] leading-snug text-[var(--fog-mute)]">
                already credited (idempotent)
              </p>
            ) : null}
            {rule.id === "integrity_velocity" &&
            velocityOnPlayer &&
            delta === 0 ? (
              <p className="mono mt-2 text-[10px] leading-snug text-[var(--ember)]">
                flag on player
              </p>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
