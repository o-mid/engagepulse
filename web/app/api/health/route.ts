import { NextResponse } from "next/server";
import { apiBase } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const started = performance.now();
  const upstream = apiBase();
  try {
    const ready = await fetch(`${upstream}/readyz`, { cache: "no-store" });
    if (ready.status !== 404) {
      const data = (await ready.json()) as { ok?: boolean; error?: string };
      return NextResponse.json({
        ok: ready.ok && !!data.ok,
        status: ready.status,
        latency_ms: Math.round(performance.now() - started),
        upstream,
        probe: "readyz",
        error: data.error,
      });
    }
    const live = await fetch(`${upstream}/healthz`, { cache: "no-store" });
    const text = await live.text();
    return NextResponse.json({
      ok: live.ok && text.trim() === "ok",
      status: live.status,
      latency_ms: Math.round(performance.now() - started),
      upstream,
      probe: "healthz",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: 0,
        latency_ms: Math.round(performance.now() - started),
        upstream,
        error: err instanceof Error ? err.message : "unreachable",
      },
      { status: 502 },
    );
  }
}
