ALTER TABLE active_deals
ADD COLUMN payload_unretrievable BOOLEAN,
ADD COLUMN last_payload_retrieval TIMESTAMP WITH TIME ZONE;