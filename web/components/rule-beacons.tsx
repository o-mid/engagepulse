"use client";

import { AnimatedNumber } from "@/components/animated-number";

const RULES = [
  {
    id: "welcome_offer",
    label: "Welcome",
    hint: "First deposit credit",
    accent: "var(--gold)",
  },
  {
    id: "vip_score",
    label: "VIP score",
    hint: "Tier from activity",
    accent: "var(--copper)",
  },
  {
    id: "integrity_velocity",
    label: "Velocity",
    hint: "Burst integrity flag",
    accent: "var(--ember)",
  },
] as const;

type Props = {
  lit: Record<string, boolean>;
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
      {RULES.map((rule) => {
        const on = !!lit[rule.id];
        const delta = deltas[`rule_${rule.id}`] ?? 0;
        return (
          <div
            key={rule.id}
            className="glass-panel relative overflow-hidden rounded-sm px-3 py-3"
            style={{
              boxShadow: on
                ? `inset 0 2px 0 ${rule.accent}`
                : "inset 0 2px 0 transparent",
            }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="display text-lg text-[var(--fog)]">{rule.label}</h3>
              <p className="mono text-[11px] uppercase tracking-[0.14em] text-[var(--fog-mute)]">
                {on ? "hit" : "idle"}
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--fog-dim)]">{rule.hint}</p>
            <p className="display mt-3 text-xl tabular-nums">
              <AnimatedNumber value={delta} />
            </p>
            {rule.id === "welcome_offer" && welcomeAlready ? (
              <p className="mt-2 text-xs text-[var(--fog-mute)]">
                Already credited. Idempotent.
              </p>
            ) : null}
            {rule.id === "integrity_velocity" &&
            velocityOnPlayer &&
            delta === 0 ? (
              <p className="mt-2 text-xs text-[var(--ember)]">
                Flag already on the player.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
