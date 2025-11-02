# 🔍 WEBHOOK DEBUGGING GUIDE - webhook-from-make

## ✅ What Was Fixed

### 1. Database Schema Verified
- `classification` column exists (defaults to 'pending')
- `ai_confidence_score` column exists
- `ai_reasoning` column exists
- `action_taken` column exists
- `processed_at` column exists
- `moved_to_folder`, `moved_at`, `move_error` columns added

### 2. Enhanced Logging Added

The webhook-from-make Edge Function now has comprehensive logging at every step:

**Logs when webhook is received:**
```
🔔 Webhook received from Make.com
📦 Payload: {full JSON payload}
✅ Processing {N} email classifications for user: {user_id}
```

**Logs for each email:**
```
📧 Processing email: {message_id}
   Classification: {classification}
   Confidence: {score}
✓ Found email in database (ID: {email_id})
   Current classification: {old_classification}
💾 Updating database with: {update_data}
✅ Database updated successfully for {message_id}
```

**Logs for email moving:**
```
📂 Moving email to InboxDefender/{classification} folder...
✅ Email moved successfully
OR
❌ Failed to move email {message_id}: {error}
⚠️  No label mapping available - email won't be moved
⚠️  No access token available - email won't be moved
```

**Summary logs:**
```
📊 WEBHOOK PROCESSING COMPLETE
   Processed: {count}
   Updated: {count}
   Moved: {count}
   Errors: {count}
```

---

## 🚀 Next Steps - DEPLOY THE UPDATED FUNCTION

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Edge Functions:**
   ```
   https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
   ```

2. **Click on `webhook-from-make` function**

3. **Copy the updated code:**
   - Open: `supabase/functions/webhook-from-make/index.ts`
   - Copy entire contents

4. **Paste and Deploy:**
   - Paste in the editor
   - Click "Deploy"
   - Wait for deployment to complete

### Option 2: CLI Deployment

```bash
supabase functions deploy webhook-from-make
```

---

## 🧪 Testing After Deployment

### Step 1: Trigger Make.com to Re-process Emails

You have 10 emails that were sent to Make.com but show "pending":

```sql
-- These emails need reprocessing
SELECT
  gmail_message_id,
  subject,
  classification,
  make_webhook_sent_at
FROM emails
WHERE classification = 'pending'
  AND make_webhook_sent_at IS NOT NULL
ORDER BY make_webhook_sent_at DESC;
```

**Options to trigger reprocessing:**

**A. Send new test email** (easiest)
```bash
# Send email to jackson@bliztic.com
# Wait up to 15 minutes for sync
# Check logs and database
```

**B. Manually trigger Make.com scenario**
- Go to Make.com
- Find the scenario
- Click "Run once"
- Or use the webhook URL directly

**C. Force sync from database** (advanced)
```sql
-- Reset make_webhook_sent_at to trigger resend
UPDATE emails
SET make_webhook_sent_at = NULL
WHERE classification = 'pending'
  AND gmail_message_id = '19a421eb7d1a31d7'; -- Test with one email first
```

### Step 2: Monitor Edge Function Logs

**Go to:**
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/webhook-from-make/logs
```

**Look for:**
```
🔔 Webhook received from Make.com
📦 Payload: {...}
✅ Processing 1 email classifications

📧 Processing email: 19a421eb7d1a31d7
   Classification: personal
   Confidence: 0.85
✓ Found email in database (ID: xxx)
💾 Updating database with: {...}
✅ Database updated successfully

📂 Moving email to InboxDefender/personal folder...
✅ Email moved successfully

📊 WEBHOOK PROCESSING COMPLETE
   Processed: 1
   Updated: 1
   Moved: 1
   Errors: 0
```

### Step 3: Verify in Database

```sql
SELECT
  gmail_message_id,
  subject,
  classification,
  ai_confidence_score,
  processed_at,
  moved_to_folder,
  moved_at,
  move_error
FROM emails
WHERE gmail_message_id = '19a421eb7d1a31d7';
```

**Expected Results:**
- `classification` = "personal" (or whatever Make.com returned)
- `ai_confidence_score` = 0.85
- `processed_at` = recent timestamp
- `moved_to_folder` = true
- `moved_at` = recent timestamp
- `move_error` = null

### Step 4: Verify in Gmail

1. Open Gmail as jackson@bliztic.com
2. Check main INBOX - email should be removed
3. Check InboxDefender/Personal folder - email should be there
4. Email should NOT be marked as read (personal emails stay unread)

---

## 🔍 Common Issues & Solutions

### Issue 1: Logs Show "Invalid payload format"

**Symptom:**
```
❌ Invalid payload format: {payload}
```

**Cause:** Make.com is sending wrong payload structure

**Expected Payload:**
```json
{
  "user_id": "uuid",
  "access_token": "optional-but-helpful",
  "results": [
    {
      "message_id": "19a421eb7d1a31d7",
      "classification": "personal",
      "ai_confidence_score": 0.85,
      "ai_reasoning": "This appears to be a personal email...",
      "action_taken": "classified"
    }
  ]
}
```

**Fix:** Update Make.com scenario to send correct format

---

### Issue 2: Logs Show "Email not found in database"

**Symptom:**
```
❌ Email not found in database: 19a421eb7d1a31d7
```

**Cause:** Message ID mismatch or email wasn't synced

**Fix:**
```sql
-- Check if email exists
SELECT gmail_message_id, subject, user_id
FROM emails
WHERE gmail_message_id = '19a421eb7d1a31d7';

