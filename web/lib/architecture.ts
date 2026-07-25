export type ArchNodeId =
  | "partner"
  | "hmac"
  | "ingest"
  | "outbox"
  | "kafka"
  | "worker"
  | "rules"
  | "ledger"
  | "read";

export type ArchNode = {
  id: ArchNodeId;
  label: string;
  plain: string;
  detail: string;
  code: string;
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
    label: "HMAC",
    plain: "Secure sign",
    detail: "X-Signature = hex HMAC-SHA256 of the raw body.",
    code: "internal/ingest",
  },
  {
    id: "ingest",
    label: "Ingest",
    plain: "Accept",
    detail: "Validate JSON, resolve tenant, enqueue outbox, return 202.",
    code: "POST /v1/events",
  },
  {
    id: "outbox",
    label: "Outbox",
    plain: "Save first",
    detail: "Postgres outbox row before Kafka — crash-safe accept.",
    code: "internal/outbox",
  },
  {
    id: "kafka",
    label: "Stream",
    plain: "Kafka / Redpanda",
    detail: "Durable log player.events (+ DLQ on hard fail).",
    code: "internal/kafka",
  },
  {
    id: "worker",
    label: "Worker",
    plain: "Process",
    detail: "Dedupe by event_id, run rules, retry up to 3×.",
    code: "internal/worker",
  },
  {
    id: "rules",
    label: "Rules",
    plain: "Decide",
    detail: "Welcome → VIP score → velocity flag, in that order.",
    code: "internal/rules",
  },
  {
    id: "ledger",
    label: "Ledger",
    plain: "Credit once",
    detail: "Unique (tenant_id, event_id) blocks double-pay.",
    code: "internal/ledger",
  },
  {
    id: "read",
    label: "Read",
    plain: "Player API",
    detail: "HTTP or gRPC snapshot behind X-API-Key.",
    code: "GET /v1/players/{id}",
  },
];

export const ARCH_EDGES: [ArchNodeId, ArchNodeId][] = [
  ["partner", "hmac"],
  ["hmac", "ingest"],
  ["ingest", "outbox"],
  ["outbox", "kafka"],
  ["kafka", "worker"],
  ["worker", "rules"],
  ["rules", "ledger"],
  ["ledger", "read"],
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
};
