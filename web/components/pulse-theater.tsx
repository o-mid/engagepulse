"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { useApiHealth } from "@/lib/use-api-health";
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <PulseField running={busy || payoff} onReady={onFieldReady} />

      <main
        id="main"
        className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5"
      >
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Credit-once, two tenants
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-base text-muted-foreground">
              HMAC ingest, outbox, Kafka, then worker.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={runDemo}
              disabled={igniteDisabled}
              aria-busy={busy}
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
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <StatusBanner
                title="Go service is offline"
                detail="Ignite needs the hosted or local Go API. Watch the recorded run, or retry."
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

        <div
          className={
            showRun
              ? "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]"
              : "grid min-h-0 flex-1 gap-4 lg:grid-cols-2"
          }
        >
          <TenantLane
            side="acme"
            title="Acme Casino"
            subtitle="VIP path"
            emptyTitle="Waiting on Ignite"
            emptyDetail="GET player fills this after ingest."
            player={acme}
            revealed={showAcme}
            focus={beat === "acme"}
            outcome={showAcme ? acmeOutcome(acme) : ""}
            hideIntegrity
          />
          <TenantLane
            side="nova"
            title="Nova Sports"
            subtitle="Velocity path"
            emptyTitle="Waiting on Acme"
            emptyDetail="Same path. Velocity flag."
            player={nova}
            revealed={showNova}
            focus={beat === "nova"}
            outcome={showNova ? novaOutcome(nova) : ""}
          />

          {showRun ? (
          <Card className="flex min-h-0 flex-col">
            <CardHeader className="pb-3">
              <CardTitle>This run</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pt-0">
              <PipelineRail beat={beat} caption={caption} />
              {payoff ? (
                <p className="text-sm text-foreground">
                  {welcomeAlready
                    ? "Welcome already on the player. Second credit held."
                    : "Welcome credited once. VIP gold. Velocity flagged."}
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
                />
                <StatCard
                  label="Credits"
                  value={
                    delta.engagepulse_ledger_credits_total?.toLocaleString() ??
                    "—"
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
        </div>
      </main>
    </div>
  );
}
