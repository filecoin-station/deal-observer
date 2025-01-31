ALTER TABLE active_deals
ADD CONSTRAINT unique_active_deals
UNIQUE (
  activated_at_epoch,
  miner_id,
  client_id,
  piece_cid,
  piece_size,
  term_start_epoch,
  term_min,
  term_max,
  sector_id
);