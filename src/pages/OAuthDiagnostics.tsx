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

export function OAuthDiagnostics() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ isConnected: false });
  const [profileTest, setProfileTest] = useState<TestResult | null>(null);
  const [labelsTest, setLabelsTest] = useState<TestResult | null>(null);
  const [testingProfile, setTestingProfile] = useState(false);
  const [testingLabels, setTestingLabels] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnectionStatus();
  }, [user]);

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

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
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
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Client ID
                </label>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600 font-mono">
                  {maskClientId(clientId)}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Redirect URI
                </label>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600 font-mono break-all">
                  {GOOGLE_REDIRECT_URI}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OAuth Scopes
                </label>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600 font-mono">
                  {OAUTH_SCOPES}
                </code>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preview OAuth URL
                </label>
                <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 font-mono break-all overflow-x-auto">
                  {previewAuthUrl || 'Failed to generate - check console'}
                </code>
                <p className="text-xs text-gray-500 mt-1">
                  This is the exact URL that buildAuthUrl generates (with state=diagnostics-test)
                </p>
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
        </div>
      </div>
    </div>
  );
}
