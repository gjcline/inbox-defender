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

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code, state }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (!res.ok) {
        const reason = json?.reason ?? `http_${res.status}`;
        const detail = (json?.detail || text || '').toString().slice(0, 400);
        throw new Error(`${reason}: ${detail}`);
      }

      if (!json || !json.ok) {
        const reason = json?.reason || 'unknown';
        const detail = (json?.detail || 'No additional details').slice(0, 400);
        throw new Error(`${reason}: ${detail}`);
      }

      setStatus('success');
      setMessage('Gmail connected successfully!');

      setTimeout(() => {
        navigate('/dashboard?gmail_connected=1');
      }, 1500);
    } catch (err: any) {
      const msg = (err?.message || String(err));
      console.error('oauth_cb_fetch_error', msg);
      setStatus('error');
      setMessage(msg);
      setErrorDetail(msg);
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
