"use client";

import { useState } from "react";
import Link from "next/link";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { Network4Icon } from "@/components/icons/network-4";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { liveReading, nodeById, type ArchNodeId } from "@/lib/architecture";
import { useLiveArchitecture } from "@/lib/use-live-architecture";

export function ArchitectureLive() {
  const [selected, setSelected] = useState<ArchNodeId>("ingest");
  const { live, hotIds, error, lag, offline, refresh } = useLiveArchitecture();
  const selectedNode = nodeById(selected);
  const reading = liveReading(live, lag, selected);

  return (
    <main id="main" className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-8 px-4 py-5 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
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
            void refresh();
          }}
          retryLabel="Retry service"
        />
      ) : null}

      <section
        aria-labelledby="event-path-heading"
        className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]"
      >
        <Card>
          <CardHeader>
            <CardTitle id="event-path-heading">Event path</CardTitle>
          </CardHeader>
          <CardContent>
            <ArchitectureDiagram
              selected={selected}
              onSelect={setSelected}
              hotIds={hotIds}
              variant="full"
              groupName="architecture-event-path"
            />
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
            <p className="text-sm leading-relaxed text-muted-foreground">{reading}</p>
            {error && live && !live.ok ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

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
            description={
              !live
                ? "ledger unique event ids"
                : live.credits === 0
                  ? "none yet (credits ≠ events)"
                  : "unique event ids, not ingest count"
            }
          />
        </div>
      </section>

      <section aria-labelledby="arch-reading">
        <Card>
          <CardHeader>
            <CardTitle id="arch-reading">What the path guarantees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="max-w-3xl text-sm leading-relaxed text-foreground">
              HMAC ingest writes the outbox, Kafka feeds the worker, and the
              ledger credits once per event_id. Tools and shadow read; they do
              not credit.
            </p>
            <p className="max-w-3xl text-sm leading-relaxed text-foreground">
              The LLM is not on the credit path.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
