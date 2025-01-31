CREATE INDEX CONCURRENTLY IF NOT EXISTS active_deals_activated_at_epoch_idx
ON active_deals (activated_at_epoch);
