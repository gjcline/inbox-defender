export const OAUTH_SCOPES = 'https://www.googleapis.com/auth/gmail.modify openid email profile';

const getGoogleRedirectUri = (): string => {
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!redirectUri || redirectUri === 'undefined') {
    console.error('❌ VITE_GOOGLE_REDIRECT_URI is not configured!');
    console.error('Please add VITE_GOOGLE_REDIRECT_URI to your .env file');
    console.error('Example: VITE_GOOGLE_REDIRECT_URI=https://app.bliztic.com/api/auth/google/callback');
    throw new Error('VITE_GOOGLE_REDIRECT_URI is not configured');
  }

  return redirectUri;
};

export const GOOGLE_REDIRECT_URI = getGoogleRedirectUri();

export function buildAuthUrl(state: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId || clientId === 'undefined') {
    console.error('❌ VITE_GOOGLE_CLIENT_ID is not configured!');
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('scope', OAUTH_SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('include_granted_scopes', 'true');
  authUrl.searchParams.append('state', state);

  return authUrl.toString();
}
