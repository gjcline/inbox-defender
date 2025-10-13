/*
  # Create Gmail Integration Tables

  1. Updates to Existing Tables
    - `mailboxes` - Add missing columns (gmail_user_id, updated_at)

  2. New Tables
    - `gmail_connections` - Store OAuth tokens and connection status
    - `emails` - Store email metadata and classification results
    - `user_settings` - Store user preferences
    - `allowlist` - Store allowed senders
    - `blocked_senders` - Store blocked senders

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Add missing columns to mailboxes table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mailboxes' AND column_name = 'gmail_user_id'
  ) THEN
    ALTER TABLE mailboxes ADD COLUMN gmail_user_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mailboxes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE mailboxes ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create gmail_connections table
CREATE TABLE IF NOT EXISTS gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mailbox_id uuid REFERENCES mailboxes(id) ON DELETE CASCADE NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  make_webhook_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, mailbox_id)
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mailbox_id uuid REFERENCES mailboxes(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  sender_email text NOT NULL,
  sender_domain text,
  subject text,
  snippet text,
  received_at timestamptz,
  classification text DEFAULT 'pending',
  ai_confidence_score numeric(3,2),
  ai_reasoning text,
  action_taken text,
  make_webhook_sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, gmail_message_id)
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  strictness_level text DEFAULT 'balanced',
  digest_frequency text DEFAULT 'weekly',
  auto_reply_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create allowlist table
CREATE TABLE IF NOT EXISTS allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_address text,
  domain text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (email_address IS NOT NULL OR domain IS NOT NULL)
);

-- Create blocked_senders table
CREATE TABLE IF NOT EXISTS blocked_senders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_address text,
  domain text,
  block_count integer DEFAULT 1 NOT NULL,
  last_blocked_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CHECK (email_address IS NOT NULL OR domain IS NOT NULL)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mailboxes_user_id ON mailboxes(user_id);
CREATE INDEX IF NOT EXISTS idx_mailboxes_email_address ON mailboxes(email_address);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_user_id ON gmail_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_mailbox_id ON gmail_connections(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_is_active ON gmail_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_classification ON emails(classification);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_pending_webhook ON emails(user_id, make_webhook_sent_at) WHERE classification = 'pending';
CREATE INDEX IF NOT EXISTS idx_allowlist_user_id ON allowlist(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_senders_user_id ON blocked_senders(user_id);

-- Enable Row Level Security
ALTER TABLE gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_senders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmail_connections
CREATE POLICY "Users can view own gmail connections"
  ON gmail_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gmail connections"
  ON gmail_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail connections"
  ON gmail_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gmail connections"
  ON gmail_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for emails
CREATE POLICY "Users can view own emails"
  ON emails FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails"
  ON emails FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for allowlist
CREATE POLICY "Users can view own allowlist"
  ON allowlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own allowlist entries"
  ON allowlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own allowlist entries"
  ON allowlist FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own allowlist entries"
  ON allowlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for blocked_senders
CREATE POLICY "Users can view own blocked senders"
  ON blocked_senders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocked senders"
  ON blocked_senders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocked senders"
  ON blocked_senders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocked senders"
  ON blocked_senders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
