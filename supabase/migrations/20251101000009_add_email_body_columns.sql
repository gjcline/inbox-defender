/*
  # Add Full Email Body Storage

  1. Changes to emails table
    - `body_text` - Plain text version of email body
    - `body_html` - HTML version of email body (if available)
    - `has_attachments` - Boolean flag indicating if email has attachments
    - `headers_json` - JSONB column for storing important email headers

  2. Purpose
    - Store full email content for AI classification
    - Enable re-classification without re-fetching from Gmail
    - Preserve email structure and metadata

  3. Notes
    - Columns are nullable to support existing records
    - body_text/body_html can be large - PostgreSQL handles this well
    - headers_json stores From, To, Reply-To, Return-Path for domain verification
*/

-- Add body_text column for plain text email content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'body_text'
  ) THEN
    ALTER TABLE emails ADD COLUMN body_text text;
  END IF;
END $$;

-- Add body_html column for HTML email content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'body_html'
  ) THEN
    ALTER TABLE emails ADD COLUMN body_html text;
  END IF;
END $$;

-- Add has_attachments flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'has_attachments'
  ) THEN
    ALTER TABLE emails ADD COLUMN has_attachments boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add headers_json for storing important email headers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'headers_json'
  ) THEN
    ALTER TABLE emails ADD COLUMN headers_json jsonb;
  END IF;
END $$;

-- Add index for searching email body text (useful for future features)
CREATE INDEX IF NOT EXISTS idx_emails_body_text_search 
  ON emails USING gin(to_tsvector('english', body_text));

-- Add comments
COMMENT ON COLUMN emails.body_text IS 'Plain text version of the email body';
COMMENT ON COLUMN emails.body_html IS 'HTML version of the email body (if available)';
COMMENT ON COLUMN emails.has_attachments IS 'Boolean flag indicating if email has attachments';
COMMENT ON COLUMN emails.headers_json IS 'JSONB storage for important email headers (From, To, Reply-To, Return-Path)';
