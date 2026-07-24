CREATE TABLE IF NOT EXISTS outbox (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    TEXT NOT NULL,
    player_id    TEXT NOT NULL,
    event_id     TEXT NOT NULL,
    payload      JSONB NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    attempts     INT NOT NULL DEFAULT 0,
    last_error   TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    UNIQUE (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending_created
    ON outbox (created_at)
    WHERE status = 'pending';
