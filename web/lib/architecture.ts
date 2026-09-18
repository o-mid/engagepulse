export type ArchNodeId =
  | "partner"
  | "hmac"
  | "ingest"
  | "outbox"
  | "kafka"
  | "worker"
  | "rules"
  | "ledger"
  | "read"
  | "dlq";

export type ArchNode = {
  id: ArchNodeId;
  label: string;
  plain: string;
  detail: string;
  code: string;
  branch?: boolean;
};

export const ARCH_NODES: ArchNode[] = [
  {
    id: "partner",
    label: "Partner",
    plain: "Event source",
    detail: "loadgen or brand backend posts signed JSON.",
    code: "cmd/loadgen",
  },
  {
    id: "hmac",
    label: "HMAC sign",
    plain: "BFF",
    detail: "The Next.js BFF hex HMAC-SHA256s the raw body and sends X-Key-Id. The browser never holds the secret.",
    code: "web/lib/hmac.ts",
  },
  {
    id: "ingest",
    label: "HMAC verify",
    plain: "Go ingest",
    detail: "internal/ingest checks X-Signature against the raw body bytes and X-Key-Id against live keys, then accepts. POST /v1/tools/ingest is the same path with an API key.",
    code: "POST /v1/events",
  },
  {
    id: "outbox",
    label: "Outbox",
    plain: "Save first",
    detail: "Postgres outbox row before Kafka — crash-safe accept, then 202. Rows left publishing after a crash go back to pending and publish once.",
    code: "internal/outbox",
  },
  {
    id: "kafka",
    label: "Kafka",
    plain: "Durable log",
    detail: "player.events. Hard-fail payloads go to player.events.dlq after retries.",
    code: "internal/kafka",
  },
  {
    id: "worker",
    label: "Worker tx",
    plain: "Retry ×3",
    detail: "Dedupe by event_id, then one tx: mark processed, write state, credit. Handler retries up to 3×, then DLQ.",
    code: "internal/worker",
  },
  {
    id: "dlq",
    label: "DLQ",
    plain: "Hard fail",
    detail: "After 3 worker retries, the event is published to player.events.dlq and is not credited. Inspect last N; redrive is a new signed ingest of the same event_id.",
    code: "player.events.dlq",
    branch: true,
  },
  {
    id: "rules",
    label: "Rules",
    plain: "Decide",
    detail: "Welcome → VIP score → velocity flag, in that order. No model on this path.",
    code: "internal/rules",
  },
  {
    id: "ledger",
    label: "Ledger",
    plain: "Credit-once",
    detail: "Unique (tenant_id, event_id) blocks double-pay.",
    code: "internal/ledger",
  },
  {
    id: "read",
    label: "GET player",
    plain: "Snapshot",
    detail: "HTTP or gRPC behind X-API-Key. Tools get_player and get_metrics read. They do not credit or set VIP.",
    code: "GET /v1/players/{id}",
  },
];

export const ARCH_MAIN = ARCH_NODES.filter((n) => !n.branch);
export const ARCH_BRANCH = ARCH_NODES.filter((n) => n.branch);

export const ARCH_EDGES: [ArchNodeId, ArchNodeId][] = [
  ["partner", "hmac"],
  ["hmac", "ingest"],
  ["ingest", "outbox"],
  ["outbox", "kafka"],
  ["kafka", "worker"],
  ["worker", "rules"],
  ["rules", "ledger"],
  ["ledger", "read"],
  ["worker", "dlq"],
];

export type LiveSnapshot = {
  ok: boolean;
  latencyMs: number;
  ingested: number;
  processed: number;
  credits: number;
  outboxPending: number;
  welcome: number;
  vip: number;
  velocity: number;
  retries: number;
  dlq: number;
};

export function nodeById(id: ArchNodeId): ArchNode {
  return ARCH_NODES.find((n) => n.id === id)!;
}

export function liveReading(
  live: LiveSnapshot | null,
  lag: number,
  id: ArchNodeId,
): string {
  if (!live) return "Waiting for live metrics.";
  const lines: Record<ArchNodeId, string> = {
    partner: `Ingested lifetime ${live.ingested.toLocaleString()}. Climb this by running the live demo.`,
    hmac: "Signed in the BFF. Secret stays in Node, not in the browser.",
    ingest: live.ok
      ? `Go verified the signature. Last /healthz ${live.latencyMs}ms.`
      : "API probe failed.",
    outbox:
      live.outboxPending > 0
        ? `${live.outboxPending} row(s) waiting to publish (pending or reclaimed mid-send).`
        : "Outbox drained. Crash reclaim runs before each publish flush.",
    kafka:
      lag > 0
        ? `${lag} accepted event(s) not yet processed.`
        : "Processed caught up with ingested.",
    worker: `Processed ${live.processed.toLocaleString()} events. Retries ${live.retries.toLocaleString()}. Worker tx is mark + state + credit.`,
    rules: `Hits: welcome ${live.welcome}, vip ${live.vip}, velocity ${live.velocity}.`,
    ledger: `Successful credits ${live.credits.toLocaleString()} (unique event ids).`,
    read: "GET /v1/players/{id}. Tools wrap the same reads. They do not credit.",
    dlq: `${live.dlq.toLocaleString()} events on the dead-letter topic. Inspect last N; redrive is a human-clicked signed ingest.`,
  };
  return lines[id];
}
