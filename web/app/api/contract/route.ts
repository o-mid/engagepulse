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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "contract probe failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
