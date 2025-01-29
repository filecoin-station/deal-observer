ALTER TABLE active_deals ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS active_deals_activated_at_epoch ON active_deals (activated_at_epoch);
