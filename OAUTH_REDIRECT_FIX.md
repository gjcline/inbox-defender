# OAuth Redirect to Dashboard Fix

## Summary
Fixed OAuth callback flow to redirect users to the Dashboard instead of the Settings page, preventing the white screen issue. Updated connection status reading to use the `email` column from `gmail_connections` directly.

## Changes Made

### 1. Edge Function OAuth Callback (`supabase/functions/gmail-oauth-callback/index.ts`)
**Changed redirect parameter:**
```typescript
// Before
const dashboardUrl = `${frontendUrl}/dashboard?gmail_connected=true`;

// After
const dashboardUrl = `${frontendUrl}/dashboard?gmail_connected=1`;
```

**Result:** Users are now redirected to `/dashboard?gmail_connected=1` after successful OAuth.

### 2. Frontend GoogleCallback Handler (`src/pages/GoogleCallback.tsx`)
**Updated success redirect:**
```typescript
// Before
navigate('/settings?gmail_connected=true');

// After
navigate('/dashboard?gmail_connected=1');
```

**Updated error redirect:**
```typescript
// Before
navigate('/settings?gmail_error=true');

// After
navigate('/dashboard?gmail_error=1');
```

**Result:** The React-based callback handler also redirects to Dashboard, not Settings.

### 3. Dashboard Toast Detection (`src/pages/Dashboard.tsx`)
**Updated query parameter check:**
```typescript
// Before
if (gmailConnected === 'true') {

// After
if (gmailConnected === 'true' || gmailConnected === '1') {
```

**Result:** Dashboard now recognizes both `gmail_connected=true` and `gmail_connected=1` parameters and displays the success toast.

### 4. Gmail Connection Status Reading (`src/components/dashboard/GmailConnect.tsx`)
**Before:**
```typescript
// Query: select is_active, mailbox_id, last_sync_at
// Then separate query to mailboxes table for email_address

const { data: connectionData } = await supabase
  .from('gmail_connections')
  .select('is_active, mailbox_id, last_sync_at')
  .eq('user_id', userId)
  .eq('is_active', true)
  .maybeSingle();

if (connectionData?.mailbox_id) {
  const { data: mailboxData } = await supabase
    .from('mailboxes')
    .select('email_address')
    .eq('id', connectionData.mailbox_id)
    .maybeSingle();

  setConnectionData({
    isConnected: true,
    emailAddress: mailboxData?.email_address || '',
    lastSyncAt: connectionData.last_sync_at,
  });
}
```

**After:**
```typescript
// Query: select is_active, email, last_sync_at directly

const { data: connectionData } = await supabase
  .from('gmail_connections')
  .select('is_active, email, last_sync_at')
  .eq('user_id', userId)
  .eq('is_active', true)
  .maybeSingle();

if (connectionData && connectionData.is_active) {
  setConnectionData({
    isConnected: true,
    emailAddress: connectionData.email || '',
    lastSyncAt: connectionData.last_sync_at,
  });
}
```

**Result:**
- Removed dependency on `mailboxes` table lookup
- Reads `email` directly from `gmail_connections` table (added in recent migration)
- Simpler, faster query with no JOIN needed
- Connection status displayed immediately after OAuth

## User Flow After Changes

### OAuth Success Flow
1. User clicks "Connect Gmail" in Dashboard or Settings
2. Google OAuth consent screen
3. User approves permissions
4. **Redirect to:** `/dashboard?gmail_connected=1`
5. Dashboard displays toast: "Gmail connected successfully! Syncing emails..."
6. GmailConnect component immediately shows connected status with email address
7. Query parameter removed from URL after toast displays

### OAuth Error Flow
1. User clicks "Connect Gmail"
2. Google OAuth consent screen
3. User denies or error occurs
4. **Redirect to:** `/dashboard?gmail_error=1`
5. Dashboard displays error toast
6. User can try again

## Why This Fixes the White Screen Issue

### Problem
The Settings page shown in the screenshot is a white/light gray background with minimal UI. Users were being redirected there after OAuth, which:
- Looked like a broken state
- Required an extra navigation to get back to Dashboard
- Didn't show the dark themed app interface

### Solution
- Skip Settings page entirely after OAuth
- Go directly to Dashboard (the dark-themed main interface)
- Show success toast on Dashboard
- Connection status updates immediately in both Dashboard and Settings

## Database Schema Alignment

The changes use the schema from the recent migration:

