"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { SiteNav } from "@/components/site-nav";
import {
  ARCH_EDGES,
  ARCH_NODES,
  type ArchNodeId,
  type LiveSnapshot,
} from "@/lib/architecture";
import type { MetricsMap } from "@/lib/types";

const DEEP_DIVES = [
  {
    title: "Outbox — save first, send later",
    body: "Accept writes a Postgres outbox row, then returns 202. A publisher drains pending rows to Kafka. If the process dies mid-send, stuck rows return to pending and retry.",
    why: "Avoids “accepted but lost” when the stream is briefly down.",
  },
  {
    title: "Retries + dead-letter topic",
    body: "The consumer retries a failing event up to 3 times. Persistent failure copies the payload + error to player.events.dlq, then commits the original offset.",
    why: "Bad events don’t block the whole tenant stream forever.",
  },
  {
    title: "Ledger — credit once",
    body: "Bonus rows are unique on (tenant_id, event_id). Kafka may redeliver; the second credit attempt is rejected so balance doesn’t jump twice.",
    why: "Idempotency is the product promise, not a footnote.",
  },
] as const;

function metric(m: MetricsMap, key: string) {
  return m[key] ?? 0;
}

export function ArchitectureLive() {
  const [selected, setSelected] = useState<ArchNodeId>("ingest");
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [hotIds, setHotIds] = useState<ArchNodeId[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    let previous: LiveSnapshot | null = null;

    const tick = async () => {
      try {
        const [healthRes, metricsRes] = await Promise.all([
          fetch("/api/health", { cache: "no-store" }),
          fetch("/api/metrics", { cache: "no-store" }),
        ]);
        const health = (await healthRes.json()) as {
          ok: boolean;
          latency_ms: number;
          error?: string;
        };
        const metrics = metricsRes.ok
          ? ((await metricsRes.json()) as MetricsMap)
          : {};

        if (!alive) return;
        const next: LiveSnapshot = {
          ok: !!health.ok,
          latencyMs: health.latency_ms ?? 0,
          ingested: metric(metrics, "engagepulse_events_ingested_total"),
          processed: metric(metrics, "engagepulse_events_processed_total"),
          credits: metric(metrics, "engagepulse_ledger_credits_total"),
          outboxPending: metric(metrics, "engagepulse_outbox_pending"),
          welcome: metric(metrics, "rule_welcome_offer"),
          vip: metric(metrics, "rule_vip_score"),
          velocity: metric(metrics, "rule_integrity_velocity"),
        };

        const nextHot = new Set<ArchNodeId>();
        if (next.ok) nextHot.add("ingest");
        if (previous) {
          if (next.ingested > previous.ingested) {
            nextHot.add("partner");
            nextHot.add("hmac");
            nextHot.add("ingest");
            nextHot.add("outbox");
          }
          if (next.processed > previous.processed) {
            nextHot.add("kafka");
            nextHot.add("worker");
            nextHot.add("rules");
            nextHot.add("read");
          }
          if (next.credits > previous.credits) nextHot.add("ledger");
        }
        if (next.outboxPending > 0) nextHot.add("outbox");

        previous = next;
        setLive(next);
        setHotIds([...nextHot]);
        setError(health.ok ? null : health.error ?? "API offline");
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : "poll failed");
          setLive((l) => (l ? { ...l, ok: false } : null));
        }
      } finally {
        if (alive) timer = window.setTimeout(tick, 1500);
      }
    };

    tick();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const selectedNode = ARCH_NODES.find((n) => n.id === selected)!;

  const hot = useMemo(() => new Set(hotIds), [hotIds]);

  const lag = live ? Math.max(0, live.ingested - live.processed) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <div className="vignette" />
      <div className="scanlines" />
      <div className="noise" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-8">
        <SiteNav />

        <header className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.3em] text-[var(--fog-mute)]">
              how it works · live
            </p>
            <h1 className="display mt-2 text-4xl leading-[0.95] md:text-6xl">
              Architecture
              <span className="block bg-gradient-to-r from-[var(--copper)] via-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
                in motion
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-[var(--fog-dim)] md:text-lg">
              One Go binary: signed ingest, outbox, Kafka, rules, ledger-safe
              credits. This page polls the running API so you can see the path
              breathe.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="display rounded-sm px-4 py-2.5 text-sm text-[var(--ink)]"
              style={{
                background:
                  "linear-gradient(120deg, var(--copper), var(--gold) 50%, var(--teal))",
              }}
            >
              Run Arena demo
            </Link>
            <a
              href="https://github.com/o-mid/engagepulse/blob/develop/docs/architecture.md"
              target="_blank"
              rel="noreferrer"
              className="mono rounded-sm border border-[var(--line)] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[var(--fog-mute)]"
            >
              docs/architecture.md
            </a>
          </div>
        </header>

        {/* live strip */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <LiveCard
            label="API"
            value={live ? (live.ok ? "online" : "offline") : "…"}
            hint={
              live
                ? `${live.latencyMs}ms · /healthz`
                : error ?? "probing"
            }
            tone={live?.ok ? "good" : "bad"}
          />
          <LiveCard
            label="ingested"
            value={live?.ingested}
            hint="lifetime counter"
          />
          <LiveCard
            label="processed"
            value={live?.processed}
            hint={lag > 0 ? `${lag} still in flight` : "caught up"}
          />
          <LiveCard
            label="outbox"
            value={live?.outboxPending}
            hint="pending / mid-send"
            tone={(live?.outboxPending ?? 0) > 0 ? "warn" : "good"}
          />
          <LiveCard
            label="credits"
            value={live?.credits}
            hint="ledger successes"
          />
        </div>

        {/* flow */}
        <section className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="glass-panel corner-frame relative rounded-sm p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--fog-mute)]">
                event path
              </p>
              <p className="mono text-[10px] text-[var(--fog-mute)]">
                click a node · hot = recent activity
              </p>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute left-[8%] right-[8%] top-[22px] hidden h-px bg-[var(--line)] md:block" />
              <motion.div
                className="pointer-events-none absolute left-[8%] top-[22px] hidden h-px origin-left bg-gradient-to-r from-[var(--copper)] via-[var(--gold)] to-[var(--teal)] md:block"
                animate={{
                  opacity: hot.size > 1 ? 1 : 0.35,
                  width: "84%",
                }}
              />

              <div className="grid grid-cols-3 gap-3 md:grid-cols-9">
                {ARCH_NODES.map((node, i) => {
                  const isHot = hot.has(node.id);
                  const isSel = selected === node.id;
                  return (
                    <motion.button
                      key={node.id}
                      type="button"
                      onClick={() => setSelected(node.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative z-10 flex flex-col items-center text-center"
                    >
                      <motion.span
                        className="flex h-11 w-11 items-center justify-center rounded-sm border mono text-[11px]"
                        animate={{
                          borderColor: isSel
                            ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                            : isHot
                              ? "color-mix(in oklab, var(--teal) 55%, transparent)"
                              : "var(--line)",
                          background: isSel
                            ? "color-mix(in oklab, var(--ink-elevated) 80%, var(--copper))"
                            : "rgba(0,0,0,0.28)",
                          boxShadow: isHot
                            ? "0 0 20px color-mix(in oklab, var(--teal) 35%, transparent)"
                            : "none",
                          scale: isSel ? 1.08 : 1,
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </motion.span>
                      <span className="display mt-2 text-sm text-[var(--fog)]">
                        {node.label}
                      </span>
                      <span className="mono mt-0.5 hidden text-[9px] uppercase tracking-[0.12em] text-[var(--fog-mute)] lg:block">
                        {node.plain}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {ARCH_EDGES.map(([from, to]) => (
                  <span
                    key={`${from}-${to}`}
                    className="mono rounded-sm border border-[var(--line)] px-2 py-1 text-[10px] text-[var(--fog-mute)]"
                  >
                    {from} → {to}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.aside
              key={selected}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="glass-panel rounded-sm p-5"
            >
              <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
                node detail
              </p>
              <h2 className="display mt-2 text-3xl text-[var(--copper)]">
                {selectedNode.label}
              </h2>
              <p className="mt-1 text-sm text-[var(--fog-dim)]">
                {selectedNode.plain}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--fog)]">
                {selectedNode.detail}
              </p>
              <p className="mono mt-4 rounded-sm border border-[var(--line)] px-3 py-2 text-[11px] text-[var(--teal)]">
                {selectedNode.code}
              </p>
              <NodeLiveHint id={selected} live={live} lag={lag} />
            </motion.aside>
          </AnimatePresence>
        </section>

        {/* rules live */}
        <section className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              id: "welcome",
              label: "Welcome",
              value: live?.welcome,
              hint: "first deposit credit",
              color: "var(--gold)",
            },
            {
              id: "vip",
              label: "VIP score",
              value: live?.vip,
              hint: "tier from bets",
              color: "var(--copper)",
            },
            {
              id: "velocity",
              label: "Velocity",
              value: live?.velocity,
              hint: "burst integrity flag",
              color: "var(--ember)",
            },
          ].map((r) => (
            <div key={r.id} className="glass-panel rounded-sm p-4">
              <div className="flex items-center justify-between">
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fog-mute)]">
                  rule
                </p>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: r.color }}
                />
              </div>
              <p className="display mt-1 text-xl">{r.label}</p>
              <p className="text-xs text-[var(--fog-dim)]">{r.hint}</p>
              <AnimatedNumber
                value={r.value}
                className="display mt-3 block text-3xl tabular-nums"
              />
            </div>
          ))}
        </section>

        {/* deep dives */}
        <section className="mt-8">
          <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--fog-mute)]">
            reliability choices
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {DEEP_DIVES.map((d, i) => (
              <motion.article
                key={d.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-panel rounded-sm p-4"
              >
                <h3 className="display text-lg text-[var(--fog)]">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--fog-dim)]">
                  {d.body}
                </p>
                <p className="mono mt-3 text-[11px] text-[var(--copper)]">
                  why · {d.why}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mt-8 glass-panel rounded-sm p-5">
          <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
            try it live
          </p>
          <p className="display mt-2 max-w-2xl text-2xl text-[var(--fog)]">
            Ignite the Arena demo, then watch this page — ingested / processed /
            rule hits should move as the pipeline runs.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/"
              className="display rounded-sm px-4 py-2.5 text-sm text-[var(--ink)]"
              style={{
                background:
                  "linear-gradient(120deg, var(--copper), var(--teal))",
              }}
            >
              Open Pulse Arena
            </Link>
            <p className="mono self-center text-[11px] text-[var(--fog-mute)]">
              tip · keep both tabs open side by side
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function LiveCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value?: number | string | null;
  hint: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const color =
    tone === "good"
      ? "var(--teal)"
      : tone === "bad"
        ? "var(--ember)"
        : tone === "warn"
          ? "var(--gold)"
          : "var(--fog)";

  return (
    <div className="glass-panel rounded-sm px-3 py-3">
      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fog-mute)]">
        {label}
      </p>
      {typeof value === "number" || value == null ? (
        <AnimatedNumber
          value={typeof value === "number" ? value : null}
          className="display mt-1 block text-2xl tabular-nums"
        />
      ) : (
        <p className="display mt-1 text-2xl" style={{ color }}>
          {value}
        </p>
      )}
      <p className="mono mt-1 text-[10px] text-[var(--fog-mute)]">{hint}</p>
    </div>
  );
}

