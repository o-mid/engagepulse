"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { EventTicker } from "@/components/event-ticker";
import { PipelineRail } from "@/components/pipeline-rail";
import { PulseField, type PulseFieldHandle } from "@/components/pulse-field";
import { RuleBeacons } from "@/components/rule-beacons";
import { SiteNav } from "@/components/site-nav";
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
  const [clock, setClock] = useState("");
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

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" });
        if (!alive) return;
        setApiOnline(res.ok);
        if (res.ok) setLifetime((await res.json()) as MetricsMap);
      } catch {
        if (alive) setApiOnline(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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

      // Kick the network while we animate early beats.
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

      // Beat: Acme VIP first
      setBeat("acme");
      setAcme(data.players.acme);
      setShowAcme(true);
      if (!reduce) fieldRef.current?.burst("acme", 1.6);
      await pause(1600);

      // Beat: Nova velocity second
      setBeat("nova");
      setNova(data.players.nova);
      setShowNova(true);
      if (!reduce) fieldRef.current?.burst("nova", 1.6);
      await pause(1500);

      // Payoff
      setBeat("payoff");
      setPayoff(true);
      if (!reduce) {
        fieldRef.current?.burst("acme", 1);
        fieldRef.current?.burst("nova", 1);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setBeat("error");
      setApiOnline(false);
      setError(err instanceof Error ? err.message : "demo failed");
    } finally {
      setElapsed(Math.round(performance.now() - started));
      setBusy(false);
    }
  }

  const caption = BEAT_CAPTION[beat];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora" />
      <PulseField running={busy || payoff} onReady={onFieldReady} />
      <div className="vignette" />
      <div className="scanlines" />
      <div className="noise" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-14 pt-5 md:px-8">
        <SiteNav />

        <motion.div
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap items-center gap-3 mono text-[10px] uppercase tracking-[0.2em] text-[var(--fog-mute)]">
            <span className="inline-flex items-center gap-2">
              <span
                className={`live-dot h-1.5 w-1.5 rounded-full ${
                  apiOnline ? "bg-[var(--teal)]" : "bg-[var(--ember)]"
                }`}
              />
              api {apiOnline == null ? "probing" : apiOnline ? "online" : "offline"}
            </span>
            <span className="text-[var(--line)]">|</span>
            <span>secure sign → accept → process → reward</span>
          </div>
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-[var(--fog-mute)]">
            {clock || "--:--:--"}
          </div>
        </motion.div>

        <nav className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.35em] text-[var(--fog-mute)]">
              engagepulse · live arena
            </p>
            <motion.h1
              className="display mt-2 text-5xl leading-[0.9] md:text-7xl lg:text-8xl"
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-[var(--fog)]">Pulse</span>
              <span className="bg-gradient-to-r from-[var(--copper)] via-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
                Arena
              </span>
            </motion.h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--fog-dim)] md:text-lg">
              One click. Two tenants. Watch VIP climb on Acme, then velocity flag
              on Nova — same pipeline, different outcome.
            </p>
          </div>

          <div className="glass-panel min-w-[200px] rounded-sm px-4 py-3 text-right">
            <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
              now
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={beat}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mono mt-1 text-sm text-[var(--fog)]"
              >
                {BEAT_PLAIN[beat]}
              </motion.p>
            </AnimatePresence>
            {elapsed > 0 ? (
              <p className="mono mt-1 text-[11px] text-[var(--fog-mute)]">
                {elapsed.toLocaleString()}ms wall
              </p>
            ) : (
              <p className="mono mt-1 text-[11px] text-[var(--fog-mute)]">
                awaiting ignite
              </p>
            )}
          </div>
        </nav>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <motion.button
            type="button"
            onClick={runDemo}
            disabled={busy}
            whileHover={busy ? undefined : { scale: 1.02 }}
            whileTap={busy ? undefined : { scale: 0.98 }}
            className="btn-shimmer display relative overflow-hidden rounded-sm px-6 py-3 text-base text-[var(--ink)] disabled:cursor-wait disabled:opacity-70"
            style={{
              background:
                "linear-gradient(120deg, var(--copper), var(--gold) 45%, var(--teal))",
            }}
          >
            <span className="relative z-10">
              {busy ? "Running guided demo…" : "Ignite live demo"}
            </span>
          </motion.button>
          <p className="mono max-w-md text-[11px] leading-relaxed text-[var(--fog-mute)]">
            Guided beats: sign → accept → process → Acme VIP → Nova flag → payoff.
          </p>
        </div>

        <AnimatePresence>
          {error ? (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mono mt-4 rounded-sm border border-[color-mix(in_oklab,var(--ember)_45%,transparent)] bg-[rgba(255,107,74,0.08)] px-3 py-2 text-sm text-[var(--ember)]"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {payoff ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-5 rounded-sm border border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-[rgba(240,194,127,0.08)] px-4 py-3"
            >
              <p className="display text-lg text-[var(--gold)]">
                Same ledger path. Different outcomes. No double credit.
              </p>
              <p className="mono mt-1 text-[11px] text-[var(--fog-mute)]">
                {welcomeAlready
                  ? "Welcome already on the player — idempotent credit held."
                  : "Welcome credited once · VIP gold · velocity flagged."}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-6">
          <PipelineRail beat={beat} caption={caption} />
        </div>

        {/* Stage 2+: lanes reveal with the story */}
        <AnimatePresence>
          {(busy || showDetails || beat !== "idle") && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.85fr]"
            >
              <div className="glass-panel relative grid overflow-hidden rounded-sm md:grid-cols-2">
                <TenantLane
                  side="acme"
                  title="Acme"
                  subtitle="vip path"
                  blurb="Deposit → heavy bets → VIP climbs → welcome credit."
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
                  blurb="Tight bet bursts → integrity velocity flag."
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

                <div className="glass-panel corner-frame relative rounded-sm p-4">
                  <div className="flex items-center justify-between">
                    <p className="mono text-[10px] uppercase tracking-[0.22em] text-[var(--fog-mute)]">
                      this run
                    </p>
                    <p className="mono text-[10px] text-[var(--fog-mute)]">
                      deltas · not lifetime
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Counter label="ingested +" value={delta.engagepulse_events_ingested_total} />
                    <Counter label="processed +" value={delta.engagepulse_events_processed_total} />
                    <Counter label="credits +" value={delta.engagepulse_ledger_credits_total} />
                    <Counter label="packets" value={events.length || undefined} />
                  </div>
                  <p className="mono mt-3 text-[10px] text-[var(--fog-mute)]">
                    lifetime ingested{" "}
                    {(lifetime.engagepulse_events_ingested_total ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDetails ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
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
          ) : beat === "idle" ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mono mt-8 text-center text-[12px] uppercase tracking-[0.22em] text-[var(--fog-mute)]"
            >
              Press Ignite — lanes and rules stay hidden until the story needs them
            </motion.p>
          ) : null}
        </AnimatePresence>
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
