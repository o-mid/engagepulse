import { NextResponse } from "next/server";
import { parseMetrics } from "@/lib/engagepulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const metrics = await parseMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "metrics failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
