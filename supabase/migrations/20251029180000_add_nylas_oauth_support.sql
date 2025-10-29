/*
  # Add Nylas OAuth Support to Gmail Connections

  1. Changes to Existing Tables
    - `gmail_connections` - Add Nylas-specific columns to support dual OAuth providers

  2. New Columns
    - `nylas_grant_id` - Unique identifier from Nylas for the grant
    - `oauth_provider` - Provider type ('google' or 'nylas')
    - `nylas_account_id` - Nylas account identifier
    - `email` - Email address (if not already exists)

  3. Notes
    - Existing Google OAuth connections remain unchanged
    - New Nylas connections will use oauth_provider='nylas'
    - Backward compatible with existing email sync logic
*/

-- Add oauth_provider column (defaults to 'google' for existing records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'oauth_provider'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN oauth_provider text DEFAULT 'google' NOT NULL;
  END IF;
END $$;

-- Add nylas_grant_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'nylas_grant_id'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN nylas_grant_id text;
  END IF;
END $$;

-- Add nylas_account_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'nylas_account_id'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN nylas_account_id text;
  END IF;
END $$;

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'email'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN email text;
  END IF;
END $$;

-- Add last_sync_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN last_sync_at timestamptz;
  END IF;
END $$;

-- Add last_error column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN last_error text;
  END IF;
END $$;

-- Create index for faster queries by oauth_provider
CREATE INDEX IF NOT EXISTS idx_gmail_connections_oauth_provider
  ON gmail_connections(oauth_provider);

-- Create index for Nylas grant lookups
CREATE INDEX IF NOT EXISTS idx_gmail_connections_nylas_grant_id
  ON gmail_connections(nylas_grant_id)
  WHERE nylas_grant_id IS NOT NULL;

-- Add comments explaining the new columns
COMMENT ON COLUMN gmail_connections.oauth_provider IS 'OAuth provider type: google or nylas';
COMMENT ON COLUMN gmail_connections.nylas_grant_id IS 'Nylas grant ID for Nylas-authenticated connections';
COMMENT ON COLUMN gmail_connections.nylas_account_id IS 'Nylas account ID associated with this connection';
COMMENT ON COLUMN gmail_connections.email IS 'Email address associated with this connection';
