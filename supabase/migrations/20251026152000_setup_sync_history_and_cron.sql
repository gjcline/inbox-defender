/*
  # Setup Sync History and Cron Job

  ## Summary
  Creates sync_history table for observability and sets up the 15-minute cron job.
  Assumes pg_cron and pg_net extensions are already enabled in Supabase.

  ## New Tables
  - sync_history: Tracks every sync run with metrics

  ## Functions
  - setup_sync_config: Securely stores service key and edge URL
  - trigger_gmail_sync: Calls the sync edge function

  ## Cron Job
  - gmail-sync-15: Runs every 15 minutes
*/

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage sync history" ON sync_history;
DROP POLICY IF EXISTS "Authenticated users can view sync history" ON sync_history;

-- RLS Policies for sync_history
CREATE POLICY "Service role can manage sync history"
  ON sync_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view sync history"
  ON sync_history FOR SELECT
  TO authenticated
  USING (true);

-- Helper function to configure sync settings
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

-- Function to trigger sync
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

-- Remove existing cron job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('gmail-sync-15');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Schedule sync every 15 minutes
SELECT cron.schedule(
  'gmail-sync-15',
  '*/15 * * * *',
  'SELECT trigger_gmail_sync();'
);
