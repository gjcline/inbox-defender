# ✅ QUICK UPDATE CHECKLIST - MAKE.COM WEBHOOK

## New Webhook URL
```
https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw
```

---

## ✅ Code Updates (DONE)

- [x] Edge Function: `gmail-sync-cron` - DEFAULT_MAKE_WEBHOOK updated
- [x] Frontend: `MakeWebhookConfig.tsx` - Default fallback URL updated
- [x] Documentation: All guides updated with new webhook
- [x] Project built successfully

---

## 🚀 DEPLOYMENT STEPS (TODO)

### 1. Update Supabase Database ⚠️ **REQUIRED**

Run this SQL in Supabase SQL Editor:

```sql
UPDATE gmail_connections
SET
  make_webhook_url = 'https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw',
  updated_at = now()
WHERE
  make_webhook_url IS NULL
  OR make_webhook_url != 'https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw';
```

**Go to:** https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor

---

### 2. Deploy Frontend (If Needed)

```bash
npm run build
# Then deploy dist/ folder to your hosting
```

---

### 3. Verify in Make.com

- Go to your Make.com scenario
- Verify webhook trigger is: `https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw`
- Make sure scenario is **active**

---

## 🧪 TESTING

### Test Email Classification Flow

1. **Send a test email** to your connected Gmail account
2. **Wait up to 15 minutes** for automated sync
3. **Check Dashboard** - Email should appear with classification
4. **Check Gmail** - Email should have BLOCKED or SAFE label

### Check Logs

**Supabase Edge Function Logs:**
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/gmail-sync-cron/logs
```

Look for: `Sending to webhook: https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw`

**Make.com Execution History:**
- Check if webhook received data
- Verify scenario executed successfully

---

## 📊 VERIFICATION QUERIES

### Check All Webhook URLs
```sql
SELECT user_id, email, make_webhook_url, is_active
FROM gmail_connections;
```

### Check Recent Syncs
```sql
SELECT sync_started_at, status, emails_fetched, emails_classified
FROM sync_history
ORDER BY sync_started_at DESC
LIMIT 10;
```

---

## ⚠️ CRITICAL

**You MUST run the database UPDATE query** or existing users will still use old webhook URLs!

---

## 📁 Reference Files

- `WEBHOOK_UPDATE_COMPLETE.md` - Full documentation
- `update_make_webhook_url.sql` - Database update script
- See detailed testing checklist in `WEBHOOK_UPDATE_COMPLETE.md`
