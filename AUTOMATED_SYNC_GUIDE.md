# Automated Email Sync Implementation Guide

## What Was Implemented

Your Gmail email sync system has been upgraded with the following features:

### 1. Automatic Email Syncing Every 15 Minutes
- **pg_cron** database scheduler now triggers the gmail-sync-cron function automatically
- Syncs run every 15 minutes in the background
- No manual intervention required after initial setup

### 2. Historical Email Fetch on First Sync
- When you first connect Gmail, the system fetches emails from your connection date
- Fetches up to 500 emails on first sync
- Subsequent syncs fetch up to 100 emails

### 3. All Emails Sent to Webhook
- **Every email** is now sent to your Make.com webhook for AI classification
- Previously blocked emails are also included with `current_classification` field
- Webhook payload includes sync metadata

### 4. Live Dashboard Updates
- Countdown timer showing time until next automatic sync
- Real-time email updates via Supabase Realtime subscriptions
- Sync status indicator (Idle, Syncing, Ready)
- "Last synced" timestamp that updates automatically
- Manual "Sync Now" button remains fully functional

### 5. Webhook Format Documentation
- Complete JSON format documentation in the UI
- Click "Show Webhook Format Documentation" in the Make.com Webhook Config section
- Clear examples of request and response formats

---

## Webhook Integration Guide

### How It Works

1. **Your System → Make.com**: Every 15 minutes (or when you click "Sync Now"), your system sends all new emails to your Make.com webhook URL

2. **Make.com → AI Classification**: Your Make.com automation receives the emails, uses AI to classify them, and determines if they're cold emails

3. **Make.com → Your System**: Make.com sends the classification results back to your webhook endpoint

4. **Your System → Gmail**: If classified as "blocked", the email is automatically moved to trash in Gmail

### Webhook Payload Format

#### Sent TO Your Make.com Webhook

```json
{
  "user_id": "uuid",
  "gmail_connection_id": "uuid",
  "user_email": "user@example.com",
  "access_token": "google_oauth_token",
  "emails": [
    {
      "message_id": "gmail_message_id",
      "thread_id": "gmail_thread_id",
      "from": "Full Name <email@domain.com>",
      "sender_email": "email@domain.com",
      "sender_name": "Full Name",
      "subject": "Email subject",
      "snippet": "Email preview text...",
      "received_date": "2025-10-14T10:30:00Z",
      "label_ids": ["INBOX", "UNREAD"],
      "current_classification": "pending"
    }
  ],
  "sync_info": {
    "is_first_sync": false,
    "total_emails": 10,
    "sync_timestamp": "2025-10-14T10:30:00Z"
  }
}
```

#### Expected Response FROM Make.com

Your Make.com automation must POST this format back to:
`{VITE_SUPABASE_URL}/functions/v1/webhook-from-make`

```json
{
  "user_id": "uuid",
  "access_token": "google_oauth_token",
  "results": [
    {
      "message_id": "gmail_message_id",
      "classification": "blocked",
      "ai_confidence_score": 0.85,
      "ai_reasoning": "This is a cold outreach email because...",
      "action_taken": "labeled_and_archived"
    }
  ]
}
```

**Important Notes:**
- `classification` must be either `"blocked"` or `"safe"`
- Include the `access_token` from the original request so the system can label emails in Gmail
- `message_id` must match the ID from the email you're classifying

---

## Database Changes

### New Table: `sync_history`
Tracks every sync operation for debugging and monitoring:
- When syncs occurred
- How many emails were fetched
- Whether webhooks were sent successfully
- Any errors that occurred

### pg_cron Extension
- Enabled in your Supabase database
- Scheduled job runs every 15 minutes
- Calls the gmail-sync-cron edge function automatically

---

## How to Verify It's Working

### 1. Check the Sync Status Widget
- Go to your Dashboard
- Look for the sync status card showing countdown timer
- You should see "Next auto-sync: Xm Ys"

### 2. Watch for New Emails
- Wait 15 minutes after connecting Gmail
- New emails should appear automatically in your dashboard
- No need to refresh or click "Sync Now"

### 3. Monitor Webhook Activity
- Check your Make.com scenario execution logs
- You should see requests coming in every 15 minutes (when there are new emails)

### 4. Test Manual Sync
- Click the "Sync Now" button
- Watch the status change to "Syncing"
- New emails should appear within a few seconds

---

## Troubleshooting

### Automatic Sync Not Working?

1. **Check pg_cron is enabled:**
   - Run this SQL query in Supabase SQL Editor:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'gmail-sync-every-15-minutes';
   ```
   - You should see one row with your scheduled job

2. **Check if cron is running:**
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'gmail-sync-every-15-minutes')
   ORDER BY start_time DESC
   LIMIT 5;
   ```
   - This shows the last 5 executions of your cron job

3. **Manual sync works but automatic doesn't:**
   - Verify pg_cron extension is enabled
   - Check Supabase logs for any errors
   - Ensure edge function is deployed

### Emails Not Appearing in Dashboard?

1. **Check Gmail connection:**
   - Verify "Gmail Connected" shows your email address
   - Check "Last synced" timestamp is updating

2. **Check Supabase Realtime:**
   - Open browser console (F12)
   - Look for Realtime subscription messages
   - Should see "Email change detected" when new emails arrive

3. **Force refresh:**
   - Click "Sync Now" button
   - Check if emails appear after manual sync

### Webhook Not Receiving Emails?

1. **Verify webhook URL is saved:**
   - Go to Make.com Webhook Config section
   - Ensure your webhook URL is displayed

2. **Test webhook endpoint:**
   - Copy your webhook URL
   - Use a tool like Postman to send a test POST request
   - Verify Make.com receives the request

3. **Check webhook format:**
   - Click "Show Webhook Format Documentation"
   - Verify your Make.com scenario expects the exact format shown

---

## Configuration Settings

### Sync Frequency
The sync runs every 15 minutes by default. To change this:

1. Run this SQL in Supabase SQL Editor:
```sql
-- Unschedule existing job
SELECT cron.unschedule('gmail-sync-every-15-minutes');

-- Schedule with new interval (example: every 5 minutes)
SELECT cron.schedule(
  'gmail-sync-every-15-minutes',
  '*/5 * * * *',
  $$SELECT trigger_gmail_sync();$$
);
```

### Cron Patterns
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes (current)
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour
- `0 */2 * * *` - Every 2 hours

---

## Next Steps

1. **Set up your Make.com automation:**
   - Create a webhook trigger in Make.com
   - Copy the webhook URL to your dashboard
   - Build your AI classification logic
   - Configure the response to post back to webhook-from-make endpoint

2. **Test the complete flow:**
   - Send yourself a test email
   - Wait for automatic sync (or click "Sync Now")
   - Verify email appears in dashboard
   - Check Make.com receives the webhook
   - Verify classification result updates in dashboard

3. **Monitor for 24 hours:**
   - Ensure syncs happen every 15 minutes
   - Check for any errors in Supabase logs
   - Verify webhook delivery success rate

---

## Support

If you encounter any issues:
1. Check the Supabase logs for error messages
2. Verify all edge functions are deployed
3. Ensure database migration was applied successfully
4. Test manual sync to isolate automatic sync issues
