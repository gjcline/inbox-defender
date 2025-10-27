import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';

interface SyncHistoryRow {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  status: 'running' | 'completed' | 'error';
  emails_fetched: number;
  emails_sent_to_webhook: number;
  refreshed_tokens: number;
  failures: number;
  error_message?: string;
}

interface GmailConnection {
  id: string;
  is_active: boolean;
}

export function SyncHistory() {
  const { user } = useAuth();
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRow[]>([]);
  const [gmailConnection, setGmailConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [historyResult, connectionResult] = await Promise.all([
        supabase
          .from('sync_history')
          .select('*')
          .order('sync_started_at', { ascending: false })
          .limit(10),
        supabase
          .from('gmail_connections')
          .select('id, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (historyResult.data) {
        setSyncHistory(historyResult.data);
      }

      if (connectionResult.data) {
        setGmailConnection(connectionResult.data);
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSyncNow = async () => {
    setRunning(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-sync-cron`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadData();
      } else {
        console.error('Sync failed:', await response.text());
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setRunning(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return '...';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(durationMs / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-50 text-green-700 border-green-200',
      running: 'bg-blue-50 text-blue-700 border-blue-200',
      error: 'bg-red-50 text-red-700 border-red-200',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const lastTwoRuns = syncHistory.slice(0, 2);
  const bothFetchedZero = lastTwoRuns.length === 2 &&
    lastTwoRuns.every(run => run.status === 'completed' && run.emails_fetched === 0);
  const hasActiveConnection = gmailConnection?.is_active === true;
  const showWarningBanner = bothFetchedZero && hasActiveConnection;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading sync history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sync History</h2>
          <p className="text-sm text-gray-600">Last 10 sync runs</p>
        </div>
        <Button
          onClick={runSyncNow}
          disabled={running || !hasActiveConnection}
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running...' : 'Run Now'}
        </Button>
      </div>

      {showWarningBanner && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border-2 border-red-500 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">No Emails Fetched</p>
            <p className="text-sm text-red-700 mt-1">
              The last 2 sync runs fetched 0 emails despite having an active Gmail connection.
              This may indicate a configuration issue or your inbox has no new emails.
            </p>
          </div>
        </div>
      )}

      <div className="p-6">
        {syncHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No sync history yet</p>
            <p className="text-sm mt-1">Sync runs will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {syncHistory.map((run) => (
              <div
                key={run.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(run.status)}
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusBadge(run.status)}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{formatDate(run.sync_started_at)}</p>
                    <p className="text-xs text-gray-500">
                      {getDuration(run.sync_started_at, run.sync_completed_at)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fetched</p>
                    <p className={`text-lg font-semibold ${
                      run.emails_fetched === 0 && run.status === 'completed'
                        ? 'text-yellow-600'
                        : 'text-gray-900'
                    }`}>
                      {run.emails_fetched}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Posted</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {run.emails_sent_to_webhook}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Refreshed</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {run.refreshed_tokens}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Failures</p>
                    <p className={`text-lg font-semibold ${
                      run.failures > 0 ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {run.failures}
                    </p>
                  </div>
                </div>

                {run.error_message && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-xs text-red-700">{run.error_message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
