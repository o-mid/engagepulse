import { NextResponse } from "next/server";
import {
  buildDemoEvents,
  fetchPlayer,
  ingestEvent,
  parseMetrics,
} from "@/lib/engagepulse";
import { metricsDelta } from "@/lib/demo-script";
import { getTenants } from "@/lib/tenants";
import type { DemoResponse, IngestResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const tenants = getTenants();
    const before = await parseMetrics();
    const accepted: IngestResult[] = [];

    const acmeEvents = buildDemoEvents("acme-casino", "vip", 12);
    for (const evt of acmeEvents) {
      accepted.push(await ingestEvent("acme-casino", evt));
    }

    const novaEvents = buildDemoEvents("nova-sports", "velocity", 8);
    for (const evt of novaEvents) {
      accepted.push(await ingestEvent("nova-sports", evt));
    }

    // Worker needs a beat to process Kafka → rules → ledger.
    await new Promise((r) => setTimeout(r, 3200));

    const [acme, nova, after] = await Promise.all([
      fetchPlayer("acme-casino", tenants["acme-casino"].playerId),
      fetchPlayer("nova-sports", tenants["nova-sports"].playerId),
      parseMetrics(),
    ]);

    const delta = metricsDelta(before, after);
    const welcomeAlready =
      (delta.rule_welcome_offer ?? 0) === 0 &&
      !!(acme?.offer_tags?.includes("welcome_bonus") ||
        nova?.offer_tags?.includes("welcome_bonus"));

    const body: DemoResponse = {
      accepted,
      players: { acme, nova },
      metrics: after,
      metrics_before: before,
      metrics_delta: delta,
      notes: {
        welcome_already_credited: welcomeAlready,
      },
    };
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "demo failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
