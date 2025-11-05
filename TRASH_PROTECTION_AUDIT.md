# 🚨 EMERGENCY: Trash Protection Audit

## Current Status: NUCLEAR-LEVEL SAFEGUARDS DEPLOYED

### What We've Added

#### 1. **Database Label Mapping Audit** (Runs on every webhook call)
- Checks ALL labels in `label_mapping` JSON
- ABORTS webhook if ANY system labels detected (TRASH, SPAM, IMPORTANT, STARRED, etc.)
- Logs every label: `key -> labelId` format
- Returns 500 error if system labels found

#### 2. **Nuclear-Level Safeguard** (Before ANY Gmail API call)
- Blocks TRASH, SPAM, IMPORTANT, STARRED, SENT, DRAFT
- Throws error if system labels in `addLabelIds`
- Throws error if forbidden system labels in `removeLabelIds`
- Only INBOX and UNREAD can be removed

#### 3. **Label Format Validation**
- ALL labels must start with `Label_` (Gmail custom label format)
- Rejects any label that doesn't match this format
- Triple-checked before Gmail API call

#### 4. **Post-API Response Verification**
- After Gmail API call, checks response labels
- Logs ERROR if TRASH appears in response
- Helps identify if Gmail is adding TRASH for some reason

### Emergency Logging

Every webhook call now logs:
```
=== EMAIL MOVE DEBUG START ===
Message ID: [gmail_message_id]
Classification: [inbox/personal/conversations/etc]
Label mapping from DB: {full JSON}
Selected label ID: [Label_xxx]
Initial add label IDs: [array]
Initial remove label IDs: [array]

🛡️ === NUCLEAR SAFEGUARD CHECK ===
Checking addLabelIds against system labels...
Checking removeLabelIds against forbidden labels...
✅ Nuclear safeguard passed - no system labels detected
=== END NUCLEAR SAFEGUARD CHECK ===

📋 FINAL Gmail API modify request:
   ➕ ADD labels: ["Label_123"]
   ➖ REMOVE labels: ["INBOX"]

✅ Gmail API modify SUCCEEDED
   Response labelIds: [array of all current labels]
=== EMAIL MOVE DEBUG END ===
```

## How to Diagnose

### Step 1: Check Database Label Mapping

Run this SQL query:
```bash
# In Supabase SQL Editor or via psql
cat check_label_mapping.sql
```

Expected result:
```json
{
  "inbox": "Label_1",
  "personal": "Label_2",
  "conversations": "Label_3",
  "marketing": "Label_4",
  "cold_outreach": "Label_5",
  "spam": "Label_6"
}
```

**RED FLAG**: If you see ANY of these:
- "TRASH"
- "SPAM" (as a value, not a key)
- "IMPORTANT"
- "STARRED"
- "SENT"
- "DRAFT"

### Step 2: Check Supabase Edge Function Logs

1. Go to Supabase Dashboard
2. Edge Functions → webhook-from-make → Logs
3. Look for recent invocations
4. Search for:
   - `🚨 BLOCKED` - System label was blocked
   - `CRITICAL BUG` - System label found in mapping
   - `TRASH` - Any mention of trash

### Step 3: Check Make.com Scenario

**CRITICAL**: Verify Make.com is NOT moving emails:

1. Open your Make.com scenario
2. Look for any Gmail modules that:
   - Move to Trash
   - Delete Email
   - Modify Labels with TRASH
   - Archive (this is OK, we handle it)

3. The scenario should ONLY:
   - Watch for new emails
   - Send to OpenAI/Claude for classification
   - Send results to webhook-from-make
   - **NOT touch Gmail**

### Step 4: Test Single Email

Create a test endpoint to move ONE email manually:

```bash
# Test webhook with single email
curl -X POST \
  https://[your-project].supabase.co/functions/v1/webhook-from-make \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "[your-user-id]",
    "results": [{
      "message_id": "[test-gmail-message-id]",
      "classification": "marketing",
      "ai_confidence_score": 0.95,
      "ai_reasoning": "Test classification"
    }]
  }'
```

Watch the logs in real-time to see exactly what happens.

## What Each Classification Does

| Classification | Label Added | Remove INBOX? | Mark Read? |
|---------------|-------------|---------------|------------|
| inbox         | Label_inbox | ❌ No (stays in inbox) | No |
| personal      | Label_personal | ❌ No (stays in inbox) | No |
| conversations | Label_conversations | ❌ No (stays in inbox) | No |
| marketing     | Label_marketing | ✅ Yes (archived) | ✅ Yes |
| cold_outreach | Label_cold_outreach | ✅ Yes (archived) | No |
| spam          | Label_spam | ✅ Yes (archived) | ✅ Yes |

**IMPORTANT**:
- "Archive" means removing INBOX label - email moves to "All Mail"
- "Archive" is NOT the same as "Trash"
- Archived emails are still searchable and accessible
- **We NEVER add TRASH label**

## If Emails Are Still Going to Trash

### Possibility 1: Make.com is Trashing Them
- Check your Make scenario step by step
- Look for any Gmail delete/trash action
- Disable the scenario temporarily to test

### Possibility 2: Gmail Filter/Rule
- User may have Gmail filters that auto-trash
- Check Gmail Settings → Filters and Blocked Addresses
- Look for filters that send to trash

### Possibility 3: Gmail API Bug (unlikely)
- Our logs will show if TRASH appears in API response
- Look for: "CRITICAL BUG: Email now has TRASH label"
- If this appears, it's a Gmail API issue, not our code

### Possibility 4: Different Email Client
- User might be using Outlook/Apple Mail
- These clients might show archived emails differently
- Verify in Gmail web interface, not external client

## Emergency Rollback

If you need to DISABLE email moving entirely:

### Option 1: Quick Disable (No Code Changes)

Update database to clear label_mapping:
```sql
UPDATE gmail_connections
SET label_mapping = NULL
WHERE is_active = true;
```

This will disable email moving but keep classification working.

### Option 2: Disable in Edge Function

Comment out the moveEmailToFolder call:
```typescript
// Move email to InboxDefender folder
// if (hasLabelMapping && accessToken) {
//   const moveResult = await moveEmailToFolder(...);
//   ...
// }
```

## Verification Checklist

- [ ] Ran `check_label_mapping.sql` - No system labels found
- [ ] Checked edge function logs - No blocked attempts
- [ ] Verified Make.com scenario - No Gmail delete/trash actions
- [ ] Tested single email - Logs show correct labels
- [ ] Checked Gmail filters - No auto-trash rules
- [ ] Verified in Gmail web interface - Not using external client

## Contact for Help

If emails are STILL going to trash after all these checks:
1. Copy the full edge function logs for one affected email
2. Copy the label_mapping JSON from database
3. Screenshot the Make.com scenario
4. Provide the gmail_message_id of affected email

This will help diagnose the root cause.
