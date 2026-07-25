"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  const accent = side === "acme" ? "var(--copper)" : "var(--ice)";
  const accentHot = side === "acme" ? "var(--gold)" : "var(--teal)";
  const flag = hideIntegrity ? "" : player?.integrity_flag ?? "";
  const tags = player?.offer_tags ?? [];
  const progress = player ? tierProgress(player.score) : null;
  const ring = 2 * Math.PI * 34;
  const dash = progress ? ring - (progress.pct / 100) * ring : ring;

  return (
    <motion.section
      layout
      className={`relative flex min-h-[420px] flex-1 flex-col justify-between p-5 md:p-7 ${
        side === "acme" ? "lane-acme" : "lane-nova"
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: focus || revealed ? 1 : 0.45,
        y: 0,
        filter: focus ? "none" : revealed ? "none" : "saturate(0.7)",
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="relative z-10">
        <div className="flex items-center gap-2">
          <motion.span
            className="live-dot h-1.5 w-1.5 rounded-full"
            animate={{
              backgroundColor: focus || revealed ? accentHot : "var(--fog-mute)",
            }}
          />
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--fog-mute)]">
            {subtitle}
          </p>
        </div>
        <h2 className="display mt-2 text-4xl md:text-5xl" style={{ color: accent }}>
          {title}
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--fog-dim)]">
          {blurb}
        </p>
      </header>

      <div className="relative z-10 mt-8">
        <motion.div
          className="glass-panel relative overflow-hidden rounded-sm p-5"
          animate={{
            borderColor:
              focus || revealed
                ? `color-mix(in oklab, ${accent} 60%, transparent)`
                : "var(--line)",
            boxShadow: focus
              ? `0 0 0 1px color-mix(in oklab, ${accent} 35%, transparent), 0 24px 70px rgba(0,0,0,0.45)`
              : "none",
          }}
        >
          <AnimatePresence mode="wait">
            {!revealed || !player ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[220px] flex-col items-center justify-center text-center"
              >
                <div className="relative mb-4 h-20 w-20">
                  <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="rgba(245,239,230,0.08)"
                      strokeWidth="4"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center mono text-[10px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
                    idle
                  </span>
                </div>
                <p className="mono text-[12px] uppercase tracking-[0.18em] text-[var(--fog-mute)]">
                  waiting for this path
                </p>
                <p className="mt-2 max-w-[220px] text-xs text-[var(--fog-mute)]">
                  {side === "acme"
                    ? "Will resolve after secure sign → accept → process."
                    : "Reveals after Acme — watch for the velocity flag."}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="filled"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
                      player
                    </p>
                    <p className="mono mt-1 truncate text-sm text-[var(--fog)]">
                      {player.player_id}
                    </p>
                  </div>
                  <div className="relative h-[84px] w-[84px] shrink-0">
                    <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke="rgba(245,239,230,0.08)"
                        strokeWidth="4"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="none"
                        stroke={accentHot}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={ring}
                        initial={{ strokeDashoffset: ring }}
                        animate={{ strokeDashoffset: dash }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="mono text-[10px] uppercase tracking-[0.16em]"
                        style={{ color: accentHot }}
                      >
                        {player.vip_tier}
                      </span>
                      <span className="mono text-[9px] text-[var(--fog-mute)]">
                        {Math.round(progress?.pct ?? 0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fog-mute)]">
                      score
                    </p>
                    <AnimatedNumber
                      value={player.score}
                      className="display mt-1 block text-3xl tabular-nums text-[var(--fog)]"
                    />
                  </div>
                  <div>
                    <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fog-mute)]">
                      balance
                    </p>
                    <AnimatedNumber
                      value={player.balance}
                      className="display mt-1 block text-3xl tabular-nums text-[var(--fog)]"
                    />
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
                      flag:{flag}
                    </span>
                  ) : null}
                </div>

                {outcome ? (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mono mt-5 border-t border-[var(--line)] pt-3 text-[12px]"
                    style={{ color: accentHot }}
                  >
                    → {outcome}
                  </motion.p>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.section>
  );
}
