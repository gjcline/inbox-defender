# Google OAuth Setup Guide

To enable Google sign-in for your application, follow these steps:

## 1. Enable Google Provider in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Toggle **Enable Sign in with Google** to ON

## 2. Configure Google OAuth Credentials

### Create Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add these Authorized redirect URIs:
   - `https://0ec90b57d6e95fcbda19832f.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/v1/callback` (for local development)

### Add Credentials to Supabase:

1. Copy the **Client ID** and **Client Secret** from Google Cloud Console
2. Go back to Supabase → Authentication → Providers → Google
3. Paste the **Client ID** and **Client Secret**
4. Click **Save**

## 3. Test the Integration

1. Run your development server: `npm run dev`
2. Click "Sign in with Google" button
3. Complete the Google OAuth flow
4. You should be redirected to `/dashboard` upon successful sign-in

## Features Implemented

- **Google OAuth Sign-in**: Users can sign in with their Google account
- **Protected Routes**: Dashboard and Settings pages require authentication
- **Auth State Management**: User session is managed globally with React Context
- **Automatic Redirects**: Users are redirected to dashboard after sign-in
- **Sign Out**: Users can sign out from the dashboard navigation

## Security Notes

- The application uses Supabase's built-in Google OAuth
- No passwords are stored or managed by the application
- User sessions are handled securely by Supabase
- Protected routes automatically redirect unauthenticated users to the landing page
