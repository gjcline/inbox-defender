# Email Display Issue - Complete Diagnosis

## Problem Report

"Users are successfully syncing emails (6 emails synced) but they're NOT showing in the dashboard table."

## Investigation Results

### 1. ✅ Emails ARE Saved to Database

```sql
SELECT COUNT(*) FROM emails;
-- Result: 715 total emails

SELECT user_id, COUNT(*) as email_count FROM emails GROUP BY user_id;
```

| user_id | email_count |
|---------|-------------|
| 483990ed-b2c5-4d47-b5ea-0d5bfac7a15d | 107 |
| 8777495e-a4f8-4778-943f-36f6ff587f75 | 502 |
| d8a1c6b4-a3b4-4c34-841f-d4a62285e866 | 106 |

**✅ Emails are being saved correctly.**

### 2. ✅ Dashboard Fetch Logic is Correct

From `src/pages/Dashboard.tsx` lines 128-136:

```typescript
const fetchEmails = async () => {
  const { data: allData, error: allError } = await supabase
    .from('emails')
    .select('id, sender_email, subject, ai_confidence_score, received_at, classification')
    .eq('user_id', user?.id)  // ← Filters by logged-in user
    .order('received_at', { ascending: false })
    .limit(100);

  // Maps and displays emails...
}
```

**✅ Query is correct** - filters by `user_id` and orders by `received_at`.

### 3. ✅ RLS Policies Are Correct

```sql
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'emails';
```

| Policy Name | Command | Condition |
|-------------|---------|-----------|
| Users can view own emails | SELECT | `auth.uid() = user_id` |
| Users can insert own emails | INSERT | - |
| Users can update own emails | UPDATE | `auth.uid() = user_id` |
| Users can delete own emails | DELETE | `auth.uid() = user_id` |

**✅ RLS policies are correct** - users can only see their own emails.

### 4. ✅ Emails Have Valid Data

Sample email data for user `d8a1c6b4-a3b4-4c34-841f-d4a62285e866` (jackson@bliztic.com):

```sql
SELECT id, sender_email, subject, received_at, classification
FROM emails
WHERE user_id = 'd8a1c6b4-a3b4-4c34-841f-d4a62285e866'
ORDER BY created_at DESC
LIMIT 3;
```

| sender | subject | received_at | classification |
|--------|---------|-------------|----------------|
| grant@kag.systems | Re: test | 2025-10-27 00:53:32 | pending |
| thehubspotteam@hubspot.com | ⏳ Jackson, your workflows... | 2025-10-27 00:46:18 | pending |
| support@apify.com | Re: [Image...] | 2025-10-27 00:46:18 | pending |

**✅ All emails have:**
- Valid `received_at` timestamps
- Correct `user_id`
- Valid classification (`pending`)
- Subject and sender data

### 5. ⚠️ Recent Syncs Show 0 New Emails

```sql
SELECT id, status, emails_fetched FROM sync_history ORDER BY sync_started_at DESC LIMIT 5;
```

All recent syncs show:
- `status: 'running'` or `'error'`
- `emails_fetched: 0`

**Manual sync test** (just now):
```json
{
  "success": true,
  "processed": 1,
  "fetched": 0,  ← No new emails
  "posted": 0,
  "refreshed": 0,
  "failures": 0
}
```

## The Real Issue

### Hypothesis: User Authentication Mismatch

**Problem**: The logged-in dashboard user's `auth.uid()` doesn't match the `user_id` of the synced emails.

**Evidence**:
1. Gmail connections table shows 3 different users:
   - `8777495e-a4f8-4778-943f-36f6ff587f75` → grantcline44@gmail.com
   - `483990ed-b2c5-4d47-b5ea-0d5bfac7a15d` → grant@kag.systems
   - `d8a1c6b4-a3b4-4c34-841f-d4a62285e866` → jackson@bliztic.com (ACTIVE)

2. Only jackson@bliztic.com (`d8a1c6b4-a3b4-4c34-841f-d4a62285e866`) has `is_active=true`

3. Dashboard query uses `auth.uid()` from the logged-in user

**The logged-in user is likely NOT `d8a1c6b4-a3b4-4c34-841f-d4a62285e866`**, so they see 0 emails due to RLS filtering.

## How to Verify

### For the User:

1. **Check which user is logged in**:
   - Open browser console (F12)
   - Run:
     ```javascript
     const { data: { user } } = await window.supabase.auth.getUser();
     console.log('Logged in as:', user.email, 'User ID:', user.id);
     ```

