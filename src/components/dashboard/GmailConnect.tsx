import { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, Unplug } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { buildAuthUrl } from '../../lib/oauthConfig';
import { buildNylasAuthUrl } from '../../lib/nylasOauthConfig';

interface GmailConnectProps {
  userId: string;
}

interface ConnectionData {
  isConnected: boolean;
  emailAddress: string;
  lastSyncAt: string | null;
  provider?: string;
}

export function GmailConnect({ userId }: GmailConnectProps) {
  const [connectionData, setConnectionData] = useState<ConnectionData>({
    isConnected: false,
    emailAddress: '',
    lastSyncAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const checkConnection = async () => {
    try {
      const { data: connectionData, error: connError } = await supabase
        .from('gmail_connections')
        .select('is_active, email, last_sync_at, oauth_provider')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (connError) throw connError;

      if (connectionData && connectionData.is_active) {
        setConnectionData({
          isConnected: true,
          emailAddress: connectionData.email || '',
          lastSyncAt: connectionData.last_sync_at,
          provider: connectionData.oauth_provider || 'google',
        });
      } else {
        setConnectionData({
          isConnected: false,
          emailAddress: '',
          lastSyncAt: null,
          provider: undefined,
        });
      }
    } catch (err) {
      console.error('Error checking Gmail connection:', err);
      setConnectionData({
        isConnected: false,
        emailAddress: '',
        lastSyncAt: null,
        provider: undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncMessage('');
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-sync-cron`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (response.ok) {
        const totalEmails = result.results?.reduce((sum: number, r: any) => sum + (r.new_emails || 0), 0) || 0;
        setSyncMessage(`Successfully synced ${totalEmails} new email${totalEmails !== 1 ? 's' : ''}`);
        await checkConnection();
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Error syncing emails:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync emails');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectNylas = async () => {
    try {
      const authUrl = buildNylasAuthUrl(userId);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to build Nylas OAuth URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to start Nylas OAuth flow');
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const authUrl = buildAuthUrl(userId);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to build Google OAuth URL:', error);
      setError(error instanceof Error ? error.message : 'Failed to start Google OAuth flow');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? This will stop email monitoring and protection.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('gmail_connections')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      setSyncMessage('Gmail disconnected successfully');
      await checkConnection();
    } catch (err) {
      console.error('Error disconnecting Gmail:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect Gmail');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-zinc-800 rounded w-32 mb-2"></div>
            <div className="h-3 bg-zinc-800 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionData.isConnected) {
    const lastSyncText = connectionData.lastSyncAt
      ? new Date(connectionData.lastSyncAt).toLocaleString()
      : 'Never';

    return (
      <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-900/30 rounded-lg flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">Gmail Connected</h3>
            <p className="text-sm text-zinc-400 mb-1">
              {connectionData.emailAddress} is being monitored and protected
            </p>
            <p className="text-xs text-zinc-500">
              Last sync: {lastSyncText}
              {connectionData.provider && (
                <span className="ml-2 px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                  via {connectionData.provider === 'nylas' ? 'Nylas' : 'Google'}
                </span>
              )}
            </p>

            {syncMessage && (
              <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>{syncMessage}</span>
              </div>
            )}

            <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <p className="text-xs text-zinc-400 leading-relaxed">
                <span className="font-semibold text-zinc-300">Automatic sync is active.</span> New emails are checked every 15 minutes automatically. The "Sync Now" button lets you check for new emails immediately.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={syncing}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-zinc-400 hover:text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Unplug className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/20 border border-amber-900/50 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 bg-amber-900/30 rounded-lg flex-shrink-0">
          <Mail className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-1">Connect Your Gmail</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Grant access to your Gmail inbox so we can protect you from unwanted cold emails and send auto-replies
          </p>
          {error && (
            <div className="flex items-center gap-2 mb-4 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleConnectNylas}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Connect via Nylas
            </button>
            <button
              onClick={handleConnectGoogle}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Connect via Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
