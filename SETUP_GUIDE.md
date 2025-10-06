# Inbox Defender - Complete Setup Guide

This guide will help you set up the complete Gmail + Make.com integration for Inbox Defender.

## Overview

**Architecture:**
1. User connects Gmail account (full access with `gmail.modify` scope)
2. Supabase Cron Job runs every 10 minutes to sync new emails
3. New emails are sent to Make.com webhook for AI classification
4. Make.com processes emails, sends auto-replies to spam, and returns results
5. Results are stored in Supabase database
6. Dashboard displays real-time email data

---

## Step 1: Database Setup

### 1.1 Run Initial Schema
Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/sql`

Copy and paste the contents of `database_schema.sql` and execute it.

### 1.2 Run Make.com Integration Schema
Copy and paste the contents of `database_schema_make_integration.sql` and execute it.

This creates:
- `gmail_connections` table (stores OAuth tokens and Make.com webhook URL)
- `emails` table (stores email metadata and classification)
- `blocked_senders` table (tracks blocked senders)
- `user_settings` table (user preferences)

---

## Step 2: Environment Variables

### 2.1 Local Development (.env)
Update your `.env` file:

```env
VITE_SUPABASE_URL=https://bazeyxgsgodhnwckttxi.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_GOOGLE_CLIENT_ID=<your_google_oauth_client_id>
```

### 2.2 Netlify Production
Go to: Netlify > Site Settings > Environment Variables

Add the same three variables above.

### 2.3 Get Supabase Keys
1. Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/api`
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 3: Google Cloud Console Setup

### 3.1 OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select **External** user type
3. Fill in:
   - App name: **Inbox Defender**
   - User support email: (your email)
   - Developer contact: (your email)
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`

### 3.2 OAuth Credentials
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs:
   ```
   https://app.bliztic.com/auth/gmail/callback
   https://bliztic.netlify.app/auth/gmail/callback
   ```
5. Copy:
   - **Client ID** → Save for `VITE_GOOGLE_CLIENT_ID`
   - **Client Secret** → Save for Supabase Edge Function

---

## Step 4: Deploy Supabase Edge Functions

### 4.1 Deploy `gmail-oauth-callback`
1. Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions`
2. Click **Create Function**
3. Name: `gmail-oauth-callback`
4. Copy code from `gmail-oauth-callback-edge-function.ts`
5. Paste and deploy
6. **Verify JWT**: ✅ Enabled

### 4.2 Deploy `gmail-sync-cron`
1. Create new function: `gmail-sync-cron`
2. Copy code from `edge-function-gmail-sync-cron.ts`
3. Paste and deploy
4. **Verify JWT**: ✅ Enabled

### 4.3 Deploy `webhook-from-make`
1. Create new function: `webhook-from-make`
2. Copy code from `edge-function-webhook-from-make.ts`
3. Paste and deploy
4. **Verify JWT**: ❌ Disabled (public webhook)

### 4.4 Add Secrets to Edge Functions
Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions`

Add these secrets:
- `GOOGLE_CLIENT_ID`: (from Google Cloud Console)
- `GOOGLE_CLIENT_SECRET`: (from Google Cloud Console)

---

## Step 5: Set Up Supabase Cron Job

1. Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/database/cron-jobs`
2. Click **Create a new cron job**
3. Name: `gmail-sync-job`
4. Schedule: `*/10 * * * *` (every 10 minutes)
5. SQL Command:
```sql
SELECT
  net.http_post(
    url := 'https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-sync-cron',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || '<YOUR_SERVICE_ROLE_KEY>'
    )
  ) as request_id;
```

**Important:** Replace `<YOUR_SERVICE_ROLE_KEY>` with your actual service role key from:
`https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/api`

---

## Step 6: Make.com Workflow Setup

### 6.1 Create New Scenario in Make.com

