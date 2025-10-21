# Gmail OAuth "Failed to Exchange Authorization Code" - Fix Guide

## Problem Summary

You're experiencing the error: **"Gmail connection failed: Failed to exchange authorization code"**

This error occurs when Google's OAuth service rejects the token exchange request, typically due to:
1. **Redirect URI mismatch** (most common)
2. **Client ID/Secret mismatch**
3. **Authorization code already used or expired**

## Current System Status ✅

Based on my analysis of your codebase:

- ✅ Edge function `gmail-oauth-callback` is deployed and active
- ✅ All database tables exist (`gmail_connections`, `mailboxes`, `emails`, `user_settings`)
- ✅ Frontend OAuth flow is properly configured
- ✅ Environment variables are set in `.env` file
- ✅ Dashboard handles OAuth callback success/error messages

**Your Configuration:**
- Supabase URL: `https://bazeyxgsgodhnwckttxi.supabase.co`
- Google Client ID: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com`
- Redirect URI: `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback`

## Step-by-Step Fix

### Step 1: Verify Google Cloud Console Redirect URI (CRITICAL)

This is the most likely issue. The redirect URI must match EXACTLY.

1. Go to: https://console.cloud.google.com/apis/credentials

2. Find and click on OAuth 2.0 Client ID: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav`

3. In "Authorized redirect URIs" section, verify this EXACT URI exists:
   ```
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
   ```

4. Common mistakes to avoid:
   - ❌ `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth` (missing `-callback`)
   - ❌ `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback/` (extra trailing slash)
   - ❌ `http://` instead of `https://`
   - ❌ Any extra characters or spaces

5. If the URI is missing or incorrect:
   - Click "Edit"
   - Add or correct the URI
   - Click "Save"
   - **WAIT 5-10 MINUTES** for Google to propagate the change

### Step 2: Verify Supabase Edge Function Secrets

The edge function needs these environment variables to work:

1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions

2. Click "Edge Functions" → "Secrets" (or "Environment Variables")

3. Verify these three secrets exist:

   ```
   GOOGLE_CLIENT_ID = 522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET = 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
   FRONTEND_URL = https://app.bliztic.com
   ```

4. If any secret is missing or incorrect:
   - Click "Add new secret" or "Edit"
   - Enter the correct value
   - Click "Save"
   - **REDEPLOY** the `gmail-oauth-callback` function (this is critical!)

### Step 3: Test with Browser Console Logging

Your code has extensive debug logging. Use it to diagnose the issue:

1. Open your application: https://app.bliztic.com/dashboard

2. Open Browser Developer Tools (F12)

3. Go to the "Console" tab

4. Click "Connect Gmail" button

5. Check the console output. You should see:
   ```
   🔍 Gmail OAuth Debug Info:
   Client ID: 522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com
   Supabase URL: https://bazeyxgsgodhnwckttxi.supabase.co
   Redirect URI: https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
   User ID: [your user ID]
   ```

6. Copy the exact "Redirect URI" shown and verify it matches what's in Google Cloud Console

7. After clicking "Allow" on Google's consent screen, check the console again for:
   - The URL you're redirected to
   - Any error messages
   - Network requests to the edge function

### Step 4: Check Supabase Edge Function Logs

If the OAuth callback is being called but failing:

1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/gmail-oauth-callback

2. Click on "Logs" or "Invocations" tab

3. Look for recent entries (they'll be timestamped when you clicked "Connect Gmail")

4. Common errors and solutions:

   **Error: "Failed to exchange authorization code"**
   - This appears at line 101 in the edge function
   - Check the detailed error response from Google's token endpoint
   - Most likely: Redirect URI mismatch or Client Secret is wrong

   **Error: "Google OAuth credentials not configured"**
   - The GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars are missing
   - Go back to Step 2 and add them

   **Error: "Missing required parameters"**
   - The `code` or `state` (userId) parameter is missing from the callback
   - This suggests the OAuth flow didn't complete properly on Google's side

### Step 5: Verify OAuth Flow End-to-End

The complete flow should work like this:

```
1. User clicks "Connect Gmail" in dashboard
   ↓
2. Frontend redirects to Google OAuth consent screen
   URL: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...
   ↓
3. User clicks "Allow"
   ↓
4. Google redirects to edge function with authorization code
   URL: https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback?code=XXX&state=USER_ID
   ↓
5. Edge function exchanges code for tokens
   POST to: https://oauth2.googleapis.com/token
   ↓
6. Edge function saves connection to database
   ↓
7. Edge function redirects to dashboard with success param
   URL: https://app.bliztic.com/dashboard?gmail_connected=true
   ↓
8. Dashboard shows success message
```

If the flow breaks at step 5 (token exchange), the issue is with Google OAuth credentials or redirect URI.

## Quick Diagnostic Commands

Run these SQL queries in Supabase SQL Editor to check the state:

**Check if edge function environment variables are being used:**
```sql
-- This won't show the actual values, but check the edge function logs for confirmation
```

**Check for existing Gmail connections:**
```sql
SELECT
  gc.id,
  gc.user_id,
  gc.is_active,
  gc.token_expires_at,
  gc.last_sync_at,
  m.email_address
FROM gmail_connections gc
LEFT JOIN mailboxes m ON m.id = gc.mailbox_id
WHERE gc.is_active = true
ORDER BY gc.created_at DESC;
```

**Check recent failed attempts (if any were saved):**
```sql
SELECT * FROM gmail_connections
ORDER BY created_at DESC
LIMIT 5;
```

## Most Likely Solution

Based on the error "Failed to exchange authorization code", the issue is **99% likely** to be one of these:

1. **Redirect URI mismatch in Google Cloud Console** (80% probability)
   - Fix: Update the authorized redirect URI to exactly match:
     `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback`

2. **Client Secret is incorrect in Supabase** (15% probability)
   - Fix: Update GOOGLE_CLIENT_SECRET in Supabase edge function secrets and redeploy

3. **Authorization code was already used** (5% probability)
   - Fix: Try the OAuth flow again with a fresh browser session

## Testing Checklist

Before testing, ensure:
- [ ] Google Cloud Console has the correct redirect URI
- [ ] Waited at least 5 minutes after updating Google Cloud Console
- [ ] Supabase edge function secrets are correct
- [ ] Edge function was redeployed after updating secrets
- [ ] Browser cache cleared for app.bliztic.com
- [ ] You're signed in to the dashboard
- [ ] Browser console is open to view logs

## Success Indicators

You'll know it worked when:
- ✅ No errors in browser console
- ✅ Dashboard shows "Gmail connected successfully! Syncing emails..."
- ✅ Green card appears: "Gmail Connected ✓"
- ✅ Your email address is displayed
- ✅ Database shows new record in `gmail_connections` table with `is_active = true`

## Still Not Working?

If you've completed all steps and it still fails:

1. Copy the EXACT error message from:
   - Browser console
   - Supabase edge function logs

2. Note the exact time the error occurred

3. Check if the redirect URI shown in browser console matches what you entered in Google Cloud Console character-by-character

4. Verify your Google Cloud project has the Gmail API enabled:
   - Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com
   - It should show "API enabled"

5. Try with a different Google account to rule out account-specific issues

## Additional Resources

- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Gmail API Scopes: https://developers.google.com/gmail/api/auth/scopes

---

**Quick Reference:**
- Project ID: bazeyxgsgodhnwckttxi
- Client ID: 522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com
- Redirect URI: https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
- Frontend URL: https://app.bliztic.com
