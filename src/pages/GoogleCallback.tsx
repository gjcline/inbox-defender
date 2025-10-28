import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildAuthUrl } from '../lib/oauthConfig';
import { Button } from '../components/ui/button';

export function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing Gmail connection...');
  const [errorDetail, setErrorDetail] = useState<string>('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleTryAgain = () => {
    if (user) {
      const authUrl = buildAuthUrl(user.id);
      window.location.href = authUrl;
    }
  };

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

      if (!code || !state) {
        throw new Error('No authorization code or state received from Google');
      }

      if (!user) {
        throw new Error('Invalid session. Please sign in and try again.');
      }

      setMessage('Exchanging authorization code...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        const reason = result.reason || 'unknown';
        const detail = result.detail || 'No additional details';

        console.error('OAuth callback failed:', { reason, detail });

        if (reason === 'client_id_mismatch') {
          throw new Error(`Configuration Error: ${detail}`);
        }

        if (reason === 'token_exchange_failed') {
          const firstLine = detail.split('\n')[0];
          throw new Error(`Token Exchange Failed: ${firstLine}`);
        }

        if (reason === 'invalid_state') {
          throw new Error('Invalid OAuth state. Please try connecting again.');
        }

        if (reason === 'missing_params') {
          throw new Error('Missing required parameters. Please try again.');
        }

        throw new Error(`Connection failed: ${reason}`);
      }

      setStatus('success');
      setMessage('Gmail connected successfully!');

      setTimeout(() => {
        navigate('/dashboard?gmail_connected=1');
      }, 1500);
    } catch (error) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Gmail';
      setMessage(errorMessage);
      setErrorDetail(errorMessage);

      // Don't auto-redirect on error
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
              {errorDetail && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-xs text-red-700 font-mono break-all">{errorDetail}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <Button onClick={handleTryAgain} className="w-full">
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
