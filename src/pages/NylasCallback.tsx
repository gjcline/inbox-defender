import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { buildNylasAuthUrl } from '../lib/nylasOauthConfig';
import { Button } from '../components/ui/button';

export function NylasCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Completing Nylas connection...');
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  const supaUrl = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const postUrl = `${supaUrl}/functions/v1/nylas-oauth-callback`;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleTryAgain = () => {
    if (user) {
      const authUrl = buildNylasAuthUrl(user.id);
      window.location.href = authUrl;
    } else {
      navigate('/dashboard');
    }
  };

  const handleCopyError = async () => {
    try {
      await navigator.clipboard.writeText(errorDetail);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCallback = async () => {
    try {
      if (!supaUrl || !anon) {
        throw new Error('env_missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
      }

      if (error) {
        console.error('Nylas OAuth Error:', {
          error,
          errorCode,
          errorDescription,
          fullUrl: window.location.href
        });

        const friendlyMessage = error === 'access_denied'
          ? 'Access was denied. Please try connecting again.'
          : errorDescription
            ? `${errorDescription} (Error ${errorCode || error})`
            : `OAuth error: ${error}`;

        throw new Error(friendlyMessage);
      }

      if (!code || !state) {
        throw new Error('missing_params: no code/state on URL');
      }

      console.log('Authorization code received:', code?.substring(0, 20) + '...');
      console.log('State parameter:', state?.substring(0, 30) + '...');

      setMessage('Exchanging authorization code with Nylas...');

      const payload: any = { code, state };
      if (user?.id) {
        payload.client_user_id = user.id;
      }

      console.info('nylas_oauth_cb_fetch_begin', {
        postUrl,
        hasAnon: !!anon,
        hasClientUserId: !!user?.id,
      });

      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anon}`,
          'apikey': anon,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON
      }

      console.log('nylas_oauth_cb_fetch_response', JSON.stringify({
        status: res.status,
        body: json ?? text
      }, null, 2));

      if (!res.ok || json?.ok === false) {
        const reason = json?.reason ?? `http_${res.status}`;

        let detailValue = json?.detail ?? json?.detail_raw ?? text ?? '';
        if (typeof detailValue === 'object' && detailValue !== null) {
          detailValue = JSON.stringify(detailValue, null, 2);
        } else {
          detailValue = String(detailValue);
        }
        const detail = detailValue.slice(0, 800);

        let errorMessage = `${reason}\n${detail}`;
        throw new Error(errorMessage);
      }

      setStatus('success');
      setMessage('Nylas connected successfully!');

      setTimeout(() => {
        navigate('/dashboard?gmail_connected=1');
      }, 1500);
    } catch (err: any) {
      const msg = (err?.message || String(err));
      console.error('nylas_oauth_cb_fetch_error', msg);
      setStatus('error');
      setMessage(msg);
      setErrorDetail(msg);
    }
  };

  if (!supaUrl || !anon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuration Error</h2>
            <p className="text-gray-600 mb-4">env_missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY</p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-xs text-red-700 font-mono">
                VITE_SUPABASE_URL: {supaUrl ? '✓' : '✗'}<br />
                VITE_SUPABASE_ANON_KEY: {anon ? '✓' : '✗'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting via Nylas</h2>
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
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-semibold text-red-900">Error Details:</p>
                    <button
                      onClick={handleCopyError}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap break-all">{errorDetail}</pre>
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
