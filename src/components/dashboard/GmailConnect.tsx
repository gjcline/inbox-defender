import { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GmailConnectProps {
  userId: string;
}

export function GmailConnect({ userId }: GmailConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_connections')
        .select('is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsConnected(data?.is_active || false);
    } catch (err) {
      console.error('Error checking Gmail connection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/gmail/callback`;

    console.log('🔍 Gmail OAuth Debug Info:');
    console.log('Client ID:', clientId);
    console.log('Redirect URI:', redirectUri);
    console.log('⚠️  Make sure this EXACT redirect URI is added in Google Cloud Console:');
    console.log(`   ${redirectUri}`);

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

    window.location.href = authUrl.toString();
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

  if (isConnected) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-emerald-900/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Gmail Connected</h3>
            <p className="text-sm text-zinc-400">Your inbox is being monitored and protected</p>
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
