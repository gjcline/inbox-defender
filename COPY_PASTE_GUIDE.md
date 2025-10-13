# Copy & Paste Guide - Fix Gmail Connection

Follow these steps **exactly** in order. Each step shows what to copy and where to paste it.

---

## ⚡ Step 1: Create Database Tables

### Where to Go:
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/sql/new
```

### What to Copy:
Open this file in your code editor:
```
supabase/migrations/20251013_create_gmail_integration_schema.sql
```

### What to Do:
1. Select ALL text in the file (Ctrl+A / Cmd+A)
2. Copy it (Ctrl+C / Cmd+C)
3. Paste into Supabase SQL Editor (Ctrl+V / Cmd+V)
4. Click the **RUN** button (or press Ctrl+Enter)
5. Wait for "Success. No rows returned"

### Verify:
Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/editor`

You should see these 6 tables:
- ✅ allowlist
- ✅ blocked_senders
- ✅ emails
- ✅ gmail_connections
- ✅ mailboxes
- ✅ user_settings

---

## ⚡ Step 2: Deploy Edge Function

### Where to Go:
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
```

### What to Do:
1. Click **"Create a new function"** button (top right)

### What to Enter:
- **Function name:** `gmail-oauth-callback`
- **Verify JWT:** Toggle it **ON** ✅

### What to Copy:
Open this file in your code editor:
```
supabase/functions/gmail-oauth-callback/index.ts
```

### What to Do:
1. Select ALL text in the file (Ctrl+A / Cmd+A)
2. Copy it (Ctrl+C / Cmd+C)
3. Paste into the function editor (Ctrl+V / Cmd+V)
4. Click **"Deploy function"** button at bottom
5. Wait 10-30 seconds (you'll see "Deployed successfully")

---

## ⚡ Step 3: Add Secrets

### Where to Go:
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/settings/functions
```

### What to Do:

**SECRET 1:**
1. Click **"Add new secret"**
2. Name: Copy and paste this:
   ```
   GOOGLE_CLIENT_ID
   ```
3. Value: Copy and paste this:
   ```
   522566281733-ehke7sqmhla6suk6susnk5p7ok0d9kav.apps.googleusercontent.com
   ```
4. Click **"Save"**

**SECRET 2:**
1. Click **"Add new secret"** again
2. Name: Copy and paste this:
   ```
   GOOGLE_CLIENT_SECRET
   ```
3. Value: Copy and paste this:
   ```
   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
   ```
4. Click **"Save"**

---

## ⚡ Step 4: Redeploy Function (CRITICAL!)

### Where to Go:
```
https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
```

### What to Do:
1. Click on **gmail-oauth-callback** function
2. Click **"Redeploy"** button
3. Wait 10 seconds for redeployment

**⚠️ IMPORTANT:** Secrets don't work until you redeploy!

---

## ⚡ Step 5: Test Connection

### What to Do:
1. Open your app: `http://localhost:5173`
2. If already signed in, sign out and sign back in
3. Click **"Connect Gmail"** button
4. Google will ask for permissions
5. Click **"Allow"**
6. You should see **"Gmail Connected"** ✅

### If It Doesn't Work:

**Option 1 - Run Test Script:**
```bash
./test-edge-function.sh
```

**Option 2 - Check Browser Console:**
1. Press F12
2. Go to Console tab
3. Look for error messages

**Option 3 - Check Function Logs:**
1. Go to: `https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions/gmail-oauth-callback`
2. Click **Logs** tab
3. Look for errors

---

## Common Issues

### "404 Not Found"
- Edge function not deployed
- Go back to Step 2

### "500 Internal Server Error"
- Secrets not configured or function not redeployed
- Go back to Step 3 and Step 4

### "Table does not exist"
- Database tables not created
- Go back to Step 1

### "Failed to fetch"
- Edge function not deployed OR
- Edge function deployed but secrets missing
- Check Steps 2, 3, and 4

---

## Checklist

Before testing, verify:

- [ ] Ran SQL migration (Step 1)
- [ ] Deployed edge function (Step 2)
- [ ] Added GOOGLE_CLIENT_ID secret (Step 3)
- [ ] Added GOOGLE_CLIENT_SECRET secret (Step 3)
- [ ] Redeployed function after adding secrets (Step 4)
- [ ] Cleared browser cache

If all checked, the connection should work! ✅

---

## Time Estimate

- Step 1: 2 minutes
- Step 2: 3 minutes
- Step 3: 2 minutes
- Step 4: 1 minute
- Step 5: 1 minute

**Total: ~10 minutes**

---

## Need Help?

1. Run `./test-edge-function.sh` and share output
2. Share browser console errors (F12 → Console)
3. Share Supabase function logs (Functions → gmail-oauth-callback → Logs)
