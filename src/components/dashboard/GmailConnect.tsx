import { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, RefreshCw, Unplug } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GmailConnectProps {
  userId: string;
}

interface ConnectionData {
  isConnected: boolean;
  emailAddress: string;
  lastSyncAt: string | null;
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
        .select('is_active, mailbox_id, last_sync_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (connError) throw connError;

      if (connectionData?.mailbox_id) {
        const { data: mailboxData, error: mailboxError } = await supabase
          .from('mailboxes')
          .select('email_address')
          .eq('id', connectionData.mailbox_id)
          .maybeSingle();

        if (mailboxError) throw mailboxError;

        setConnectionData({
          isConnected: true,
          emailAddress: mailboxData?.email_address || '',
          lastSyncAt: connectionData.last_sync_at,
        });
      } else {
        setConnectionData({
          isConnected: false,
          emailAddress: '',
          lastSyncAt: null,
        });
      }
    } catch (err) {
      console.error('Error checking Gmail connection:', err);
      setConnectionData({
        isConnected: false,
        emailAddress: '',
        lastSyncAt: null,
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

  const handleConnect = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const appDomain = import.meta.env.VITE_APP_DOMAIN || 'https://app.bliztic.com';
    const redirectUri = `${appDomain}/functions/v1/gmail-oauth-callback`;

    console.log('🔍 Gmail OAuth Debug Info:');
    console.log('Client ID:', clientId);
    console.log('App Domain:', appDomain);
    console.log('Redirect URI:', redirectUri);
    console.log('User ID:', userId);
    console.log('⚠️  Make sure this EXACT redirect URI is added in Google Cloud Console:');
    console.log(`   ${redirectUri}`);

    if (!clientId || clientId === 'undefined') {
      console.error('❌ VITE_GOOGLE_CLIENT_ID is not set!');
      setError('Google Client ID not configured. Please check your environment variables.');
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
    authUrl.searchParams.append('state', userId);

    console.log('🚀 Redirecting to Google OAuth...');
    console.log('Full URL:', authUrl.toString());

    window.location.href = authUrl.toString();
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
            <p className="text-xs text-zinc-500">Last sync: {lastSyncText}</p>

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
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Connect Gmail
          </button>
        </div>
      </div>
    </div>
  );
}
