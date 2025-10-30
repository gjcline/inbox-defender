/*
  # Remove Duplicate Gmail Sync Cron Jobs

  ## Problem
  Multiple cron jobs are trying to invoke gmail-sync-cron simultaneously:
  - gmail-sync-every-15-minutes
  - gmail-sync-15
  - gmail-poll-job (every 2 minutes!)

  This causes constant advisory lock conflicts, preventing any sync from completing.

  ## Solution
  1. Unschedule ALL duplicate/old cron jobs
  2. Keep ONLY gmail-sync-15 (the correct one with proper timeout)
  3. Remove the obsolete gmail-poll-job (polling is replaced by cron sync)

  ## Changes
  - Unschedule: gmail-sync-every-15-minutes
  - Unschedule: gmail-poll-job
  - Keep: gmail-sync-15
  - Keep: gmail-renew-watches-every-6-days
*/

-- Unschedule duplicate gmail sync job
DO $$
BEGIN
  PERFORM cron.unschedule('gmail-sync-every-15-minutes');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Unschedule obsolete polling job (replaced by automated sync)
DO $$
BEGIN
  PERFORM cron.unschedule('gmail-poll-job');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Verify remaining jobs
COMMENT ON EXTENSION pg_cron IS 
  'Active cron jobs: gmail-sync-15 (every 15 min), gmail-renew-watches-every-6-days';
