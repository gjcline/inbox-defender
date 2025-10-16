import { useState, useEffect, useMemo } from 'react';
import { Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStrictness } from '../hooks/useStrictness';
import { KpiCards } from '../components/dashboard/KpiCards';
import { StrictnessSelector } from '../components/dashboard/StrictnessSelector';
import { WeeklyChart } from '../components/dashboard/WeeklyChart';
import { BlockedTable, BlockedEmail } from '../components/dashboard/BlockedTable';
import { AllEmailsTable, EmailWithStatus } from '../components/dashboard/AllEmailsTable';
import { SettingsDrawer } from '../components/dashboard/SettingsDrawer';
import { Toast } from '../components/dashboard/Toast';
import { GmailConnect } from '../components/dashboard/GmailConnect';
import { MakeWebhookConfig } from '../components/dashboard/MakeWebhookConfig';
import { SyncStatus } from '../components/dashboard/SyncStatus';

export function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    strictness,
    setStrictness,
    digestFrequency,
    setDigestFrequency,
    scoreThreshold,
    falsePositiveRate,
    helperText,
  } = useStrictness();

  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [realEmails, setRealEmails] = useState<BlockedEmail[]>([]);
  const [allEmails, setAllEmails] = useState<EmailWithStatus[]>([]);
  const [hasRealData, setHasRealData] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth success/error params
    const gmailConnected = searchParams.get('gmail_connected');
    const gmailError = searchParams.get('gmail_error');

    if (gmailConnected === 'true') {
      setToastMessage('Gmail connected successfully! Syncing emails...');
      setShowToast(true);
      // Clear the param from URL
      searchParams.delete('gmail_connected');
      setSearchParams(searchParams);
      // Trigger initial fetch
      if (user) {
        fetchEmails();
        fetchLastSyncTime();
      }
    }

    if (gmailError) {
      setToastMessage(`Gmail connection failed: ${gmailError}`);
      setShowToast(true);
      // Clear the param from URL
      searchParams.delete('gmail_error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, user]);

  useEffect(() => {
    if (user) {
      fetchEmails();
      fetchLastSyncTime();

      // Set up Realtime subscription for live email updates
      const emailsSubscription = supabase
        .channel('emails-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'emails',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Email change detected:', payload);
            fetchEmails();
          }
        )
        .subscribe();

      // Poll for updates every 30 seconds as backup
      const interval = setInterval(() => {
        fetchEmails();
        fetchLastSyncTime();
      }, 30000);

      return () => {
        clearInterval(interval);
        emailsSubscription.unsubscribe();
      };
    } else {
      const timer = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const fetchLastSyncTime = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_connections')
        .select('last_sync_at')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (data?.last_sync_at) {
        setLastSyncAt(data.last_sync_at);
      }
    } catch (err) {
      console.error('Error fetching last sync time:', err);
    }
  };

  const fetchEmails = async () => {
    try {
      const { data: allData, error: allError } = await supabase
        .from('emails')
        .select('id, sender_email, subject, ai_confidence_score, received_at, classification')
        .eq('user_id', user?.id)
        .order('received_at', { ascending: false })
        .limit(100);

      if (allError) throw allError;

      if (allData && allData.length > 0) {
        const mappedAllEmails: EmailWithStatus[] = allData.map((email) => ({
          id: email.id,
          sender: email.sender_email,
          subject: email.subject || '(no subject)',
          score: email.ai_confidence_score || 0,
          dateISO: email.received_at,
          classification: email.classification || 'pending',
        }));
        setAllEmails(mappedAllEmails);

        const blockedOnly = mappedAllEmails
          .filter(e => e.classification === 'blocked')
          .map(({ classification, ...rest }) => rest) as BlockedEmail[];
        setRealEmails(blockedOnly);
        setHasRealData(true);
      } else {
        setHasRealData(false);
        setAllEmails([]);
        setRealEmails([]);
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  };

  const weeklyData = useMemo(() => {
    if (!hasRealData) {
      // Return empty data structure when no real emails exist
      return [
        { day: 'Mon', count: 0 },
        { day: 'Tue', count: 0 },
        { day: 'Wed', count: 0 },
        { day: 'Thu', count: 0 },
        { day: 'Fri', count: 0 },
        { day: 'Sat', count: 0 },
        { day: 'Sun', count: 0 },
      ];
    }

    // Calculate real weekly data from blocked emails
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysAgo = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday-based week
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysAgo);
    monday.setHours(0, 0, 0, 0);

    const dayCounts = {
      'Mon': 0,
      'Tue': 0,
      'Wed': 0,
      'Thu': 0,
      'Fri': 0,
      'Sat': 0,
      'Sun': 0,
    };

    const blockedEmails = allEmails.filter(e => e.classification === 'blocked');

    blockedEmails.forEach(email => {
      const emailDate = new Date(email.dateISO);
      if (emailDate >= monday) {
        const dayIndex = emailDate.getDay();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayName = dayNames[dayIndex] as keyof typeof dayCounts;
        dayCounts[dayName]++;
      }
    });

    return [
      { day: 'Mon', count: dayCounts.Mon },
      { day: 'Tue', count: dayCounts.Tue },
      { day: 'Wed', count: dayCounts.Wed },
      { day: 'Thu', count: dayCounts.Thu },
      { day: 'Fri', count: dayCounts.Fri },
      { day: 'Sat', count: dayCounts.Sat },
      { day: 'Sun', count: dayCounts.Sun },
    ];
  }, [hasRealData, allEmails]);

  const filteredEmails = useMemo(() => {
    return realEmails.filter(email => email.score >= scoreThreshold);
  }, [realEmails, scoreThreshold]);

  const blockedThisWeek = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return allEmails.filter(e =>
      e.classification === 'blocked' &&
      new Date(e.dateISO) >= oneWeekAgo
    ).length;
  }, [allEmails]);

  const blockedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEmails.filter(e =>
      e.classification === 'blocked' &&
      new Date(e.dateISO) >= today
    ).length;
  }, [allEmails]);

  const potentialFalsePositives = useMemo(() => {
    return Math.ceil(blockedThisWeek * falsePositiveRate);
  }, [blockedThisWeek, falsePositiveRate]);

  const timeSaved = useMemo(() => {
    return Math.round(blockedThisWeek * 0.5);
  }, [blockedThisWeek]);

  const handleRestore = async (id: string) => {
    try {
      const { data: emailData, error: emailError } = await supabase
        .from('emails')
        .select('gmail_message_id')
        .eq('id', id)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (emailError) throw emailError;
      if (!emailData) throw new Error('Email not found');

      const { data: connData, error: connError } = await supabase
        .from('gmail_connections')
        .select('access_token')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (connError) throw connError;
      if (!connData) throw new Error('No active Gmail connection');

      const labelResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailData.gmail_message_id}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${connData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            addLabelIds: ['INBOX'],
            removeLabelIds: ['TRASH'],
          }),
        }
      );

      if (!labelResponse.ok) {
        throw new Error('Failed to restore email in Gmail');
      }

      await supabase
        .from('emails')
        .update({
          classification: 'safe',
          action_taken: 'restored_to_inbox',
          label_applied: false,
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      setToastMessage('Email restored to inbox');
      setShowToast(true);
      await fetchEmails();
    } catch (err) {
      console.error('Error restoring email:', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to restore email');
      setShowToast(true);
    }
  };

  const handleSaveSettings = () => {
    setToastMessage('Settings saved successfully');
    setShowToast(true);
  };

  const handleManualSync = async (options?: { dateRange?: string; resetSync?: boolean }) => {
    setSyncing(true);
    setToastMessage('');

    try {
      // If resetSync is true, clear the last_sync_at timestamp first
      if (options?.resetSync && user) {
        await supabase
          .from('gmail_connections')
          .update({ last_sync_at: null })
          .eq('user_id', user.id)
          .eq('is_active', true);
      }

      // If dateRange is specified, set last_sync_at to that range
      if (options?.dateRange && user) {
        let hoursBack = 0;
        switch (options.dateRange) {
          case '1h':
            hoursBack = 1;
            break;
          case '24h':
            hoursBack = 24;
            break;
          case '7d':
            hoursBack = 24 * 7;
            break;
          case '30d':
            hoursBack = 24 * 30;
            break;
        }

        if (hoursBack > 0) {
          const targetDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
          await supabase
            .from('gmail_connections')
            .update({ last_sync_at: targetDate.toISOString() })
            .eq('user_id', user.id)
            .eq('is_active', true);
        }
      }

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
        setToastMessage(`Successfully synced ${totalEmails} new email${totalEmails !== 1 ? 's' : ''}`);
        setShowToast(true);
        await fetchEmails();
        await fetchLastSyncTime();
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Error syncing emails:', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to sync emails');
      setShowToast(true);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Inbox Defender</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">{user?.email}</span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {user && <GmailConnect userId={user.id} />}
        {user && <MakeWebhookConfig userId={user.id} />}
        {user && (
          <SyncStatus
            lastSyncAt={lastSyncAt}
            onManualSync={handleManualSync}
            isSyncing={syncing}
          />
        )}

        <KpiCards
          blockedThisWeek={blockedThisWeek}
          blockedToday={blockedToday}
          potentialFalsePositives={potentialFalsePositives}
          timeSaved={timeSaved}
          loading={loading}
        />

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Filter Strictness</h3>
          <StrictnessSelector
            value={strictness}
            onChange={setStrictness}
            helperText={helperText}
          />
        </div>

        <WeeklyChart data={weeklyData} />

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setShowAllEmails(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAllEmails
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            All Emails ({allEmails.length})
          </button>
          <button
            onClick={() => setShowAllEmails(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showAllEmails
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Blocked Only ({realEmails.length})
          </button>
        </div>

        {showAllEmails ? (
          <AllEmailsTable
            emails={allEmails}
            onRestore={handleRestore}
            loading={loading}
          />
        ) : (
          <BlockedTable
            emails={filteredEmails}
            onRestore={handleRestore}
            loading={loading}
          />
        )}
      </main>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        strictness={strictness}
        onStrictnessChange={setStrictness}
        digestFrequency={digestFrequency}
        onDigestFrequencyChange={setDigestFrequency}
        helperText={helperText}
        onSave={handleSaveSettings}
      />

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
