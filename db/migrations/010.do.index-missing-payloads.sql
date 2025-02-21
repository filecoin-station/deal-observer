CREATE INDEX CONCURRENTLY IF NOT EXISTS unresolved_payloads_idx
ON active_deals (activated_at_epoch)
WHERE payload_cid IS NULL
  AND (payload_retrievability_state = 'PAYLOAD_CID_NOT_QUERIED_YET' OR payload_retrievability_state = 'PAYLOAD_CID_UNRESOLVED');