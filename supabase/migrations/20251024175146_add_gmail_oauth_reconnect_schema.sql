/*
  # Gmail OAuth Reconnect and Token Audit Schema

  ## Summary
  This migration adds support for proper Gmail OAuth token management, reconnect flow,
  and comprehensive audit trail for token lifecycle events.

  ## New Tables

  ### gmail_token_audit
  - Tracks all token lifecycle events (issued, refreshed, revoked, reconnect)
  - Links to gmail_connections via foreign key
  - Stores event metadata in JSONB for flexibility
  - Provides audit trail for debugging OAuth issues

  ## Updates to Existing Tables

  ### gmail_connections
  - `google_user_id` (text) - Google's unique identifier for the user
  - `email` (text) - The connected Gmail address
  - `last_error` (text) - Most recent OAuth or API error for debugging
  - `last_profile_check_at` (timestamptz) - When we last verified profile access

  ## Security
  - Enable RLS on gmail_token_audit table
  - Add policies for authenticated users to view their own audit events
  - Only allow service role to insert audit events (prevents tampering)

  ## Indexes
  - Index on gmail_token_audit for connection_id lookups
  - Index on gmail_token_audit for event type filtering
*/

-- Add missing columns to gmail_connections table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'google_user_id'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN google_user_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'email'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN last_error text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'last_profile_check_at'
  ) THEN
    ALTER TABLE gmail_connections ADD COLUMN last_profile_check_at timestamptz;
  END IF;
END $$;

-- Create gmail_token_audit table
CREATE TABLE IF NOT EXISTS gmail_token_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_connection_id uuid REFERENCES gmail_connections(id) ON DELETE CASCADE NOT NULL,
  event text NOT NULL CHECK (event IN ('issued', 'refreshed', 'revoked', 'reconnect')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_gmail_token_audit_connection_id ON gmail_token_audit(gmail_connection_id);
CREATE INDEX IF NOT EXISTS idx_gmail_token_audit_event ON gmail_token_audit(event);
CREATE INDEX IF NOT EXISTS idx_gmail_token_audit_created_at ON gmail_token_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_email ON gmail_connections(email);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_google_user_id ON gmail_connections(google_user_id);

-- Enable Row Level Security
ALTER TABLE gmail_token_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmail_token_audit
-- Users can view their own token audit events
CREATE POLICY "Users can view own token audit events"
  ON gmail_token_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM gmail_connections
      WHERE gmail_connections.id = gmail_token_audit.gmail_connection_id
      AND gmail_connections.user_id = auth.uid()
    )
  );

-- Only service role can insert audit events (prevents user tampering)
CREATE POLICY "Service role can insert audit events"
  ON gmail_token_audit FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can manage all audit events
CREATE POLICY "Service role can manage audit events"
  ON gmail_token_audit FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
