import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Settings as SettingsIcon, Trash2, AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Mailbox {
  id: string;
  email_address: string;
  created_at: string;
}

interface OrgSettings {
  digest_frequency: 'weekly' | 'monthly';
  retention_days: number;
}

interface GmailConnection {
  id: string;
  is_active: boolean;
  last_sync_at: string | null;
  token_expires_at: string | null;
  email_address: string;
}

export function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [gmailConnection, setGmailConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: mailboxData, error: mailboxError } = await supabase
        .from('mailboxes')
        .select('id, email_address, created_at')
        .order('created_at', { ascending: false });

      if (mailboxError) throw mailboxError;

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('digest_frequency, retention_days')
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      // Load Gmail connection data
      if (user) {
        const { data: connData, error: connError } = await supabase
          .from('gmail_connections')
          .select('id, is_active, last_sync_at, token_expires_at, mailbox_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (connError && connError.code !== 'PGRST116') {
          throw connError;
        }

        if (connData && connData.mailbox_id) {
          const { data: mailboxInfo, error: mailboxInfoError } = await supabase
            .from('mailboxes')
            .select('email_address')
            .eq('id', connData.mailbox_id)
            .maybeSingle();

          if (!mailboxInfoError && mailboxInfo) {
            setGmailConnection({
              ...connData,
              email_address: mailboxInfo.email_address,
            });
          }
        }
      }

      setMailboxes(mailboxData || []);
      setSettings(settingsData || { digest_frequency: 'weekly', retention_days: 14 });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (mailboxId: string) => {
    if (!confirm('Are you sure you want to disconnect this mailbox? This will stop email monitoring and protection.')) {
      return;
    }

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: connError } = await supabase
        .from('gmail_connections')
        .update({ is_active: false })
        .eq('mailbox_id', mailboxId)
        .eq('user_id', user.id);

      if (connError) throw connError;

      await loadSettings();
      alert('Mailbox disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect mailbox:', error);
      alert('Failed to disconnect mailbox. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleGmailConnect = async () => {
    if (!user) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const appDomain = import.meta.env.VITE_APP_DOMAIN || 'https://app.bliztic.com';
    const redirectUri = `${appDomain}/functions/v1/gmail-oauth-callback`;

    if (!clientId || clientId === 'undefined') {
      alert('Google Client ID not configured. Please check your environment variables.');
      return;
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', user.id);

    window.location.href = authUrl.toString();
  };

  const handleGmailDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? This will stop email monitoring and protection.')) {
      return;
    }

    setDeleting(true);
    try {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('gmail_connections')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      await loadSettings();
      alert('Gmail disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
      alert('Failed to disconnect Gmail. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
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
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-gray-900" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-600">Manage your Inbox Defender configuration</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Gmail Connection</h2>
              <p className="text-sm text-gray-600">Manage your Gmail account connection</p>
            </div>
            <div className="p-6">
              {gmailConnection && gmailConnection.is_active ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-emerald-900">{gmailConnection.email_address}</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        Status: Connected and Active
                      </p>
                      {gmailConnection.last_sync_at && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Last synced: {new Date(gmailConnection.last_sync_at).toLocaleString()}
                        </p>
                      )}
                      {gmailConnection.token_expires_at && (
                        <p className="text-xs text-emerald-600">
                          Token expires: {new Date(gmailConnection.token_expires_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleGmailConnect}
                      disabled={deleting}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconnect Gmail
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGmailDisconnect}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No Gmail account connected</p>
                  <Button onClick={handleGmailConnect}>
                    Connect Gmail
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Connected Mailboxes</h2>
              <p className="text-sm text-gray-600">Gmail accounts connected to Inbox Defender</p>
            </div>
            <div className="p-6">
              {mailboxes.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No mailboxes connected</p>
                  <Button onClick={() => navigate('/connect')}>
                    Connect Gmail
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mailboxes.map((mailbox) => (
                    <div
                      key={mailbox.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{mailbox.email_address}</p>
                        <p className="text-sm text-gray-500">
                          Connected {new Date(mailbox.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(mailbox.id)}
                        disabled={deleting}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => navigate('/connect')}
                    className="w-full"
                  >
                    Connect Another Mailbox
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Digest Settings</h2>
              <p className="text-sm text-gray-600">Configure email digest frequency</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digest Frequency
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    value={settings?.digest_frequency || 'weekly'}
                    disabled
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Read-only for MVP</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Data Retention</h2>
              <p className="text-sm text-gray-600">How long we keep email metadata</p>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Period
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={`${settings?.retention_days || 14} days`}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Fixed at 14 days for MVP</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Allowlist</h2>
              <p className="text-sm text-gray-600">Domains that should never be filtered</p>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Domains
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  rows={4}
                  placeholder="example.com&#10;company.io"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Will be functional in next sprint</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
                <p className="text-red-800 text-sm mb-4">
                  Disconnecting your mailbox will stop email ingestion and remove all stored data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
