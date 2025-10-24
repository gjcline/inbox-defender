import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing Gmail connection...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        throw new Error(error === 'access_denied'
          ? 'Access was denied. Please try connecting again.'
          : `OAuth error: ${error}`
        );
      }

      if (!code) {
        throw new Error('No authorization code received from Google');
      }

      if (!user || state !== user.id) {
        throw new Error('Invalid session. Please sign in and try again.');
      }

      setMessage('Exchanging authorization code...');

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
      const appDomain = import.meta.env.VITE_APP_DOMAIN || 'https://app.bliztic.com';
      const redirectUri = `${appDomain}/api/auth/google/callback`;

      if (!clientId || !clientSecret) {
        throw new Error('OAuth configuration missing');
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error('Token exchange failed:', errorData);
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokens;

      if (!refresh_token) {
        throw new Error('No refresh token received. Please try reconnecting.');
      }

      setMessage('Fetching Gmail profile...');

      const profileResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch Gmail profile');
      }

      const profile = await profileResponse.json();
      const emailAddress = profile.emailAddress;

      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo = await userInfoResponse.json();
      const googleUserId = userInfo.id;

      setMessage('Saving connection...');

      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      const { data: existingConnection, error: fetchError } = await supabase
        .from('gmail_connections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const connectionData = {
        user_id: user.id,
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        email: emailAddress,
        google_user_id: googleUserId,
        is_active: true,
        last_error: null,
        last_profile_check_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let connectionId: string;

      if (existingConnection) {
        const { data: updated, error: updateError } = await supabase
          .from('gmail_connections')
          .update(connectionData)
          .eq('id', existingConnection.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        connectionId = updated.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from('gmail_connections')
          .insert({
            ...connectionData,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createError) throw createError;
        connectionId = created.id;
      }

      setStatus('success');
      setMessage(`Successfully connected ${emailAddress}`);

      setTimeout(() => {
        navigate('/settings?gmail_connected=true');
      }, 1500);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to connect Gmail');

      setTimeout(() => {
        navigate('/settings?gmail_error=true');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting Gmail</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to settings...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
