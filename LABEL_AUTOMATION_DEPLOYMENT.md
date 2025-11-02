# 🚀 LABEL AUTOMATION - QUICK DEPLOYMENT GUIDE

## ✅ What's Ready

- [x] Database migration created
- [x] gmail-oauth-callback updated (creates labels)
- [x] webhook-from-make updated (moves emails)
- [x] Token refresh logic implemented
- [x] Error handling added
- [x] Project built successfully

---

## 📋 DEPLOYMENT STEPS

### Step 1: Apply Database Migration ⚠️ **REQUIRED**

**Go to:** https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor

**Run this SQL:**
```sql
-- Open and run: supabase/migrations/20251102000000_add_label_mapping_and_email_moving.sql
```

**Or copy-paste:**
```sql
-- Add label_mapping to gmail_connections
ALTER TABLE gmail_connections
ADD COLUMN IF NOT EXISTS label_mapping jsonb DEFAULT NULL;

-- Add email moving tracking to emails
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS moved_to_folder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS moved_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS move_error text DEFAULT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emails_needs_moving
  ON emails(classification, moved_to_folder)
  WHERE classification IS NOT NULL AND classification != 'pending' AND moved_to_folder = false;

CREATE INDEX IF NOT EXISTS idx_emails_move_errors
  ON emails(move_error)
  WHERE move_error IS NOT NULL;
```

**Verify:**
```sql
-- Check columns exist
\d gmail_connections
\d emails
```

---

### Step 2: Deploy Edge Functions

**Note:** Edge functions are in the local project files. They need to be deployed to Supabase.

#### Option A: Manual Deployment (Recommended)

1. **Deploy gmail-oauth-callback:**
   - Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
   - Click on `gmail-oauth-callback` function
   - Copy contents from: `supabase/functions/gmail-oauth-callback/index.ts`
   - Paste and Deploy

2. **Deploy webhook-from-make:**
   - Click on `webhook-from-make` function
   - Copy contents from: `supabase/functions/webhook-from-make/index.ts`
   - Paste and Deploy

#### Option B: CLI Deployment (If Available)

```bash
supabase functions deploy gmail-oauth-callback
supabase functions deploy webhook-from-make
```

---

### Step 3: Test Label Creation

#### A. Existing Users Must Reconnect

**Why:** Existing connections don't have `label_mapping` yet.

**How:**
1. Go to Dashboard → Settings
2. Disconnect Gmail (if connected)
3. Reconnect Gmail
4. Check Gmail - should see InboxDefender folders

#### B. Verify in Database

```sql
SELECT
  user_id,
  email,
  label_mapping,
  is_active
FROM gmail_connections
WHERE label_mapping IS NOT NULL;
```

**Expected:** `label_mapping` contains 6 label IDs

#### C. Check Gmail Labels

- Open Gmail in browser
- Look for "InboxDefender" in left sidebar
- Should see 6 nested labels:
  - InboxDefender/Inbox
  - InboxDefender/Personal
  - InboxDefender/Conversations
  - InboxDefender/Marketing
  - InboxDefender/Cold_Outreach
  - InboxDefender/Spam

---

### Step 4: Test Email Moving

#### A. Send Test Email

```bash
# Send email to your connected Gmail account
# Subject: "Test InboxDefender - Please classify as marketing"
```

#### B. Wait for Classification

- Automated sync runs every 15 minutes
- Or trigger manual sync if available

#### C. Check Results

**Database:**
```sql
SELECT
  subject,
  classification,
  moved_to_folder,
  moved_at,
  move_error
FROM emails
WHERE subject LIKE '%Test InboxDefender%'
ORDER BY received_date DESC;
```

**Expected:**
- `classification` = "marketing" (or whatever Make.com returned)
- `moved_to_folder` = true
- `moved_at` = recent timestamp
- `move_error` = null

**Gmail:**
- Email no longer in main INBOX
- Email in InboxDefender/Marketing folder
- Email marked as read

---

## 🔍 Verification Queries

### Check Label Mappings
```sql
SELECT
  COUNT(*) as total_connections,
  COUNT(label_mapping) as connections_with_labels,
  COUNT(*) - COUNT(label_mapping) as connections_without_labels
FROM gmail_connections
WHERE is_active = true;
```

**Expected:** All active connections should have labels after reconnect

### Check Email Moving Stats
```sql
SELECT
  classification,
  COUNT(*) as total,
  SUM(CASE WHEN moved_to_folder THEN 1 ELSE 0 END) as moved,
  SUM(CASE WHEN move_error IS NOT NULL THEN 1 ELSE 0 END) as failed
FROM emails
WHERE classification IS NOT NULL AND classification != 'pending'
GROUP BY classification
ORDER BY total DESC;
```

**Expected:** High percentage of moved emails, low failures

