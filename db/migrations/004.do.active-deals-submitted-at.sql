ALTER TABLE active_deals ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS active_deals_activated_at_epoch ON active_deals (activated_at_epoch);
CREATE INDEX IF NOT EXISTS active_deals_miner_id_client_id_piece_cid_piece_size ON active_deals (miner_id, client_id, piece_cid, piece_size);