**Trigger: Webhook**
1. Create a new webhook
2. Copy the webhook URL (you'll need this later)

**Module 1: Parse Webhook Data**
- Input: Webhook data
- Output: `user_id`, `emails[]` array

**Module 2: Iterate Over Emails**
- Use an Iterator module
- Array: `emails[]`

**Module 3: AI Classification (for each email)**
- Use OpenAI / Claude / Gemini module
- Prompt:
```
Classify this email as either "blocked" (spam/cold outreach) or "safe" (legitimate).

Email Details:
From: {{sender_email}}
Subject: {{subject}}
Preview: {{snippet}}

Respond in JSON format:
{
  "classification": "blocked" or "safe",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}
```

**Module 4: Send Auto-Reply (if blocked)**
- Add Router with filter: `classification = "blocked"`
- Use Gmail: Send an Email
- To: `{{sender_email}}`
- Subject: `Re: {{subject}}`
- Body:
```
Thank you for reaching out. This inbox uses automated filtering to manage cold outreach emails.

If you believe this is an error, please reach out through our website contact form.

Best regards,
Inbox Defender
```

**Module 5: Archive/Label Email (if blocked)**
- Use Gmail: Modify Labels
- Add label: "Inbox Defender - Blocked"
- Remove label: "INBOX"

**Module 6: Send Results Back to Supabase**
- Use HTTP module
- URL: `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/webhook-from-make`
- Method: POST
- Headers:
  - `Content-Type: application/json`
- Body:
```json
{
  "user_id": "{{user_id}}",
  "results": [
    {
      "message_id": "{{message_id}}",
      "classification": "{{classification}}",
      "ai_confidence_score": {{confidence}},
      "ai_reasoning": "{{reasoning}}",
      "action_taken": "auto_replied_and_archived"
    }
  ]
}
```

**Important:** Make.com needs Gmail API access. When prompted, authorize with the same Google account that users will connect.

### 6.2 Save Your Make.com Webhook URL
Copy the webhook URL from Step 6.1 - you'll need to paste this in the dashboard.

---

## Step 7: User Flow Testing

### 7.1 Sign In
1. Go to: `https://app.bliztic.com`
2. Sign in with Google

### 7.2 Connect Gmail
1. Dashboard should show "Connect Your Gmail" card
2. Click "Connect Gmail"
3. Authorize with Google (accept gmail.modify scope)
4. You'll be redirected back to dashboard

### 7.3 Configure Make.com Webhook
1. In dashboard, find "Make.com Webhook URL" section
2. Paste your Make.com webhook URL
3. Click "Save Webhook URL"

### 7.4 Wait for Sync
- The cron job runs every 10 minutes
- New emails will be synced and sent to Make.com
- Make.com processes them and sends results back
- Dashboard updates automatically (refreshes every 30 seconds)

---

## Step 8: Monitoring & Debugging

### 8.1 Check Edge Function Logs
Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions`

Click on each function to view logs.

### 8.2 Check Database
Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor`

Query the tables:
```sql
-- Check Gmail connections
SELECT * FROM gmail_connections;

-- Check emails
SELECT * FROM emails ORDER BY received_at DESC LIMIT 10;

-- Check blocked senders
SELECT * FROM blocked_senders;
```

### 8.3 Check Make.com Execution History
In Make.com, go to History tab to see all webhook executions and any errors.

---

## Frequently Asked Questions

### Q: How often do emails sync?
**A:** Every 10 minutes via the Supabase cron job.

### Q: Can I change the sync frequency?
**A:** Yes, edit the cron job schedule in Supabase dashboard.

### Q: What if Gmail tokens expire?
**A:** The refresh token is stored and will be used to get new access tokens automatically.

### Q: Can users have multiple Gmail accounts?
**A:** Currently one Gmail account per user. Multi-account support can be added later.

### Q: What happens to emails before connection?
**A:** Only new emails received AFTER connecting Gmail are processed.

### Q: How do I customize the auto-reply message?
**A:** Edit the auto-reply template in your Make.com workflow.

---

## Troubleshooting

### Issue: OAuth callback fails
- Check that redirect URI in Google Console matches exactly
- Verify Supabase URL is correct in `.env`
- Check Edge Function logs for errors

### Issue: No emails syncing
- Verify cron job is running (check Supabase logs)
- Ensure Gmail connection `is_active = true` in database
- Check that `make_webhook_url` is set in `gmail_connections` table

### Issue: Make.com not receiving webhooks
- Verify webhook URL is correct in database
- Check Edge Function logs for HTTP errors
- Ensure Make.com scenario is active

### Issue: Dashboard not updating
- Check that webhook-from-make function is deployed
- Verify Make.com is sending results back to correct URL
- Check browser console for errors

---

## Next Steps

Once everything is working:

1. **Test with real emails**: Send yourself a cold outreach-style email
2. **Monitor classification accuracy**: Review blocked emails in dashboard
3. **Adjust AI prompts**: Fine-tune classification in Make.com
4. **Add more features**:
   - Whitelist domains
   - Custom auto-reply templates
   - Email unsubscribe detection
   - Sentiment analysis

---

## Support

If you encounter issues:
1. Check Edge Function logs first
2. Verify all environment variables are set
3. Review Make.com execution history
4. Check database for data integrity

Good luck! 🚀
