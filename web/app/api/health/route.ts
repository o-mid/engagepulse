import { NextResponse } from "next/server";
import { apiBase } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = performance.now();
  try {
    const res = await fetch(`${apiBase()}/healthz`, { cache: "no-store" });
    const text = await res.text();
    return NextResponse.json({
      ok: res.ok && text.trim() === "ok",
      status: res.status,
      latency_ms: Math.round(performance.now() - started),
      upstream: apiBase(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        latency_ms: Math.round(performance.now() - started),
        upstream: apiBase(),
        error: err instanceof Error ? err.message : "unreachable",
      },
      { status: 502 },
    );
  }
}
