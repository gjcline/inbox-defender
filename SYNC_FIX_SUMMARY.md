# Gmail Sync Scheduler - Implementation Summary

## What Was Implemented

### 1. pg_cron Scheduler (Migration: `20251027023307_enable_gmail_sync_scheduler.sql`)

**Job Details:**
- Name: `gmail-sync-15`
- Schedule: `*/15 * * * *` (every 15 minutes)
- Action: POSTs to edge function via pg_net with service role auth

**Configuration Required:**
```sql
-- Run once as superuser in SQL Editor:
SELECT set_config('app.svc_key', '<YOUR_SERVICE_ROLE_KEY>', true);
SELECT set_config('app.edge_url', 'https://bazeyxgsgodhnwckttxi.supabase.co', true);
```

### 2. Token Refresh Logic (supabase/functions/gmail-sync-cron/index.ts)

**Features:**
- Checks token expiry before every Gmail API call
- Refreshes if `token_expires_at` is within 2 minutes
- Handles `invalid_grant` by marking connection `is_active=false`
- Updates `gmail_connections` with new access_token and expiry
- Never logs tokens (security)

**Token Refresh Flow:**
```
1. Check: expiresAt - now <= 2 minutes?
2. If yes → POST to https://oauth2.googleapis.com/token
   - grant_type=refresh_token
   - refresh_token from database
   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
3. On success → Update gmail_connections
4. On invalid_grant → Set is_active=false, skip mailbox
```

### 3. Advisory Lock (Lock ID: 851234)

**Purpose:** Prevent overlapping sync runs

**Implementation:**
```typescript
// At start
const { data: lockAcquired } = await supabase.rpc('pg_try_advisory_lock', { key: 851234 });
if (!lockAcquired) {
  return { message: "Sync already in progress, skipped" };
}

// At end (success or error)
await supabase.rpc('pg_advisory_unlock', { key: 851234 });
```

### 4. Observability - sync_history Table

**Columns Used:**
- `sync_started_at` - When sync began
- `sync_completed_at` - When sync finished
- `emails_fetched` - Total emails fetched
- `emails_sent_to_webhook` - Total posted to webhook
- `refreshed_tokens` - Count of tokens refreshed
- `failures` - Count of failures
- `status` - 'running', 'completed', or 'failed'
- `error_message` - Error text if failed
- `error_details` - JSON error details

**Structured Log:**
```json
{
  "event": "sync_complete",
  "fetched": 10,
  "posted": 10,
  "refreshed": 1,
  "failures": 0,
  "duration_ms": 5432
}
```

## Verification Commands

### Check Cron Job Exists
```sql
SELECT * FROM cron.job WHERE jobname='gmail-sync-15';
```

**Expected output:**
- jobname: `gmail-sync-15`
- schedule: `*/15 * * * *`
- command: `SELECT net.http_post(...)`

### View Recent Job Runs
```sql
SELECT * FROM cron.job_run_details
  WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='gmail-sync-15')
  ORDER BY start_time DESC LIMIT 5;
```

### Check Sync History
```sql
-- Recent syncs
SELECT
  sync_started_at,
  sync_completed_at,
  status,
  emails_fetched,
  emails_sent_to_webhook,
  refreshed_tokens,
  failures
FROM sync_history
ORDER BY sync_started_at DESC
LIMIT 10;

-- Should show new row every 15 minutes
SELECT COUNT(*) as syncs_last_hour
FROM sync_history
WHERE sync_started_at > NOW() - INTERVAL '1 hour';
-- Expected: ~4 rows
```

### Check Token Refreshes
```sql
-- Syncs that refreshed tokens
SELECT
  sync_started_at,
  refreshed_tokens,
  emails_fetched
FROM sync_history
WHERE refreshed_tokens > 0
ORDER BY sync_started_at DESC;

-- After 1 hour, should have some rows with refreshed_tokens > 0
```

### Manual Trigger (Testing)
```sql
-- Trigger sync immediately without waiting 15 minutes
SELECT net.http_post(
  url := current_setting('app.edge_url', true) || '/functions/v1/gmail-sync-cron',
  headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.svc_key', true)),
  timeout_milliseconds := 25000
);
```

## Acceptance Criteria

✅ **Cron job exists:**
```sql
SELECT COUNT(*) FROM cron.job WHERE jobname='gmail-sync-15';
-- Should return 1
```

✅ **sync_history gets new rows every 15 minutes:**
```sql
SELECT COUNT(*) FROM sync_history
WHERE sync_started_at > NOW() - INTERVAL '1 hour';
-- Should be ~4 after 1 hour
```

✅ **Tokens refresh automatically:**
```sql
SELECT SUM(refreshed_tokens) FROM sync_history
WHERE sync_started_at > NOW() - INTERVAL '2 hours';
-- Should be > 0 after tokens expire (1 hour)
```

✅ **Sync continues working after 1 hour:**
- Initial OAuth gives token valid for ~1 hour
- After 1 hour, sync should auto-refresh tokens
- Gmail API calls should succeed without manual reconnection
- Check: No "invalid_grant" errors unless user actually revoked access

## Setup Checklist

- [ ] Migration applied (`20251027023307_enable_gmail_sync_scheduler.sql`)
- [ ] Config set in database:
  ```sql
  SELECT set_config('app.svc_key', '<SERVICE_ROLE_KEY>', true);
  SELECT set_config('app.edge_url', '<SUPABASE_URL>', true);
  ```
- [ ] Edge function deployed with updated code
- [ ] Verify cron job exists: `SELECT * FROM cron.job WHERE jobname='gmail-sync-15';`
- [ ] Test manual trigger and check sync_history
- [ ] Monitor for 1+ hour to verify token refresh works

## Troubleshooting

### Cron job not running

**Check config:**
```sql
SELECT current_setting('app.svc_key', true) as svc_key,
       current_setting('app.edge_url', true) as edge_url;
```

If NULL, run setup again.

**Check job logs:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid=(SELECT jobid FROM cron.job WHERE jobname='gmail-sync-15')
ORDER BY start_time DESC;
```

### Token refresh failing

**Check edge function logs** in Supabase Dashboard → Edge Functions → gmail-sync-cron → Logs

Look for:
- `Refreshing token for connection...`
- `Token refreshed successfully...`
- `Token refresh failed...`

**Verify OAuth credentials:**
- GOOGLE_CLIENT_ID set in edge function env
- GOOGLE_CLIENT_SECRET set in edge function env

### Advisory lock stuck

If lock is stuck (shouldn't happen with proper error handling):
```sql
-- Release all advisory locks (use with caution)
SELECT pg_advisory_unlock_all();
```

## Default Make.com Webhook

If `make_webhook_url` is NULL in `gmail_connections`:
```
https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw
```

## Security Notes

- Never log access_token or refresh_token
- Service role key stored in superuser-local GUC
- Config not returned to clients
- Advisory lock prevents concurrent runs
- Token refresh errors logged without sensitive data
