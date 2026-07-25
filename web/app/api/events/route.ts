import { NextResponse } from "next/server";
import { ingestEvent } from "@/lib/engagepulse";
import type { TenantId } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  tenant_id: TenantId;
  player_id: string;
  type: string;
  amount: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (body.tenant_id !== "acme-casino" && body.tenant_id !== "nova-sports") {
      return NextResponse.json({ error: "unknown tenant" }, { status: 400 });
    }
    const result = await ingestEvent(body.tenant_id, {
      event_id: `${body.tenant_id}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      player_id: body.player_id,
      type: body.type,
      amount: body.amount,
      occurred_at: new Date().toISOString(),
    });
    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
