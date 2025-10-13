# Gmail OAuth Architecture

## Current Flow (What Should Happen)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Gmail OAuth Flow                             │
└─────────────────────────────────────────────────────────────────────┘

1. User clicks "Connect Gmail" button
   │
   ├─> Frontend builds OAuth URL with:
   │   - client_id: Your Google Client ID
   │   - redirect_uri: http://localhost:5173/auth/gmail/callback
   │   - scope: gmail.modify + userinfo.email
   │   - state: userId (from Supabase auth)
   │
   v

2. Redirect to Google OAuth consent screen
   │
   ├─> User sees: "bolt.host wants to access your Gmail"
   │
   └─> User clicks "Allow"
       │
       v

3. Google redirects back to your app
   │
   └─> URL: /auth/gmail/callback?code=XXX&state=userId
       │
       v

4. GmailCallback component handles the callback
   │
   ├─> Extracts: code, state (userId), redirectUri
   │
   └─> Makes POST request to Supabase Edge Function:
       │
       │   URL: https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
       │   Headers: Authorization: Bearer <SUPABASE_ANON_KEY>
       │   Body: { code, userId, redirectUri }
       │
       v

5. Edge Function processes the request
   │
   ├─> Exchange code for tokens with Google:
   │   POST https://oauth2.googleapis.com/token
   │   - Returns: access_token, refresh_token, expires_in
   │
   ├─> Get user info from Google:
   │   GET https://www.googleapis.com/oauth2/v2/userinfo
   │   - Returns: email, id (googleUserId)
   │
   ├─> Save to database:
   │   │
   │   ├─> INSERT/UPDATE mailboxes table:
   │   │   - user_id, email_address, gmail_user_id
   │   │
   │   ├─> UPSERT gmail_connections table:
   │   │   - user_id, mailbox_id, access_token, refresh_token
   │   │   - token_expires_at, is_active: true
   │   │
   │   └─> UPSERT user_settings table:
   │       - user_id, strictness_level, digest_frequency
   │
   └─> Return success: { success: true, message: "Gmail connected successfully" }
       │
       v

6. Frontend receives success response
   │
   └─> Navigate to /dashboard
       │
       └─> GmailConnect component checks connection:
           │
           └─> Shows "Gmail Connected" ✅

```

## What's Broken Right Now

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Current Broken Flow                               │
└─────────────────────────────────────────────────────────────────────┘

Steps 1-3: ✅ Working fine
  │
  v

Step 4: ❌ FAILS HERE
  │
  └─> POST request to edge function
      │
      └─> Returns: 404 Not Found
          │
          └─> Error: "Failed to fetch"
              │
              v

          Shows: "Connection Failed" screen
```

## Why It's Failing

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Root Cause                                      │
└─────────────────────────────────────────────────────────────────────┘

1. Edge function NOT deployed to Supabase
   └─> URL returns 404
       └─> Frontend cannot reach the function
           └─> Connection fails

2. Database tables DON'T exist
   └─> Even if function was deployed, it would fail
       └─> Cannot save connection data
           └─> Would show database error

3. Secrets NOT configured
   └─> Function cannot exchange OAuth code
       └─> Google API would reject the request
           └─> Would show OAuth error
