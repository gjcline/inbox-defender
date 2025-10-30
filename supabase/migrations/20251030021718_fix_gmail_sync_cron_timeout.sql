/*
  # Fix Gmail Sync Cron Timeout Issue

  ## Problem
  The gmail-sync-cron Edge Function takes longer than 25 seconds to process 100+ emails,
  causing the http_post to timeout. The Edge Function continues running but can't update
  sync_history, leaving records stuck in "running" status.

  ## Solution
  1. Increase timeout from 25 seconds to 5 minutes (300000ms)
  2. Make the trigger fire-and-forget by not capturing response
  3. The Edge Function will complete asynchronously and update sync_history on its own

  ## Changes
  - Update internal.trigger_gmail_sync() function with longer timeout
  - Edge Function already handles completion via sync_history table
*/

-- Drop and recreate the trigger function with increased timeout
DROP FUNCTION IF EXISTS internal.trigger_gmail_sync();

CREATE OR REPLACE FUNCTION internal.trigger_gmail_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge TEXT;
  key  TEXT;
BEGIN
  -- Get secrets from scheduler_secrets table
  SELECT value INTO edge FROM private.scheduler_secrets WHERE name = 'edge_url';
  SELECT value INTO key  FROM private.scheduler_secrets WHERE name = 'svc_key';

  -- Validate secrets exist
  IF edge IS NULL OR key IS NULL THEN
    RAISE EXCEPTION 'Missing edge_url or svc_key in private.scheduler_secrets';
  END IF;

  -- Fire-and-forget: trigger the Edge Function with 5 minute timeout
  -- The Edge Function will handle completion and update sync_history
  PERFORM net.http_post(
    url := edge || '/functions/v1/gmail-sync-cron',
    headers := jsonb_build_object('Authorization', 'Bearer ' || key),
    timeout_milliseconds := 300000  -- 5 minutes (was 25 seconds)
  );

  -- Log successful trigger
  RAISE NOTICE 'Gmail sync cron triggered at %', NOW();
END;
$$;

-- Grant execute permission to postgres role
GRANT EXECUTE ON FUNCTION internal.trigger_gmail_sync() TO postgres;

COMMENT ON FUNCTION internal.trigger_gmail_sync() IS 
  'Triggers gmail-sync-cron Edge Function every 15 minutes. Uses 5-minute timeout to handle large email syncs.';
