# Quick Start: Fix Gmail Connection Error

## The Problem

You're seeing **"Connection Failed - Failed to fetch"** after clicking "Allow" in the Gmail OAuth flow.

## Root Cause

The test confirmed: **The gmail-oauth-callback edge function is NOT deployed to Supabase** (returns 404).

## The Solution (3 Steps)

### Step 1: Deploy Database Tables (5 minutes)

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/sql/new
   ```

2. Copy the **entire** contents of this file:
   ```
   supabase/migrations/20251013_create_gmail_integration_schema.sql
   ```

3. Paste into SQL Editor and click **RUN**

4. Verify: Go to Table Editor and check these tables exist:
   - mailboxes
   - gmail_connections
   - emails
   - user_settings
   - allowlist
   - blocked_senders

### Step 2: Deploy Edge Function (5 minutes)

1. Open Supabase Functions:
   ```
   https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
   ```

2. Click **"Create a new function"**

3. Fill in:
   - Name: `gmail-oauth-callback`
   - Verify JWT: **ENABLED** ✅

4. Copy the **entire** contents of this file:
   ```
   supabase/functions/gmail-oauth-callback/index.ts
   ```

5. Paste into the function editor

6. Click **"Deploy function"**

7. Wait 10-30 seconds for deployment to complete

### Step 3: Configure Secrets (3 minutes)

1. Open Function Settings:
   ```
   https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions
   ```

2. Click **"Add new secret"** and add these TWO secrets:

   **First Secret:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com`

   **Second Secret:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `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`

3. **CRITICAL**: After adding secrets, go back to Functions and **REDEPLOY** the function:
   - Click on `gmail-oauth-callback`
   - Click **"Redeploy"**
   - (Secrets don't take effect until you redeploy!)

## Test It

1. Clear browser cache

2. Go to your app: `http://localhost:5173`

3. Sign in with Google

4. Click **"Connect Gmail"**

5. Click **"Allow"** on Google consent screen

6. You should now see **"Gmail Connected"** ✅

## Troubleshooting

### Still getting "Connection Failed"?

**Check Edge Function Status:**
```bash
./test-edge-function.sh
```

This will tell you if:
- ❌ Function not deployed (404) → Go to Step 2
- ⚠️  Function error (500) → Check secrets in Step 3
- ✅ Function working (400) → Should be working!

**Check Browser Console:**
1. Press F12
2. Go to Console tab
3. Look for error messages starting with 🔍 or ❌

**Check Supabase Logs:**
1. Go to Functions → gmail-oauth-callback → Logs tab
2. Look for error messages
3. Common errors:
   - "Table does not exist" → Run Step 1
   - "Google OAuth credentials not configured" → Check Step 3
   - "Failed to exchange authorization code" → Check Google Console redirect URIs

## What This Fixes

✅ Creates all required database tables
✅ Deploys the OAuth callback handler
✅ Configures Google OAuth credentials
✅ Enables proper error messages in the UI
✅ Adds detailed logging for debugging

## Files Created/Modified

- ✅ `supabase/migrations/20251013_create_gmail_integration_schema.sql` - Database schema
- ✅ `GMAIL_CONNECTION_FIX.md` - Detailed troubleshooting guide
- ✅ `test-edge-function.sh` - Test script to verify deployment
- ✅ `src/pages/GmailCallback.tsx` - Better error messages

## Next Steps After Connection Works

Once Gmail is connected successfully:

1. **Configure Make.com Webhook** (optional):
   - Set up Make.com scenario for AI classification
   - Add webhook URL in dashboard

2. **Set Up Email Sync** (optional):
   - Deploy `gmail-sync-cron` edge function
   - Create Supabase cron job to run every 10 minutes

3. **Test Email Classification**:
   - Send yourself a test cold email
   - Watch it appear in the blocked emails table

## Support

If you need help:

1. Run `./test-edge-function.sh` and share the output
2. Check browser console (F12) and share any errors
3. Check Supabase function logs and share any errors

The most common mistake is forgetting to **redeploy after adding secrets**! 🔄
