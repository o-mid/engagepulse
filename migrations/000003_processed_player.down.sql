DROP INDEX IF EXISTS idx_processed_player_type_time;
ALTER TABLE processed_events DROP COLUMN IF EXISTS player_id;
