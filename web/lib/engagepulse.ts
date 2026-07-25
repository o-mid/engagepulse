import { apiBase, getTenants, type TenantId } from "./tenants";
import { signBody } from "./hmac";
import type { IngestResult, MetricsMap, PlayerSnapshot } from "./types";

type EventPayload = {
  event_id: string;
  tenant_id: string;
  player_id: string;
  type: string;
  amount: number;
  occurred_at: string;
};

export async function fetchPlayer(
  tenantId: TenantId,
  playerId: string,
): Promise<PlayerSnapshot | null> {
  const tenant = getTenants()[tenantId];
  const res = await fetch(`${apiBase()}/v1/players/${encodeURIComponent(playerId)}`, {
    headers: { "X-API-Key": tenant.apiKey },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`player ${res.status}`);
  return (await res.json()) as PlayerSnapshot;
}

export async function ingestEvent(
  tenantId: TenantId,
  evt: Omit<EventPayload, "tenant_id"> & { tenant_id?: string },
): Promise<IngestResult> {
  const tenant = getTenants()[tenantId];
  const payload: EventPayload = {
    event_id: evt.event_id,
    tenant_id: tenantId,
    player_id: evt.player_id,
    type: evt.type,
    amount: evt.amount,
    occurred_at: evt.occurred_at,
  };
  const body = Buffer.from(JSON.stringify(payload));
  const res = await fetch(`${apiBase()}/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature": signBody(tenant.hmacSecret, body),
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { status: string; event_id: string };
  return {
    status: data.status,
    event_id: data.event_id,
    tenant_id: tenantId,
    player_id: payload.player_id,
    type: payload.type,
    amount: payload.amount,
  };
}

export async function parseMetrics(): Promise<MetricsMap> {
  const res = await fetch(`${apiBase()}/metrics`, { cache: "no-store" });
  if (!res.ok) throw new Error(`metrics ${res.status}`);
  const text = await res.text();
  const out: MetricsMap = {};
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(
      /^(engagepulse_[a-z_]+)(?:\{[^}]*\})?\s+([0-9.eE+-]+)/,
    );
    if (!m) continue;
    const key = m[1];
    const val = Number(m[2]);
    out[key] = (out[key] ?? 0) + val;
  }
  // Also keep labeled rule hits separately
  for (const line of text.split("\n")) {
    const rm = line.match(
      /^engagepulse_rule_hits_total\{rule="([^"]+)"\}\s+([0-9.eE+-]+)/,
    );
    if (rm) out[`rule_${rm[1]}`] = Number(rm[2]);
  }
  return out;
}

export function buildDemoEvents(
  tenantId: TenantId,
  mode: "vip" | "velocity",
  n: number,
): EventPayload[] {
  const now = Date.now();
  const out: EventPayload[] = [];
  for (let i = 0; i < n; i++) {
    const player =
      mode === "velocity"
        ? `load-${tenantId}-0`
        : `load-${tenantId}-${i % 3}`;
    let type = "bet_placed";
    let amount = 400 + i * 100;
    if (i === 0) {
      type = "deposit";
      amount = 50;
    } else if (mode === "velocity") {
      type = "bet_placed";
      amount = 10;
    }
    out.push({
      event_id: `${tenantId}-${now}-${i}-${Math.random().toString(16).slice(2, 8)}`,
      tenant_id: tenantId,
      player_id: player,
      type,
      amount,
      occurred_at: new Date().toISOString(),
    });
  }
  return out;
}
