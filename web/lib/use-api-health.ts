"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiHealth = {
  online: boolean | null;
  latencyMs: number | null;
  upstream: string | null;
  error: string | null;
};

const EMPTY: ApiHealth = {
  online: null,
  latencyMs: null,
  upstream: null,
  error: null,
};

export function useApiHealth(intervalMs = 15_000): ApiHealth & {
  refresh: () => Promise<boolean>;
} {
  const [health, setHealth] = useState<ApiHealth>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        latency_ms?: number;
        upstream?: string;
        error?: string;
      };
      const online = !!data.ok;
      setHealth({
        online,
        latencyMs: data.latency_ms ?? null,
        upstream: data.upstream ?? null,
        error: online ? null : (data.error ?? "Go service offline"),
      });
      return online;
    } catch (err) {
      setHealth({
        online: false,
        latencyMs: null,
        upstream: null,
        error: err instanceof Error ? err.message : "unreachable",
      });
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await refresh();
    };
    void tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs, refresh]);

  return { ...health, refresh };
}

export function hostedApi(upstream: string | null): boolean {
  if (!upstream) return false;
  return /railway\.app|up\.railway/i.test(upstream);
}
