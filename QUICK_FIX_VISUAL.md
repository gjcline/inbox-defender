# 🔧 Gmail OAuth Fix - Visual Guide

## The Problem (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR CODE SENDS                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
    https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/
                   gmail-oauth-callback
                      ▲
                      │
                      │ ❌ MISMATCH!
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE CLOUD CONSOLE HAS                        │
└─────────────────────────────────────────────────────────────┘

    https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/
                      gmail-oauth
                          ▲
                          │
                   Missing "-callback"!
```

---

## The Fix (Visual)

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Go to Google Cloud Console                         │
│  https://console.cloud.google.com/apis/credentials           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Click your OAuth 2.0 Client ID                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Find "Authorized redirect URIs"                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Update URI #3                                      │
│                                                              │
│  FROM:                                                       │
│  https://bazeyxgsgodhnwckttxi.supabase.co/                  │
│         functions/v1/gmail-oauth                            │
│                                                              │
│  TO:                                                         │
│  https://bazeyxgsgodhnwckttxi.supabase.co/                  │
│         functions/v1/gmail-oauth-callback                   │
│                    └─────────────┘                           │
│                    Add this part!                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Click SAVE                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: Wait 10 minutes for propagation                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: Test OAuth flow                                    │
│  https://app.bliztic.com/dashboard                          │
│  → Click "Connect Gmail"                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                      ✅ SUCCESS!
```

---

## What Success Looks Like

### Before (Current State) ❌
```
Dashboard → Click "Connect Gmail"
    ↓
Google OAuth Consent Screen
    ↓
Click "Allow"
    ↓
❌ ERROR: redirect_uri_mismatch
OR
❌ ERROR: 404 Not Found
OR
Stuck loading / nothing happens
```

### After (Fixed State) ✅
```
Dashboard → Click "Connect Gmail"
    ↓
Google OAuth Consent Screen
    ↓
Click "Allow"
    ↓
✅ Redirected to dashboard
    ↓
✅ Green card: "Gmail Connected"
    ↓
✅ Shows your email address
    ↓
✅ "Sync Now" button works
    ↓
✅ Emails appear in tables
```

---

## Side-by-Side Comparison

