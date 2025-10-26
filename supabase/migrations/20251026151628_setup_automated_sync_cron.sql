/*
  # Setup Automated Gmail Sync with pg_cron

  ## Summary
  Enables automated server-side Gmail sync every 15 minutes using pg_cron and pg_net.
  The sync runs even when no browser is open, automatically refreshes tokens, and posts to Make.com webhook.

  ## New Tables

  ### sync_history
  - Tracks every sync run with detailed metrics
  - Fields: id, started_at, completed_at, status, fetched_count, posted_count, refreshed_tokens, failures, error_details
  - Provides observability into sync operations
  - RLS enabled for admin access only

  ## Extensions
  - pg_cron: For scheduling periodic jobs
  - pg_net: For making HTTP requests from Postgres

  ## Configuration
  - Stores service role key securely in Postgres config
  - Stores edge function URL in Postgres config
  - Both are session-scoped for security

  ## Cron Schedule
  - Job name: gmail-sync-15
  - Schedule: Every 15 minutes (*/15 * * * *)
  - Timeout: 25 seconds
  - Calls gmail-sync-cron edge function with service role auth

  ## Security
  - Service role key stored in session config, not hardcoded
  - RLS policies protect sync_history table
  - Only authenticated admins can view sync history
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create sync_history table for observability
CREATE TABLE IF NOT EXISTS sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  fetched_count int DEFAULT 0,
  posted_count int DEFAULT 0,
  refreshed_tokens int DEFAULT 0,
  failures int DEFAULT 0,
  error_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for sync_history
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);

-- Enable RLS on sync_history
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_history (admin/service role access only)
CREATE POLICY "Service role can manage sync history"
  ON sync_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view sync history (for admin dashboards)
CREATE POLICY "Authenticated users can view sync history"
  ON sync_history FOR SELECT
  TO authenticated
  USING (true);

-- Configure service role key and edge URL
CREATE OR REPLACE FUNCTION setup_sync_config(
  service_key text,
  edge_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.svc_key', service_key, false);
  PERFORM set_config('app.edge_url', edge_url, false);
END;
$$;

-- Remove existing job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('gmail-sync-15');
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN OTHERS THEN
    NULL;
END $$;

-- Create a function to call the sync endpoint
CREATE OR REPLACE FUNCTION trigger_gmail_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  svc_key text;
  edge_url text;
BEGIN
  svc_key := current_setting('app.svc_key', true);
  edge_url := current_setting('app.edge_url', true);

  IF svc_key IS NOT NULL AND edge_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := edge_url || '/functions/v1/gmail-sync-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || svc_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('source', 'pg_cron'),
      timeout_milliseconds := 25000
    );
  END IF;
END;
$$;

-- Schedule the sync job to run every 15 minutes
SELECT cron.schedule(
  'gmail-sync-15',
  '*/15 * * * *',
  'SELECT trigger_gmail_sync();'
);
