# 🚀 START HERE: Fix Gmail Connection

## The Problem

Your Gmail OAuth connection isn't working because of a **redirect URI mismatch** between your code and Google Cloud Console.

## The Solution (2 Minutes)

### Step 1: Update Google Cloud Console ⚡ **DO THIS FIRST**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Find "Authorized redirect URIs"
4. Update the third URI from:
   ```
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth
   ```
   To:
   ```
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
   ```
   *(Just add `-callback` at the end)*

5. Click **Save**
6. **Wait 10 minutes** for changes to propagate

### Step 2: Verify Supabase Secrets

1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions
2. Find "Edge Functions" → "Secrets" section
3. Check these secrets exist:
   - `FRONTEND_URL` = `https://app.bliztic.com`
   - `GOOGLE_CLIENT_ID` = `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET` = `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`

4. If `FRONTEND_URL` shows a hashed value, edit it and paste: `https://app.bliztic.com`
5. If you made changes, click "Redeploy all functions"

### Step 3: Test It Works

1. Open: https://app.bliztic.com/dashboard
2. Open browser console (F12)
3. Click "Connect Gmail"
4. Grant permissions on Google's page
5. You should be redirected back with success message
6. Gmail connection card should turn green ✅

---

## What Happens Next?

After Gmail connects successfully:

1. ✅ **Green card appears** showing "Gmail Connected"
2. ✅ **Your email address** is displayed
3. ✅ **"Sync Now" button** becomes active
4. ✅ **Automatic sync** starts running every 15 minutes
5. ✅ **Emails appear** in your dashboard tables
6. ✅ **Make.com integration** processes emails for AI classification

---

## Quick Status Check

**Already Done ✅:**
- All edge functions deployed (11 total)
- Database tables created with RLS
- Frontend code working
- Production site deployed

**Needs Fixing ⚠️:**
- Google redirect URI (add `-callback`)
- Supabase FRONTEND_URL secret (verify it's not hashed)

---

## Detailed Documentation

Once you've completed Steps 1-3 above, refer to these guides:

- **`GMAIL_CONNECTION_ACTION_PLAN.md`** - Complete troubleshooting guide
- **`TESTING_CHECKLIST.md`** - Step-by-step testing procedures
- **`SETUP_GUIDE.md`** - Full system setup documentation

---

## Expected Timeline

- **0 min:** Update Google Cloud Console redirect URI
- **0 min:** Verify Supabase secrets
- **10 min:** Wait for Google propagation
- **1 min:** Test OAuth flow
- **SUCCESS!** 🎉

Total time: ~11 minutes

---

## If It Doesn't Work

1. **Check the exact error message** in browser console
2. **View edge function logs** at: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
3. **Wait longer** - Google can take up to 30 minutes to propagate changes
4. **Try incognito mode** to rule out browser cache issues
5. **Read `GMAIL_CONNECTION_ACTION_PLAN.md`** for detailed troubleshooting

---

## Why This Fixes It

Your code creates this OAuth redirect URL:
```javascript
const redirectUri = `${supabaseUrl}/functions/v1/gmail-oauth-callback`;
```

This results in: `https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback`

But your Google Cloud Console currently has:
`https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth`

The `-callback` suffix is missing, causing Google to reject the redirect with `redirect_uri_mismatch` error.

Once you add `-callback` to the Google Console URI, it will match your code exactly, and OAuth will work.

---

## Architecture Overview

```
User clicks "Connect Gmail"
    ↓
Redirects to Google OAuth
    ↓
User grants permissions
    ↓
Google redirects to: gmail-oauth-callback edge function
    ↓
Edge function exchanges code for tokens
    ↓
Saves to database: mailboxes + gmail_connections tables
    ↓
Redirects to: /dashboard?gmail_connected=true
    ↓
Dashboard shows success + starts syncing emails
```

---

## What's Already Working

Your infrastructure is solid:

✅ **Supabase Setup:**
- 11 edge functions deployed and active
- All database tables exist
- RLS policies configured
- Secrets (mostly) configured

✅ **Frontend:**
- React app deployed to production
- Gmail connection UI implemented
- Dashboard showing KPIs and email tables
- Real-time updates working

✅ **Backend:**
- OAuth callback handler ready
- Email sync cron job ready
- Make.com webhook receiver ready
- Gmail API integration ready

**You're 99% there. Just need to fix that one redirect URI!**

---

## Next Steps After Connection Works

1. **Add Make.com webhook URL** in dashboard settings
2. **Test email sync** with "Sync Now" button
3. **Verify AI classification** processes correctly
4. **Test auto-reply** on blocked emails
5. **Monitor performance** via dashboard KPIs

---

## TL;DR

1. Add `-callback` to Google redirect URI
2. Wait 10 minutes
3. Test OAuth flow
4. Done! ✅

Everything else is already set up and working. This is just a simple URI mismatch.
