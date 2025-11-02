-- ============================================================================
-- Update Make.com Webhook URL in gmail_connections Table
-- ============================================================================
--
-- This SQL updates all existing gmail_connections records to use the new
-- Make.com webhook URL. This ensures that all email classification requests
-- will be sent to the correct endpoint.
--
-- New Webhook URL: https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- First, let's check what webhook URLs are currently in use
SELECT
  user_id,
  email,
  make_webhook_url,
  is_active
FROM gmail_connections
ORDER BY created_at DESC;

-- Update all records to use the new webhook URL
-- This will update both NULL values and old webhook URLs
UPDATE gmail_connections
SET
  make_webhook_url = 'https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw',
  updated_at = now()
WHERE
  -- Update if webhook is NULL or if it's an old webhook URL
  make_webhook_url IS NULL
  OR make_webhook_url != 'https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw';

-- Verify the update
SELECT
  user_id,
  email,
  make_webhook_url,
  is_active,
  updated_at
FROM gmail_connections
ORDER BY updated_at DESC;

-- Expected result: All records should now have the new webhook URL
-- https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw
