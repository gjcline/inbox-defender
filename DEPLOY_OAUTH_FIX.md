# Deploy OAuth Redirect Fix

## Quick Deployment Steps

### 1. Deploy Edge Function
The `gmail-oauth-callback` edge function needs to be redeployed with the redirect change.

```bash
# This change redirects users to /dashboard?gmail_connected=1 instead of /settings
```

**Note:** The edge function deployment is handled automatically by the Supabase MCP tool or Supabase CLI.

### 2. Deploy Frontend
```bash
npm run build
# Deploy the built files to your hosting platform
```

### 3. Test OAuth Flow
After deployment:

1. Navigate to your app's dashboard
2. Click "Connect Gmail"
3. Complete Google OAuth consent
4. **Expected:** You should land on `/dashboard?gmail_connected=1` with a toast notification
5. **Expected:** The dark Dashboard UI appears (not white Settings page)
6. **Expected:** Gmail connection card shows your email address immediately

## What Changed

### Backend (Edge Function)
- **File:** `supabase/functions/gmail-oauth-callback/index.ts`
- **Change:** Redirect URL parameter changed from `gmail_connected=true` to `gmail_connected=1`
- **Impact:** Users redirected to Dashboard instead of Settings

### Frontend
- **File:** `src/pages/GoogleCallback.tsx`
- **Change:** Navigate to `/dashboard` instead of `/settings`
- **Impact:** React callback handler also redirects to Dashboard

- **File:** `src/pages/Dashboard.tsx`
- **Change:** Accept both `gmail_connected=true` and `gmail_connected=1`
- **Impact:** Backward compatible with old parameter format

- **File:** `src/components/dashboard/GmailConnect.tsx`
- **Change:** Read `email` directly from `gmail_connections` table
- **Impact:** No need for JOIN with `mailboxes` table, faster connection status display

## No Database Changes Required

The recent migration already added the `email` column to `gmail_connections`, so no new migrations are needed.

## Rollback If Needed

If you need to rollback:

1. **Revert edge function redirect:**
   - Change back to: `${frontendUrl}/settings?gmail_connected=true`
   - Redeploy edge function

2. **Revert frontend:**
   - Git revert or manually change redirects back to `/settings`
   - Rebuild and redeploy

3. **Test:** Verify OAuth redirects to Settings page again

## Success Indicators

After deployment, verify:

- ✅ OAuth redirects to Dashboard (dark UI)
- ✅ Toast notification appears: "Gmail connected successfully!"
- ✅ Connection card immediately shows email address
- ✅ No white Settings page appears after OAuth
- ✅ Query parameter `?gmail_connected=1` is removed after toast displays

## Known Issues (None Expected)

This is a low-risk change:
- Only changes redirect destination
- Maintains backward compatibility
- No database schema changes
- No API contract changes
- Simple UI updates

## Timeline

**Estimated deployment time:** 5-10 minutes
- Edge function deployment: 2-3 minutes
- Frontend build and deployment: 3-5 minutes
- DNS/CDN propagation (if applicable): 0-5 minutes

**Estimated testing time:** 5 minutes
- Test OAuth flow once
- Verify toast appears
- Verify connection status displays

**Total time:** ~15 minutes from start to verified deployment