-- If not found, check user_id matches
SELECT gmail_message_id, subject, user_id
FROM emails
WHERE subject LIKE '%EMAIL DEFENDER TEST%';
```

---

### Issue 3: Database Update Fails

**Symptom:**
```
❌ Error updating email 19a421eb7d1a31d7: {error}
```

**Possible Causes:**
1. RLS policies blocking update
2. Column doesn't exist
3. Invalid data type

**Fix:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'emails';

-- Try manual update to test
UPDATE emails
SET
  classification = 'personal',
  ai_confidence_score = 0.85,
  processed_at = now()
WHERE gmail_message_id = '19a421eb7d1a31d7';
```

---

### Issue 4: Email Not Moving (Label Errors)

**Symptom:**
```
⚠️  No label mapping available - email won't be moved
```

**Cause:** User connected before label feature was deployed

**Fix:**
```sql
-- Check label_mapping
SELECT email, label_mapping
FROM gmail_connections
WHERE user_id = 'user-id';

-- If NULL, user must reconnect Gmail
-- Go to Dashboard → Settings → Disconnect → Reconnect
```

---

### Issue 5: Token Expired

**Symptom:**
```
❌ Failed to move email: 401 Unauthorized
```

**Cause:** Access token expired

**Expected Behavior:** Function should auto-refresh token

**Fix:** Check token refresh logs:
```
Token expires in X minutes, refreshing...
✓ Token refreshed successfully
```

If not refreshing, check:
```sql
SELECT
  email,
  token_expires_at,
  EXTRACT(EPOCH FROM (token_expires_at - now())) / 60 as minutes_until_expiry
FROM gmail_connections;
```

---

## 📊 Success Metrics

After deploying the updated function, monitor these metrics:

### Webhook Health
```sql
-- Classification success rate
SELECT
  COUNT(*) FILTER (WHERE classification != 'pending') as classified,
  COUNT(*) FILTER (WHERE classification = 'pending') as pending,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE classification != 'pending') / COUNT(*), 2) as success_rate_pct
FROM emails
WHERE make_webhook_sent_at IS NOT NULL;
```

### Email Moving Success Rate
```sql
-- Moving success rate
SELECT
  COUNT(*) FILTER (WHERE moved_to_folder = true) as moved,
  COUNT(*) FILTER (WHERE moved_to_folder = false AND move_error IS NOT NULL) as failed,
  COUNT(*) FILTER (WHERE classification != 'pending') as classified,
  ROUND(100.0 * COUNT(*) FILTER (WHERE moved_to_folder = true) /
    NULLIF(COUNT(*) FILTER (WHERE classification != 'pending'), 0), 2) as move_success_pct
FROM emails
WHERE classification != 'pending';
```

### Recent Activity
```sql
-- Last 10 processed emails
SELECT
  gmail_message_id,
  subject,
  classification,
  moved_to_folder,
  processed_at,
  COALESCE(move_error, 'Success') as status
FROM emails
WHERE processed_at IS NOT NULL
ORDER BY processed_at DESC
LIMIT 10;
```

---

## 🎯 Expected Behavior After Fix

1. **Make.com sends webhook** with classification results
2. **Logs show:** "🔔 Webhook received from Make.com"
3. **For each email:**
   - Fetch from database ✓
   - Update classification ✓
   - Move to InboxDefender folder ✓
   - Update move status ✓
4. **Response sent** with counts
5. **Database updated** with new classification
6. **Gmail updated** with new label and archived
7. **Dashboard shows** updated classification (not "Pending")

---

## 📞 If Still Not Working

### Check These in Order:

1. **Is webhook being called at all?**
   - Check logs for "🔔 Webhook received"
   - If no logs, Make.com isn't calling webhook

2. **Is payload valid?**
   - Check logs for "📦 Payload:"
   - Verify structure matches expected format

3. **Can it find the email?**
   - Check logs for "✓ Found email in database"
   - If "Email not found", user_id or message_id mismatch

4. **Does database update succeed?**
   - Check logs for "✅ Database updated successfully"
   - If error, check RLS policies

5. **Does email move succeed?**
   - Check logs for "✅ Email moved successfully"
   - If "No label mapping", user needs to reconnect

---

## 🚀 Quick Test Script

After deploying, run this to test webhook manually:

```bash
curl -X POST \
  https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/webhook-from-make \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "results": [{
      "message_id": "19a421eb7d1a31d7",
      "classification": "personal",
      "ai_confidence_score": 0.95,
      "ai_reasoning": "Test classification",
      "action_taken": "test"
    }]
  }'
```

Check response for:
```json
{
  "success": true,
  "processed": 1,
  "updated": 1,
  "moved": 1
}
```

---

**The webhook-from-make function is now fully instrumented with logging. Deploy it and test!**
