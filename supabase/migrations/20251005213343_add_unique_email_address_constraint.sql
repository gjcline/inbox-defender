/*
  # Add unique constraint to mailboxes email_address

  1. Changes
    - Add unique constraint to `mailboxes.email_address` column
    - This allows upsert operations to work correctly when connecting Gmail accounts

  2. Security
    - No RLS changes needed
*/

-- Add unique constraint to email_address if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mailboxes_email_address_key'
  ) THEN
    ALTER TABLE mailboxes ADD CONSTRAINT mailboxes_email_address_key UNIQUE (email_address);
  END IF;
END $$;