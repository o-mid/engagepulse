"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchNodeId, LiveSnapshot } from "@/lib/architecture";
import type { MetricsMap } from "@/lib/types";

function metric(m: MetricsMap, key: string) {
  return m[key] ?? 0;
}

export function useLiveArchitecture(intervalMs = 1500) {
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
        dlq: metric(metrics, "engagepulse_consumer_dlq_total"),
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
        if (next.dlq > previous.dlq) nextHot.add("dlq");
      }
      if (next.outboxPending > 0) nextHot.add("outbox");

      previousRef.current = next;
      setLive(next);
      setHotIds([...nextHot]);
      setError(health.ok ? null : (health.error ?? "API offline"));
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
      if (alive) timer = window.setTimeout(loop, intervalMs);
    };
    void loop();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [intervalMs, tick]);

  const lag = live ? Math.max(0, live.ingested - live.processed) : 0;
  const offline = live ? !live.ok : false;

  return { live, hotIds, error, lag, offline, refresh: tick };
}
