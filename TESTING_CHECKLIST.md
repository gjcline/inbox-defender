# Gmail Connection Testing Checklist

Use this checklist to systematically test and verify the Gmail OAuth connection.

---

## Pre-Flight Checklist ✈️

Before you start testing, verify these are complete:

- [ ] **Google Cloud Console updated**
  - Redirect URI changed to: `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback`
  - Changes saved
  - **Waited 10+ minutes** for propagation

- [ ] **Supabase Secrets verified**
  - FRONTEND_URL = `https://app.bliztic.com` (plain text, not hashed)
  - GOOGLE_CLIENT_ID matches your Google OAuth client
  - GOOGLE_CLIENT_SECRET matches your Google OAuth client
  - Functions redeployed after secret changes

- [ ] **Browser Setup**
  - Chrome/Firefox/Edge opened
  - Dev Tools open (F12)
  - Console tab visible
  - Network tab ready (optional, but helpful)

---

## Testing Phase 1: OAuth Initiation 🚀

- [ ] Navigate to: https://app.bliztic.com/dashboard
- [ ] Confirm you're signed in (see your email in top-right)
- [ ] Locate "Connect Your Gmail" card (amber/yellow color)
- [ ] **Before clicking**, check console is ready to capture logs
- [ ] Click "Connect Gmail" button

**Expected Console Output:**
```
🔍 Gmail OAuth Debug Info:
Client ID: 522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com
Supabase URL: https://bazeyxgsgodhnwckttxi.supabase.co
Redirect URI: https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
User ID: [your-user-uuid]
```

- [ ] Console shows the above debug info
- [ ] Redirect URI includes `-callback` at the end
- [ ] Browser redirects to Google OAuth page

---

## Testing Phase 2: Google OAuth Consent 🔐

- [ ] Google consent screen loads (accounts.google.com)
- [ ] App name shows: "Inbox Defender" (or your OAuth app name)
- [ ] Permissions requested show:
  - ✅ Read, compose, send, and permanently delete mail from Gmail
  - ✅ See your personal info, including any personal info you've made publicly available

- [ ] Select the Gmail account you want to connect
- [ ] Click "Allow" or "Continue"

**If you see an error here:**
- ❌ "redirect_uri_mismatch" → Wait longer, or check Google Console URI again
- ❌ "access_denied" → You clicked "Cancel", try again
- ❌ "invalid_client" → Check GOOGLE_CLIENT_ID in Supabase secrets

---

## Testing Phase 3: OAuth Callback Processing ⚙️

After clicking "Allow", Google redirects back to your app.

**Expected URL Pattern:**
```
https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback?code=4%2F0AanReRp...&state=YOUR_USER_ID
```

- [ ] URL starts with `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback`
- [ ] URL has `?code=` parameter
- [ ] URL has `&state=` parameter (your user ID)
- [ ] Page shows loading or processing indicator
- [ ] **Wait 5-10 seconds** for edge function to process

**Check Edge Function Logs (if needed):**
1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
2. Click "gmail-oauth-callback"
3. View recent invocations
4. Should see logs like:
   ```
   === Gmail OAuth Callback Started ===
   Step 1: Exchanging authorization code for tokens...
   ✓ Token exchange successful
   Step 2: Fetching Gmail user info...
   ✓ User info fetched
   Step 3: Checking for existing mailbox...
   Step 4: Saving Gmail connection...
   ✓ Gmail connection saved
   Step 5: Triggering initial sync...
   === OAuth Callback Completed Successfully ===
   ```

---

## Testing Phase 4: Redirect to Dashboard ✅

After edge function completes, you're redirected to dashboard.

**Expected URL:**
```
https://app.bliztic.com/dashboard?gmail_connected=true
```

- [ ] URL ends with `?gmail_connected=true`
- [ ] Green toast notification appears: "Gmail connected successfully! Syncing emails..."
- [ ] Gmail connection card changes from amber to **green**
- [ ] Card shows:
  - ✅ "Gmail Connected" heading
  - ✅ Your email address
  - ✅ "is being monitored and protected"
  - ✅ Last sync timestamp (may show "Never" initially)
  - ✅ "Sync Now" button is enabled (not grayed out)
  - ✅ "Disconnect" button visible

- [ ] All of the above are visible and correct

---

## Testing Phase 5: Database Verification 🗄️

Verify data was saved correctly in Supabase.

1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor

2. **Check `mailboxes` table:**
   - [ ] Has 1 new row
   - [ ] `email_address` = your Gmail address
   - [ ] `user_id` = your user UUID
   - [ ] `gmail_user_id` is populated
   - [ ] `created_at` is recent timestamp

3. **Check `gmail_connections` table:**
   - [ ] Has 1 new row
   - [ ] `user_id` = your user UUID
   - [ ] `is_active` = true
   - [ ] `access_token` is present (long encrypted string)
   - [ ] `refresh_token` is present
   - [ ] `token_expires_at` is in the future (~1 hour from now)
   - [ ] `created_at` is recent timestamp

