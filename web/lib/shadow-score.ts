export type ShadowEvent = {
  type: string;
  occurred_at: string;
};

export type ShadowRow = {
  pack: string;
  rule: boolean;
  model: boolean;
  agree: boolean;
  bets: number;
  reason: string;
};

const VELOCITY_LIMIT = 5;

/** Same packs `make shadow` scores. Counts only; no ledger write. */
const PACKS: { pack: string; events: ShadowEvent[] }[] = [
  {
    pack: "acme-casino",
    events: [
      { type: "deposit", occurred_at: "2026-01-01T00:00:00Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:01Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:02Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:03Z" },
    ],
  },
  {
    pack: "nova-sports",
    events: [
      { type: "deposit", occurred_at: "2026-01-01T00:00:00Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:01Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:02Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:03Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:04Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:05Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:06Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:07Z" },
    ],
  },
  {
    pack: "sparse-bets",
    events: [
      { type: "bet_placed", occurred_at: "2026-01-01T00:00:00Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:01:30Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:03:00Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:04:30Z" },
      { type: "bet_placed", occurred_at: "2026-01-01T00:06:00Z" },
    ],
  },
];

function betCount(events: ShadowEvent[]) {
  return events.filter((e) => e.type === "bet_placed").length;
}

function mockFlags(events: ShadowEvent[]) {
  return betCount(events) >= VELOCITY_LIMIT;
}

/** 1-minute velocity window, matching rules.ApplyIntegrity. */
function ruleFlags(events: ShadowEvent[]) {
  const prior: number[] = [];
  for (const evt of events) {
    if (evt.type !== "bet_placed") continue;
    const t = Date.parse(evt.occurred_at);
    let recent = 0;
    for (const p of prior) {
      if (t - p <= 60_000) recent += 1;
    }
    if (recent + 1 >= VELOCITY_LIMIT) return true;
    prior.push(t);
  }
  return false;
}

export function scoreShadowBoard(): ShadowRow[] {
  return PACKS.map(({ pack, events }) => {
    const rule = ruleFlags(events);
    const model = mockFlags(events);
    const bets = betCount(events);
    return {
      pack,
      rule,
      model,
      agree: rule === model,
      bets,
      reason: `pack bets=${bets} limit=${VELOCITY_LIMIT}`,
    };
  });
}
