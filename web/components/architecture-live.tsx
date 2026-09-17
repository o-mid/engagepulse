"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { OpsPanels } from "@/components/ops-panels";
import { SiteNav } from "@/components/site-nav";
import { StatusBanner } from "@/components/status-banner";
import {
  ARCH_NODES,
  type ArchNodeId,
  type LiveSnapshot,
} from "@/lib/architecture";
import type { MetricsMap } from "@/lib/types";

const DEEP_DIVES = [
  {
    title: "Outbox: save first, send later",
    body: "Accept writes a Postgres outbox row, then returns 202. A publisher drains pending rows to Kafka. If the process dies mid-send, stuck rows return to pending and retry.",
    why: "Avoids accepted-but-lost when the stream is briefly down.",
  },
  {
    title: "Retries and dead-letter topic",
    body: "The consumer retries a failing event up to 3 times. Persistent failure copies the payload and error to player.events.dlq, then commits the original offset.",
    why: "Bad events do not block the whole tenant stream forever.",
  },
  {
    title: "Ledger: credit once",
    body: "Bonus rows are unique on (tenant_id, event_id). Kafka may redeliver; the second credit attempt is rejected so balance does not jump twice.",
    why: "Idempotency is the product promise, not a footnote.",
  },
] as const;

function metric(m: MetricsMap, key: string) {
  return m[key] ?? 0;
}

