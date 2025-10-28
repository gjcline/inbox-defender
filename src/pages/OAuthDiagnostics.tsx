import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, XCircle, AlertCircle, Clock, Play, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { refreshGmailToken } from '../lib/gmailAuth';
import { OAUTH_SCOPES, GOOGLE_REDIRECT_URI, buildAuthUrl } from '../lib/oauthConfig';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  email?: string;
  tokenExpiresAt?: string;
  lastError?: string;
  connectionId?: string;
}

interface ServerConfig {
  client_id_suffix: string;
  redirect_uri: string;
  timestamp: string;
}

export function OAuthDiagnostics() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false });
  const [profileTest, setProfileTest] = useState<TestResult | null>(null);
  const [labelsTest, setLabelsTest] = useState<TestResult | null>(null);
  const [testingProfile, setTestingProfile] = useState(false);
  const [testingLabels, setTestingLabels] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [loadingServerConfig, setLoadingServerConfig] = useState(true);
  const [dryRunTest, setDryRunTest] = useState<TestResult | null>(null);
  const [testingDryRun, setTestingDryRun] = useState(false);
  const [pingTest, setPingTest] = useState<TestResult | null>(null);
  const [testingPing, setTestingPing] = useState(false);
  const [syntheticProbes, setSyntheticProbes] = useState<{[key: string]: TestResult}>({});
  const [runningSyntheticProbes, setRunningSyntheticProbes] = useState(false);

  useEffect(() => {
    loadConnectionStatus();
    loadServerConfig();
  }, [user]);

  const loadServerConfig = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/debug-env`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setServerConfig(data);
      } else {
        console.error('Failed to load server config:', await response.text());
      }
    } catch (error) {
      console.error('Error loading server config:', error);
    } finally {
      setLoadingServerConfig(false);
    }
  };

  const loadConnectionStatus = async () => {
    if (!user) return;

    try {
      const { data: connection, error } = await supabase
        .from('gmail_connections')
        .select('id, email, token_expires_at, last_error, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (connection && connection.is_active) {
        setConnectionStatus({
          isConnected: true,
          email: connection.email,
          tokenExpiresAt: connection.token_expires_at,
          lastError: connection.last_error,
          connectionId: connection.id,
        });
      } else {
        setConnectionStatus({ isConnected: false });
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runProfileTest = async () => {
    if (!connectionStatus.connectionId) return;

    setTestingProfile(true);
    setProfileTest(null);

    try {
      const refreshResult = await refreshGmailToken(connectionStatus.connectionId);
      if (!refreshResult.success) {
        throw new Error(refreshResult.error || 'Failed to refresh token');
      }

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/profile',
        {
          headers: {
            Authorization: `Bearer ${refreshResult.accessToken}`,
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setProfileTest({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setProfileTest({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestingProfile(false);
    }
  };

  const runLabelsTest = async () => {
    if (!connectionStatus.connectionId) return;

    setTestingLabels(true);
    setLabelsTest(null);

    try {
      const refreshResult = await refreshGmailToken(connectionStatus.connectionId);
      if (!refreshResult.success) {
        throw new Error(refreshResult.error || 'Failed to refresh token');
      }

      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels',
        {
          headers: {
            Authorization: `Bearer ${refreshResult.accessToken}`,
          },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setLabelsTest({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setLabelsTest({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestingLabels(false);
    }
  };

  const runDryRunTest = async () => {
    setTestingDryRun(true);
    setDryRunTest(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dry_run: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setDryRunTest({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setDryRunTest({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestingDryRun(false);
    }
  };

  const runPingTest = async () => {
    setTestingPing(true);
    setPingTest(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ dry_run: true }),
      });

      const text = await response.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (!response.ok) {
        const reason = json?.reason ?? `http_${response.status}`;
        const detail = (json?.detail || text || '').toString().slice(0, 400);
        throw new Error(`${reason}: ${detail}`);
      }

      setPingTest({
        success: true,
        data: json || { raw: text },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setPingTest({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTestingPing(false);
    }
  };

  const runSyntheticProbes = async () => {
    setRunningSyntheticProbes(true);
    setSyntheticProbes({});

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const probes = ['invalid_client', 'redirect_mismatch', 'bad_code'];

    for (const probe of probes) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            force_error: probe,
            code: 'synthetic_test_code',
            state: btoa(JSON.stringify({ userId: user?.id || 'test', clientId: 'test1234' })),
          }),
        });

        const text = await response.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          // Not JSON
        }

        setSyntheticProbes(prev => ({
          ...prev,
          [probe]: {
            success: response.ok,
            data: json || { raw: text },
            timestamp: new Date().toISOString(),
            error: !response.ok ? (json?.reason || `http_${response.status}`) : undefined,
          },
        }));
      } catch (error) {
        setSyntheticProbes(prev => ({
          ...prev,
          [probe]: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
        }));
      }
    }

    setRunningSyntheticProbes(false);
  };

  const getTimeUntilExpiry = () => {
    if (!connectionStatus.tokenExpiresAt) return null;
    const expiresAt = new Date(connectionStatus.tokenExpiresAt);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    return diffMinutes;
  };

  const maskClientId = (clientId: string) => {
    if (!clientId || clientId.length < 8) return '****';
    return `...${clientId.slice(-4)}`;
  };

  const getClientIdSuffix = (clientId: string): string => {
    if (!clientId) return '';
    return clientId.split('-')[0].slice(-8);
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const frontendSuffix = getClientIdSuffix(clientId);
  const serverSuffix = serverConfig?.client_id_suffix || '';
  const suffixesMatch = frontendSuffix && serverSuffix && frontendSuffix === serverSuffix;
  const redirectUrisMatch = serverConfig && GOOGLE_REDIRECT_URI === serverConfig.redirect_uri;
  const minutesUntilExpiry = getTimeUntilExpiry();

  let previewAuthUrl = '';
  try {
    previewAuthUrl = buildAuthUrl('diagnostics-test');
  } catch (error) {
    console.error('Failed to build preview auth URL:', error);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Inbox Defender</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-gray-900" />
            <h1 className="text-3xl font-bold text-gray-900">OAuth Diagnostics</h1>
          </div>
          <p className="text-gray-600">Verify Gmail OAuth configuration and test API access</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">OAuth Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">Compare frontend and backend configuration</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frontend Client ID Suffix
                  </label>
                  <div className={`px-4 py-3 rounded-lg border-2 ${
                    loadingServerConfig
                      ? 'bg-gray-50 border-gray-200'
                      : suffixesMatch
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}>
                    <code className={`block text-lg font-bold font-mono ${
                      loadingServerConfig
                        ? 'text-gray-600'
                        : suffixesMatch
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {frontendSuffix || 'Not configured'}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      From: VITE_GOOGLE_CLIENT_ID
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backend Client ID Suffix
                  </label>
                  <div className={`px-4 py-3 rounded-lg border-2 ${
                    loadingServerConfig
                      ? 'bg-gray-50 border-gray-200'
                      : suffixesMatch
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}>
                    {loadingServerConfig ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-600">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <code className={`block text-lg font-bold font-mono ${
                          suffixesMatch ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {serverSuffix || 'Not configured'}
                        </code>
                        <p className="text-xs text-gray-600 mt-1">
                          From: GOOGLE_CLIENT_ID (edge function)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {!loadingServerConfig && (
                <div className={`flex items-start gap-3 p-4 rounded-lg border-2 ${
                  suffixesMatch
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}>
                  {suffixesMatch ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      suffixesMatch ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {suffixesMatch
                        ? 'Client IDs Match'
                        : 'Client ID Mismatch Detected'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      suffixesMatch ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {suffixesMatch
                        ? 'Frontend and backend are using the same Google Client ID'
                        : 'Frontend and backend are using different Client IDs. OAuth will fail.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Redirect URI
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Frontend:</p>
                    <code className={`block px-3 py-2 rounded border ${
                      loadingServerConfig
                        ? 'bg-gray-50 border-gray-200'
                        : redirectUrisMatch
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    } text-sm font-mono break-all`}>
                      {GOOGLE_REDIRECT_URI}
                    </code>
                  </div>
                  {!loadingServerConfig && serverConfig && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Backend:</p>
                      <code className={`block px-3 py-2 rounded border ${
                        redirectUrisMatch
                          ? 'bg-green-50 border-green-500'
                          : 'bg-red-50 border-red-500'
                      } text-sm font-mono break-all`}>
                        {serverConfig.redirect_uri}
                      </code>
                    </div>
                  )}
                </div>
                {!loadingServerConfig && (
                  <div className={`flex items-start gap-2 mt-3 p-3 rounded-lg ${
                    redirectUrisMatch
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {redirectUrisMatch ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">
                      {redirectUrisMatch
                        ? 'Redirect URIs match'
                        : 'Redirect URIs do not match'}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OAuth Scopes
                </label>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600 font-mono">
                  {OAUTH_SCOPES}
                </code>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preview OAuth URL
                </label>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 font-mono break-all overflow-x-auto max-h-32">
                  {previewAuthUrl || 'Failed to generate - check console'}
                </code>
                <p className="text-xs text-gray-500 mt-1">
                  This is the exact URL that buildAuthUrl generates (with test state)
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Ping OAuth Callback</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Test edge function reachability with full headers (CORS, preflight, auth)
                    </p>
                  </div>
                  <Button
                    onClick={runPingTest}
                    disabled={testingPing}
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {testingPing ? 'Testing...' : 'Ping Callback'}
                  </Button>
                </div>
                {pingTest && (
                  <div className={`p-4 rounded-lg border ${
                    pingTest.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3 mb-2">
                      {pingTest.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          pingTest.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {pingTest.success ? 'Success - Function Reachable' : 'Failed - Cannot Reach Function'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(pingTest.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {pingTest.success && pingTest.data && (
                      <pre className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                        {JSON.stringify(pingTest.data, null, 2)}
                      </pre>
                    )}
                    {!pingTest.success && pingTest.error && (
                      <p className="mt-2 text-sm text-red-700">{pingTest.error}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Dry-Run Test</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Test OAuth callback without Google (no auth headers)
                    </p>
                  </div>
                  <Button
                    onClick={runDryRunTest}
                    disabled={testingDryRun}
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {testingDryRun ? 'Testing...' : 'Test Dry-Run'}
                  </Button>
                </div>
                {dryRunTest && (
                  <div className={`p-4 rounded-lg border ${
                    dryRunTest.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3 mb-2">
                      {dryRunTest.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          dryRunTest.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {dryRunTest.success ? 'Success' : 'Failed'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(dryRunTest.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {dryRunTest.success && dryRunTest.data && (
                      <pre className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                        {JSON.stringify(dryRunTest.data, null, 2)}
                      </pre>
                    )}
                    {!dryRunTest.success && dryRunTest.error && (
                      <p className="mt-2 text-sm text-red-700">{dryRunTest.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Connection Status</h2>
            </div>
            <div className="p-6">
              {connectionStatus.isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">Connected</p>
                      <p className="text-sm text-green-700 mt-1">{connectionStatus.email}</p>
                    </div>
                  </div>
                  {minutesUntilExpiry !== null && (
                    <div className={`flex items-start gap-3 p-3 border rounded-lg ${
                      minutesUntilExpiry < 5
                        ? 'bg-red-50 border-red-200'
                        : minutesUntilExpiry < 30
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <Clock className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        minutesUntilExpiry < 5
                          ? 'text-red-600'
                          : minutesUntilExpiry < 30
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`} />
                      <p className={`text-sm ${
                        minutesUntilExpiry < 5
                          ? 'text-red-800'
                          : minutesUntilExpiry < 30
                          ? 'text-yellow-800'
                          : 'text-blue-800'
                      }`}>
                        Token expires in {minutesUntilExpiry} minutes
                      </p>
                    </div>
                  )}
                  {connectionStatus.lastError && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Last Error</p>
                        <p className="text-sm text-red-700 mt-1">{connectionStatus.lastError}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Disconnected</p>
                    <p className="text-sm text-gray-600 mt-1">No active Gmail connection found</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {connectionStatus.isConnected && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">API Tests</h2>
                <p className="text-sm text-gray-600">Test Gmail API access with current credentials</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Test Profile Access</h3>
                    <Button
                      onClick={runProfileTest}
                      disabled={testingProfile}
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {testingProfile ? 'Testing...' : 'Run Test'}
                    </Button>
                  </div>
                  {profileTest && (
                    <div className={`p-4 rounded-lg border ${
                      profileTest.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-3 mb-2">
                        {profileTest.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            profileTest.success ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {profileTest.success ? 'Success' : 'Failed'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(profileTest.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {profileTest.success && profileTest.data && (
                        <pre className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                          {JSON.stringify(profileTest.data, null, 2)}
                        </pre>
                      )}
                      {!profileTest.success && profileTest.error && (
                        <p className="mt-2 text-sm text-red-700">{profileTest.error}</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Test Labels Access</h3>
                    <Button
                      onClick={runLabelsTest}
                      disabled={testingLabels}
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {testingLabels ? 'Testing...' : 'Run Test'}
                    </Button>
                  </div>
                  {labelsTest && (
                    <div className={`p-4 rounded-lg border ${
                      labelsTest.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-start gap-3 mb-2">
                        {labelsTest.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            labelsTest.success ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {labelsTest.success ? 'Success' : 'Failed'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(labelsTest.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {labelsTest.success && labelsTest.data && (
                        <pre className="mt-3 p-3 bg-white border border-gray-200 rounded text-xs overflow-x-auto max-h-96">
                          {JSON.stringify(labelsTest.data, null, 2)}
                        </pre>
                      )}
                      {!labelsTest.success && labelsTest.error && (
                        <p className="mt-2 text-sm text-red-700">{labelsTest.error}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Synthetic OAuth Probes */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Synthetic OAuth Probes</h2>
              <p className="text-sm text-purple-100">Test OAuth callback error handling</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                These probes intentionally trigger specific OAuth errors to verify error handling:
              </p>
              <Button
                onClick={runSyntheticProbes}
                disabled={runningSyntheticProbes}
                className="mb-4"
              >
                <Play className="w-4 h-4 mr-2" />
                {runningSyntheticProbes ? 'Running Probes...' : 'Run Synthetic OAuth Probes'}
              </Button>

              {Object.keys(syntheticProbes).length > 0 && (
                <div className="space-y-4">
                  {['invalid_client', 'redirect_mismatch', 'bad_code'].map((probe) => {
                    const result = syntheticProbes[probe];
                    if (!result) return null;

                    return (
                      <div key={probe} className={`p-4 rounded-lg border ${
                        result.success
                          ? 'bg-red-50 border-red-200'
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-start gap-3 mb-2">
                          {!result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !result.success ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {probe.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {!result.success ? 'Failed as expected ✓' : 'Unexpected success'}
                            </p>
                          </div>
                        </div>
                        {result.data && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 mb-1">Response:</p>
                            <pre className="p-3 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {result.error && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700">Error Reason:</p>
                            <p className="text-sm text-gray-900 font-mono">{result.error}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
