# Gmail OAuth Fix - Required Action

## Problem
Your Gmail OAuth connection is failing because Google Cloud Console has the wrong redirect URI configured.

## Current Situation
- **What you have configured in Google Cloud Console:**
  - `https://bazeyxgsgodhnwckttxi.supabase.co/auth/v1/callback` (Supabase default)
  - `https://inbox-defender-landi-q5rk.bolt.host/auth/gmail/callback`
  - Other URIs for your app

- **What your app actually uses:**
  - When running on Bolt.host: `https://inbox-defender-landi-q5rk.bolt.host/auth/gmail/callback`
  - This IS already in your Google Cloud Console (URI #2)

## Solution

### Step 1: Verify the Redirect URI
Open your browser console (F12) when you click "Connect Gmail" and look for the debug output:
```
🔍 Gmail OAuth Debug Info:
Client ID: 522566281733-...
Redirect URI: https://inbox-defender-landi-q5rk.bolt.host/auth/gmail/callback
```

### Step 2: Check Google Cloud Console
Go to: https://console.cloud.google.com/apis/credentials

1. Find your OAuth client: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav`
2. Verify the EXACT redirect URI from Step 1 is in the "Authorized redirect URIs" list
3. **Important:** Google takes 5 minutes to a few hours for changes to propagate

### Step 3: Common Issues

**Issue 1: Redirect URI Mismatch**
- Even a single character difference will cause failure
- Check for trailing slashes, http vs https, etc.

**Issue 2: Wrong Client ID/Secret in Supabase**
The secrets in Supabase Edge Functions must match the credentials from the Google Cloud Console OAuth client.

To verify:
1. Go to Google Cloud Console > Credentials
2. Click on your OAuth 2.0 Client ID
3. Compare the Client ID and Client Secret with what's in your `.env` file:
   - `VITE_GOOGLE_CLIENT_ID=522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com`
   - `VITE_GOOGLE_CLIENT_SECRET=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`

**Issue 3: Supabase Edge Function Secrets**
The Edge Function uses these environment variables (auto-configured in Supabase):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

You set these in Supabase Dashboard on October 6, 2025. They should match your local `.env` values.

### Step 4: Debug the Callback
After clicking "Allow" on Google's consent screen, check your browser console for:
```
🔍 Gmail Callback Debug:
Code: Present
State (userId): [your user ID]
📡 Calling Edge Function: https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
Response status: 200 or 400
Response data: {...}
```

If you see:
- `"Failed to exchange authorization code"` → Client ID/Secret mismatch
- `"Missing required parameters"` → OAuth flow didn't complete properly
- Network error → Edge Function not deployed or CORS issue

## Testing
1. Clear your browser cache and cookies for bolt.host
2. Click "Connect Gmail"
3. Check console for debug output
4. Authorize the app on Google
5. Check console on the callback page
6. If it fails, share the console output

## Need Help?
The console debug output will tell us exactly what's failing. Share the console logs and we can fix it!
