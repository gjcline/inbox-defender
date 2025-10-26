-- Add missing columns to existing sync_history table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_history' AND column_name = 'refreshed_tokens'
  ) THEN
    ALTER TABLE sync_history ADD COLUMN refreshed_tokens int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_history' AND column_name = 'failures'
  ) THEN
    ALTER TABLE sync_history ADD COLUMN failures int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sync_history' AND column_name = 'error_details'
  ) THEN
    ALTER TABLE sync_history ADD COLUMN error_details jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_sync_history_sync_started_at ON sync_history(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);

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
