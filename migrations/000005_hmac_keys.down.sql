ALTER TABLE tenants
    DROP COLUMN IF EXISTS hmac_prev_until,
    DROP COLUMN IF EXISTS hmac_prev_key_id,
    DROP COLUMN IF EXISTS hmac_prev_secret,
    DROP COLUMN IF EXISTS hmac_key_id;
