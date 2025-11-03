import { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

interface SyncStatusProps {
  lastSyncAt: string | null;
  onManualSync: (options?: { dateRange?: string; resetSync?: boolean }) => void;
  isSyncing: boolean;
}

export function SyncStatus({ lastSyncAt, onManualSync, isSyncing }: SyncStatusProps) {
  const [timeUntilNextSync, setTimeUntilNextSync] = useState<number>(0);
  const [lastSyncText, setLastSyncText] = useState<string>('Never');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [showSyncOptions, setShowSyncOptions] = useState<boolean>(false);

  useEffect(() => {
    const updateTimes = () => {
      // Calculate time until next sync (5 minutes from last sync)
      if (lastSyncAt) {
        const lastSync = new Date(lastSyncAt);
        const nextSync = new Date(lastSync.getTime() + 5 * 60 * 1000); // 5 minutes
        const now = new Date();
        const msUntilNextSync = nextSync.getTime() - now.getTime();

        if (msUntilNextSync > 0) {
          setTimeUntilNextSync(Math.floor(msUntilNextSync / 1000));
          setAutoSyncEnabled(true);
        } else {
          setTimeUntilNextSync(0);
          setAutoSyncEnabled(true);
        }

        // Update "last sync" text
        const diffMs = now.getTime() - lastSync.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) {
          setLastSyncText('Just now');
        } else if (diffMins < 60) {
          setLastSyncText(`${diffMins}m ago`);
        } else if (diffHours < 24) {
          setLastSyncText(`${diffHours}h ago`);
        } else {
          setLastSyncText(lastSync.toLocaleDateString());
        }
      } else {
        setLastSyncText('Never');
        setTimeUntilNextSync(0);
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000); // Update every second

    return () => clearInterval(interval);
  }, [lastSyncAt]);

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return 'Syncing soon...';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusBadge = () => {
    if (isSyncing) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing
        </span>
      );
    }

    if (timeUntilNextSync > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" />
          Idle
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        Ready
      </span>
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <div className={`w-2 h-2 rounded-full ${
            autoSyncEnabled && timeUntilNextSync > 0
              ? 'bg-emerald-500 animate-pulse'
              : autoSyncEnabled
              ? 'bg-amber-500'
              : 'bg-zinc-500'
          }`} />
          <span className="text-xs font-medium text-zinc-400">
            {autoSyncEnabled ? 'Auto-sync Active' : 'Auto-sync Disabled'}
          </span>
        </div>

        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <div>
              <div className="text-xs text-zinc-500">Next auto-sync</div>
              <div className="text-sm font-medium text-white">
                {isSyncing ? 'In progress...' : formatCountdown(timeUntilNextSync)}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div>
            <div className="text-xs text-zinc-500">Last synced</div>
            <div className="text-sm font-medium text-white">{lastSyncText}</div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div>
            <div className="text-xs text-zinc-500 mb-1">Status</div>
            {getStatusBadge()}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => onManualSync()}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={() => setShowSyncOptions(!showSyncOptions)}
            disabled={isSyncing}
            className="ml-1 px-2 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            title="Sync options"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showSyncOptions ? 'rotate-180' : ''}`} />
          </button>

          {showSyncOptions && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden">
              <div className="p-2">
                <div className="text-xs font-medium text-zinc-400 px-2 py-1.5">Quick Sync Options</div>
                <button
                  onClick={() => {
                    onManualSync({ dateRange: '1h' });
                    setShowSyncOptions(false);
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                >
                  Sync Last Hour
                </button>
                <button
                  onClick={() => {
                    onManualSync({ dateRange: '24h' });
                    setShowSyncOptions(false);
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                >
                  Sync Last 24 Hours
                </button>
                <button
                  onClick={() => {
                    onManualSync({ dateRange: '7d' });
                    setShowSyncOptions(false);
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                >
                  Sync Last 7 Days
                </button>
                <button
                  onClick={() => {
                    onManualSync({ dateRange: '30d' });
                    setShowSyncOptions(false);
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                >
                  Sync Last 30 Days
                </button>
                <div className="h-px bg-zinc-700 my-1" />
                <button
                  onClick={() => {
                    if (confirm('This will reset your sync history and re-fetch all recent emails. Continue?')) {
                      onManualSync({ resetSync: true });
                      setShowSyncOptions(false);
                    }
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-3 py-2 text-sm text-amber-400 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                >
                  Reset Sync History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
