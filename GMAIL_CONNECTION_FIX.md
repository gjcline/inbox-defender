# Gmail Connection Fix Guide

This guide will fix the "Connection Failed - Failed to fetch" error you're seeing after clicking "Allow" in the Gmail OAuth flow.

## Problem Analysis

The error "Failed to fetch" happens when the frontend tries to call the `gmail-oauth-callback` edge function, but either:
1. The edge function is not deployed
2. The database tables don't exist
3. The Google OAuth secrets are not configured

## Step-by-Step Fix

### Step 1: Deploy Database Schema

1. Go to your Supabase SQL Editor:
   - URL: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/sql/new`

2. Copy the entire contents of this file:
   - File: `supabase/migrations/20251013_create_gmail_integration_schema.sql`

3. Paste it into the SQL Editor and click **RUN**

4. You should see: "Success. No rows returned"

5. Verify tables were created:
   - Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor`
   - You should see these tables:
     - `mailboxes`
     - `gmail_connections`
     - `emails`
     - `user_settings`
     - `allowlist`
     - `blocked_senders`

### Step 2: Deploy Edge Function

1. Go to Supabase Functions:
   - URL: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions`

2. Check if `gmail-oauth-callback` function exists:
   - If YES: Click on it to view
   - If NO: Continue to step 3

3. If the function doesn't exist, create it:
   - Click **Create a new function**
   - Name: `gmail-oauth-callback`
   - Copy the entire contents of: `supabase/functions/gmail-oauth-callback/index.ts`
   - Paste into the editor
   - Verify JWT: **ENABLED** ✅
   - Click **Deploy function**

4. Wait for deployment to complete (usually 10-30 seconds)

### Step 3: Configure Function Secrets

1. Go to Function Secrets:
   - URL: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions`

2. Click **Add new secret**

3. Add these two secrets:

   **Secret 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com`
   - Click **Save**

   **Secret 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `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`
   - Click **Save**

⚠️ **IMPORTANT**: After adding secrets, you must **redeploy** the edge function:
   - Go back to Functions
   - Click on `gmail-oauth-callback`
   - Click **Redeploy**

### Step 4: Verify Google Cloud Console Setup

1. Go to Google Cloud Console:
   - URL: `https://console.cloud.google.com/apis/credentials`

2. Find your OAuth 2.0 Client ID (should show the Client ID from above)

3. Click **Edit** and verify these Authorized redirect URIs are added:
   ```
   http://localhost:5173/auth/gmail/callback
   https://bolt.host/auth/gmail/callback
   ```

4. If any are missing, add them and click **Save**

### Step 5: Test the Connection

1. Clear your browser cache and cookies for the app

2. Go to your app: `http://localhost:5173` (or your deployed URL)

3. Sign in with Google (if not already signed in)

4. Go to Dashboard

5. Click **Connect Gmail**

6. You should be redirected to Google OAuth consent screen

7. Click **Allow**

8. You should be redirected back to Dashboard with "Gmail Connected" status

### Step 6: Troubleshooting

If you still see "Connection Failed", check the following:

**Check Edge Function Logs:**
1. Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/gmail-oauth-callback`
2. Click on **Logs** tab
3. Look for any error messages

**Common Errors and Fixes:**

| Error | Solution |
|-------|----------|
| "Table does not exist" | Run the database migration from Step 1 |
| "Google OAuth credentials not configured" | Add secrets in Step 3 and redeploy |
| "Failed to exchange authorization code" | Verify redirect URI matches exactly in Google Console |
| "Missing required parameters" | Check browser console for details |

**Check Browser Console:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for any red error messages
4. Common issues:
   - 404 error: Edge function not deployed
   - 500 error: Check edge function logs
   - CORS error: Edge function needs to be redeployed

**Network Tab Check:**
1. Open Developer Tools (F12)
2. Go to Network tab
3. After clicking "Allow" on Google, look for request to `gmail-oauth-callback`
4. Check the response:
   - Status 200: Success
   - Status 400: Check error message in response
   - Status 404: Edge function not deployed
   - Status 500: Internal error, check logs

### Step 7: Verify Database

After successful connection, verify data was saved:

1. Go to Supabase Table Editor:
   - URL: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor`

2. Check `mailboxes` table:
   - Should have 1 row with your Gmail address

3. Check `gmail_connections` table:
   - Should have 1 row with `is_active = true`

4. Check `user_settings` table:
   - Should have 1 row with your user_id

## Quick Verification Checklist

- [ ] Database tables created (Step 1)
- [ ] Edge function deployed (Step 2)
- [ ] Secrets configured (Step 3)
- [ ] Edge function redeployed after adding secrets (Step 3)
- [ ] Redirect URIs correct in Google Console (Step 4)
- [ ] Test connection (Step 5)
- [ ] Data appears in database (Step 7)

## Still Having Issues?

If you're still experiencing problems:

1. Copy the error message from browser console
2. Copy the error from edge function logs
3. Send both error messages for further troubleshooting

The most common issue is forgetting to **redeploy the edge function** after adding secrets!