### Check Recent Activity
```sql
SELECT
  gmail_message_id,
  classification,
  moved_to_folder,
  moved_at,
  COALESCE(move_error, 'No error') as status
FROM emails
WHERE processed_at > now() - interval '1 hour'
ORDER BY processed_at DESC
LIMIT 20;
```

---

## 📊 Edge Function Logs

### gmail-oauth-callback
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/gmail-oauth-callback/logs
```

**Look for:**
- "Step 3.5: Creating InboxDefender labels in Gmail..."
- "✓ Created label: InboxDefender/Personal (Label_xxx)"
- "✓ Label mapping created: {...}"

### webhook-from-make
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/webhook-from-make/logs
```

**Look for:**
- "Token expires in X minutes, refreshing..."
- "✅ Moved email xxx to marketing folder"
- "Processed: 10, Updated: 10, Moved: 10"

---

## ⚠️ Common Issues

### Issue: label_mapping is null

**Cause:** User connected before labels feature deployed
**Fix:** User must disconnect and reconnect Gmail

**SQL to find affected users:**
```sql
SELECT user_id, email, created_at
FROM gmail_connections
WHERE is_active = true AND label_mapping IS NULL;
```

### Issue: Emails not moving (move_error populated)

**Check errors:**
```sql
SELECT
  move_error,
  COUNT(*) as count
FROM emails
WHERE move_error IS NOT NULL
GROUP BY move_error
ORDER BY count DESC;
```

**Common errors:**
1. `"No label mapping for {classification}"` → User needs to reconnect
2. `"401 Unauthorized"` → Token expired, will auto-refresh next run
3. `"404 Not Found"` → Message deleted from Gmail

### Issue: Token refresh failing

**Check token status:**
```sql
SELECT
  user_id,
  email,
  token_expires_at,
  EXTRACT(EPOCH FROM (token_expires_at - now())) / 60 as minutes_until_expiry
FROM gmail_connections
WHERE is_active = true
ORDER BY minutes_until_expiry ASC;
```

**Fix:** If tokens are expired, users may need to reconnect Gmail

---

## 🎯 Success Metrics

After deployment, these metrics should improve:

✅ **Label Creation:**
- 100% of new connections have `label_mapping`
- All 6 labels created in Gmail

✅ **Email Moving:**
- 95%+ emails successfully moved
- < 5% move errors
- Average move time < 1 second

✅ **Token Management:**
- Auto-refresh success rate > 99%
- Token expiry rate < 1%

✅ **User Experience:**
- Clean Gmail inbox (only important emails)
- Easy navigation with InboxDefender folders
- Automatic organization (no user action needed)

---

## 📞 Support

### For Users

**"My emails aren't being organized"**
1. Check if you connected Gmail before the label feature
2. Disconnect and reconnect Gmail to create labels
3. Wait up to 15 minutes for next sync

**"I don't see InboxDefender folders in Gmail"**
1. Check Gmail in web browser (not just mobile app)
2. Look in left sidebar for "InboxDefender"
3. May need to scroll down to see nested labels

### For Admins

**Debug specific user:**
```sql
-- Check connection status
SELECT * FROM gmail_connections WHERE user_id = 'user-id';

-- Check recent emails
SELECT
  gmail_message_id,
  subject,
  classification,
  moved_to_folder,
  move_error
FROM emails
WHERE user_id = 'user-id'
ORDER BY received_date DESC
LIMIT 10;
```

**Check system health:**
```sql
-- Overall stats
SELECT
  COUNT(*) FILTER (WHERE label_mapping IS NOT NULL) as connections_with_labels,
  COUNT(*) FILTER (WHERE moved_to_folder) as emails_moved,
  COUNT(*) FILTER (WHERE move_error IS NOT NULL) as move_failures
FROM gmail_connections, emails;
```

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong, you can rollback:

### Disable Email Moving (Keep Classifications)

```sql
-- Temporarily disable moving by clearing label mappings
UPDATE gmail_connections SET label_mapping = NULL;

-- Emails will still be classified, just not moved
```

### Revert Database Changes

```sql
-- Remove new columns
ALTER TABLE gmail_connections DROP COLUMN IF EXISTS label_mapping;
ALTER TABLE emails DROP COLUMN IF EXISTS moved_to_folder;
ALTER TABLE emails DROP COLUMN IF EXISTS moved_at;
ALTER TABLE emails DROP COLUMN IF EXISTS move_error;

-- Drop indexes
DROP INDEX IF EXISTS idx_emails_needs_moving;
DROP INDEX IF EXISTS idx_emails_move_errors;
```

### Redeploy Old Edge Functions

- Deploy previous versions from git history
- Or temporarily disable by removing the moving logic

---

## 📚 Documentation

**Full Guide:** `GMAIL_LABEL_AUTOMATION_GUIDE.md`
**This Checklist:** `LABEL_AUTOMATION_DEPLOYMENT.md`

---

**Ready to deploy! Start with Step 1 (database migration) and proceed through the checklist.**
