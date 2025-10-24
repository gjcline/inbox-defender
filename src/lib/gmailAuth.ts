import { supabase } from './supabase';

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: string;
  error?: string;
}

interface GmailConnection {
  id: string;
  refresh_token: string;
  access_token: string;
  token_expires_at: string;
}

export async function refreshGmailToken(
  connectionId: string
): Promise<TokenRefreshResult> {
  try {
    const { data: connection, error: fetchError } = await supabase
      .from('gmail_connections')
      .select('id, refresh_token, access_token, token_expires_at')
      .eq('id', connectionId)
      .maybeSingle();

    if (fetchError || !connection) {
      return {
        success: false,
        error: 'Gmail connection not found',
      };
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const twoMinutes = 2 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() > twoMinutes) {
      return {
        success: true,
        accessToken: connection.access_token,
        expiresAt: connection.token_expires_at,
      };
    }

    if (!connection.refresh_token) {
      return {
        success: false,
        error: 'No refresh token available. Please reconnect your Gmail account.',
      };
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'OAuth credentials not configured',
      };
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed:', errorText);

      await supabase
        .from('gmail_connections')
        .update({
          last_error: 'Token refresh failed. Please reconnect your account.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      return {
        success: false,
        error: 'Failed to refresh access token. Please reconnect your Gmail account.',
      };
    }

    const tokens = await tokenResponse.json();
    const { access_token, expires_in } = tokens;
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('gmail_connections')
      .update({
        access_token,
        token_expires_at: newExpiresAt,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('Failed to update token:', updateError);
      return {
        success: false,
        error: 'Failed to save refreshed token',
      };
    }

    return {
      success: true,
      accessToken: access_token,
      expiresAt: newExpiresAt,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during token refresh',
    };
  }
}

export function buildGmailAuthUrl(userId: string, forceReconnect: boolean = false): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appDomain = import.meta.env.VITE_APP_DOMAIN || 'https://app.bliztic.com';
  const redirectUri = `${appDomain}/api/auth/google/callback`;

  if (!clientId || clientId === 'undefined') {
    throw new Error('Google Client ID not configured');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.modify',
    'openid',
    'email',
    'profile',
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', forceReconnect ? 'consent' : 'consent');
  authUrl.searchParams.append('include_granted_scopes', 'true');
  authUrl.searchParams.append('state', userId);

  return authUrl.toString();
}

export async function disconnectGmail(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('gmail_connections')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Gmail',
    };
  }
}

export async function clearGmailTokensForReconnect(
  userId: string
): Promise<{ success: boolean; connectionId?: string; error?: string }> {
  try {
    const { data: connection, error: fetchError } = await supabase
      .from('gmail_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError || !connection) {
      return {
        success: false,
        error: 'No active Gmail connection found',
      };
    }

    const { error: updateError } = await supabase
      .from('gmail_connections')
      .update({
        access_token: null,
        refresh_token: null,
        is_active: false,
        last_error: 'Reconnecting - tokens cleared by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, connectionId: connection.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear tokens',
    };
  }
}
