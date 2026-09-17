"use client";

import { CheckmarkIcon } from "@/components/icons/checkmark";
import { Badge } from "@/components/ui/badge";

const RULES = [
  {
    id: "welcome_offer",
    label: "Welcome",
    hint: "First deposit credit",
  },
  {
    id: "vip_score",
    label: "VIP score",
    hint: "Tier from bets",
  },
  {
    id: "integrity_velocity",
    label: "Velocity",
    hint: "Burst integrity flag",
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
    <ul className="flex flex-col gap-2">
      {RULES.map((rule) => {
        const on = !!lit[rule.id];
        const delta = deltas[`rule_${rule.id}`] ?? 0;
        return (
          <li key={rule.id} className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{rule.label}</p>
              <p className="text-xs text-muted-foreground">{rule.hint}</p>
              {rule.id === "welcome_offer" && welcomeAlready ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Already credited. Idempotent.
                </p>
              ) : null}
              {rule.id === "integrity_velocity" &&
              velocityOnPlayer &&
              delta === 0 ? (
                <p className="mt-1 text-xs text-destructive">
                  Flag already on the player.
                </p>
              ) : null}
            </div>
            <Badge variant={on ? "success-light" : "outline"}>
              {on ? <CheckmarkIcon className="size-3" /> : null}
              {on ? `hit ${delta}` : "idle"}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