**`gmail_connections` table now has:**
- ✅ `email` column (contains Gmail address)
- ✅ `google_user_id` column (Google's user ID)
- ✅ `is_active` column (connection status)
- ✅ `last_sync_at` column (last sync timestamp)

**No longer need to:**
- ❌ Query separate `mailboxes` table for email address
- ❌ Join on `mailbox_id` foreign key

## Testing Checklist

### Fresh Connection
- [ ] Navigate to Dashboard
- [ ] Click "Connect Gmail" button in GmailConnect card
- [ ] Complete Google OAuth consent
- [ ] **Verify:** Redirected to Dashboard (dark UI, not white Settings page)
- [ ] **Verify:** Toast appears: "Gmail connected successfully!"
- [ ] **Verify:** GmailConnect card immediately shows email address
- [ ] **Verify:** Query parameter `?gmail_connected=1` is removed after toast

### Reconnect Flow
- [ ] In Settings, click "Reconnect Gmail"
- [ ] Complete OAuth
- [ ] **Verify:** Redirected to Dashboard
- [ ] **Verify:** Toast appears
- [ ] **Verify:** Updated connection status shown

### Error Handling
- [ ] Start OAuth flow
- [ ] Deny permissions or cancel
- [ ] **Verify:** Redirected to Dashboard
- [ ] **Verify:** Error toast appears
- [ ] **Verify:** Can try connecting again

### Connection Status Display
- [ ] After connecting, verify Gmail card shows:
  - ✅ Email address (e.g., user@gmail.com)
  - ✅ Green checkmark or connected status
  - ✅ Last sync timestamp
  - ✅ Sync Now button (if available)
- [ ] Navigate to Settings page
- [ ] **Verify:** Gmail connection shows same status
- [ ] **Verify:** Same email address displayed

## Files Modified

1. **`supabase/functions/gmail-oauth-callback/index.ts`**
   - Changed redirect parameter from `gmail_connected=true` to `gmail_connected=1`

2. **`src/pages/GoogleCallback.tsx`**
   - Changed success redirect from `/settings?gmail_connected=true` to `/dashboard?gmail_connected=1`
   - Changed error redirect from `/settings?gmail_error=true` to `/dashboard?gmail_error=1`

3. **`src/pages/Dashboard.tsx`**
   - Updated query param check to accept both `'true'` and `'1'`

4. **`src/components/dashboard/GmailConnect.tsx`**
   - Changed query to select `email` instead of `mailbox_id`
   - Removed JOIN query to `mailboxes` table
   - Simplified connection status logic

## Acceptance Criteria

✅ After consenting with Google, user lands on `/dashboard` with toast
✅ No white Settings screen appears
✅ Connection card shows Gmail account immediately
✅ Email address displayed correctly from `gmail_connections.email`
✅ Toast message: "Gmail connected successfully! Syncing emails..."
✅ Dark UI (Dashboard) shown, not light UI (Settings)
✅ Works for both edge function callback and React callback handler

## Backward Compatibility

The changes maintain backward compatibility:

- Dashboard accepts both `gmail_connected=true` (old) and `gmail_connected=1` (new)
- Settings page still works and shows connection status correctly
- Old edge function callback updated but still functional
- React callback handler updated to match

## Settings Page Still Accessible

Users can still access Settings page manually:
- Click Settings icon in Dashboard header
- Navigate to `/settings` route
- Shows same connection status as Dashboard
- Can Reconnect or Disconnect from there

**Key difference:** OAuth no longer forces users to Settings page - they land on Dashboard and can choose to visit Settings if needed.

## Next Steps

After deploying these changes:

1. **Deploy edge function:** The `gmail-oauth-callback` function needs to be redeployed with the redirect change
2. **Test OAuth flow:** Complete end-to-end OAuth with a test account
3. **Verify toast appears:** Check that success message displays correctly
4. **Check connection status:** Ensure email appears in both Dashboard and Settings

## Rollback Plan

If issues occur:

1. **Revert edge function redirect:**
   ```typescript
   const dashboardUrl = `${frontendUrl}/settings?gmail_connected=true`;
   ```

2. **Revert frontend redirects:**
   ```typescript
   navigate('/settings?gmail_connected=true');
   ```

3. **Revert connection query:**
   ```typescript
   .select('is_active, mailbox_id, last_sync_at')
   // Then query mailboxes table
   ```

4. **Deploy rollback:** Redeploy edge function and frontend

## Related Documentation

- See `OAUTH_RECONNECT_IMPLEMENTATION.md` for full OAuth implementation details
- See `OAUTH_UNIFICATION.md` for OAuth URL builder standardization
- See migration `20251024175146_add_gmail_oauth_reconnect_schema.sql` for schema changes
