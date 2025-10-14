/*
  # Fix Mailboxes and Add Proper Foreign Key

  1. Changes
    - Drop old foreign key constraint
    - Update existing mailboxes to use valid auth.users IDs
    - Make org_id nullable
    - Add proper foreign key to auth.users

  2. Security
    - Maintains data integrity with correct foreign key reference
*/

-- Drop the old foreign key constraint
ALTER TABLE mailboxes DROP CONSTRAINT IF EXISTS mailboxes_user_id_fkey;

-- Make org_id nullable
ALTER TABLE mailboxes ALTER COLUMN org_id DROP NOT NULL;

-- Update mailbox for jackson@bliztic.com to use the correct user_id
UPDATE mailboxes 
SET user_id = 'd8a1c6b4-a3b4-4c34-841f-d4a62285e866'
WHERE email_address = 'jackson@bliztic.com';

-- Add proper foreign key to auth.users
ALTER TABLE mailboxes 
  ADD CONSTRAINT mailboxes_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
