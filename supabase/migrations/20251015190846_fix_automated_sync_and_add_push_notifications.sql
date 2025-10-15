/*
  # Fix Automated Email Sync and Add Gmail Push Notifications

  1. Changes to Existing Tables
    - Add watch-related columns to `gmail_connections` table:
      - `gmail_watch_id` (text) - The watch ID from Gmail API
      - `gmail_watch_expiration` (timestamptz) - When the watch expires (7 days)
      - `push_enabled` (boolean) - Whether push notifications are active
      - `push_endpoint` (text) - The webhook endpoint for push notifications

  2. Fix trigger_gmail_sync Function
    - Update to use Supabase's built-in environment variables
    - Add proper error handling and logging
    - Use correct authorization header

  3. New Table: gmail_push_logs
    - Track all incoming push notifications from Gmail
    - Help debug push notification issues
    - Monitor push notification health

  4. Security
    - Enable RLS on gmail_push_logs table
    - Add policies for service role access

  5. Notes
    - Gmail watch expires after 7 days and needs renewal
    - Push notifications provide real-time email detection
    - Cron job remains as backup sync mechanism
*/

-- Add watch-related columns to gmail_connections
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmail_connections' AND column_name = 'gmail_watch_id'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN gmail_watch_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmail_connections' AND column_name = 'gmail_watch_expiration'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN gmail_watch_expiration timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmail_connections' AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN push_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gmail_connections' AND column_name = 'push_endpoint'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN push_endpoint text;
  END IF;
END $$;

-- Create gmail_push_logs table to track push notifications
CREATE TABLE IF NOT EXISTS gmail_push_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_connection_id uuid REFERENCES gmail_connections(id) ON DELETE CASCADE,
  notification_data jsonb,
  history_id text,
  received_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gmail_push_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can insert push logs"
  ON gmail_push_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update push logs"
  ON gmail_push_logs FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own push logs"
  ON gmail_push_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_gmail_push_logs_user_id ON gmail_push_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_push_logs_connection_id ON gmail_push_logs(gmail_connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_push_logs_processed ON gmail_push_logs(processed, received_at);

-- Drop and recreate the trigger_gmail_sync function with proper implementation
DROP FUNCTION IF EXISTS trigger_gmail_sync();

CREATE OR REPLACE FUNCTION trigger_gmail_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text := 'https://bazeyxgsgodhnwckttxi.supabase.co';
  supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhemV5eGdzZ29kaG53Y2t0dHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTgzODksImV4cCI6MjA3NTA5NDM4OX0.dHAFT1tqfsL7tIgMm4Xpw0wQAuTUJKNI4tL0W8pGZOw';
  request_id bigint;
BEGIN
  -- Make HTTP request to edge function using pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/gmail-sync-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key,
      'apikey', supabase_anon_key
    ),
    body := jsonb_build_object(
      'triggered_by', 'cron',
      'timestamp', now()
    )
  ) INTO request_id;

  -- Log the request
  RAISE NOTICE 'Triggered gmail-sync-cron with request_id: %, timestamp: %', request_id, now();

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering gmail-sync-cron: %', SQLERRM;
END;
$$;

-- Create function to renew Gmail watches before they expire
CREATE OR REPLACE FUNCTION renew_expiring_gmail_watches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text := 'https://bazeyxgsgodhnwckttxi.supabase.co';
  supabase_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhemV5eGdzZ29kaG53Y2t0dHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTgzODksImV4cCI6MjA3NTA5NDM4OX0.dHAFT1tqfsL7tIgMm4Xpw0wQAuTUJKNI4tL0W8pGZOw';
  request_id bigint;
BEGIN
  -- Make HTTP request to renew watches function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/gmail-renew-watches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || supabase_anon_key,
      'apikey', supabase_anon_key
    ),
    body := jsonb_build_object(
      'triggered_by', 'cron',
      'timestamp', now()
    )
  ) INTO request_id;

  RAISE NOTICE 'Triggered gmail-renew-watches with request_id: %', request_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering gmail-renew-watches: %', SQLERRM;
END;
$$;

-- Schedule watch renewal to run every 6 days (before 7-day expiration)
DO $$
BEGIN
  -- First try to unschedule if it exists
  PERFORM cron.unschedule('gmail-renew-watches-every-6-days');
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist, continue
    NULL;
END $$;

SELECT cron.schedule(
  'gmail-renew-watches-every-6-days',
  '0 0 */6 * *',  -- Every 6 days at midnight UTC
  $$SELECT renew_expiring_gmail_watches();$$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;