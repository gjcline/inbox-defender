# 🚨 DEPLOY EMERGENCY TRASH PROTECTION FIX

## Critical Updates Made

The webhook-from-make edge function has been updated with NUCLEAR-LEVEL safeguards to prevent emails from going to trash.

## Changes Summary

1. **Database Label Mapping Audit** - Checks label_mapping on every webhook call, aborts if system labels detected
2. **Nuclear-Level Safeguard** - Blocks TRASH, SPAM, IMPORTANT, STARRED, SENT, DRAFT labels before ANY Gmail API call
3. **Label Format Validation** - ALL labels must start with `Label_` format
4. **Emergency Logging** - Comprehensive debug output for every email move operation
5. **Post-API Verification** - Checks Gmail API response for unexpected TRASH label

## How to Deploy

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project directory
cd /tmp/cc-agent/57720435/project

# Login to Supabase (if not already logged in)
supabase login

# Link to your project
supabase link --project-ref bazeyxgsgodhnwckttxi

# Deploy the updated function
supabase functions deploy webhook-from-make
```

### Option 2: Manual Deployment via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi
2. Navigate to Edge Functions
3. Find `webhook-from-make` function
4. Click "Edit Function"
5. Copy the contents of `supabase/functions/webhook-from-make/index.ts`
6. Paste into the editor
7. Click "Deploy"

### Option 3: Copy and Paste to Existing

If you can't deploy via CLI:

1. Open your Supabase project dashboard
2. Go to Edge Functions → webhook-from-make
3. Copy the ENTIRE contents from:
   `/tmp/cc-agent/57720435/project/supabase/functions/webhook-from-make/index.ts`
4. Replace the existing function code
5. Save and deploy

## Verification After Deployment

### Step 1: Check Deployment Status

```bash
# List deployed functions
supabase functions list

# Should show webhook-from-make with recent deployment timestamp
```

### Step 2: Check Function Logs

1. Go to Supabase Dashboard → Edge Functions → webhook-from-make → Logs
2. Look for the new log format:
   - `=== EMAIL MOVE DEBUG START ===`
   - `=== EMERGENCY LABEL MAPPING AUDIT ===`
   - `🛡️ === NUCLEAR SAFEGUARD CHECK ===`

### Step 3: Verify Database Label Mapping

Run the audit query:

```bash
# From project root
cat check_label_mapping.sql
```

Or in Supabase SQL Editor:

```sql
SELECT
  user_id,
  email_address,
  label_mapping
FROM gmail_connections
WHERE is_active = true;
```

**Expected**: Only `Label_` format IDs, NO system labels

### Step 4: Test with Real Email (Optional)

If you want to test immediately:

1. Have a test email sent to your connected Gmail
2. Watch the edge function logs in real-time
3. Verify the new logging format appears
4. Check that email is NOT in trash

## What to Monitor

### Good Signs ✅

- Logs show: `✅ Label mapping audit passed: No system labels detected`
- Logs show: `✅ Nuclear safeguard passed - no system labels detected`
- Emails appear in correct InboxDefender folders
- NO emails in Gmail Trash

### Bad Signs 🚨

- Logs show: `🚨 BLOCKED: Attempt to add system label`
- Logs show: `CRITICAL BUG: System labels detected in label_mapping`
- Logs show: `CRITICAL BUG: Email now has TRASH label`
- Function returns 500 error

If you see bad signs, check:
1. `check_label_mapping.sql` results
2. Make.com scenario for Gmail trash actions
3. Gmail filters/rules in user account

## Emergency Rollback

If emails STILL go to trash after deploying this fix:

### Disable Email Moving Entirely

```sql
-- Run this in Supabase SQL Editor
UPDATE gmail_connections
SET label_mapping = NULL
WHERE is_active = true;
```

This will:
- Keep email classification working
- STOP all email moving operations
- Prevent any potential trash issues

Users will still see classifications in the dashboard, but emails won't be moved to folders.

## Expected Behavior After Fix

| Classification | What Happens |
|---------------|-------------|
| inbox | Adds Label_inbox, stays in inbox ✅ |
| personal | Adds Label_personal, stays in inbox ✅ |
| conversations | Adds Label_conversations, stays in inbox ✅ |
| marketing | Adds Label_marketing, archives (removes INBOX) ✅ |
| cold_outreach | Adds Label_cold_outreach, archives ✅ |
| spam | Adds Label_spam, archives, marks read ✅ |

**IMPORTANT**: "Archive" = Remove INBOX label (email goes to All Mail, still accessible)
**NEVER**: Add TRASH label (email goes to Trash, deleted after 30 days)

## Support Files Created

1. `TRASH_PROTECTION_AUDIT.md` - Full diagnostic guide
2. `check_label_mapping.sql` - Database audit query
3. This file - Deployment instructions

## Questions?

If you still see emails going to trash after:
1. Deploying this fix
2. Verifying database has no system labels
3. Checking Make.com has no trash actions

Then we need to investigate:
- Gmail API behavior
- External email client issues
- User's Gmail filters/rules

Copy all edge function logs and database label_mapping for further diagnosis.
