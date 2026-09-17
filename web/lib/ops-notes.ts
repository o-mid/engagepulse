export const REPLAY_CONTRACT = [
  {
    pack: "acme-casino",
    playerId: "replay-acme-casino-0",
    vipTier: "silver",
    score: 3000,
    tags: "welcome_bonus",
    flag: "none",
    balance: 100,
  },
  {
    pack: "nova-sports",
    playerId: "replay-nova-sports-0",
    vipTier: "bronze",
    score: 70,
    tags: "welcome_bonus",
    flag: "velocity",
    balance: 100,
  },
] as const;

export const SHADOW_BOARD = [
  {
    pack: "acme-casino",
    rule: "no",
    model: "no",
    agree: "yes",
    note: "Three bets. Under the mock pack-count limit.",
  },
  {
    pack: "nova-sports",
    rule: "yes",
    model: "yes",
    agree: "yes",
    note: "Burst bets trip the 1-minute rule and the mock pack count.",
  },
  {
    pack: "sparse-bets",
    rule: "no",
    model: "yes",
    agree: "no",
    note: "Five bets spaced 90s. Rule stays quiet; mock flags pack count >= 5.",
  },
] as const;

export const TOOLS = [
  {
    name: "ingest",
    auth: "X-API-Key and X-Signature",
    does: "Same accept path as POST /v1/events. Tenant on the key must match tenant_id.",
  },
  {
    name: "get_player",
    auth: "X-API-Key",
    does: "Same snapshot as GET /v1/players/{id} for that tenant.",
  },
  {
    name: "get_metrics",
    auth: "X-API-Key",
    does: "JSON subset of process counters. Not the Prometheus text from GET /metrics.",
  },
] as const;

export const NOT_TOOLS = ["credit", "set_vip"] as const;