```

## The Fix

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Fix Implementation                               │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Create Database Tables
  │
  ├─> Run SQL migration
  └─> Creates: mailboxes, gmail_connections, emails, user_settings, etc.
      └─> Status: ✅ SQL file ready

Step 2: Deploy Edge Function
  │
  ├─> Create function in Supabase dashboard
  └─> Deploy gmail-oauth-callback code
      └─> Status: ⏳ YOU NEED TO DO THIS

Step 3: Configure Secrets
  │
  ├─> Add GOOGLE_CLIENT_ID
  ├─> Add GOOGLE_CLIENT_SECRET
  └─> Redeploy function
      └─> Status: ⏳ YOU NEED TO DO THIS

Result: OAuth flow works end-to-end ✅
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Database Tables                                 │
└─────────────────────────────────────────────────────────────────────┘

mailboxes
  ├─ id (uuid, PK)
  ├─ user_id → auth.users
  ├─ email_address (unique)
  ├─ gmail_user_id
  └─ timestamps

gmail_connections
  ├─ id (uuid, PK)
  ├─ user_id → auth.users
  ├─ mailbox_id → mailboxes
  ├─ access_token (encrypted)
  ├─ refresh_token (encrypted)
  ├─ token_expires_at
  ├─ is_active (boolean)
  └─ make_webhook_url (optional)

emails
  ├─ id (uuid, PK)
  ├─ user_id → auth.users
  ├─ mailbox_id → mailboxes
  ├─ gmail_message_id
  ├─ sender_email
  ├─ subject
  ├─ classification (blocked/safe/pending)
  ├─ ai_confidence_score
  └─ timestamps

user_settings
  ├─ id (uuid, PK)
  ├─ user_id → auth.users (unique)
  ├─ strictness_level
  ├─ digest_frequency
  └─ auto_reply_enabled

allowlist
  ├─ id (uuid, PK)
  ├─ user_id → auth.users
  ├─ email_address / domain
  └─ created_at

blocked_senders
  ├─ id (uuid, PK)
  ├─ user_id → auth.users
  ├─ email_address / domain
  ├─ block_count
  └─ last_blocked_at
```

## Security (Row Level Security)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RLS Policies                                     │
└─────────────────────────────────────────────────────────────────────┘

All tables have RLS enabled with policies:

SELECT: Users can view own data
  └─> WHERE auth.uid() = user_id

INSERT: Users can insert own data
  └─> WITH CHECK auth.uid() = user_id

UPDATE: Users can update own data
  └─> USING auth.uid() = user_id
  └─> WITH CHECK auth.uid() = user_id

DELETE: Users can delete own data
  └─> WHERE auth.uid() = user_id

This ensures:
  ✅ Users can only access their own data
  ✅ No cross-user data leaks
  ✅ Proper multi-tenant security
```

## What Happens After Fix

```
┌─────────────────────────────────────────────────────────────────────┐
│                After Successful Connection                           │
└─────────────────────────────────────────────────────────────────────┘

1. Gmail connection saved in database
   └─> gmail_connections.is_active = true

2. Dashboard shows "Gmail Connected" ✅

3. Ready for next steps:
   │
   ├─> Deploy gmail-sync-cron function
   │   └─> Periodically fetch new emails
   │
   ├─> Set up Make.com webhook
   │   └─> AI classification of emails
   │
   └─> Configure auto-reply settings
       └─> Send responses to cold emails
```

## Environment Variables

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Configuration                                     │
└─────────────────────────────────────────────────────────────────────┘

Frontend (.env):
  ├─ VITE_SUPABASE_URL
  ├─ VITE_SUPABASE_ANON_KEY
  └─ VITE_GOOGLE_CLIENT_ID

Edge Function Secrets:
  ├─ SUPABASE_URL (auto-provided)
  ├─ SUPABASE_SERVICE_ROLE_KEY (auto-provided)
  ├─ GOOGLE_CLIENT_ID (YOU ADD)
  └─ GOOGLE_CLIENT_SECRET (YOU ADD)

Google Cloud Console:
  ├─ OAuth Client ID
  ├─ OAuth Client Secret
  └─ Authorized Redirect URIs:
      ├─ http://localhost:5173/auth/gmail/callback
      └─ https://bolt.host/auth/gmail/callback
```

## Testing Checklist

```
✅ Database tables exist
✅ Edge function deployed
✅ Edge function returns non-404 status
✅ Secrets configured
✅ Function redeployed after secrets
✅ Google redirect URIs match exactly
✅ Browser console shows detailed logs
✅ Can click "Connect Gmail"
✅ Google consent screen appears
✅ After "Allow", no error screen
✅ Dashboard shows "Gmail Connected"
✅ Database has records in tables
```
