# Automated Gmail Sync Setup Guide

## Overview
Server-side Gmail sync runs every 15 minutes using pg_cron, automatically refreshes tokens, and posts to Make.com webhooks.

## What Was Implemented

### Database Changes
- Updated `sync_history` table with `refreshed_tokens`, `failures`, `error_details` columns
- Created `setup_sync_config()` function to store service key and edge URL
- Created `trigger_gmail_sync()` function to call edge function via pg_net
- Created `gmail-sync-15` cron job running every 15 minutes

### Edge Function Updates
- Automatic token refresh before Gmail API calls (if expires within 2 minutes)
- Invalid grant handling (marks connection inactive if user revoked access)
- Default Make.com webhook: `https://hook.us2.make.com/qd1axtiygb3ivkcrgqqke0phfof2mcj7`
- Sync history tracking with detailed metrics
- Structured JSON logging for observability

## Setup Steps

### 1. Configure Sync Settings

Run this SQL in Supabase SQL Editor:

```sql
SELECT setup_sync_config(
  'YOUR_SUPABASE_SERVICE_ROLE_KEY',
  'https://bazeyxgsgodhnwckttxi.supabase.co'
);
```

Get your service role key from: Supabase Dashboard → Project Settings → API

### 2. Verify Cron Job

```sql
SELECT * FROM cron.job WHERE jobname = 'gmail-sync-15';
```

Should show job with schedule `*/15 * * * *`

### 3. Test Manual Trigger

```sql
SELECT trigger_gmail_sync();
```

### 4. Check Sync History

```sql
SELECT * FROM sync_history
ORDER BY sync_started_at DESC
LIMIT 5;
```

## Acceptance Criteria

✅ Cron job `gmail-sync-15` exists in `cron.job`
✅ sync_history shows new row every 15 minutes
✅ Tokens refresh automatically (check `refreshed_tokens` column)
✅ Gmail API calls work beyond 1 hour (token expiry)

## Default Webhook

If `make_webhook_url` is NULL, uses:
```
https://hook.us2.make.com/qd1axtiygb3ivkcrgqqke0phfof2mcj7
```
