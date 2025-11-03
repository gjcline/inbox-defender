/*
  # Change Gmail Sync Interval to 5 Minutes

  ## Purpose
  Improve user experience by syncing emails 3x faster.
  Changes the automatic email sync from every 15 minutes to every 5 minutes.

  ## Changes
  1. Unschedule the existing gmail-sync-15 job
  2. Create new gmail-sync-5 job that runs every 5 minutes
  3. Uses the same timeout and configuration as before

  ## Impact
  - Emails will now sync every 5 minutes instead of 15
  - Users will see new emails and updates much faster
  - All other functionality remains the same
*/

-- Unschedule the old 15-minute job
DO $$
BEGIN
  PERFORM cron.unschedule('gmail-sync-15');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule new job to run every 5 minutes
SELECT cron.schedule(
  'gmail-sync-5',
  '*/5 * * * *',
  'SELECT internal.trigger_gmail_sync()'
);

-- Update the comment on the extension to reflect the new interval
COMMENT ON EXTENSION pg_cron IS
  'Active cron jobs: gmail-sync-5 (every 5 min), gmail-renew-watches-every-6-days';

-- Update the function comment to reflect the new interval
COMMENT ON FUNCTION internal.trigger_gmail_sync() IS
  'Triggers gmail-sync-cron Edge Function every 5 minutes. Uses 5-minute timeout to handle large email syncs.';
