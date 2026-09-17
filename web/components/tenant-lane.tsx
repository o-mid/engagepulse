"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/animated-number";
import type { PlayerSnapshot } from "@/lib/types";

type Props = {
  side: "acme" | "nova";
  title: string;
  subtitle: string;
  blurb: string;
  player: PlayerSnapshot | null;
  revealed: boolean;
  focus: boolean;
  outcome: string;
  /** Hide integrity noise on Acme so VIP story stays clear. */
  hideIntegrity?: boolean;
};

function tierProgress(score: number) {
  if (score >= 5000)
    return { pct: 100, next: null as string | null, remain: 0 };
  if (score >= 1000) {
    return {
      pct: Math.min(100, ((score - 1000) / 4000) * 100),
      next: "gold",
      remain: Math.max(0, 5000 - score),
    };
  }
  return {
    pct: Math.min(100, (score / 1000) * 100),
    next: "silver",
    remain: Math.max(0, 1000 - score),
  };
}

export function TenantLane({
  side,
  title,
  subtitle,
  blurb,
  player,
  revealed,
  focus,
  outcome,
  hideIntegrity,
}: Props) {
  const reduce = useReducedMotion();
  const accent = side === "acme" ? "var(--copper)" : "var(--ice)";
  const accentHot = side === "acme" ? "var(--gold)" : "var(--teal)";
  const flag = hideIntegrity ? "" : player?.integrity_flag ?? "";
  const tags = player?.offer_tags ?? [];
  const progress = player ? tierProgress(player.score) : null;
  const ring = 2 * Math.PI * 28;
  const dash = progress ? ring - (progress.pct / 100) * ring : ring;
  const waiting = !revealed || !player;

  return (
    <section
      className={`relative flex flex-col p-4 md:p-5 ${
        side === "acme" ? "lane-acme" : "lane-nova"
      }`}
      aria-busy={waiting && focus}
    >
      <header>
        <h2 className="display text-3xl md:text-4xl" style={{ color: accent }}>
          {title}
        </h2>
        <p className="mono mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
          {subtitle}
          {focus ? ", live" : revealed ? ", resolved" : ", waiting"}
        </p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--fog-dim)]">
          {blurb}
        </p>
      </header>

      <div className="relative mt-5">
        <div
          className="relative overflow-hidden rounded-sm border p-4"
          style={{
            borderColor:
              focus || revealed
                ? `color-mix(in oklab, ${accent} 50%, transparent)`
                : "var(--line)",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          <AnimatePresence mode="wait">
            {waiting ? (
              <motion.div
                key="empty"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-h-[168px]"
              >
                <p className="display text-lg text-[var(--fog)]">
                  {side === "acme" ? "No Acme snapshot yet" : "No Nova snapshot yet"}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--fog-dim)]">
                  {side === "acme"
                    ? "This lane fills after signed ingest is processed."
                    : "This lane fills after Acme, when the velocity path resolves."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="filled"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mono truncate text-sm text-[var(--fog)]">
                      {player.player_id}
                    </p>
                    <p className="mono mt-1 text-[11px] text-[var(--fog-mute)]">
                      {player.vip_tier}
                      {progress?.next
                        ? `, ${Math.round(progress.pct)}% to ${progress.next}`
                        : ", gold"}
                    </p>
                  </div>
                  <div className="relative h-[72px] w-[72px] shrink-0" aria-hidden>
                    <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="28"
                        fill="none"
                        stroke="rgba(245,239,230,0.12)"
                        strokeWidth="4"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="28"
                        fill="none"
                        stroke={accentHot}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={ring}
                        initial={reduce ? false : { strokeDashoffset: ring }}
                        animate={{ strokeDashoffset: dash }}
                        transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </svg>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="display text-3xl tabular-nums text-[var(--fog)]">
                      <AnimatedNumber value={player.score} className="tabular-nums" />
                    </p>
                    <p className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
                      score
                    </p>
                  </div>
                  <div>
                    <p className="display text-3xl tabular-nums text-[var(--fog)]">
                      <AnimatedNumber value={player.balance} className="tabular-nums" />
                    </p>
                    <p className="mono mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
                      balance
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="mono rounded-sm border px-2 py-1 text-[11px]"
                      style={{
                        borderColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
                        color: accentHot,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {flag ? (
                    <span className="mono rounded-sm border border-[color-mix(in_oklab,var(--ember)_55%,transparent)] px-2 py-1 text-[11px] text-[var(--ember)]">
                      flag: {flag}
                    </span>
                  ) : null}
                </div>

                {outcome ? (
                  <p
                    className="mono mt-4 border-t border-[var(--line)] pt-3 text-[12px]"
                    style={{ color: accentHot }}
                  >
                    {outcome}
                  </p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
