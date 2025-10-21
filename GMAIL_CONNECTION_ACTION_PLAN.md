# Gmail Connection - Critical Fix Action Plan

## Current Status ✅

**What's Already Working:**
- ✅ All 11 edge functions deployed and active in Supabase
- ✅ All database tables exist with proper RLS policies
- ✅ Frontend code is correctly configured
- ✅ Environment variables are set in `.env`
- ✅ Production site deployed at https://app.bliztic.com

**What's Broken:**
- ❌ Google OAuth redirect URI mismatch
- ⚠️ Supabase `FRONTEND_URL` secret needs verification

---

## IMMEDIATE ACTIONS REQUIRED

### Action 1: Fix Google Cloud Console Redirect URI ⚡ CRITICAL

**Current Problem:**
Your code sends users to: `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback`

But Google Cloud Console has: `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth` (missing `-callback`)

**How to Fix:**
1. Go to: [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Find "Authorized redirect URIs" section
4. Update URI #3 from:
   ```
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth
   ```
   To:
   ```
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
   ```
5. Click "Save"
6. **IMPORTANT:** Wait 5-10 minutes for Google to propagate changes

**Verification:**
Your authorized redirect URIs should be:
- ✅ `https://bazeyxgsgodhnwckttxi.supabase.co/auth/v1/callback` (for Supabase Auth)
- ✅ `https://app.bliztic.com/dashboard` (optional, if needed)
- ✅ `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback` ⚡ **ADD THIS**

---

### Action 2: Verify/Update Supabase Edge Function Secrets

**How to Do It:**
1. Go to: [Supabase Dashboard](https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions)
2. Click "Edge Functions" in settings
3. Look for "Secrets" or "Environment Variables" section
4. Verify these secrets exist and have correct values:

```
FRONTEND_URL = https://app.bliztic.com
GOOGLE_CLIENT_ID = 522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = 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
```

**If FRONTEND_URL shows a hashed/encrypted value:**
- Click "Edit" on that secret
- Replace with plain text: `https://app.bliztic.com`
- Save

**After updating secrets:**
- Look for a "Redeploy all functions" or "Redeploy" button
- Click it to ensure functions pick up new secrets
- This may take 1-2 minutes

---

### Action 3: Test the OAuth Flow

**Testing Steps:**

1. **Open Browser Dev Tools:**
   - Press F12
   - Go to "Console" tab
   - Keep it open during testing

2. **Navigate to Dashboard:**
   - Go to: https://app.bliztic.com/dashboard
   - Sign in if not already signed in

3. **Initiate Gmail Connection:**
   - Click "Connect Gmail" button
   - Check console for debug logs (your code has extensive logging)
   - Note the exact redirect URI being used

4. **Google OAuth Screen:**
   - You should see Google's consent screen
   - It will ask for permission to access Gmail
   - Click "Allow"

5. **Expected Success Flow:**
   ```
   Google redirects to:
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback?code=XXX&state=USER_ID

   ↓

   Edge function processes the code

   ↓

   You're redirected to:
   https://app.bliztic.com/dashboard?gmail_connected=true

   ↓

   Dashboard shows:
   "Gmail connected successfully! Syncing emails..."

   ↓

   Gmail connection card turns green:
   "Gmail Connected ✓"
   "your-email@gmail.com is being monitored and protected"
   ```

6. **If It Fails:**
   - Note the exact error message
   - Check browser console for errors
   - Check Supabase Edge Function logs (see below)

---

### Action 4: Check Edge Function Logs (If Errors Occur)

**How to View Logs:**
1. Go to: [Supabase Edge Functions](https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions)
2. Click on `gmail-oauth-callback` function
3. Look for "Logs" or "Invocations" tab
4. Find the most recent invocation (should be timestamped when you clicked "Connect Gmail")
5. Read the logs to see what failed

**Common Errors and Solutions:**

**Error: `redirect_uri_mismatch`**
- Solution: Wait longer (up to 30 minutes) for Google changes to propagate
- Or: Double-check the URI is EXACTLY correct (no trailing slash, exact spelling)

**Error: `Missing required parameters`**
- Solution: Check that `state` parameter is being passed (it should be the user ID)
- Verify user is authenticated before clicking "Connect Gmail"

**Error: `Failed to exchange authorization code`**
- Solution: Check `GOOGLE_CLIENT_SECRET` is correct in Supabase secrets
- Verify the secret hasn't expired or been regenerated

**Error: `Database error` or `Insert failed`**
- Solution: Check Supabase logs for specific database error
- Verify RLS policies allow authenticated users to insert

---

## After Successful Connection

Once Gmail connection works, you should see:

1. **In Dashboard UI:**
   - Green card showing "Gmail Connected ✓"
   - Your email address displayed
   - "Last sync" timestamp
   - "Sync Now" button active

2. **In Database (Table Editor):**
   - Check `mailboxes` table:
     - Should have 1 row with your email address
     - `user_id` matches your auth user ID
     - `gmail_user_id` populated

   - Check `gmail_connections` table:
     - Should have 1 row
     - `is_active = true`
     - `access_token` present (encrypted text)
     - `refresh_token` present
     - `token_expires_at` is in the future

   - Check `user_settings` table:
     - Should have 1 row with your user ID
     - Default settings applied

3. **Edge Function Logs:**
   - Should show "OAuth Callback Completed Successfully"
   - Initial sync triggered
   - No error messages

---

## Next Steps After Connection Works

Once Gmail connection is successful:

1. **Configure Make.com Webhook:**
   - In dashboard, find "Make.com Webhook Configuration" section
   - Paste your Make.com webhook URL
   - Click "Save"

2. **Test Email Sync:**
   - Click "Sync Now" button
   - Should see "Successfully synced X emails"
   - Check "All Emails" table for real emails

3. **Test AI Classification:**
   - Send yourself a test email
   - Wait for sync (or click "Sync Now")
   - Verify email appears in dashboard
   - Make.com should classify it
   - Check if classification shows correctly

4. **Test Auto-Reply (for blocked emails):**
   - Have someone send you a cold outreach email
   - Or send one from another account
   - Should be classified as "blocked"
   - Auto-reply should be sent
   - Email should be labeled/archived

---

## Troubleshooting Commands

**Check if tables exist:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Check Gmail connections:**
```sql
SELECT
  id,
  user_id,
  is_active,
  token_expires_at,
  last_sync_at,
  created_at
FROM gmail_connections
ORDER BY created_at DESC;
```

**Check mailboxes:**
```sql
SELECT
  id,
  email_address,
  gmail_user_id,
  created_at
FROM mailboxes
ORDER BY created_at DESC;
```

**Check recent emails:**
```sql
SELECT
  id,
  sender_email,
  subject,
  classification,
  ai_confidence_score,
  received_at
FROM emails
ORDER BY received_at DESC
LIMIT 10;
```

---

## Emergency Contacts / Resources

**Supabase Project:**
- URL: https://bazeyxgsgodhnwckttxi.supabase.co
- Dashboard: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi

**Google OAuth:**
- Console: https://console.cloud.google.com/apis/credentials
- Client ID: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com`

**Production Site:**
- URL: https://app.bliztic.com

---

## Summary Checklist

Before testing, ensure:
- [ ] Google Cloud Console redirect URI updated to include `-callback`
- [ ] Waited 5-10 minutes after updating Google OAuth settings
- [ ] Verified Supabase secrets are correct (especially FRONTEND_URL)
- [ ] Redeployed edge functions if secrets were changed
- [ ] Browser console is open and ready to show logs
- [ ] You're signed in to the dashboard

During testing:
- [ ] Clicked "Connect Gmail" button
- [ ] Saw Google OAuth consent screen
- [ ] Granted permissions
- [ ] Got redirected back to dashboard
- [ ] Saw success message
- [ ] Gmail connection card shows green/connected state

If successful:
- [ ] Database shows new records in mailboxes and gmail_connections
- [ ] "Sync Now" button works
- [ ] Emails appear in dashboard
- [ ] Ready to configure Make.com webhook

---

## The Bottom Line

**The #1 issue preventing Gmail connection is likely the redirect URI mismatch.**

Fix that first. Everything else is already in place and working.

Once you update the Google Cloud Console redirect URI to add `-callback`, wait 10 minutes, then try connecting Gmail again. It should work.
