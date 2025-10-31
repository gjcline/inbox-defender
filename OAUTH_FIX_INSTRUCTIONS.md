# OAuth "invalid_grant" Error - Fix Instructions

## Problem Diagnosis

You're seeing `"callback_error"` with `"invalid_grant"` error when trying to connect Gmail.

### What's Happening

1. ✅ Frontend redirects to Google OAuth correctly
2. ✅ User approves permissions
3. ✅ Google redirects back to: `https://app.bliztic.com/api/auth/google/callback`
4. ✅ React route catches the callback
5. ✅ Frontend POSTs code/state to edge function
6. ❌ Edge function tries to exchange code for tokens → **FAILS with "invalid_grant"**

### Root Cause

The `invalid_grant` error from Google means one of these:

1. **Redirect URI mismatch** - The URI used to GET the code doesn't match the URI used to EXCHANGE it
2. **Authorization code expired** - Codes expire after 10 minutes
3. **Authorization code already used** - Codes can only be used once
4. **Google Cloud Console missing redirect URI** - The URI isn't registered

## Current Configuration

**Frontend (.env)**:
```
VITE_GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback
```

**Edge Function (gmail-oauth-callback)**:
```typescript
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI")
  ?? "https://app.bliztic.com/api/auth/google/callback";
```

**React Route (App.tsx)**:
```typescript
<Route path="/api/auth/google/callback" element={<GoogleCallback />} />
```

✅ All three match! The configuration is correct.

## The Fix

### Option 1: Set Edge Function Environment Variable (RECOMMENDED)

The edge function defaults to `https://app.bliztic.com/api/auth/google/callback` but checks for `GOOGLE_REDIRECT_URI` env var first.

**Go to Supabase Dashboard**:
1. Navigate to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions
2. Find "Edge Functions" → "Environment Variables" section
3. Add variable:
   - **Name**: `GOOGLE_REDIRECT_URI`
   - **Value**: `https://app.bliztic.com/api/auth/google/callback`
4. Click "Save"
5. Click "Redeploy all functions"

### Option 2: Update Google Cloud Console (REQUIRED)

**Go to Google Cloud Console**:
1. Navigate to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav`
3. Click to edit
4. Find "Authorized redirect URIs"
5. **Ensure this EXACT URI is listed**:
   ```
   https://app.bliztic.com/api/auth/google/callback
   ```
6. Click "Save"
7. **Wait 5-10 minutes** for Google to propagate changes

### Option 3: Check for Double OAuth Attempts

If a user clicks "Connect Gmail" multiple times quickly, the same authorization code might be sent to the edge function twice, causing the second attempt to fail with `invalid_grant`.

**Solution**: Clear browser cache and try again with a single click.

## Verification Steps

### 1. Test Edge Function Dry Run
```bash
curl -X POST https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback \
  -H 'Content-Type: application/json' \
  -d '{"dry_run":true}'
```

Expected response:
```json
{
  "ok": true,
  "mode": "dry_run",
  "redirect_uri": "https://app.bliztic.com/api/auth/google/callback"
}
```

✅ This confirms the edge function is using the correct redirect URI.

### 2. Check Frontend OAuth URL

Open browser dev tools (F12), then click "Connect Gmail". Check console for:
```
🔍 Gmail OAuth Debug Info:
Redirect URI: https://app.bliztic.com/api/auth/google/callback
```

The OAuth URL should include:
```
redirect_uri=https%3A%2F%2Fapp.bliztic.com%2Fapi%2Fauth%2Fgoogle%2Fcallback
```

### 3. Test OAuth Flow

1. Go to https://app.bliztic.com/dashboard
2. Open browser console (F12)
3. Click "Connect Gmail" button **ONCE**
4. On Google consent screen, click "Allow"
5. Watch for redirect back to app
6. Check console for any errors

If you see `"invalid_grant"`, add `?debug=1` to the callback URL in your browser:
```
https://app.bliztic.com/api/auth/google/callback?debug=1&code=...&state=...
```

Then click the "🔬 Run Probe" button to see detailed error information.

## Most Likely Issue

Based on the error, the most likely cause is:

**Google Cloud Console doesn't have the redirect URI registered.**

### To Fix:

1. Go to Google Cloud Console credentials page
2. Check ALL three of these URIs are listed:
   ```
   http://localhost:5173/api/auth/google/callback
   https://app.bliztic.com/api/auth/google/callback
   https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
   ```

The first is for local development, second for production frontend, third for direct edge function calls.

3. Save and wait 10 minutes
4. Try OAuth flow again

## Alternative: Use Edge Function Directly

If the frontend-to-edge-function flow continues failing, you can change to use the edge function as the direct callback:

### 1. Update .env
```
VITE_GOOGLE_REDIRECT_URI=https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
```

### 2. Update Google Cloud Console
Add this redirect URI:
```
https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
```

### 3. Edge function will handle redirect
The edge function already has code to redirect back to frontend on success (line 554-562 in gmail-oauth-callback/index.ts).

This approach is simpler and avoids the frontend POST step.

## Debug Information

If the issue persists, collect this information:

1. **Edge function logs**:
   - Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
   - Click "gmail-oauth-callback"
   - Check recent logs for `[reqId] oauth_cb_params` entries

2. **Browser console logs**:
   - Look for `oauth_cb_fetch_response` logs
   - Note the `reason` and `detail` fields

3. **Google Cloud Console**:
   - List all authorized redirect URIs currently configured
   - Confirm the OAuth client ID matches: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav`

## Next Steps After Fix

Once OAuth is working:

1. User will see "Success! Gmail connected successfully!"
2. Redirected to dashboard with green "Gmail Connected" card
3. Emails will sync automatically every 15 minutes
4. Can click "Sync Now" for immediate sync

## Summary

The code is correctly configured. The issue is most likely:

1. **Google Cloud Console missing the redirect URI** ← Most likely
2. Authorization code being reused (click once, wait)
3. Code expiring (complete OAuth flow within 10 minutes)

**Fix**: Add `https://app.bliztic.com/api/auth/google/callback` to Google Cloud Console authorized redirect URIs and wait 10 minutes.
