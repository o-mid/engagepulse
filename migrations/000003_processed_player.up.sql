ALTER TABLE processed_events
    ADD COLUMN IF NOT EXISTS player_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_processed_player_type_time
    ON processed_events (tenant_id, player_id, event_type, processed_at);
