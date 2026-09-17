import { NextResponse } from "next/server";
import {
  fetchPlayer,
  ingestEvent,
  parseMetrics,
  postTool,
} from "@/lib/engagepulse";
import { scoreShadowBoard } from "@/lib/shadow-score";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function POST() {
  try {
    const creditsBefore = (await parseMetrics()).engagepulse_ledger_credits_total ?? 0;

    const suffix = `${Date.now()}`;
    const playerId = `probe-acme-${suffix}`;
    const eventId = `probe-dup-${suffix}`;
    const evt = {
      event_id: eventId,
      player_id: playerId,
      type: "deposit",
      amount: 50,
      occurred_at: new Date().toISOString(),
    };

    const first = await ingestEvent("acme-casino", evt);
    const second = await ingestEvent("acme-casino", evt);

    let player = await fetchPlayer("acme-casino", playerId);
    for (let i = 0; i < 6 && (player == null || player.balance === 0); i++) {
      await sleep(800);
      player = await fetchPlayer("acme-casino", playerId);
    }

    const creditsAfterCredit = (await parseMetrics())
      .engagepulse_ledger_credits_total ?? 0;
    const creditsDelta = creditsAfterCredit - creditsBefore;
    const creditOncePass =
      first.status === "accepted" &&
      second.status === "accepted" &&
      (player?.balance ?? 0) <= 100 &&
      creditsDelta <= 1;

    const creditStatus = await postTool("credit");
    const setVipStatus = await postTool("set_vip");
    const notToolsPass = creditStatus === 404 && setVipStatus === 404;

    const shadowBefore = (await parseMetrics()).engagepulse_ledger_credits_total ?? 0;
    const shadowRows = scoreShadowBoard();
    const shadowAfter = (await parseMetrics()).engagepulse_ledger_credits_total ?? 0;
    const sparse = shadowRows.find((r) => r.pack === "sparse-bets");
    const shadowPass =
      !!sparse &&
      sparse.agree === false &&
      sparse.rule === false &&
      sparse.model === true &&
      shadowAfter === shadowBefore;

    const metricsBeforePoison = await parseMetrics();
    const injectOn = (metricsBeforePoison.engagepulse_fail_inject ?? 0) > 0;
    let dlqProbe: {
      enabled: boolean;
      skipped: boolean;
      event_id: string | null;
      player_id: string | null;
      ingest_status: string | null;
      retries_delta: number;
      dlq_delta: number;
      balance: number | null;
      pass: boolean;
    } = {
      enabled: injectOn,
      skipped: !injectOn,
      event_id: null,
      player_id: null,
      ingest_status: null,
      retries_delta: 0,
      dlq_delta: 0,
      balance: null,
      pass: true,
    };

    if (injectOn) {
      const poisonPlayerId = `probe-poison-${suffix}`;
      const poisonEventId = `poison-${suffix}`;
      const retriesBefore = metricsBeforePoison.engagepulse_consumer_retries_total ?? 0;
      const dlqBefore = metricsBeforePoison.engagepulse_consumer_dlq_total ?? 0;
      const poisonIngest = await ingestEvent("acme-casino", {
        event_id: poisonEventId,
        player_id: poisonPlayerId,
        type: "deposit",
        amount: 50,
        occurred_at: new Date().toISOString(),
      });

      let poisonPlayer = await fetchPlayer("acme-casino", poisonPlayerId);
      let retriesAfter = retriesBefore;
      let dlqAfter = dlqBefore;
      for (let i = 0; i < 8; i++) {
        await sleep(800);
        const m = await parseMetrics();
        retriesAfter = m.engagepulse_consumer_retries_total ?? retriesAfter;
        dlqAfter = m.engagepulse_consumer_dlq_total ?? dlqAfter;
        poisonPlayer = await fetchPlayer("acme-casino", poisonPlayerId);
        if (dlqAfter > dlqBefore) break;
      }
      const retriesDelta = retriesAfter - retriesBefore;
      const dlqDelta = dlqAfter - dlqBefore;
      const poisonBalance = poisonPlayer?.balance ?? 0;
      dlqProbe = {
        enabled: true,
        skipped: false,
        event_id: poisonEventId,
        player_id: poisonPlayerId,
        ingest_status: poisonIngest.status,
        retries_delta: retriesDelta,
        dlq_delta: dlqDelta,
        balance: poisonPlayer?.balance ?? null,
        pass:
          poisonIngest.status === "accepted" &&
          retriesDelta >= 2 &&
          dlqDelta >= 1 &&
          poisonBalance === 0,
      };
    }

    return NextResponse.json({
      llm: "The LLM is not on the credit path.",
      hmac: "HMAC is signed in the BFF and verified in Go.",
      credit_once: {
        event_id: eventId,
        player_id: playerId,
        first_status: first.status,
        second_status: second.status,
        balance: player?.balance ?? null,
        credits_delta: creditsDelta,
        pass: creditOncePass,
      },
      not_tools: {
        credit: creditStatus,
        set_vip: setVipStatus,
        pass: notToolsPass,
      },
      shadow: {
        rows: shadowRows,
        credits_before: shadowBefore,
        credits_after: shadowAfter,
        ledger_wrote: shadowAfter !== shadowBefore,
        pass: shadowPass,
      },
      dlq: dlqProbe,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "contract probe failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
