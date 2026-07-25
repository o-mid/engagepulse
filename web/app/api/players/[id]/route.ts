import { NextResponse } from "next/server";
import { fetchPlayer } from "@/lib/engagepulse";
import type { TenantId } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const tenant = (url.searchParams.get("tenant") ?? "acme-casino") as TenantId;
  if (tenant !== "acme-casino" && tenant !== "nova-sports") {
    return NextResponse.json({ error: "unknown tenant" }, { status: 400 });
  }
  try {
    const player = await fetchPlayer(tenant, id);
    if (!player) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(player);
  } catch (err) {
    const message = err instanceof Error ? err.message : "player failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
