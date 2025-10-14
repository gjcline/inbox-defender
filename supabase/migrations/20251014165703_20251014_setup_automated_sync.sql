/*
  # Setup Automated Email Sync with pg_cron

  1. New Tables
    - `sync_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `gmail_connection_id` (uuid, foreign key to gmail_connections)
      - `sync_started_at` (timestamptz)
      - `sync_completed_at` (timestamptz)
      - `emails_fetched` (integer)
      - `emails_sent_to_webhook` (integer)
      - `status` (text: success, error, running)
      - `error_message` (text, nullable)
      - `created_at` (timestamptz)

  2. Extensions
    - Enable pg_cron extension for scheduled jobs

  3. Cron Jobs
    - Schedule gmail sync to run every 15 minutes
    - Call gmail-sync-cron edge function via HTTP

  4. Security
    - Enable RLS on sync_history table
    - Add policies for authenticated users to view their own sync history

  5. Notes
    - pg_cron runs in UTC timezone
    - Edge function is called using pg_net extension for HTTP requests
    - Service role authentication is used for cron job
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create sync_history table
CREATE TABLE IF NOT EXISTS sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_connection_id uuid REFERENCES gmail_connections(id) ON DELETE CASCADE,
  sync_started_at timestamptz DEFAULT now(),
  sync_completed_at timestamptz,
  emails_fetched integer DEFAULT 0,
  emails_sent_to_webhook integer DEFAULT 0,
  status text DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_history
CREATE POLICY "Users can view own sync history"
  ON sync_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert sync history"
  ON sync_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update sync history"
  ON sync_history FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_history_user_id ON sync_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_connection_id ON sync_history(gmail_connection_id, created_at DESC);

-- Schedule the gmail-sync-cron job to run every 15 minutes
-- Note: This uses pg_cron which runs in the database
-- The job calls the edge function via HTTP using pg_net

-- First, we need to create a function that calls the edge function
CREATE OR REPLACE FUNCTION trigger_gmail_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  supabase_service_key text;
  request_id bigint;
BEGIN
  -- Get environment variables (these need to be set in Supabase)
  supabase_url := current_setting('app.settings.supabase_url', true);
  supabase_service_key := current_setting('app.settings.supabase_service_key', true);

  -- If settings are not configured, use default from Supabase
  IF supabase_url IS NULL THEN
    supabase_url := 'https://' || current_setting('request.jwt.claim.iss', true);
  END IF;

  -- Make HTTP request to edge function using pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/gmail-sync-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_service_key
    ),
    body := jsonb_build_object()
  ) INTO request_id;

  -- Log the request
  RAISE NOTICE 'Triggered gmail-sync-cron with request_id: %', request_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error triggering gmail-sync-cron: %', SQLERRM;
END;
$$;

-- Schedule the cron job to run every 15 minutes
-- Note: Cron expression is in UTC timezone
-- Pattern: minute hour day month day_of_week
SELECT cron.schedule(
  'gmail-sync-every-15-minutes',
  '*/15 * * * *',
  $$SELECT trigger_gmail_sync();$$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;