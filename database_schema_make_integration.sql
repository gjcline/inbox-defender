/*
  # Database Schema Updates for Make.com Integration

  Run this SQL in your Supabase SQL Editor to add Make.com integration support:
  https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/sql

  ## Changes
  1. Add make_webhook_url to gmail_connections table
  2. Add action_taken column to emails table
  3. Add make_webhook_sent_at column to emails table
  4. Add indexes for better query performance
*/

-- Add Make.com webhook URL to gmail_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'make_webhook_url'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN make_webhook_url text;
  END IF;
END $$;

-- Add action_taken column to emails table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'action_taken'
  ) THEN
    ALTER TABLE emails ADD COLUMN action_taken text;
  END IF;
END $$;

-- Add make_webhook_sent_at column to emails table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'make_webhook_sent_at'
  ) THEN
    ALTER TABLE emails ADD COLUMN make_webhook_sent_at timestamptz;
  END IF;
END $$;

-- Add index for pending emails that need to be sent to Make.com
CREATE INDEX IF NOT EXISTS idx_emails_pending_webhook
  ON emails(user_id, make_webhook_sent_at)
  WHERE classification = 'pending';

-- Add comment explaining the workflow
COMMENT ON COLUMN gmail_connections.make_webhook_url IS 'URL endpoint in Make.com where new emails will be sent for AI classification';
COMMENT ON COLUMN emails.action_taken IS 'Action taken by Make.com: auto_replied, archived, labeled, etc.';
COMMENT ON COLUMN emails.make_webhook_sent_at IS 'Timestamp when email was sent to Make.com webhook';
