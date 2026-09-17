"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Network4Icon } from "@/components/icons/network-4";
import { StatusBanner } from "@/components/status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ARCH_NODES,
  type ArchNodeId,
  type LiveSnapshot,
} from "@/lib/architecture";
import type { MetricsMap } from "@/lib/types";

function metric(m: MetricsMap, key: string) {
  return m[key] ?? 0;
}

export function ArchitectureLive() {
  const [selected, setSelected] = useState<ArchNodeId>("ingest");
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [hotIds, setHotIds] = useState<ArchNodeId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<LiveSnapshot | null>(null);
  const rowRefs = useRef<Partial<Record<ArchNodeId, HTMLTableRowElement | null>>>(
    {},
  );
  const shouldFocus = useRef(false);

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
  const liveReading = interpret(live, lag, selected);
  const selectedIndex = ARCH_NODES.findIndex((n) => n.id === selected);

  function selectNode(id: ArchNodeId, focus = false) {
    if (focus) shouldFocus.current = true;
    setSelected(id);
  }

  function moveSelection(delta: number) {
    const next = Math.min(
      ARCH_NODES.length - 1,
      Math.max(0, selectedIndex + delta),
    );
    const node = ARCH_NODES[next];
    if (node) selectNode(node.id, true);
  }

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    rowRefs.current[selected]?.focus();
  }, [selected]);

  return (
    <main id="main" className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 py-5 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Architecture
          </h1>
          <p className="mt-2 max-w-xl text-pretty text-base text-muted-foreground">
            Partners send signed events. Credits cannot pay twice.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Open Arena</Link>
        </Button>
      </header>

      {offline ? (
        <StatusBanner
          title="Go service is offline"
          detail="Counters on this page will not move. Open the recorded Arena demo, or retry."
          onRetry={() => {
            void tick();
          }}
          retryLabel="Retry service"
        />
      ) : null}

      <section aria-labelledby="live-metrics-heading">
        <h2 id="live-metrics-heading" className="sr-only">
          Live counters
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="API"
            value={live ? (live.ok ? "online" : "offline") : "…"}
            description={live ? `${live.latencyMs} ms, /healthz` : "probing"}
            icon={<Network4Icon className="size-4" />}
          />
          <StatCard
            label="Ingested"
            value={live ? live.ingested.toLocaleString() : "—"}
            description="lifetime"
          />
          <StatCard
            label="Processed"
            value={live ? live.processed.toLocaleString() : "—"}
            description={lag > 0 ? `${lag} still in flight` : "caught up"}
          />
          <StatCard
            label="Outbox"
            value={live ? live.outboxPending.toLocaleString() : "—"}
            description="pending / mid-send"
          />
          <StatCard
            label="Credits"
            value={live ? live.credits.toLocaleString() : "—"}
            description="ledger successes"
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Event path</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="min-w-0">
              <TableCaption>
                Select a row. Hot means recent counter movement.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Node</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead className="hidden sm:table-cell">Code</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ARCH_NODES.map((node) => {
                  const isHot = hot.has(node.id);
                  const isSel = selected === node.id;
                  return (
                    <TableRow
                      key={node.id}
                      ref={(el) => {
                        rowRefs.current[node.id] = el;
                      }}
                      data-state={isSel ? "selected" : undefined}
                      className="cursor-pointer"
                      onClick={() => selectNode(node.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectNode(node.id);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          moveSelection(1);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          moveSelection(-1);
                        } else if (e.key === "Home") {
                          e.preventDefault();
                          selectNode(ARCH_NODES[0].id, true);
                        } else if (e.key === "End") {
                          e.preventDefault();
                          const last = ARCH_NODES[ARCH_NODES.length - 1];
                          if (last) selectNode(last.id, true);
                        }
                      }}
                      tabIndex={isSel ? 0 : -1}
                      aria-selected={isSel}
                    >
                      <TableCell className="font-medium">{node.label}</TableCell>
                      <TableCell>{node.plain}</TableCell>
                      <TableCell className="hidden font-mono text-xs sm:table-cell">
                        {node.code}
                      </TableCell>
                      <TableCell>
                        {isHot ? (
                          <Badge variant="success-light">hot</Badge>
                        ) : isSel ? (
                          <Badge variant="secondary">selected</Badge>
                        ) : (
                          <Badge variant="outline">idle</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedNode.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{selectedNode.plain}</p>
            <p className="text-sm leading-relaxed text-foreground">
              {selectedNode.detail}
            </p>
            <p className="rounded-md border border-border bg-input px-3 py-2 font-mono text-xs text-primary">
              {selectedNode.code}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {liveReading}
            </p>
            {error && live && !live.ok ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="arch-reading">
        <Card>
          <CardHeader>
            <CardTitle id="arch-reading">What the path guarantees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-3xl text-sm leading-relaxed text-foreground">
              HMAC ingest writes the outbox, Kafka feeds the worker, and the
              ledger credits once per event_id. Tools and shadow read; they do
              not credit.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function interpret(
  live: LiveSnapshot | null,
  lag: number,
  id: ArchNodeId,
): string {
  if (!live) return "Waiting for live metrics.";
  const lines: Record<ArchNodeId, string> = {
    partner: `Ingested lifetime ${live.ingested.toLocaleString()}. Climb this by running Arena.`,
    hmac: "Signatures are verified against the raw body bytes, not re-marshalled JSON.",
    ingest: live.ok
      ? `API healthy. Last probe ${live.latencyMs}ms.`
      : "API probe failed.",
    outbox:
      live.outboxPending > 0
        ? `${live.outboxPending} row(s) waiting to publish.`
        : "Outbox drained. Publisher caught up.",
    kafka:
      lag > 0
        ? `${lag} accepted event(s) not yet processed.`
        : "Processed caught up with ingested.",
    worker: `Processed ${live.processed.toLocaleString()} events. Worker tx is mark + state + credit.`,
    rules: `Hits: welcome ${live.welcome}, vip ${live.vip}, velocity ${live.velocity}.`,
    ledger: `Successful credits ${live.credits.toLocaleString()} (unique event ids).`,
    read: "GET /v1/players/{id}. Tools wrap the same reads. They do not credit.",
  };
  return lines[id];
}
