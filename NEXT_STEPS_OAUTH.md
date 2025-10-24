# Gmail OAuth - Next Steps for Testing

## Immediate Actions Required (Before Testing)

### 1. Update Google Cloud Console
**Location:** https://console.cloud.google.com

1. Navigate to: **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID: `522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav`
3. Under **Authorized redirect URIs**, add:
   ```
   https://app.bliztic.com/api/auth/google/callback
   ```
4. Click **Save**
5. **IMPORTANT:** Wait 5-10 minutes for changes to propagate

### 2. Test with Two Users
**Test User 1:** Your primary account (already used for testing)
**Test User 2:** Create a new test Google account or use secondary account

## Testing Sequence

### Test 1: Fresh Connection
**Steps:**
1. Sign in to Inbox Defender with Test User 1
2. Navigate to `/settings`
3. Click "Connect Gmail"
4. Complete OAuth consent screen
5. Verify redirect back to Settings
6. Confirm email address displayed
7. Note token expiration time

**Expected Results:**
- ✅ Connected status with green checkmark
- ✅ Email address: [your-email]@gmail.com
- ✅ Last synced: Never (since sync not enabled)
- ✅ Token expires: [timestamp ~1 hour from now]
- ✅ Toast notification: "Gmail connected successfully!"

**Database Check:**
```sql
SELECT
  email,
  google_user_id,
  token_expires_at,
  is_active,
  last_error
FROM gmail_connections
WHERE user_id = '[your-user-id]';
```

### Test 2: Diagnostics Panel
**Steps:**
1. Navigate to `/admin/oauth-diagnostics`
2. Verify configuration display:
   - Client ID shows: `...9kav`
   - Redirect URI shows: `https://app.bliztic.com/api/auth/google/callback`
   - Scopes show: `gmail.modify, openid, email, profile`
3. Check connection status:
   - Status: Connected (green)
   - Email: [your-email]@gmail.com
   - Token expires in: ~60 minutes (blue)
4. Click "Test Profile"
   - Wait for response
   - Verify JSON shows `emailAddress` and `messagesTotal`
5. Click "Test Labels"
   - Wait for response
   - Verify JSON shows array of Gmail labels

**Expected Results:**
- ✅ All configuration values displayed correctly
- ✅ Connection status shows as Connected
- ✅ Both API tests return successful JSON responses
- ✅ Timestamps shown for each test

### Test 3: Reconnect Flow
**Steps:**
1. From Settings page, click "Reconnect Gmail"
2. Confirm the dialog
3. Complete OAuth consent screen again
4. Verify redirect back to Settings
5. Check that new tokens were issued

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ OAuth consent screen shows with `prompt=consent`
- ✅ Redirect back to Settings
- ✅ Toast: "Gmail connected successfully!"
- ✅ Token expiration updated to new time

**Database Check:**
```sql
-- Old tokens should be NULL before completing OAuth
SELECT
  access_token IS NULL as access_token_cleared,
  refresh_token IS NULL as refresh_token_cleared,
  is_active
FROM gmail_connections
WHERE user_id = '[your-user-id]';

-- After OAuth completes, tokens should be present again
SELECT
  access_token IS NOT NULL as has_access_token,
  refresh_token IS NOT NULL as has_refresh_token,
  token_expires_at > now() as token_valid,
  is_active
FROM gmail_connections
WHERE user_id = '[your-user-id]';
```

### Test 4: Disconnect Flow
**Steps:**
1. From Settings page, click "Disconnect"
2. Confirm the dialog
3. Verify connection status changes
4. Try accessing `/admin/oauth-diagnostics`
5. Verify diagnostics shows disconnected

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Toast: "Gmail disconnected successfully"
- ✅ Settings shows "No Gmail account connected"
- ✅ Diagnostics shows "Disconnected" status
- ✅ API test buttons not shown

**Database Check:**
```sql
SELECT
  is_active,
  email,
  token_expires_at
FROM gmail_connections
WHERE user_id = '[your-user-id]';
-- Expected: is_active = false, email and token still present
```

### Test 5: Error Handling
**Steps:**
1. Disconnect Gmail
2. Navigate to Settings
3. Start OAuth flow but cancel at Google consent screen
4. Verify error handling

**Expected Results:**
- ✅ Redirect back to Settings
- ✅ Toast shows error message
- ✅ No connection created in database

### Test 6: Second User
**Steps:**
1. Sign out of Test User 1
2. Sign in with Test User 2
3. Navigate to Settings
4. Connect Gmail with Test User 2's Google account
5. Verify both users have separate connections

