/*
  # Enable Gmail Sync Scheduler with pg_cron

  ## Summary
  Sets up automated Gmail sync every 15 minutes using pg_cron and pg_net.
  The scheduler calls the gmail-sync-cron edge function with service role authorization.

  ## Setup Instructions

  After applying this migration, an operator must configure the service role key and edge URL:

  ```sql
  -- Run these commands in SQL Editor as a superuser:
  SELECT set_config('app.svc_key', '<YOUR_SERVICE_ROLE_KEY>', true);
  SELECT set_config('app.edge_url', '<YOUR_SUPABASE_PROJECT_URL>', true);

  -- Example:
  SELECT set_config('app.svc_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', true);
  SELECT set_config('app.edge_url', 'https://bazeyxgsgodhnwckttxi.supabase.co', true);
  ```

  These GUC settings are superuser-local and not returned to clients.

  ## Verification Commands

  ```sql
  -- Check if cron job exists
  SELECT * FROM cron.job WHERE jobname='gmail-sync-15';

  -- View recent job runs
  SELECT * FROM cron.job_run_details
    WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='gmail-sync-15')
    ORDER BY start_time DESC LIMIT 5;

  -- Check sync history
  SELECT * FROM sync_history
    ORDER BY sync_started_at DESC LIMIT 10;
  ```

  ## Extensions
  - pg_cron: Schedules periodic jobs
  - pg_net: Makes HTTP requests from Postgres

  ## Schedule
  - Job name: gmail-sync-15
  - Frequency: Every 15 minutes (*/15 * * * *)
  - Endpoint: /functions/v1/gmail-sync-cron
  - Auth: Service role key from app.svc_key config
*/

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any existing job to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('gmail-sync-15');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule new job to run every 15 minutes
SELECT cron.schedule(
  'gmail-sync-15',
  '*/15 * * * *',
  $$SELECT net.http_post(
      url := current_setting('app.edge_url', true) || '/functions/v1/gmail-sync-cron',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.svc_key', true)),
      timeout_milliseconds := 25000
    )$$
);

-- Add comment explaining configuration requirement
COMMENT ON EXTENSION pg_cron IS
'Gmail sync scheduler. Requires configuration:
  SELECT set_config(''app.svc_key'', ''<SERVICE_ROLE_KEY>'', true);
  SELECT set_config(''app.edge_url'', ''<SUPABASE_URL>'', true);';