```
┌──────────────────────────────┬──────────────────────────────┐
│         BEFORE FIX           │         AFTER FIX            │
├──────────────────────────────┼──────────────────────────────┤
│                              │                              │
│  Google Console URI:         │  Google Console URI:         │
│  .../gmail-oauth             │  .../gmail-oauth-callback    │
│           ❌                 │           ✅                 │
│                              │                              │
│  Code sends:                 │  Code sends:                 │
│  .../gmail-oauth-callback    │  .../gmail-oauth-callback    │
│           ✅                 │           ✅                 │
│                              │                              │
│  Result:                     │  Result:                     │
│  ❌ Mismatch error           │  ✅ Perfect match            │
│  ❌ OAuth fails              │  ✅ OAuth succeeds           │
│  ❌ No connection            │  ✅ Gmail connected!         │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

---

## Screenshot Guide

### 1. Google Cloud Console - Find Your OAuth Client
```
┌───────────────────────────────────────────────────────────┐
│ Google Cloud Console > APIs & Services > Credentials      │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ OAuth 2.0 Client IDs                                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Name: Web client 1                                   │ │
│ │ Client ID: 522566281733-ehke7s...  [Copy]           │ │
│ │ Type: Web application                                │ │
│ │                                           [Edit] [📋] │ │
│ └──────────────────────────────────────────────────────┘ │
│                         👆 Click "Edit" here              │
└───────────────────────────────────────────────────────────┘
```

### 2. Edit OAuth Client - Authorized Redirect URIs
```
┌───────────────────────────────────────────────────────────┐
│ Edit OAuth client                                          │
├───────────────────────────────────────────────────────────┤
│                                                            │
│ Authorized redirect URIs                                  │
│                                                            │
│ URIs 1                                                    │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ https://bazeyxgsgodhnwckttxi.supabase.co/auth/...   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ URIs 2                                                    │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ https://app.bliztic.com/dashboard                    │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ URIs 3                  👇 CHANGE THIS ONE!               │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ https://bazeyxgsgodhnwckttxi.supabase.co/           │ │
│ │         functions/v1/gmail-oauth-callback            │ │
│ └──────────────────────────────────────────────────────┘ │
│                         Add "-callback" ^^^               │
│                                                            │
│              [Cancel]              [Save] 👈 Click        │
└───────────────────────────────────────────────────────────┘
```

### 3. After Clicking Save
```
┌───────────────────────────────────────────────────────────┐
│ ✅ Client updated                                         │
│                                                            │
│ Note: It may take 5 minutes to a few hours for settings  │
│ to take effect                                            │
│                                                            │
│ ⏰ WAIT 10 MINUTES before testing!                        │
└───────────────────────────────────────────────────────────┘
```

---

## Testing Flow (Step-by-Step)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Open Browser                                         │
│    Press F12 to open DevTools                           │
│    Go to Console tab                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Navigate to Dashboard                                │
│    https://app.bliztic.com/dashboard                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Find "Connect Your Gmail" Card                       │
│    Should be amber/yellow colored                       │
│    Has "Connect Gmail" button                           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Click "Connect Gmail"                                │
│    Console should show debug logs                       │
│    Browser redirects to accounts.google.com             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Google OAuth Consent Screen                          │
│    Select your Gmail account                            │
│    Review permissions                                   │
│    Click "Allow" or "Continue"                          │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Processing (3-10 seconds)                            │
│    URL shows: .../gmail-oauth-callback?code=...         │
│    Edge function runs                                   │
│    Exchanges code for tokens                            │
│    Saves to database                                    │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Success!                                             │
│    Redirected to: /dashboard?gmail_connected=true       │
│    Toast message: "Gmail connected successfully!"       │
│    Green card appears                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting Flowchart

```
                    Start Testing
                         │
                         ▼
                Click "Connect Gmail"
                         │
                         ▼
              Redirected to Google? ───── NO ──┐
                         │                      │
                        YES                     │
                         │                      ▼
                         ▼              Check console logs
                 Google consent screen   Check client ID set
                         │                      │
                         ▼                      │
                   Click "Allow"                │
                         │                      │
                         ▼                      │
           redirect_uri_mismatch? ──── YES ────┤
                         │                      │
                        NO                      │
                         │                      ▼
                         ▼              Update Google Console
              Redirected to dashboard?  Wait 10 minutes
                         │              Try again
                        YES
                         │
                         ▼
            Green card appears? ──── NO ──┐
                         │                │
                        YES               │
                         │                ▼
                         ▼         Check edge function logs
                    SUCCESS!       Check database records
                                  Check FRONTEND_URL secret
```

---

## Quick Reference: All 3 Redirect URIs

Your Google Cloud Console should have these 3 URIs:

```
1. https://bazeyxgsgodhnwckttxi.supabase.co/auth/v1/callback
   └─ For Supabase Auth (login/signup)

2. https://app.bliztic.com/dashboard
   └─ Your app domain (optional)

3. https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-oauth-callback
   └─ For Gmail OAuth (THIS ONE NEEDS -callback!)
                                    ^^^^^^^^^^^^^^^^
```

---

## Timeline to Success

```
┌──────────┬─────────────────────────────────────────────┐
│   Time   │                 Action                      │
├──────────┼─────────────────────────────────────────────┤
│  0 min   │ Update Google redirect URI                  │
│  0 min   │ Click "Save"                                │
│  10 min  │ ⏰ Wait for propagation                    │
│  11 min  │ Test OAuth flow                             │
│  12 min  │ ✅ Success! Gmail connected                 │
└──────────┴─────────────────────────────────────────────┘

Total: ~12 minutes from start to finish
```

---

## Bottom Line

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║  The ONLY thing preventing Gmail connection:            ║
║                                                          ║
║  Missing "-callback" in Google Cloud Console            ║
║                                                          ║
║  Fix: Add "-callback" to redirect URI #3                ║
║  Time: 30 seconds + 10 minute wait                      ║
║  Difficulty: ⭐ (Very Easy)                              ║
║                                                          ║
║  Everything else is already working! ✅                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

**Next:** Open `START_HERE.md` for step-by-step instructions.
