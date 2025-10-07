import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';

export function GmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    console.log('🔍 Gmail Callback Debug:');
    console.log('Code:', code ? 'Present' : 'Missing');
    console.log('State (userId):', state);
    console.log('Error param:', errorParam);

    if (errorParam) {
      console.error('❌ OAuth error from Google:', errorParam);
      setError('Authorization was denied or cancelled');
      setTimeout(() => navigate('/dashboard'), 3000);
      return;
    }

    if (!code || !state) {
      console.error('❌ Missing required parameters');
      setError('Missing authorization code or state');
      setTimeout(() => navigate('/dashboard'), 3000);
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/auth/gmail/callback`;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

      console.log('📡 Calling Edge Function:', apiUrl);
      console.log('Redirect URI:', redirectUri);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          userId: state,
          redirectUri,
        }),
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to connect Gmail');
      }

      console.log('✅ Gmail connected successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Gmail OAuth error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Gmail');
      setTimeout(() => navigate('/dashboard'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        {error ? (
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-900/30 rounded-full mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connection Failed</h2>
            <p className="text-zinc-400 mb-4">{error}</p>
            <p className="text-sm text-zinc-500">Redirecting to dashboard...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-900/30 rounded-full mx-auto mb-4">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connecting Gmail</h2>
            <p className="text-zinc-400">Please wait while we complete the connection...</p>
          </div>
        )}
      </div>
    </div>
  );
}
