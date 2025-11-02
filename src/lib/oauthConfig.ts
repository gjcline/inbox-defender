export const OAUTH_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';

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

function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function buildAuthUrl(userId: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId || clientId === 'undefined') {
    console.error('❌ VITE_GOOGLE_CLIENT_ID is not configured!');
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔐 FRONTEND OAuth Configuration Check');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('👤 Building OAuth URL for user:', userId);
  console.log('');
  console.log('📋 Client ID Configuration:');
  console.log('   Full Client ID:', clientId);
  console.log('   First 30 chars:', clientId.substring(0, 30) + '...');
  console.log('   Last 20 chars:', '...' + clientId.substring(clientId.length - 20));
  console.log('');
  console.log('🔄 Redirect URI Configuration:');
  console.log('   Full Redirect URI:', GOOGLE_REDIRECT_URI);
  console.log('');
  console.log('📋 OAuth Scopes:');
  console.log('   ', OAUTH_SCOPES);
  console.log('');
  console.log('⚠️  IMPORTANT: Backend must use IDENTICAL values!');
  console.log('   Backend env var GOOGLE_CLIENT_ID must equal:', clientId);
  console.log('   Backend env var GOOGLE_REDIRECT_URI must equal:', GOOGLE_REDIRECT_URI);
  console.log('═══════════════════════════════════════════════════════════');

  // Encode JSON state with userId and clientId suffix for sanity checking
  const clientIdSuffix = clientId.split('-')[0].slice(-8);
  const stateData = {
    userId,
    clientId: clientIdSuffix,
  };
  const state = base64urlEncode(JSON.stringify(stateData));

  console.log('📦 State parameter (decoded):', JSON.stringify(stateData));

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.append('scope', OAUTH_SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');
  authUrl.searchParams.append('include_granted_scopes', 'true');
  authUrl.searchParams.append('state', state);

  const fullUrl = authUrl.toString();
  console.log('🌐 Complete OAuth URL params:');
  authUrl.searchParams.forEach((value, key) => {
    if (key === 'client_id') {
      console.log(`   ${key}: ${value.substring(0, 20)}...`);
    } else if (key === 'state') {
      console.log(`   ${key}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`   ${key}: ${value}`);
    }
  });

  return fullUrl;
}