**Expected Results:**
- ✅ Test User 2 can connect Gmail independently
- ✅ Test User 1's connection unaffected
- ✅ Database has two separate `gmail_connections` rows
- ✅ RLS prevents users from seeing each other's data

## Common Issues and Solutions

### Issue: "redirect_uri_mismatch" Error
**Cause:** Redirect URI in code doesn't match Google Cloud Console
**Solution:**
1. Check exact URI in Google Cloud Console
2. Verify no trailing slashes or extra characters
3. Ensure protocol matches (https vs http)
4. Wait 5-10 minutes after saving changes

### Issue: Diagnostics Tests Return 401 Unauthorized
**Cause:** Token expired or revoked
**Solution:**
1. Check token expiration countdown
2. If token expired, use Reconnect flow
3. If token revoked, disconnect and reconnect

### Issue: "Failed to exchange authorization code"
**Cause:** Client secret incorrect or code already used
**Solution:**
1. Verify VITE_GOOGLE_CLIENT_SECRET in `.env`
2. Don't refresh the callback page (code single-use)
3. Start OAuth flow again from Settings

### Issue: State Parameter Mismatch
**Cause:** User ID doesn't match session
**Solution:**
1. Sign out and sign back in
2. Clear browser cache
3. Try incognito/private window

## Success Criteria

All tests pass when:
- ✅ Fresh connection works for new user
- ✅ Diagnostics panel shows correct config
- ✅ Both API tests (profile and labels) succeed
- ✅ Reconnect flow clears old tokens and gets new ones
- ✅ Disconnect properly deactivates connection
- ✅ Error handling shows user-friendly messages
- ✅ Multiple users can connect independently
- ✅ No tokens logged to console
- ✅ RLS prevents cross-user data access

## After Successful Testing

### 1. Update Documentation
- Document any issues encountered
- Add screenshots of successful flows
- Update troubleshooting section

### 2. Production Readiness
- Add monitoring for OAuth failures
- Set up alerts for token refresh failures
- Implement rate limiting on callback route
- Add E2E tests

### 3. Next Implementation Phase
Choose one of these follow-up tasks:

**Option A: Token Audit Trail**
Add actual insertion of audit events in OAuth callback and token refresh utility.

**Option B: Feature Flag Enforcement**
Add checks for `VITE_ENABLE_GMAIL_CONNECT` flag in Settings and diagnostics routes.

**Option C: Sync Job Integration**
Update existing sync jobs to use new token refresh utility and proper token management.

**Option D: Background Token Refresh**
Implement a background process to refresh tokens before they expire.

## Quick Verification Commands

### Check Migration Applied
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'gmail_token_audit'
) as audit_table_exists;
```

### Check Connection Status
```sql
SELECT
  u.email as user_email,
  gc.email as gmail_email,
  gc.is_active,
  gc.token_expires_at,
  EXTRACT(EPOCH FROM (gc.token_expires_at - now()))/60 as minutes_until_expiry,
  gc.last_error
FROM gmail_connections gc
JOIN auth.users u ON u.id = gc.user_id
WHERE gc.is_active = true;
```

### Check RLS Policies
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('gmail_connections', 'gmail_token_audit')
ORDER BY tablename, policyname;
```

## Contact and Support

If you encounter issues during testing:
1. Check browser console for detailed error messages
2. Review `gmail_connections.last_error` in database
3. Verify redirect URI in Google Cloud Console
4. Check all environment variables in `.env`
5. Wait 5-10 minutes if you just changed Google Cloud Console

## Rollback Plan

If OAuth implementation has critical issues:

1. **Frontend Rollback:**
   - Comment out new routes in `App.tsx`
   - Revert Settings page to use old OAuth flow
   - Users can still use old edge function callback

2. **Database Rollback:**
   ```sql
   -- Remove new columns (optional)
   ALTER TABLE gmail_connections
   DROP COLUMN IF EXISTS google_user_id,
   DROP COLUMN IF EXISTS email,
   DROP COLUMN IF EXISTS last_error,
   DROP COLUMN IF EXISTS last_profile_check_at;

   -- Remove audit table
   DROP TABLE IF EXISTS gmail_token_audit CASCADE;
   ```

3. **Environment Rollback:**
   - Remove or set `VITE_ENABLE_GMAIL_CONNECT=false`
   - Keep old redirect URI in Google Cloud Console

**Note:** Database rollback should only be done if no users have connected Gmail yet, as it will lose data.
