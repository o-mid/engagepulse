export type VIPTier = "bronze" | "silver" | "gold" | string;

export type PlayerSnapshot = {
  tenant_id: string;
  player_id: string;
  score: number;
  vip_tier: VIPTier;
  offer_tags: string[];
  integrity_flag: string;
  balance: number;
  updated_at: string;
};

export type IngestResult = {
  status: string;
  event_id: string;
  tenant_id: string;
  player_id: string;
  type: string;
  amount: number;
};

export type MetricsMap = Record<string, number>;

export type DeadLetterEvent = {
  event_id: string;
  tenant_id: string;
  player_id: string;
  type: string;
  amount?: number;
  occurred_at: string;
};

export type DeadLetter = {
  failed_at: string;
  error: string;
  attempts: number;
  event: DeadLetterEvent;
};

export type RedriveResult = {
  status: string;
  event_id: string;
  tenant_id: string;
  player_id: string;
  balance_before: number | null;
  balance_after: number | null;
  message: string;
};

export type DemoResponse = {
  accepted: IngestResult[];
  players: {
    acme: PlayerSnapshot | null;
    nova: PlayerSnapshot | null;
  };
  metrics: MetricsMap;
  metrics_before: MetricsMap;
  metrics_delta: MetricsMap;
  notes: {
    welcome_already_credited: boolean;
  };
};
