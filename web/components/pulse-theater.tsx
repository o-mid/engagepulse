"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { EventTicker } from "@/components/event-ticker";
import { FlashIcon } from "@/components/icons/flash";
import { PipelineRail } from "@/components/pipeline-rail";
import { PulseField, type PulseFieldHandle } from "@/components/pulse-field";
import { RuleBeacons } from "@/components/rule-beacons";
import { StatusBanner } from "@/components/status-banner";
import { TenantLane } from "@/components/tenant-lane";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  BEAT_CAPTION,
  acmeOutcome,
  novaOutcome,
  pickStoryEvents,
  wait,
  type DemoBeat,
  type StoryEvent,
} from "@/lib/demo-script";
import { liveReading, type ArchNodeId } from "@/lib/architecture";
import { useApiHealth } from "@/lib/use-api-health";
import { useLiveArchitecture } from "@/lib/use-live-architecture";
import type { DemoResponse, IngestResult, MetricsMap, PlayerSnapshot } from "@/lib/types";

export function PulseTheater() {
  const reduce = useReducedMotion();
  const fieldRef = useRef<PulseFieldHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const health = useApiHealth();

  const [beat, setBeat] = useState<DemoBeat>("idle");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<IngestResult[]>([]);
  const [stories, setStories] = useState<StoryEvent[]>([]);
  const [acme, setAcme] = useState<PlayerSnapshot | null>(null);
  const [nova, setNova] = useState<PlayerSnapshot | null>(null);
  const [showAcme, setShowAcme] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [delta, setDelta] = useState<MetricsMap>({});
  const [welcomeAlready, setWelcomeAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showAllTape, setShowAllTape] = useState(false);
  const [payoff, setPayoff] = useState(false);
  const [pathNode, setPathNode] = useState<ArchNodeId>("hmac");
  const arch = useLiveArchitecture();

  const lit = useMemo(
    () => ({
      welcome_offer:
        (delta.rule_welcome_offer ?? 0) > 0 ||
        welcomeAlready ||
        !!(showAcme && acme?.offer_tags?.includes("welcome_bonus")),
      vip_score: showAcme && (acme?.score ?? 0) > 0,
      integrity_velocity:
        showNova &&
        ((delta.rule_integrity_velocity ?? 0) > 0 ||
          nova?.integrity_flag === "velocity"),
    }),
    [acme, nova, delta, showAcme, showNova, welcomeAlready],
  );

  const allLabels = useMemo(
    () =>
      events.map(
        (e) =>
          `${e.tenant_id === "acme-casino" ? "ACME" : "NOVA"} ${e.type} ${e.amount}`,
      ),
    [events],
  );

  const onFieldReady = useCallback((api: PulseFieldHandle) => {
    fieldRef.current = api;
  }, []);

  async function runDemo() {
    if (busy) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setBusy(true);
    setError(null);
    setEvents([]);
    setStories([]);
    setAcme(null);
    setNova(null);
    setShowAcme(false);
    setShowNova(false);
    setShowDetails(false);
    setShowAllTape(false);
    setPayoff(false);
    setDelta({});
    setWelcomeAlready(false);
    setBeat("sign");

    const started = performance.now();
    const pause = (ms: number) => wait(reduce ? Math.min(ms, 80) : ms, ac.signal);

    try {
      if (!reduce) fieldRef.current?.burst("acme", 1);
      await pause(700);
      setBeat("ingest");
      if (!reduce) fieldRef.current?.burst("nova", 0.8);

      const fetchPromise = fetch("/api/demo", { method: "POST", signal: ac.signal });

      await pause(650);
      setBeat("stream");
      if (!reduce) {
        fieldRef.current?.burst("acme", 0.7);
        fieldRef.current?.burst("nova", 0.7);
      }

      const res = await fetchPromise;
      const data = (await res.json()) as DemoResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "demo failed");

      setEvents(data.accepted ?? []);
      setStories(pickStoryEvents(data.accepted ?? []));
      setDelta(data.metrics_delta ?? {});
      setWelcomeAlready(!!data.notes?.welcome_already_credited);
      setShowDetails(true);

      setBeat("acme");
      setAcme(data.players.acme);
      setShowAcme(true);
      if (!reduce) fieldRef.current?.burst("acme", 1.6);
      await pause(1600);

      setBeat("nova");
      setNova(data.players.nova);
      setShowNova(true);
      if (!reduce) fieldRef.current?.burst("nova", 1.6);
      await pause(1500);

      setBeat("payoff");
      setPayoff(true);
      if (!reduce) {
        fieldRef.current?.burst("acme", 1);
        fieldRef.current?.burst("nova", 1);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBeat("error");
      setError(err instanceof Error ? err.message : "demo failed");
      void health.refresh();
    } finally {
      setElapsed(Math.round(performance.now() - started));
      setBusy(false);
    }
  }

  const caption = BEAT_CAPTION[beat];
  const offline = health.online === false;
  const igniteDisabled = busy || offline;
  const showRun = busy || showDetails || beat !== "idle";
  const beatHot = beatHotIds(beat);
  const pathHot = [...new Set([...arch.hotIds, ...beatHot])];
  const pathReading = liveReading(arch.live, arch.lag, pathNode);

  return (
    <div className="relative flex min-h-0 flex-col">
      <PulseField running={busy || payoff} onReady={onFieldReady} />

      <main
        id="main"
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5"
      >
        <header className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 w-full max-w-xl">
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Credit-once, two tenants
            </h1>
            <p className="mt-2 w-full text-pretty break-words text-base text-muted-foreground">
              Watch VIP on Acme, velocity on Nova. Same pipeline, different
              outcome.
            </p>
            <p id="ignite-hint" className="mt-2 w-full text-pretty break-words text-sm text-muted-foreground">
              Ignite signs both tenants in the BFF, writes the outbox, then GET
              player.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={runDemo}
              disabled={igniteDisabled}
              aria-busy={busy}
              aria-describedby={offline ? "arena-offline ignite-hint" : "ignite-hint"}
              size="lg"
            >
              <FlashIcon />
              {busy ? "Running demo" : "Ignite live demo"}
            </Button>
            {elapsed > 0 ? (
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {elapsed.toLocaleString()} ms
              </p>
            ) : null}
          </div>
        </header>

        <AnimatePresence>
          {offline && !error ? (
            <motion.div
              id="arena-offline"
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <StatusBanner
                title="Go service is offline"
                detail="Ignite needs the hosted Railway API or a local Go process. Open the recorded Arena demo, or retry."
                onRetry={() => {
                  void health.refresh();
                }}
                retryLabel="Retry service"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {error ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <StatusBanner
                tone="error"
                title="Demo did not finish"
                detail={error}
                onRetry={() => {
                  void runDemo();
                }}
                retryLabel="Retry demo"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <section aria-labelledby="start-path-heading">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <CardTitle id="start-path-heading">Event path</CardTitle>
                  <p className="mt-1 w-full text-pretty break-words text-sm text-muted-foreground">
                    HMAC sign in the BFF, verify in Go, outbox, Kafka, worker tx.
                  </p>
                </div>
                <Button asChild variant="link" size="sm" className="h-auto shrink-0 px-0">
                  <Link href="/architecture">Live counters</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 pt-0">
              <ArchitectureDiagram
                selected={pathNode}
                onSelect={setPathNode}
                hotIds={pathHot}
                variant="compact"
                groupName="start-event-path"
              />
              <p className="mt-3 text-pretty text-sm text-muted-foreground">
                {pathReading}
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="grid min-h-0 gap-4 lg:grid-cols-2">
          <TenantLane
            side="acme"
            title="Acme Casino"
            slug="acme-casino"
            subtitle="VIP path"
            emptyTitle="Waiting on Ignite"
            emptyDetail="VIP score after GET player. Same pipeline as Nova."
            player={acme}
            revealed={showAcme}
            focus={beat === "acme"}
            outcome={showAcme ? acmeOutcome(acme) : ""}
            hideIntegrity
          />
          <TenantLane
            side="nova"
            title="Nova Sports"
            slug="nova-sports"
            subtitle="Velocity path"
            emptyTitle={showAcme && !showNova ? "Waiting on Acme" : "Waiting on Ignite"}
            emptyDetail="Velocity flag after GET player. Same pipeline as Acme."
            player={nova}
            revealed={showNova}
            focus={beat === "nova"}
            outcome={showNova ? novaOutcome(nova) : ""}
          />
        </div>

        {showRun ? (
          <Card className="flex min-h-0 flex-col">
            <CardHeader className="pb-3">
              <CardTitle>This run</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-0">
              <PipelineRail beat={beat} caption={caption} />
              {payoff ? (
                <p className="text-pretty text-sm text-foreground">
                  {welcomeAlready
                    ? "Welcome already on the player. Second credit held."
                    : "Credit-once 100 on both tenants. VIP on Acme. Velocity on Nova."}
                </p>
              ) : null}
              <RuleBeacons
                lit={lit}
                deltas={delta}
                welcomeAlready={welcomeAlready}
                velocityOnPlayer={
                  showNova && nova?.integrity_flag === "velocity"
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Ingested"
                  value={
                    delta.engagepulse_events_ingested_total?.toLocaleString() ??
                    "—"
                  }
                  description="accepted events"
                />
                <StatCard
                  label="Credits"
                  value={
                    delta.engagepulse_ledger_credits_total?.toLocaleString() ??
                    "—"
                  }
                  description={
                    (delta.engagepulse_ledger_credits_total ?? 0) === 0
                      ? "none this run (credits ≠ events)"
                      : "unique event ids, not ingest count"
                  }
                />
              </div>
              {showDetails ? (
                <EventTicker
                  stories={stories}
                  totalAccepted={events.length}
                  showAll={showAllTape}
                  onToggle={() => setShowAllTape((v) => !v)}
                  allLabels={allLabels}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

function beatHotIds(beat: DemoBeat): ArchNodeId[] {
  if (beat === "idle" || beat === "error") return [];
  if (beat === "sign") return ["hmac"];
  if (beat === "ingest") return ["hmac", "ingest", "outbox"];
  if (beat === "stream") return ["kafka", "worker", "rules"];
  if (beat === "acme" || beat === "nova") return ["ledger", "read"];
  if (beat === "payoff") return ["ledger", "read"];
  return [];
}
