"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShadowRow } from "@/lib/shadow-score";

type Probe = {
  llm: string;
  hmac: string;
  credit_once: {
    event_id: string;
    player_id: string;
    first_status: string;
    second_status: string;
    balance: number | null;
    credits_delta: number;
    pass: boolean;
  };
  not_tools: {
    credit: number;
    set_vip: number;
    pass: boolean;
  };
  shadow: {
    rows: ShadowRow[];
    credits_before: number;
    credits_after: number;
    ledger_wrote: boolean;
    pass: boolean;
  };
  dlq: {
    enabled: boolean;
    skipped: boolean;
    event_id: string | null;
    player_id: string | null;
    ingest_status: string | null;
    retries_delta: number;
    dlq_delta: number;
    balance: number | null;
    pass: boolean;
  };
  isolation: {
    player_id: string;
    status: number;
    body_empty: boolean;
    pass: boolean;
  };
  error?: string;
};

export function ContractRun() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Probe | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/contract", { method: "POST" });
      const data = (await res.json()) as Probe;
      if (!res.ok) throw new Error(data.error ?? "probe failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "probe failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 w-full">
          <CardTitle>Run contract</CardTitle>
          <p className="mt-1 w-full text-pretty break-words text-sm text-muted-foreground">
            Duplicate event_id, 404 on credit/set_vip, sparse-bets vs velocity,
            Nova cannot read an Acme player, and poison retry to DLQ when inject
            is on.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          aria-busy={busy}
          className="shrink-0 self-start sm:self-auto"
        >
          {busy ? "Running probes" : "Run contract"}
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        <p className="text-pretty break-words text-sm text-foreground">
          The LLM is not on the credit path. HMAC is signed in the BFF and
          verified in Go.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {result ? (
          <ul className="space-y-2 text-sm">
            <li className="text-pretty text-muted-foreground">{result.hmac}</li>
            <li>
              <Badge variant={result.credit_once.pass ? "success-light" : "destructive-light"}>
                {result.credit_once.pass ? "pass" : "fail"}
              </Badge>{" "}
              Duplicate {result.credit_once.event_id}: both{" "}
              {result.credit_once.first_status}. Balance{" "}
              {result.credit_once.balance ?? "—"}. Credits Δ{" "}
              {result.credit_once.credits_delta}.
            </li>
            <li>
              <Badge variant={result.not_tools.pass ? "success-light" : "destructive-light"}>
                {result.not_tools.pass ? "pass" : "fail"}
              </Badge>{" "}
              credit → {result.not_tools.credit}, set_vip → {result.not_tools.set_vip}.
            </li>
            <li>
              <Badge variant={result.shadow.pass ? "success-light" : "destructive-light"}>
                {result.shadow.pass ? "pass" : "fail"}
              </Badge>{" "}
              sparse-bets{" "}
              {result.shadow.rows.find((r) => r.pack === "sparse-bets")?.agree
                ? "agrees"
                : "disagrees"}
              . Credits {result.shadow.credits_before} → {result.shadow.credits_after}
              {result.shadow.ledger_wrote ? " (wrote)" : " (no ledger write)"}.
            </li>
            <li>
              <Badge variant={result.dlq.pass ? "success-light" : "destructive-light"}>
                {result.dlq.skipped ? "skip" : result.dlq.pass ? "pass" : "fail"}
              </Badge>{" "}
              {result.dlq.skipped
                ? "Inject off. Poison event not sent."
                : `Poison ${result.dlq.event_id}: retries Δ ${result.dlq.retries_delta}, DLQ Δ ${result.dlq.dlq_delta}. Balance ${result.dlq.balance ?? "—"}.`}
            </li>
            <li>
              <Badge variant={result.isolation.pass ? "success-light" : "destructive-light"}>
                {result.isolation.pass ? "pass" : "fail"}
              </Badge>{" "}
              Nova GET {result.isolation.player_id} → {result.isolation.status}
              {result.isolation.body_empty ? ", no snapshot" : ""}.
            </li>
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