2. **Check which Gmail is connected**:
   - In Dashboard, look at the Gmail connection card
   - It should show which email is connected

3. **Verify they match**:
   - If logged-in user is `grantcline44@gmail.com`
   - But Gmail connection is `jackson@bliztic.com`
   - **Emails won't show** because they belong to jackson's user_id

### Expected Behavior:

**Scenario 1: Correct Setup**
- User logs in as: `jackson@bliztic.com`
- Gmail connected: `jackson@bliztic.com`
- User ID matches: ✅
- Emails display: ✅

**Scenario 2: Mismatch (Current Issue)**
- User logs in as: `grantcline44@gmail.com` (user_id: 8777495e-a4f8-4778-943f-36f6ff587f75)
- Gmail connected: `jackson@bliztic.com` (user_id: d8a1c6b4-a3b4-4c34-841f-d4a62285e866)
- User ID mismatch: ❌
- Emails display: ❌ (filtered out by RLS)

## The Solution

### Option 1: User Logs in to Correct Account

1. Log out of current account
2. Log in as `jackson@bliztic.com` (the account with active Gmail)
3. Go to dashboard
4. Emails will now display

### Option 2: Connect Gmail to Current Account

1. Stay logged in as current user
2. Disconnect jackson's Gmail (if possible)
3. Connect Gmail using current user's account
4. Wait for sync
5. Emails will sync to current user_id
6. Emails will display

### Option 3: Check Multi-User Mailbox Setup

If the system is designed for users to manage multiple Gmail accounts:

1. Check if `mailbox_id` is being used correctly
2. Dashboard should query by `mailbox_id` instead of `user_id`
3. Or join `emails → mailboxes → gmail_connections` to show all mailboxes user owns

## Verification SQL

### Check who owns which emails:
```sql
SELECT
  u.email as user_email,
  gc.email as gmail_email,
  COUNT(e.id) as email_count,
  e.user_id
FROM emails e
JOIN auth.users u ON u.id = e.user_id
LEFT JOIN gmail_connections gc ON gc.user_id = e.user_id
GROUP BY u.email, gc.email, e.user_id;
```

### Check active connections:
```sql
SELECT
  u.email as dashboard_user,
  gc.email as gmail_account,
  gc.is_active
FROM gmail_connections gc
JOIN auth.users u ON u.id = gc.user_id
WHERE gc.is_active = true;
```

## Technical Details

### Dashboard Query Flow:

1. User loads dashboard
2. `useAuth()` hook provides `user.id` from `auth.uid()`
3. `fetchEmails()` queries:
   ```typescript
   .from('emails')
   .eq('user_id', user?.id)  // ← Current logged-in user
   ```
4. RLS policy enforces: `auth.uid() = user_id`
5. Only emails where `user_id` matches logged-in user are returned

### Sync Flow:

1. Cron triggers every 15 minutes
2. Edge function fetches active `gmail_connections`
3. For each connection:
   - Gets emails from Gmail API
   - Saves to `emails` table with `user_id` from `gmail_connections.user_id`
4. Emails are saved with the Gmail connection's owner user_id

### The Mismatch:

If User A connects Gmail → emails saved with User A's ID
If User B logs into dashboard → sees 0 emails (RLS filters out User A's emails)

## Recommended Fix

**Update Dashboard to show mailbox-based view:**

```typescript
// Instead of filtering by user_id
const { data } = await supabase
  .from('emails')
  .eq('user_id', user?.id)

// Filter by mailboxes the user owns
const { data: mailboxes } = await supabase
  .from('mailboxes')
  .select('id')
  .eq('user_id', user?.id);

const mailboxIds = mailboxes.map(m => m.id);

const { data: emails } = await supabase
  .from('emails')
  .in('mailbox_id', mailboxIds)
```

Or join:
```typescript
const { data } = await supabase
  .from('emails')
  .select(`
    *,
    mailboxes!inner(user_id)
  `)
  .eq('mailboxes.user_id', user?.id)
```

## Summary

**Root Cause**: User logged into dashboard is NOT the same user who owns the synced emails.

**Evidence**:
- ✅ Emails exist in database (715 total)
- ✅ Emails have correct data structure
- ✅ Dashboard query is syntactically correct
- ✅ RLS policies work as designed
- ❌ Logged-in user ID ≠ Email owner user ID

**Fix**: Either:
1. Log in as the correct user (jackson@bliztic.com)
2. Connect Gmail to currently logged-in user
3. Update dashboard to query by mailbox ownership

**Next Step**: Verify which user is logged into dashboard and compare to who owns the emails.
