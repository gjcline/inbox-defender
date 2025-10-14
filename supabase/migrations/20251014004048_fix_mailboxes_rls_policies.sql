/*
  # Fix Mailboxes RLS Policies

  1. Changes
    - Drop old RLS policies that reference non-existent users table and org_id
    - Create new simpler policies that just check user_id

  2. Security
    - Users can only view/manage their own mailboxes
    - Policies check auth.uid() = user_id
*/

-- Drop old policies that reference org_id and users table
DROP POLICY IF EXISTS "Users can view mailboxes in their org" ON mailboxes;
DROP POLICY IF EXISTS "Users can insert mailboxes for their org" ON mailboxes;
DROP POLICY IF EXISTS "Users can update mailboxes in their org" ON mailboxes;
DROP POLICY IF EXISTS "Users can delete their own mailboxes" ON mailboxes;

-- Create new simplified policies
CREATE POLICY "Users can view own mailboxes"
  ON mailboxes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mailboxes"
  ON mailboxes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mailboxes"
  ON mailboxes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mailboxes"
  ON mailboxes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
