import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react';
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
  const [usingRedirectUri, setUsingRedirectUri] = useState<string>('');
  const [probeResult, setProbeResult] = useState<any>(null);
  const [showProbe, setShowProbe] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const supaUrl = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const postUrl = `${supaUrl}/functions/v1/gmail-oauth-callback`;

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const showDebug = searchParams.get('debug') === '1';

  useEffect(() => {
    handleCallback();
  }, []);

  const handleTryAgain = () => {
    if (user) {
      const authUrl = buildAuthUrl(user.id);
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

  const handleRunProbe = async () => {
    if (!code || !state) return;

    setShowProbe(true);
    setProbeResult({ loading: true });

    try {
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anon}`,
          'apikey': anon,
        },
        body: JSON.stringify({
          probe: { code, state }
        }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON
      }

      setProbeResult({
        status: res.status,
        ok: res.ok,
        reason: json?.reason,
        detail_raw: json?.detail_raw,
        using_redirect_uri: json?.using_redirect_uri,
        rawResponse: JSON.stringify(json ?? text, null, 2)
      });
    } catch (err) {
      setProbeResult({
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  const handleCallback = async () => {
    try {
      // Check env vars
      if (!supaUrl || !anon) {
        throw new Error('env_missing: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
      }

      // Check OAuth error param
      if (error) {
        throw new Error(error === 'access_denied'
          ? 'Access was denied. Please try connecting again.'
          : `OAuth error: ${error}`
        );
      }

      // Check required params
      if (!code || !state) {
        throw new Error('missing_params: no code/state on URL');
      }

      setMessage('Exchanging authorization code...');

      // Don't block on frontend session; trust state.userId and verify server-side
      const payload: any = { code, state };
      if (user?.id) {
        payload.client_user_id = user.id;
      }

      console.info('oauth_cb_fetch_begin', {
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

      console.log('oauth_cb_fetch_response', JSON.stringify({
        status: res.status,
        body: json ?? text
      }, null, 2));

      if (!res.ok || json?.ok === false) {
        const reason = json?.reason ?? `http_${res.status}`;
        const detail = (json?.detail ?? json?.detail_raw ?? text ?? '').toString().slice(0, 800);
        const redirectUri = json?.using_redirect_uri;

        setUsingRedirectUri(redirectUri || '');

        let errorMessage = `${reason}\n`;
        if (redirectUri) {
          errorMessage += `using_redirect_uri: ${redirectUri}\n`;
        }
        errorMessage += detail;

        throw new Error(errorMessage);
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

  // Env error takes precedence
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
      {showDebug && (
        <div className="fixed top-4 left-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg max-w-md z-50">
          <h3 className="text-sm font-bold text-blue-900 mb-2">🐛 Debug HUD</h3>
          <div className="space-y-1 text-xs font-mono">
            <div><span className="text-gray-600">postUrl:</span> <span className="text-blue-700">{postUrl}</span></div>
            <div><span className="text-gray-600">hasAnon:</span> <span className="text-blue-700">{anon ? 'true' : 'false'}</span></div>
            <div><span className="text-gray-600">code:</span> <span className="text-blue-700">{code ? `${code.slice(0, 20)}...` : 'null'}</span></div>
            <div><span className="text-gray-600">state:</span> <span className="text-blue-700">{state ? state.slice(0, 12) : 'null'}</span></div>
            <div><span className="text-gray-600">user:</span> <span className="text-blue-700">{user ? user.id.slice(0, 12) : 'null'}</span></div>
          </div>
        </div>
      )}

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

              {code && state && (
                <div className="mb-4">
                  <Button
                    onClick={handleRunProbe}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    🔬 Run Probe on This Code
                  </Button>
                </div>
              )}

              {showProbe && probeResult && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Probe Result:</p>
                  {probeResult.loading ? (
                    <p className="text-xs text-blue-700">Running probe...</p>
                  ) : probeResult.error ? (
                    <p className="text-xs text-red-700">{probeResult.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-semibold">Status:</span> {probeResult.status} {probeResult.ok ? '✓' : '✗'}
                      </div>
                      {probeResult.reason && (
                        <div className="text-xs">
                          <span className="font-semibold">Reason:</span> {probeResult.reason}
                        </div>
                      )}
                      {probeResult.using_redirect_uri && (
                        <div className="text-xs">
                          <span className="font-semibold">Using Redirect URI:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-blue-700 font-mono break-all">{probeResult.using_redirect_uri}</pre>
                        </div>
                      )}
                      {probeResult.detail_raw && (
                        <div className="text-xs">
                          <span className="font-semibold">Detail:</span>
                          <pre className="mt-1 p-2 bg-white rounded text-blue-700 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{probeResult.detail_raw}</pre>
                        </div>
                      )}
                    </div>
                  )}
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
