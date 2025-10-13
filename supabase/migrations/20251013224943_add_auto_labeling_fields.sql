/*
  # Add Auto-Labeling Fields and Tracking

  1. Updates to gmail_connections table
    - Add last_sync_at field to track when emails were last fetched

  2. Updates to emails table
    - Add thread_id field for Gmail thread tracking
    - Add sender_name field for display purposes
    - Add processed_at field to track when classification was completed
    - Add label_applied field to track if Gmail label was applied

  3. Updates to blocked_senders table
    - Add sender_name field for display
    - Add total_emails_blocked field to track count for auto-labeling threshold
    - Add blocked_at field for timestamp
    - Add block_reason field to track why sender was blocked
    - Add unique constraint on user_id and email_address

  4. Security
    - All tables already have RLS enabled from previous migration
*/

-- Add missing columns to gmail_connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN last_sync_at timestamptz;
  END IF;
END $$;

-- Add missing columns to emails table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE emails ADD COLUMN thread_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'sender_name'
  ) THEN
    ALTER TABLE emails ADD COLUMN sender_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE emails ADD COLUMN processed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'label_applied'
  ) THEN
    ALTER TABLE emails ADD COLUMN label_applied boolean DEFAULT false;
  END IF;
END $$;

-- Update blocked_senders table structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_senders' AND column_name = 'sender_name'
  ) THEN
    ALTER TABLE blocked_senders ADD COLUMN sender_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_senders' AND column_name = 'total_emails_blocked'
  ) THEN
    ALTER TABLE blocked_senders ADD COLUMN total_emails_blocked integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_senders' AND column_name = 'blocked_at'
  ) THEN
    ALTER TABLE blocked_senders ADD COLUMN blocked_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_senders' AND column_name = 'block_reason'
  ) THEN
    ALTER TABLE blocked_senders ADD COLUMN block_reason text;
  END IF;
END $$;

-- Add unique constraint to blocked_senders for user_id and email_address
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blocked_senders_user_email_unique'
  ) THEN
    ALTER TABLE blocked_senders
    ADD CONSTRAINT blocked_senders_user_email_unique
    UNIQUE (user_id, email_address);
  END IF;
END $$;

-- Create index for faster lookups of blocked senders
CREATE INDEX IF NOT EXISTS idx_blocked_senders_user_email ON blocked_senders(user_id, email_address);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON emails(sender_email);
