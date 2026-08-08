import type { IngestResult, MetricsMap, PlayerSnapshot } from "@/lib/types";

export type DemoBeat =
  | "idle"
  | "sign"
  | "ingest"
  | "stream"
  | "acme"
  | "nova"
  | "payoff"
  | "error";

export type StoryEvent = {
  id: string;
  tenant: "acme" | "nova";
  label: string;
  detail: string;
};

export const BEAT_CAPTION: Record<DemoBeat, string> = {
  idle: "Press Ignite to run the happy path.",
  sign: "Secure sign — HMAC stays in the BFF.",
  ingest: "Accept — events land in the outbox.",
  stream: "Process — Kafka delivers to the worker.",
  acme: "Acme VIP path — score climbs, welcome lands.",
  nova: "Nova velocity path — burst bets raise a flag.",
  payoff: "Same ledger path. Different outcomes. No double credit.",
  error: "Backend unreachable — watch the recorded Arena demo, or retry when the API is up.",
};

/** Recorded Arena demo when the live API is unreachable. */
export const DEMO_VIDEO_URL =
  "https://github.com/o-mid/engagepulse/releases/download/v0.3.0/engagepulse-web-arena-v0.3.0.mp4";

export const BEAT_PLAIN: Record<DemoBeat, string> = {
  idle: "Ready",
  sign: "1 · Secure sign",
  ingest: "2 · Accept",
  stream: "3 · Process",
  acme: "4 · Acme VIP",
  nova: "5 · Nova flag",
  payoff: "Done",
  error: "Fault",
};

export function metricsDelta(before: MetricsMap, after: MetricsMap): MetricsMap {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: MetricsMap = {};
  for (const k of keys) {
    out[k] = (after[k] ?? 0) - (before[k] ?? 0);
  }
  return out;
}

export function pickStoryEvents(events: IngestResult[]): StoryEvent[] {
  const acmeDeposit = events.find(
    (e) => e.tenant_id === "acme-casino" && e.type === "deposit",
  );
  const acmeBet = events.find(
    (e) => e.tenant_id === "acme-casino" && e.type === "bet_placed",
  );
  const novaDeposit = events.find(
    (e) => e.tenant_id === "nova-sports" && e.type === "deposit",
  );
  const novaBets = events.filter(
    (e) => e.tenant_id === "nova-sports" && e.type === "bet_placed",
  );

  const out: StoryEvent[] = [];
  if (acmeDeposit) {
    out.push({
      id: acmeDeposit.event_id,
      tenant: "acme",
      label: "deposit",
      detail: "opens welcome path",
    });
  }
  if (acmeBet) {
    out.push({
      id: acmeBet.event_id,
      tenant: "acme",
      label: "heavy bets",
      detail: "VIP score climbs",
    });
  }
  if (novaDeposit) {
    out.push({
      id: novaDeposit.event_id,
      tenant: "nova",
      label: "deposit",
      detail: "same credit rules",
    });
  }
  if (novaBets.length) {
    out.push({
      id: novaBets[0].event_id,
      tenant: "nova",
      label: `${novaBets.length}× burst bets`,
      detail: "triggers velocity flag",
    });
  }
  return out;
}

export function acmeOutcome(player: PlayerSnapshot | null): string {
  if (!player) return "";
  const welcome = player.offer_tags?.includes("welcome_bonus");
  const tier = player.vip_tier?.toUpperCase() ?? "—";
  if (welcome) return `${tier} · welcome credited`;
  return `${tier} · VIP path complete`;
}

export function novaOutcome(player: PlayerSnapshot | null): string {
  if (!player) return "";
  if (player.integrity_flag === "velocity") {
    return "velocity flagged · integrity watch";
  }
  return `${player.vip_tier?.toUpperCase() ?? "—"} · processed`;
}

export function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
