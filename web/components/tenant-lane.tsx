"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/animated-number";
import { UserIcon } from "@/components/icons/user";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import type { PlayerSnapshot } from "@/lib/types";

type Props = {
  side: "acme" | "nova";
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDetail: string;
  player: PlayerSnapshot | null;
  revealed: boolean;
  focus: boolean;
  outcome: string;
  hideIntegrity?: boolean;
};

function tierProgress(score: number) {
  if (score >= 5000) return { pct: 100, next: null as string | null };
  if (score >= 1000) {
    return { pct: Math.min(100, ((score - 1000) / 4000) * 100), next: "gold" };
  }
  return { pct: Math.min(100, (score / 1000) * 100), next: "silver" };
}

export function TenantLane({
  side,
  title,
  subtitle,
  emptyTitle,
  emptyDetail,
  player,
  revealed,
  focus,
  outcome,
  hideIntegrity,
}: Props) {
  const reduce = useReducedMotion();
  const flag = hideIntegrity ? "" : player?.integrity_flag ?? "";
  const tags = player?.offer_tags ?? [];
  const progress = player ? tierProgress(player.score) : null;
  const waiting = !revealed || !player;

  return (
    <Card
      className={`flex h-full min-h-0 flex-col ${side === "acme" ? "lane-acme" : "lane-nova"}`}
      style={{
        boxShadow: focus
          ? "var(--shadow-panel), var(--shadow-focus)"
          : undefined,
      }}
      aria-busy={waiting && focus}
    >
      <CardHeader className="pb-3">
        <CardTitle
          className="text-2xl"
          style={{ color: "var(--lane)" }}
        >
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div
              key="empty"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Empty
                icon={<UserIcon />}
                title={emptyTitle}
                description={emptyDetail}
                className="p-6"
              />
            </motion.div>
          ) : (
            <motion.div
              key="filled"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <p className="truncate font-mono text-sm text-foreground">
                {player.player_id}
              </p>
              <p className="text-sm text-muted-foreground">
                {player.vip_tier}
                {progress?.next
                  ? `, ${Math.round(progress.pct)}% to ${progress.next}`
                  : ", gold"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                    <AnimatedNumber value={player.score} />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Score</p>
                </div>
                <div>
                  <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight">
                    <AnimatedNumber value={player.balance} />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Balance (credit-once)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {flag ? (
                  <Badge variant="destructive-light">flag: {flag}</Badge>
                ) : null}
              </div>
              {outcome ? (
                <p className="border-t border-border pt-3 text-sm" style={{ color: "var(--lane-hot)" }}>
                  {outcome}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
