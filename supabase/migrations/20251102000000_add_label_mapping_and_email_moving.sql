/*
  # Add Gmail Label Mapping and Email Moving Tracking

  1. Changes to gmail_connections table
    - Add `label_mapping` (jsonb) - Stores Gmail label IDs for each classification type
      Structure: {
        "inbox": "Label_xxx",
        "personal": "Label_yyy",
        "conversations": "Label_zzz",
        "marketing": "Label_aaa",
        "cold_outreach": "Label_bbb",
        "spam": "Label_ccc"
      }

  2. Changes to emails table
    - Add `moved_to_folder` (boolean) - Tracks if email was moved to InboxDefender folder
    - Add `moved_at` (timestamptz) - Timestamp when email was moved
    - Add `move_error` (text) - Stores error message if move failed

  3. Purpose
    - Enable automatic Gmail label creation on OAuth connection
    - Track which emails have been moved to InboxDefender folders
    - Support retry logic for failed moves
*/

-- Add label_mapping to gmail_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gmail_connections' AND column_name = 'label_mapping'
  ) THEN
    ALTER TABLE gmail_connections
    ADD COLUMN label_mapping jsonb DEFAULT NULL;

    COMMENT ON COLUMN gmail_connections.label_mapping IS 'Maps classification types to Gmail label IDs. Created during OAuth.';
  END IF;
END $$;

-- Add email moving tracking columns to emails table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'moved_to_folder'
  ) THEN
    ALTER TABLE emails
    ADD COLUMN moved_to_folder boolean DEFAULT false;

    COMMENT ON COLUMN emails.moved_to_folder IS 'True if email was successfully moved to InboxDefender folder';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'moved_at'
  ) THEN
    ALTER TABLE emails
    ADD COLUMN moved_at timestamptz DEFAULT NULL;

    COMMENT ON COLUMN emails.moved_at IS 'Timestamp when email was moved to InboxDefender folder';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'move_error'
  ) THEN
    ALTER TABLE emails
    ADD COLUMN move_error text DEFAULT NULL;

    COMMENT ON COLUMN emails.move_error IS 'Error message if email move failed. Used for retry logic.';
  END IF;
END $$;

-- Create index for finding emails that need to be moved
CREATE INDEX IF NOT EXISTS idx_emails_needs_moving
  ON emails(classification, moved_to_folder)
  WHERE classification IS NOT NULL AND classification != 'pending' AND moved_to_folder = false;

-- Create index for finding failed moves for retry
CREATE INDEX IF NOT EXISTS idx_emails_move_errors
  ON emails(move_error)
  WHERE move_error IS NOT NULL;
