CREATE TABLE active_deals (
  activated_at_epoch INT NOT NULL,
  miner INT NOT NULL,
  client INT NOT NULL,
  piece_cid TEXT NOT NULL,
  piece_size BIGINT NOT NULL,
  term_start_epoch INT NOT NULL,
  term_min INT NOT NULL,
  term_max INT NOT NULL,
  sector BIGINT NOT NULL,
  payload_cid TEXT
);


