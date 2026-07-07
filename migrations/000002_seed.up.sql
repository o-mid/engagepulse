INSERT INTO tenants (id, name, api_key, hmac_secret) VALUES
    ('acme-casino', 'Acme Casino', 'ak_acme_dev_001', 'hmac_acme_dev_secret'),
    ('nova-sports', 'Nova Sports', 'ak_nova_dev_001', 'hmac_nova_dev_secret')
ON CONFLICT (id) DO NOTHING;

INSERT INTO players (tenant_id, player_id) VALUES
    ('acme-casino', 'player-100'),
    ('acme-casino', 'player-101'),
    ('nova-sports', 'player-200'),
    ('nova-sports', 'player-201')
ON CONFLICT DO NOTHING;

INSERT INTO player_state (tenant_id, player_id) VALUES
    ('acme-casino', 'player-100'),
    ('acme-casino', 'player-101'),
    ('nova-sports', 'player-200'),
    ('nova-sports', 'player-201')
ON CONFLICT DO NOTHING;

INSERT INTO balances (tenant_id, player_id) VALUES
    ('acme-casino', 'player-100'),
    ('acme-casino', 'player-101'),
    ('nova-sports', 'player-200'),
    ('nova-sports', 'player-201')
ON CONFLICT DO NOTHING;
