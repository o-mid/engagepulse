DELETE FROM balances WHERE tenant_id IN ('acme-casino', 'nova-sports');
DELETE FROM player_state WHERE tenant_id IN ('acme-casino', 'nova-sports');
DELETE FROM players WHERE tenant_id IN ('acme-casino', 'nova-sports');
DELETE FROM tenants WHERE id IN ('acme-casino', 'nova-sports');
