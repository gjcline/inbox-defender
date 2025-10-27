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
