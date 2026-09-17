"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { EventTicker } from "@/components/event-ticker";
import { PipelineRail } from "@/components/pipeline-rail";
import { PulseField, type PulseFieldHandle } from "@/components/pulse-field";
import { RuleBeacons } from "@/components/rule-beacons";
import { SiteNav } from "@/components/site-nav";
import { StatusBanner } from "@/components/status-banner";
import { TenantLane } from "@/components/tenant-lane";
import {
  BEAT_CAPTION,
  BEAT_PLAIN,
  acmeOutcome,
  novaOutcome,
  pickStoryEvents,
  wait,
  type DemoBeat,
  type StoryEvent,
} from "@/lib/demo-script";
import type { DemoResponse, IngestResult, MetricsMap, PlayerSnapshot } from "@/lib/types";

export function PulseTheater() {
  const reduce = useReducedMotion();
  const fieldRef = useRef<PulseFieldHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
  const [lifetime, setLifetime] = useState<MetricsMap>({});
  const [welcomeAlready, setWelcomeAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
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

  const probe = useCallback(async () => {
    try {
      const [healthRes, metricsRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/metrics", { cache: "no-store" }),
      ]);
      const health = (await healthRes.json().catch(() => null)) as {
        ok?: boolean;
      } | null;
      const online = !!health?.ok;
      setApiOnline(online);
      if (online && metricsRes.ok) {
        setLifetime((await metricsRes.json()) as MetricsMap);
      }
      return online;
    } catch {
      setApiOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await probe();
    };
    void tick();
    const id = window.setInterval(tick, 15_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [probe]);

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

      setApiOnline(true);
      setEvents(data.accepted ?? []);
      setStories(pickStoryEvents(data.accepted ?? []));
      setDelta(data.metrics_delta ?? {});
      setLifetime(data.metrics ?? {});
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
      void probe();
    } finally {
      setElapsed(Math.round(performance.now() - started));
      setBusy(false);
    }
  }

  const caption = BEAT_CAPTION[beat];
  const offline = apiOnline === false;
  const igniteDisabled = busy || offline;
  const showStage = busy || showDetails || (beat !== "idle" && beat !== "error");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <PulseField running={busy || payoff} onReady={onFieldReady} />
      <div className="vignette" />
      <div className="scanlines" />
      <div className="noise" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-14 pt-5 md:px-8">
        <SiteNav apiOnline={apiOnline} />

        <main id="main" className="flex flex-1 flex-col">
          <AnimatePresence>
            {offline && !error ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <StatusBanner
                  title="Live API is offline"
                  detail="Ignite needs the Go service. Watch the recorded Arena run, or retry when the API is up."
                  onRetry={() => {
                    void probe();
                  }}
                  retryLabel="Retry API"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <header className="mt-8 max-w-2xl">
            <h1 className="display text-4xl leading-[0.95] md:text-5xl">
              Pulse Arena
            </h1>
            <p className="mt-3 text-base leading-relaxed text-[var(--fog-dim)] md:text-lg">
              Two tenants, one ledger path. Ignite to watch VIP on Acme, then a
              velocity flag on Nova.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runDemo}
                disabled={igniteDisabled}
                aria-busy={busy}
                className="btn-primary btn-shimmer focus-ring display relative min-h-11 overflow-hidden rounded-sm px-5 py-2.5 text-base disabled:cursor-not-allowed"
              >
                <span className="relative z-10">
                  {busy ? "Running demo" : "Ignite live demo"}
                </span>
              </button>
              <p className="mono text-[12px] text-[var(--fog-mute)]">
                {BEAT_PLAIN[beat]}
                {elapsed > 0 ? ` · ${elapsed.toLocaleString()}ms` : ""}
              </p>
            </div>
          </header>

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

          <AnimatePresence>
            {payoff ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 rounded-sm border border-[var(--line)] bg-[rgba(240,194,127,0.06)] px-4 py-3"
              >
                <p className="display text-lg text-[var(--gold)]">
                  Same ledger path. Different outcomes. No double credit.
                </p>
                <p className="mt-1 text-sm text-[var(--fog-mute)]">
                  {welcomeAlready
                    ? "Welcome already on the player. Idempotent credit held."
                    : "Welcome credited once. VIP gold. Velocity flagged."}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showStage ? (
            <div className="mt-6">
              <PipelineRail beat={beat} caption={caption} />
            </div>
          ) : beat === "idle" && !offline ? (
            <p className="mt-8 max-w-xl text-sm text-[var(--fog-mute)]">
              Tenant lanes stay empty until Ignite. HMAC signing stays in the
              BFF.
            </p>
          ) : null}

          <AnimatePresence>
            {showStage ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.85fr]"
              >
                <div className="glass-panel relative grid overflow-hidden rounded-sm md:grid-cols-2">
                  <TenantLane
                    side="acme"
                    title="Acme"
                    subtitle="vip path"
                    blurb="Deposit, heavy bets, VIP climbs, welcome credit."
                    player={acme}
                    revealed={showAcme}
                    focus={beat === "acme"}
                    outcome={showAcme ? acmeOutcome(acme) : ""}
                    hideIntegrity
                  />
                  <TenantLane
                    side="nova"
                    title="Nova"
                    subtitle="velocity path"
                    blurb="Tight bet bursts, then an integrity velocity flag."
                    player={nova}
                    revealed={showNova}
                    focus={beat === "nova"}
                    outcome={showNova ? novaOutcome(nova) : ""}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <RuleBeacons
                    lit={lit}
                    deltas={delta}
                    welcomeAlready={welcomeAlready}
                    velocityOnPlayer={
                      showNova && nova?.integrity_flag === "velocity"
                    }
                  />

                  <div className="glass-panel relative rounded-sm p-4">
                    <div className="flex items-center justify-between">
                      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fog-mute)]">
                        this run
                      </p>
                      <p className="mono text-[10px] text-[var(--fog-mute)]">
                        deltas, not lifetime
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Counter
                        label="ingested +"
                        value={delta.engagepulse_events_ingested_total}
                      />
                      <Counter
                        label="processed +"
                        value={delta.engagepulse_events_processed_total}
                      />
                      <Counter
                        label="credits +"
                        value={delta.engagepulse_ledger_credits_total}
                      />
                      <Counter
                        label="packets"
                        value={events.length || undefined}
                      />
                    </div>
                    <p className="mono mt-3 text-[10px] text-[var(--fog-mute)]">
                      lifetime ingested{" "}
                      {(
                        lifetime.engagepulse_events_ingested_total ?? 0
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showDetails ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <EventTicker
                  stories={stories}
                  totalAccepted={events.length}
                  showAll={showAllTape}
                  onToggle={() => setShowAllTape((v) => !v)}
                  allLabels={allLabels}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Counter({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-sm border border-[var(--line)] px-3 py-2">
      <p className="mono text-[10px] uppercase tracking-[0.18em] text-[var(--fog-mute)]">
        {label}
      </p>
      <AnimatedNumber
        value={value}
        className="display mt-1 block text-2xl tabular-nums"
      />
    </div>
  );
}