4. **Check `user_settings` table:**
   - [ ] Has 1 row for your user
   - [ ] `user_id` = your user UUID
   - [ ] `strictness_level` = "balanced" (default)
   - [ ] `digest_frequency` = "weekly" (default)

---

## Testing Phase 6: Manual Email Sync 📧

Now test that email syncing works.

1. **From Dashboard:**
   - [ ] Click "Sync Now" button in Gmail connection card
   - [ ] Button shows "Syncing..." with spinning icon
   - [ ] Wait 5-30 seconds (depends on email volume)
   - [ ] Success message appears: "Successfully synced X new emails"
   - [ ] "Last sync" timestamp updates

2. **Check Dashboard Tables:**
   - [ ] Scroll down to "All Emails" table
   - [ ] Should see real emails from your inbox
   - [ ] Each row shows:
     - Sender email address
     - Subject
     - Confidence score (0-100%)
     - Date/time
     - Classification badge (Safe/Blocked/Pending)

3. **Database Check:**
   - [ ] Go to `emails` table in Supabase
   - [ ] Should have multiple rows (one per email)
   - [ ] `user_id` matches yours
   - [ ] `gmail_message_id` populated
   - [ ] `sender_email` populated
   - [ ] `subject` populated
   - [ ] `received_at` has timestamps
   - [ ] `classification` shows "pending" (or "safe"/"blocked" if Make.com processed)

---

## Testing Phase 7: Make.com Integration (Optional) 🤖

If you have Make.com webhook configured:

1. **Configure Webhook URL:**
   - [ ] In dashboard, find "Make.com Webhook Configuration" section
   - [ ] Paste your Make.com webhook URL
   - [ ] Click "Save Webhook URL"
   - [ ] Success message appears

2. **Trigger Sync:**
   - [ ] Click "Sync Now" button again
   - [ ] Wait for sync to complete

3. **Check Make.com:**
   - [ ] Go to Make.com dashboard
   - [ ] Open your scenario
   - [ ] Check execution history
   - [ ] Should see new runs with email data

4. **Check Dashboard:**
   - [ ] Emails should now show classifications:
     - "Blocked" (red badge) for spam/cold outreach
     - "Safe" (green badge) for legitimate emails
   - [ ] Confidence scores updated
   - [ ] "Blocked Only" table should have entries

---

## Success Criteria ✨

Gmail connection is successful if ALL of these are true:

✅ **OAuth Flow:**
- You can click "Connect Gmail" without errors
- Google consent screen appears
- After "Allow", you're redirected back to dashboard
- No error messages appear

✅ **Dashboard Display:**
- Green "Gmail Connected" card visible
- Your email address shown
- "Sync Now" button works
- Emails appear in tables after sync

✅ **Database State:**
- `mailboxes` table has your Gmail account
- `gmail_connections` table shows active connection
- `emails` table populates after sync
- All foreign keys properly linked

✅ **Functionality:**
- Manual sync fetches new emails
- KPI cards show accurate counts
- Weekly chart displays data
- "Restore to Inbox" button works (for blocked emails)

---

## Troubleshooting Quick Reference 🔧

**Problem: redirect_uri_mismatch**
→ Solution: Update Google Cloud Console, wait 10+ minutes

**Problem: 404 after OAuth**
→ Solution: Check edge function is deployed, name is exactly `gmail-oauth-callback`

**Problem: Edge function error**
→ Solution: Check Supabase secrets, verify GOOGLE_CLIENT_SECRET

**Problem: No emails showing**
→ Solution: Click "Sync Now", check Make.com webhook URL

**Problem: Gmail connection card stays amber**
→ Solution: Refresh page, check `gmail_connections.is_active = true` in database

**Problem: Sync button doesn't work**
→ Solution: Check `gmail-sync-cron` edge function is deployed

---

## Post-Testing Actions 📝

Once everything works:

1. **Document Success:**
   - [ ] Take screenshot of green "Gmail Connected" card
   - [ ] Note any issues encountered and how you fixed them
   - [ ] Update team on successful connection

2. **Configure Production:**
   - [ ] Add Make.com webhook URL
   - [ ] Set strictness level preference
   - [ ] Test with real cold emails

3. **Monitor:**
   - [ ] Check Edge Function logs periodically
   - [ ] Verify automatic sync runs every 15 minutes
   - [ ] Monitor email classification accuracy

---

## Need Help? 🆘

If you're stuck at any step:

1. **Check the logs first:**
   - Browser console
   - Supabase Edge Function logs
   - Make.com execution history

2. **Verify configuration:**
   - Google Cloud Console redirect URIs
   - Supabase secrets
   - Environment variables in `.env`

3. **Common fixes:**
   - Wait 10+ minutes after Google changes
   - Clear browser cache
   - Try incognito/private mode
   - Redeploy edge functions

4. **Still stuck?**
   - Check `GMAIL_CONNECTION_ACTION_PLAN.md` for detailed troubleshooting
   - Review edge function logs for specific error messages
   - Verify database RLS policies allow your user to insert
