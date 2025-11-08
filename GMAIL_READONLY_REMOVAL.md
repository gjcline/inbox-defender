# 🔒 Gmail.Readonly Scope Removal

## Issue

Google verification found that our app was requesting `gmail.readonly` scope, but this scope is NOT configured in Google Cloud Console and we don't need it.

## What Was Removed

### 1. `src/lib/oauthConfig.ts`
**Before:**
```typescript
export const OAUTH_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
```

**After:**
```typescript
export const OAUTH_SCOPES = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';
```

### 2. `src/pages/Privacy.tsx`
**Before:**
```
We request the minimum scopes (e.g., gmail.readonly/gmail.metadata and gmail.modify)
```

**After:**
```
We request the minimum scopes (gmail.modify and gmail.labels)
```

### 3. `src/pages/OAuthDiagnostics.tsx`
**Before:**
```
✓ gmail.readonly - Read email messages
✓ gmail.modify - Modify/label emails
✓ gmail.labels - Create/manage labels
```

**After:**
```
✓ gmail.modify - Modify/label emails
✓ gmail.labels - Create/manage labels
```

## Final Scope List

The application now requests ONLY these scopes:

1. ✅ `https://www.googleapis.com/auth/gmail.modify` - Modify emails and labels
2. ✅ `https://www.googleapis.com/auth/gmail.labels` - Create/manage labels
3. ✅ `https://www.googleapis.com/auth/userinfo.email` - Access user email
4. ✅ `https://www.googleapis.com/auth/userinfo.profile` - Access user profile
5. ✅ `openid` - OpenID Connect authentication

## Why This Works

`gmail.modify` includes read permissions, so we don't need `gmail.readonly`. The `gmail.modify` scope allows us to:
- Read email messages ✅
- Modify email labels ✅
- Create/delete labels ✅
- Archive/unarchive emails ✅

This is all we need for InboxDefender's functionality.

## Next Steps

### 1. Deploy the Updated Code

The code has been built successfully. Deploy to production:

```bash
# If using Netlify, Vercel, or similar
git add .
git commit -m "Remove gmail.readonly scope from OAuth"
git push origin main

# Deployment will happen automatically
```

### 2. Clear Browser Cache

After deployment, users should:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Or use incognito/private window for testing

### 3. Disconnect and Reconnect Gmail

For jackson@bliztic.com and all users:

1. Go to Dashboard
2. Click "Disconnect Gmail" (if connected)
3. Click "Connect Gmail"
4. Review the OAuth consent screen

### 4. Verify Consent Screen

The OAuth consent screen should now show ONLY:
- ✅ "Read, compose, send, and permanently delete all your email from Gmail"
- ❌ Should NOT show "gmail.readonly"

### 5. Test Complete Flow

1. Connect Gmail account
2. Click "Sync Now"
3. Verify emails are classified correctly
4. Verify emails are moved to correct folders
5. Confirm no emails go to trash

## Verification Checklist

- [x] Removed `gmail.readonly` from `oauthConfig.ts`
- [x] Updated Privacy Policy text
- [x] Updated OAuthDiagnostics page
- [x] Verified no other instances in codebase
- [x] Project builds successfully
- [ ] Deploy to production
- [ ] Clear browser cache
- [ ] Test OAuth flow with new scopes
- [ ] Verify consent screen shows only gmail.modify
- [ ] Test full functionality (sync, classify, move emails)

## Google Cloud Console Configuration

Make sure your Google Cloud Console OAuth configuration matches:

### Scopes (API Scopes section)
1. `https://www.googleapis.com/auth/gmail.modify`
2. `https://www.googleapis.com/auth/gmail.labels`
3. `https://www.googleapis.com/auth/userinfo.email`
4. `https://www.googleapis.com/auth/userinfo.profile`
5. `openid`

### OAuth Consent Screen
- Application name: InboxDefender
- User support email: [your email]
- Developer contact: [your email]
- Authorized domains: bliztic.com

### OAuth Client ID
- Type: Web application
- Authorized JavaScript origins: https://app.bliztic.com
- Authorized redirect URIs: https://app.bliztic.com/api/auth/google/callback

## Testing Instructions

### For jackson@bliztic.com:

1. **Before testing**, clear browser cache or use incognito
2. Go to https://app.bliztic.com
3. Log in (if not logged in)
4. Click "Disconnect Gmail" (if already connected)
5. Click "Connect Gmail"
6. **IMPORTANT**: Review the OAuth consent screen carefully
7. Look for the permissions being requested
8. Verify you DO NOT see "gmail.readonly"
9. Approve the permissions
10. Test "Sync Now"
11. Verify emails are classified and moved correctly

### Expected OAuth Consent Screen Text:

```
InboxDefender wants to access your Google Account

This will allow InboxDefender to:
✓ Read, compose, send, and permanently delete all your email from Gmail

Choose what to share:
☑ Email address
☑ Basic profile info
```

### Should NOT See:
❌ "View your email messages and settings" (this is gmail.readonly)
❌ Any reference to "readonly"

## Troubleshooting

### If consent screen still shows gmail.readonly:

1. **Clear ALL browser data** for bliztic.com:
   - Chrome: Settings → Privacy → Clear browsing data → Cookies and site data
   - Or use incognito mode

2. **Revoke previous authorization** in Google Account:
   - Go to https://myaccount.google.com/permissions
   - Find InboxDefender
   - Click "Remove Access"
   - Try connecting again

3. **Verify deployed code** is the latest:
   - Check the OAUTH_SCOPES value in browser console
   - Should NOT contain "gmail.readonly"

### If functionality breaks:

If something stops working after removing gmail.readonly, it means we were relying on it. But this shouldn't happen because:
- `gmail.modify` includes all read permissions
- We don't use any gmail.readonly-specific features

### If Google verification still fails:

1. Double-check Google Cloud Console scopes match the code
2. Make sure ALL environments (dev, staging, prod) are updated
3. Verify no old edge functions are still requesting gmail.readonly
4. Check if any environment variables reference gmail.readonly

## Summary

✅ Removed `gmail.readonly` from all application code
✅ Updated documentation and UI to reflect correct scopes
✅ Project builds successfully
✅ Ready for deployment and testing

The application now requests ONLY the scopes that are configured in Google Cloud Console, which should resolve the Google verification issue.