function NodeLiveHint({
  id,
  live,
  lag,
}: {
  id: ArchNodeId;
  live: LiveSnapshot | null;
  lag: number;
}) {
  if (!live) {
    return (
      <p className="mono mt-4 text-[11px] text-[var(--fog-mute)]">
        Waiting for live metrics…
      </p>
    );
  }

  const lines: Record<ArchNodeId, string> = {
    partner: `Ingested lifetime ${live.ingested.toLocaleString()} — climb this by running Arena or loadgen.`,
    hmac: "Signatures are verified against the raw body bytes, not re-marshalled JSON.",
    ingest: live.ok
      ? `API healthy · last probe ${live.latencyMs}ms.`
      : "API probe failed — start `make run` on :8080.",
    outbox:
      live.outboxPending > 0
        ? `${live.outboxPending} row(s) waiting to publish.`
        : "Outbox drained — publisher caught up.",
    kafka:
      lag > 0
        ? `${lag} accepted event(s) not yet processed.`
        : "Processed caught up with ingested.",
    worker: `Processed ${live.processed.toLocaleString()} events through the worker.`,
    rules: `Hits · welcome ${live.welcome} · vip ${live.vip} · velocity ${live.velocity}.`,
    ledger: `Successful credits ${live.credits.toLocaleString()} (unique event ids).`,
    read: "Snapshots served via HTTP X-API-Key or gRPC x-api-key metadata.",
  };

  return (
    <p className="mono mt-4 text-[11px] leading-relaxed text-[var(--fog-dim)]">
      live · {lines[id]}
    </p>
  );
}
