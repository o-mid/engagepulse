"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeadLetter, RedriveResult } from "@/lib/types";

type ListResponse = { items?: DeadLetter[]; error?: string };

export function DlqInspect() {
  const [items, setItems] = useState<DeadLetter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [redriving, setRedriving] = useState<string | null>(null);
  const [note, setNote] = useState<RedriveResult | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dlq?n=20", { cache: "no-store" });
      const data = (await res.json()) as ListResponse;
      if (!res.ok) throw new Error(data.error ?? "dlq list failed");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "dlq list failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function redrive(tenantId: string, eventId: string) {
    if (redriving) return;
    setRedriving(eventId);
    setError(null);
    try {
      const res = await fetch("/api/dlq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, event_id: eventId }),
      });
      const data = (await res.json()) as RedriveResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "redrive failed");
      setNote(data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "redrive failed");
    } finally {
      setRedriving(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 w-full">
          <CardTitle id="dlq-inspect-heading">Dead letters</CardTitle>
          <p className="mt-1 w-full text-pretty break-words text-sm text-muted-foreground">
            Last N from <code className="font-mono">player.events.dlq</code>.
            Redrive is a new signed ingest of the same event_id. No skip-HMAC
            credit.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load()}
          disabled={busy || redriving != null}
          className="shrink-0 self-start sm:self-auto"
        >
          {busy ? "Loading" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {note ? (
          <p className="text-sm text-foreground">
            {note.message} {note.event_id}: balance {note.balance_before ?? "—"}{" "}
            → {note.balance_after ?? "—"}.
          </p>
        ) : null}
        <Table>
          <TableCaption className="text-pretty pb-2">
            Human click only. Same event_id stays credit-once.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead className="hidden sm:table-cell">Player</TableHead>
              <TableHead className="hidden sm:table-cell">Error</TableHead>
              <TableHead className="text-right">Redrive</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No dead letters in the last 20.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={`${item.event.tenant_id}:${item.event.event_id}`}>
                  <TableCell>
                    <span className="block font-mono break-words text-xs">
                      {item.event.event_id}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.event.tenant_id} · {item.attempts} tries
                    </span>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {item.event.player_id}
                  </TableCell>
                  <TableCell className="hidden max-w-[14rem] text-pretty text-xs text-muted-foreground sm:table-cell">
                    {item.error}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        void redrive(item.event.tenant_id, item.event.event_id)
                      }
                      disabled={redriving != null || busy}
                    >
                      {redriving === item.event.event_id ? "Redriving" : "Redrive"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
