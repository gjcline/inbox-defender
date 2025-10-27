# OAuth Callback Fix - Single Source of Truth for Redirect URI

## Problem
The OAuth callback was deriving the `redirect_uri` from `requestUrl.origin`, which could cause mismatches with the redirect URI used when initiating the OAuth flow. This caused "redirect_uri_mismatch" errors and made debugging difficult.

## Solution
Implemented a single source of truth for the redirect URI across all OAuth flows.

## Changes Made

### 1. Edge Function: `supabase/functions/gmail-oauth-callback/index.ts`

**Before:**
```typescript
if (req.method === "GET") {
  redirectUri = `${requestUrl.origin}/functions/v1/gmail-oauth-callback`;
}
```

**After:**
```typescript
// Single source of truth
const REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI") ?? "https://app.bliztic.com/api/auth/google/callback";

// Use REDIRECT_URI for token exchange
body: new URLSearchParams({
  code,
  client_id: googleClientId,
  client_secret: googleClientSecret,
  redirect_uri: REDIRECT_URI,  // <-- Single source
  grant_type: "authorization_code",
})
```

**Enhanced Error Handling:**
```typescript
if (!tokenResponse.ok) {
  const errTxt = await tokenResponse.text();
  console.error("token_exchange_failed", {
    status: tokenResponse.status,
    body: errTxt,
    redirect_uri: REDIRECT_URI,
  });

  // Return structured error for frontend
  return new Response(
    JSON.stringify({
      ok: false,
      reason: "token_exchange_failed",
      detail: errTxt.slice(0, 500),
    }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
```

### 2. Frontend: `src/pages/GoogleCallback.tsx`

**Enhanced Error Handling:**
```typescript
if (!tokenResponse.ok) {
  const errorData = await tokenResponse.json().catch(() => ({ reason: 'unknown' }));
  console.error('Token exchange failed:', errorData);

  // Handle token_exchange_failed from edge function
  if (errorData.reason === 'token_exchange_failed') {
    const firstLine = errorData.detail?.split('\n')[0] || 'Token exchange failed';
    throw new Error(`OAuth Error: ${firstLine}`);
  }

  throw new Error('Failed to exchange authorization code');
}
```

### 3. Configuration

**Environment Variables:**

**Edge Function** (Set in Supabase Dashboard → Edge Functions → gmail-oauth-callback → Settings):
```
GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback
```

**Frontend** (`.env`):
```
VITE_GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback
```

**Both must match exactly!**

## Benefits

### 1. Single Source of Truth
- No more deriving redirect URI from request origin
- Same URI used in:
  - OAuth flow initiation (`src/lib/oauthConfig.ts`)
  - Token exchange (`supabase/functions/gmail-oauth-callback/index.ts`)
  - Google Cloud Console configuration

### 2. High-Signal Error Logging
- Edge function logs show exact error from Google
- Logs include:
  - HTTP status code
  - Error message body
  - Redirect URI that was used
- Easy to diagnose redirect_uri_mismatch errors

### 3. Frontend Error Display
- Token exchange errors surfaced to user via toast
- First line of error detail shown
- User sees meaningful error instead of generic message

### 4. Easy Debugging
- Check Supabase Logs → Edge Functions → gmail-oauth-callback
- Look for: `token_exchange_failed`
- See exact Google error response
- Verify redirect_uri matches Google Cloud Console

## Verification

### 1. Check Configuration

**Edge Function:**
```bash
# In Supabase Dashboard → Edge Functions → gmail-oauth-callback → Settings
GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback
```

**Frontend:**
```bash
# In .env file
VITE_GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback
```

**Google Cloud Console:**
```
https://console.cloud.google.com/apis/credentials
→ OAuth 2.0 Client IDs
→ Authorized redirect URIs:
   https://app.bliztic.com/api/auth/google/callback
```

### 2. Test OAuth Flow

1. Click "Connect Gmail" in app
2. Complete Google OAuth consent
3. Check redirect behavior:
   - Should redirect to dashboard
   - Toast should show "Gmail connected successfully!"
   - No error messages

### 3. Check Logs on Error

If OAuth fails:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → gmail-oauth-callback → Logs
3. Look for: `token_exchange_failed`
4. Check the logged data:
   ```json
   {
     "status": 400,
     "body": "Error 400: redirect_uri_mismatch...",
     "redirect_uri": "https://app.bliztic.com/api/auth/google/callback"
   }
   ```

## Common Issues

### redirect_uri_mismatch

**Error in logs:**
```
Error 400: redirect_uri_mismatch
The redirect URI in the request, https://..., does not match
```

**Solution:**
1. Check all three locations use identical URI
2. Ensure no trailing slashes
3. Verify protocol (https vs http)
4. Update Google Cloud Console if needed
5. Redeploy edge function after env var change

### invalid_grant

**Error in logs:**
```
Error 400: invalid_grant
Code was already used or invalid
```

**Solution:**
- Authorization codes can only be used once
- User needs to restart OAuth flow
- This is normal if user refreshes callback page

### Missing Environment Variable

**Error:**
```
REDIRECT_URI is undefined
```

**Solution:**
```bash
# Set in Supabase Dashboard
GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback

# Set in .env
VITE_GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback

# Rebuild and redeploy
npm run build
```

## Testing Checklist

- [ ] Environment variables set in edge function
- [ ] Environment variables set in frontend .env
- [ ] Google Cloud Console has matching redirect URI
- [ ] Edge function deployed with new code
- [ ] Frontend built and deployed
- [ ] Test OAuth flow end-to-end
- [ ] Verify toast shows success message
- [ ] Check edge function logs show no errors
- [ ] Test error case (remove redirect URI from Google Console)
- [ ] Verify error message appears in frontend toast
- [ ] Verify error logged correctly in Supabase Logs

## Files Modified

1. `supabase/functions/gmail-oauth-callback/index.ts`
   - Added REDIRECT_URI constant from env var
   - Removed dynamic redirect URI derivation
   - Enhanced error logging with structured data
   - Return JSON error response for frontend

2. `src/pages/GoogleCallback.tsx`
   - Parse token_exchange_failed error from edge function
   - Extract first line of error detail
   - Display in user-friendly error message

3. Interface update:
   - Removed `redirectUri` from `OAuthCallbackRequest` interface (no longer needed in POST body)

## Rollback Plan

If issues occur, revert these commits and:

1. Restore old redirect URI derivation:
   ```typescript
   redirectUri = `${requestUrl.origin}/functions/v1/gmail-oauth-callback`;
   ```

2. Restore old error handling:
   ```typescript
   throw new Error("Failed to exchange authorization code");
   ```

3. Redeploy edge function

## Documentation References

- Google OAuth 2.0 docs: https://developers.google.com/identity/protocols/oauth2
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- OAuth redirect_uri parameter: https://www.oauth.com/oauth2-servers/redirect-uris/
