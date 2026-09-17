import { NextResponse } from "next/server";
import { listDeadLetters, redriveDeadLetter } from "@/lib/engagepulse";
import type { TenantId } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isTenant(value: unknown): value is TenantId {
  return value === "acme-casino" || value === "nova-sports";
}

export async function GET(req: Request) {
  try {
    const n = Number(new URL(req.url).searchParams.get("n") ?? "20");
    const limit = Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 20;
    const [acme, nova] = await Promise.all([
      listDeadLetters("acme-casino", limit),
      listDeadLetters("nova-sports", limit),
    ]);
    const items = [...acme, ...nova].sort((a, b) =>
      a.failed_at < b.failed_at ? 1 : a.failed_at > b.failed_at ? -1 : 0,
    );
    return NextResponse.json({ items: items.slice(0, limit) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "dlq list failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { tenant_id?: unknown; event_id?: unknown };
    if (!isTenant(body.tenant_id) || typeof body.event_id !== "string" || !body.event_id) {
      return NextResponse.json({ error: "tenant_id and event_id required" }, { status: 400 });
    }
    const result = await redriveDeadLetter(body.tenant_id, body.event_id);
    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "redrive failed";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
