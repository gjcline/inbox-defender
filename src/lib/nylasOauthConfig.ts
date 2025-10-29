/**
 * Nylas OAuth Configuration
 *
 * Builds Nylas hosted authentication URLs for OAuth flow
 * Uses Nylas v3 API with hosted authentication
 */

export const NYLAS_SCOPES = 'email.read_only email.modify';

function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function buildNylasAuthUrl(userId: string): string {
  const clientId = import.meta.env.VITE_NYLAS_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_NYLAS_REDIRECT_URI;

  if (!clientId || clientId === 'undefined') {
    console.error('❌ VITE_NYLAS_CLIENT_ID is not configured!');
    throw new Error('VITE_NYLAS_CLIENT_ID is not configured');
  }

  if (!redirectUri || redirectUri === 'undefined') {
    console.error('❌ VITE_NYLAS_REDIRECT_URI is not configured!');
    throw new Error('VITE_NYLAS_REDIRECT_URI is not configured');
  }

  // Encode JSON state with userId for verification after callback
  const stateData = {
    userId,
    provider: 'nylas',
    timestamp: Date.now(),
  };
  const state = base64urlEncode(JSON.stringify(stateData));

  // Nylas Hosted Authentication URL
  // https://developer.nylas.com/docs/v3/auth/hosted-authentication/
  const authUrl = new URL('https://api.us.nylas.com/v3/connect/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('state', state);

  // Nylas-specific: provider selection
  // Set to 'google' to only show Gmail option
  authUrl.searchParams.append('provider', 'google');

  console.log('🔐 Nylas OAuth URL built:', {
    clientId: clientId.slice(0, 20) + '...',
    redirectUri,
    state: state.slice(0, 20) + '...',
    provider: 'google',
  });

  return authUrl.toString();
}
