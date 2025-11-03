/*
  # Create waitlist table for early signups

  ## Overview
  This migration creates a waitlist table to capture early interest before product launch.
  Users can sign up with their contact information and indicate their primary interest.

  ## New Tables
  
  ### `waitlist`
  Stores early signup information with contact details and interest tracking:
  - `id` (uuid, primary key) - Unique identifier for each waitlist entry
  - `name` (text, required) - Full name of the person joining the waitlist
  - `email` (text, required, unique) - Email address for contact and preventing duplicates
  - `mobile` (text, optional) - Phone number in any format (US default, international accepted)
  - `interest` (text, required) - Primary interest area selected by user
  - `created_at` (timestamptz) - Timestamp when the signup occurred
  - `updated_at` (timestamptz) - Timestamp of last update to the record

  ## Security
  
  ### Row Level Security (RLS)
  - Enable RLS on `waitlist` table for security
  - Allow anonymous INSERT to enable public signups
  - Restrict SELECT to authenticated users only to prevent data scraping
  - Restrict UPDATE and DELETE to prevent tampering
  
  ## Constraints
  - Unique constraint on email to prevent duplicate signups
  - NOT NULL constraints on required fields (name, email, interest)
  
  ## Notes
  - The interest field stores one of five predefined options or "Other"
  - Mobile number is optional and accepts any format for international compatibility
  - Duplicate emails will trigger a constraint violation for proper error handling
*/

-- Create the waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  mobile text,
  interest text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (join the waitlist)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can view waitlist entries
CREATE POLICY "Only authenticated users can view waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: No one can update waitlist entries (immutable after creation)
CREATE POLICY "No updates to waitlist entries"
  ON waitlist
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: No one can delete waitlist entries
CREATE POLICY "No deletes from waitlist"
  ON waitlist
  FOR DELETE
  TO authenticated
  USING (false);

-- Create index on email for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Create index on created_at for sorting and analytics
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_timestamp
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();