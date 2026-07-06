CREATE TABLE IF NOT EXISTS tenants (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    api_key     TEXT NOT NULL UNIQUE,
    hmac_secret TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
    tenant_id  TEXT NOT NULL REFERENCES tenants(id),
    player_id  TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, player_id)
);

CREATE TABLE IF NOT EXISTS processed_events (
    tenant_id   TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE IF NOT EXISTS player_state (
    tenant_id      TEXT NOT NULL,
    player_id      TEXT NOT NULL,
    score          BIGINT NOT NULL DEFAULT 0,
    vip_tier       TEXT NOT NULL DEFAULT 'bronze',
    offer_tags     TEXT[] NOT NULL DEFAULT '{}',
    integrity_flag TEXT NOT NULL DEFAULT '',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, player_id),
    FOREIGN KEY (tenant_id, player_id) REFERENCES players(tenant_id, player_id)
);

CREATE TABLE IF NOT EXISTS balances (
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    amount    BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, player_id),
    FOREIGN KEY (tenant_id, player_id) REFERENCES players(tenant_id, player_id)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id         BIGSERIAL PRIMARY KEY,
    tenant_id  TEXT NOT NULL,
    player_id  TEXT NOT NULL,
    event_id   TEXT NOT NULL,
    amount     BIGINT NOT NULL,
    reason     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_player ON ledger_entries (tenant_id, player_id);
