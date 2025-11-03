/*
  # Create lead_form_submissions table for email deliverability leads

  ## Overview
  This migration creates a table to capture leads from cold emailers who were filtered
  and are seeking help with their email deliverability. This page is linked from 
  auto-reply emails sent to filtered cold emails.

  ## New Tables
  
  ### `lead_form_submissions`
  Stores lead capture information for email deliverability help requests:
  - `id` (uuid, primary key) - Unique identifier for each submission
  - `name` (text, required) - Full name of the person requesting help
  - `email` (text, required, unique) - Email address for contact and preventing duplicates
  - `company` (text, optional) - Company or business name
  - `email_volume` (text, required) - Current email sending volume (Just starting, Under 500, 500-2000, 2000+)
  - `biggest_challenge` (text, optional) - Main struggle with cold email deliverability
  - `source` (text, required) - Traffic source tracking (default: spam_filter_response)
  - `notes` (text, optional) - Additional notes or context
  - `created_at` (timestamptz) - Timestamp when the submission occurred
  - `updated_at` (timestamptz) - Timestamp of last update to the record

  ## Security
  
  ### Row Level Security (RLS)
  - Enable RLS on `lead_form_submissions` table for security
  - Allow anonymous INSERT to enable public form submissions
  - Restrict SELECT to authenticated users only to prevent data scraping
  - Restrict UPDATE and DELETE to prevent tampering
  
  ## Constraints
  - Unique constraint on email to prevent duplicate submissions
  - NOT NULL constraints on required fields (name, email, email_volume, source)
  
  ## Notes
  - This form is specifically for cold emailers seeking deliverability help
  - The source field tracks where the lead came from (auto-reply, direct link, etc.)
  - Email volume options: "Just starting", "Under 500", "500-2000", "2000+"
  - Form is designed with empathetic, helpful tone (not condescending)
*/

-- Create the lead_form_submissions table
CREATE TABLE IF NOT EXISTS lead_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  company text,
  email_volume text NOT NULL,
  biggest_challenge text,
  source text NOT NULL DEFAULT 'spam_filter_response',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE lead_form_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (submit the form)
CREATE POLICY "Anyone can submit lead form"
  ON lead_form_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can view lead submissions
CREATE POLICY "Only authenticated users can view lead submissions"
  ON lead_form_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: No one can update lead submissions (immutable after creation)
CREATE POLICY "No updates to lead submissions"
  ON lead_form_submissions
  FOR UPDATE
  TO authenticated
  USING (false);

-- Policy: No one can delete lead submissions
CREATE POLICY "No deletes from lead submissions"
  ON lead_form_submissions
  FOR DELETE
  TO authenticated
  USING (false);

-- Create index on email for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_email ON lead_form_submissions(email);

-- Create index on created_at for sorting and analytics
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_created_at ON lead_form_submissions(created_at DESC);

-- Create index on source for tracking lead sources
CREATE INDEX IF NOT EXISTS idx_lead_form_submissions_source ON lead_form_submissions(source);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_form_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_form_submissions_timestamp
  BEFORE UPDATE ON lead_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_form_submissions_updated_at();