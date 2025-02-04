CREATE INDEX CONCURRENTLY IF NOT EXISTS missing_payloads_idx
ON active_deals (activated_at_epoch)
WHERE payload_cid IS NULL
  AND payload_unretrievable IS DISTINCT FROM TRUE;