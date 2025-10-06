# Complete Gmail Integration Setup Guide

This guide will help you set up the Gmail integration for Inbox Defender from scratch.

## Prerequisites

- A Supabase project (already configured in `.env`)
- A Google Cloud Platform account
- Your app deployed and accessible via URL

## Part 1: Database Setup

### 1.1 Create Database Tables

The database schema needs to be created. Run the SQL migration located at:
`supabase/migrations/create_core_schema.sql`

**Option A: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/sql
2. Open the SQL Editor
3. Copy the entire contents of the migration file
4. Run the SQL

**Option B: Via Supabase CLI** (if you have it installed locally)
```bash
supabase db push
```

This creates the following tables:
- `mailboxes` - Gmail accounts
- `gmail_connections` - OAuth tokens and connection status
- `emails` - Tracked emails with AI classification
- `user_settings` - User preferences
- `allowlist` - Emails/domains to never block

## Part 2: Google OAuth Setup

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "Inbox Defender"

### 2.2 Enable Gmail API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**

### 2.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in the required fields:
   - App name: `Inbox Defender`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. **Scopes**: Add these scopes:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Click **Save and Continue**
7. **Test users**: Add your email for testing
8. Click **Save and Continue**

### 2.4 Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Name it "Inbox Defender Web Client"
5. Add **Authorized redirect URIs**:
   - For production: `https://your-domain.com/auth/gmail/callback`
   - For local dev: `http://localhost:5173/auth/gmail/callback`
6. Click **Create**
7. **IMPORTANT**: Copy the **Client ID** and **Client Secret**

### 2.5 Update Environment Variables

1. Open `.env` in your project
2. Replace `your-google-client-id-here.apps.googleusercontent.com` with your actual Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
   ```

## Part 3: Supabase Edge Function Setup

### 3.1 Deploy gmail-oauth-callback Function

The edge function handles the OAuth callback and token exchange.

**Deploy the function:**

1. The function code is at: `supabase/functions/gmail-oauth-callback/index.ts`
2. You need to deploy this to Supabase

**Option A: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/functions
2. Click **Deploy a new function**
3. Name: `gmail-oauth-callback`
4. Copy the entire contents of `supabase/functions/gmail-oauth-callback/index.ts`
5. Paste into the function editor
6. Click **Deploy function**

**Option B: Via Supabase CLI** (if installed locally)
```bash
supabase functions deploy gmail-oauth-callback
```

### 3.2 Configure Function Secrets

The edge function needs Google OAuth credentials as secrets:

1. Go to https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/settings/functions
2. Add these secrets:
   - **Name**: `GOOGLE_CLIENT_ID`
     **Value**: Your Google Client ID

   - **Name**: `GOOGLE_CLIENT_SECRET`
     **Value**: Your Google Client Secret (from step 2.4)

## Part 4: Supabase Authentication Setup

### 4.1 Enable Google OAuth in Supabase

1. Go to https://supabase.com/dashboard/project/0ec90b57d6e95fcbda19832f/auth/providers
2. Find **Google** in the providers list
3. Toggle **Enable Sign in with Google** to ON
4. Enter your Google Client ID
5. Enter your Google Client Secret
6. Add your site URL: `https://your-domain.com` (or `http://localhost:5173` for dev)
7. Click **Save**

## Part 5: Testing

### 5.1 Test Authentication Flow

1. Run your app: `npm run dev`
2. Go to http://localhost:5173
3. Click "Sign in with Google"
4. Complete the Google OAuth flow
5. You should be redirected to `/dashboard`

### 5.2 Test Gmail Connection

1. Once signed in and on the dashboard
2. Click "Connect Gmail"
3. You'll be redirected to Google for authorization
4. Grant the required permissions
5. You should see "Gmail Connected" status on the dashboard

### 5.3 Verify Database

Check that the following records were created:
- A row in `mailboxes` with your Gmail address
- A row in `gmail_connections` with `is_active = true`
- A row in `user_settings` with your user_id

## Part 6: Optional - Deploy Additional Edge Functions

### 6.1 Gmail Sync Cron Function

For automatic email syncing, deploy the cron function:

1. Code at: `edge-function-gmail-sync-cron.ts`
2. Deploy as edge function named `gmail-sync-cron`
3. Set up a cron job in Supabase to call it every 10 minutes

### 6.2 Make.com Webhook Handler

If using Make.com for AI classification:

1. Code at: `edge-function-webhook-from-make.ts`
2. Deploy as edge function named `webhook-from-make`
3. Configure the webhook URL in Make.com

## Troubleshooting

### "400 Error" from Google OAuth

- Verify your redirect URI exactly matches what's in Google Cloud Console
- Check that both Client ID and Client Secret are correct
- Make sure Gmail API is enabled in your Google Cloud project

### "Failed to connect Gmail" Error

- Check Supabase Function Logs for detailed error messages
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets are set
- Ensure the gmail-oauth-callback function is deployed

### Database Errors

- Verify all tables are created (check Supabase Table Editor)
- Check that RLS policies are enabled
- Verify user is authenticated (check Supabase Auth Users)

### Token Expiration

- OAuth tokens expire after 1 hour
- The refresh_token is used to get new access tokens
- This is handled automatically by the edge functions

## Next Steps

Once Gmail is connected:

1. Configure strictness level in dashboard settings
2. Set up Make.com webhook for AI classification (optional)
3. Monitor blocked emails in the dashboard
4. Adjust allowlist as needed

## Support

For issues or questions:
- Check Supabase Function Logs
- Review browser console for errors
- Verify all setup steps were completed

---

**Security Notes:**
- Never commit your Client Secret to git
- Keep your Supabase Service Role Key secure
- OAuth tokens are encrypted in the database
- All database access is protected by Row Level Security (RLS)
