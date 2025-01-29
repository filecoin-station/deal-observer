CREATE OR REPLACE FUNCTION timestamp_to_epoch(timestamp_input TIMESTAMP WITHOUT TIME ZONE)
 RETURNS INTEGER
 LANGUAGE plpgsql
AS $function$
DECLARE
    FILECOIN_GENESIS_UNIX_EPOCH BIGINT := 1598306400; -- Filecoin genesis timestamp
    unix_timestamp BIGINT;
BEGIN
    -- Convert the TIMESTAMP to Unix timestamp (seconds since 1970-01-01)
    unix_timestamp := EXTRACT(EPOCH FROM timestamp_input)::BIGINT;
    
    -- Calculate and return the Filecoin epoch
    RETURN FLOOR((unix_timestamp - FILECOIN_GENESIS_UNIX_EPOCH) / 30);
END;
$function$;