export function ArchitectureLive() {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<ArchNodeId>("ingest");
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [hotIds, setHotIds] = useState<ArchNodeId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<LiveSnapshot | null>(null);

  const tick = useCallback(async () => {
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

      const previous = previousRef.current;
      const nextHot = new Set<ArchNodeId>();
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

      previousRef.current = next;
      setLive(next);
      setHotIds([...nextHot]);
      setError(health.ok ? null : health.error ?? "API offline");
    } catch (err) {
      setError(err instanceof Error ? err.message : "poll failed");
      setLive((l) => (l ? { ...l, ok: false } : null));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const loop = async () => {
      await tick();
      if (alive) timer = window.setTimeout(loop, 1500);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [tick]);

  const selectedNode = ARCH_NODES.find((n) => n.id === selected)!;
  const hot = useMemo(() => new Set(hotIds), [hotIds]);
  const lag = live ? Math.max(0, live.ingested - live.processed) : 0;
  const offline = live ? !live.ok : false;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <div className="vignette" />
      <div className="scanlines" />
      <div className="noise" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-8">
        <SiteNav apiOnline={live == null ? null : live.ok} />

        <main id="main">
          {offline ? (
            <StatusBanner
              title="Go service is offline"
              detail="Counters on this page will not move. Watch the recorded Arena run, or retry when the service is up."
              onRetry={() => {
                void tick();
              }}
              retryLabel="Retry service"
            />
          ) : null}

          <header className="mt-8 max-w-2xl">
            <h1 className="display text-balance text-4xl leading-[0.95] md:text-5xl">
              Architecture
            </h1>
            <p className="mt-3 max-w-xl text-base text-[var(--fog-dim)] md:text-lg">
              <span className="block">Partners send signed events.</span>
              <span className="block">Credits cannot pay twice.</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/"
                className="btn-primary focus-ring display inline-flex min-h-11 items-center rounded-sm px-4 py-2 text-sm"
              >
                Open Pulse Arena
              </Link>
            </div>
          </header>

          <section className="mt-8" aria-labelledby="live-metrics-heading">
            <h2 id="live-metrics-heading" className="display text-xl">
              Live counters
            </h2>
            <p className="mt-1 text-sm text-[var(--fog-dim)]">
              {live
                ? live.ok
                  ? `Last probe ${live.latencyMs}ms.`
                  : error ?? "API offline"
                : "Probing /healthz."}
              {live && lag > 0 ? ` ${lag} ingested events not yet processed.` : ""}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <LiveCard
                label="API"
                value={live ? (live.ok ? "online" : "offline") : "…"}
                hint={live ? `${live.latencyMs}ms, /healthz` : "probing"}
                tone={live?.ok ? "good" : "bad"}
              />
              <LiveCard
                label="ingested"
                value={live?.ingested}
                hint="lifetime"
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
          </section>

          <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-panel relative rounded-sm p-4 md:p-5">
              <h2 className="display text-xl">Event path</h2>
              <p className="mt-1 text-sm text-[var(--fog-dim)]">
                Select a node. Hot means recent counter movement.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {ARCH_NODES.map((node, i) => {
                  const isHot = hot.has(node.id);
                  const isSel = selected === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelected(node.id)}
                      aria-pressed={isSel}
                      className="focus-ring flex min-h-11 flex-col items-start rounded-sm border px-2 py-2 text-left"
                      style={{
                        borderColor: isSel
                          ? "color-mix(in oklab, var(--gold) 70%, transparent)"
                          : isHot
                            ? "color-mix(in oklab, var(--teal) 55%, transparent)"
                            : "var(--line)",
                        background: isSel
                          ? "color-mix(in oklab, var(--ink-elevated) 80%, var(--copper))"
                          : "rgba(0,0,0,0.28)",
                      }}
                    >
                      <span className="mono text-[10px] text-[var(--fog-mute)]">
                        {String(i + 1).padStart(2, "0")}
                        {isHot ? ", hot" : ""}
                      </span>
                      <span className="display text-sm text-[var(--fog)]">
                        {node.label}
                      </span>
                      <span className="mono mt-0.5 hidden text-[9px] uppercase tracking-[0.12em] text-[var(--fog-mute)] sm:block">
                        {node.plain}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.aside
                key={selected}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel rounded-sm p-5"
              >
                <h2 className="display text-3xl text-[var(--copper)]">
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

          <section className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              {
                id: "welcome",
                label: "Welcome",
                value: live?.welcome,
                hint: "First deposit credit",
              },
              {
                id: "vip",
                label: "VIP score",
                value: live?.vip,
                hint: "Tier from bets",
              },
              {
                id: "velocity",
                label: "Velocity",
                value: live?.velocity,
                hint: "Burst integrity flag",
              },
            ].map((r) => (
              <div key={r.id} className="glass-panel rounded-sm p-4">
                <h3 className="display text-xl">{r.label}</h3>
                <p className="text-xs text-[var(--fog-dim)]">{r.hint}</p>
                <AnimatedNumber
                  value={r.value}
                  className="display mt-3 block text-3xl tabular-nums"
                />
              </div>
            ))}
          </section>

          <section className="mt-8">
            <h2 className="display text-xl">Reliability choices</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {DEEP_DIVES.map((d) => (
                <article key={d.title} className="glass-panel rounded-sm p-4">
                  <h3 className="display text-lg text-[var(--fog)]">{d.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--fog-dim)]">
                    {d.body}
                  </p>
                  <p className="mt-3 text-sm text-[var(--copper)]">Why: {d.why}</p>
                </article>
              ))}
            </div>
          </section>

          <OpsPanels />
        </main>
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
      {typeof value === "number" || value == null ? (
        <AnimatedNumber
          value={typeof value === "number" ? value : null}
          className="display block text-2xl tabular-nums"
        />
      ) : (
        <p className="display text-2xl" style={{ color }}>
          {value}
          {tone === "bad" ? " (fault)" : ""}
        </p>
      )}
      <p className="mono mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--fog-mute)]">
        {label}
      </p>
      <p className="mt-1 text-xs text-[var(--fog-mute)]">{hint}</p>
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
      <p className="mt-4 text-sm text-[var(--fog-mute)]">
        Waiting for live metrics.
      </p>
    );
  }

  const lines: Record<ArchNodeId, string> = {
    partner: `Ingested lifetime ${live.ingested.toLocaleString()}. Climb this by running Arena or loadgen.`,
    hmac: "Signatures are verified against the raw body bytes, not re-marshalled JSON.",
    ingest: live.ok
      ? `API healthy. Last probe ${live.latencyMs}ms.`
      : "API probe failed. Start `make run` on :8080.",
    outbox:
      live.outboxPending > 0
        ? `${live.outboxPending} row(s) waiting to publish.`
        : "Outbox drained. Publisher caught up.",
    kafka:
      lag > 0
        ? `${lag} accepted event(s) not yet processed.`
        : "Processed caught up with ingested.",
    worker: `Processed ${live.processed.toLocaleString()} events through the worker.`,
    rules: `Hits: welcome ${live.welcome}, vip ${live.vip}, velocity ${live.velocity}.`,
    ledger: `Successful credits ${live.credits.toLocaleString()} (unique event ids).`,
    read: "Snapshots via HTTP X-API-Key or gRPC x-api-key. Tools wrap the same reads.",
  };

  return (
    <p className="mt-4 text-sm leading-relaxed text-[var(--fog-dim)]">
      Live: {lines[id]}
    </p>
  );
}
