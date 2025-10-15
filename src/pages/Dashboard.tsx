// Later we will replace mock data with API:
// GET /api/reports/weekly
// GET /api/messages/blocked?limit=50
// POST /api/settings (strictness, digest_frequency)
// POST /api/gmail/label/restore { gmail_msg_id }

import { useState, useEffect, useMemo } from 'react';
import { Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
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

const BASE_WEEKLY_DATA = [
  { day: 'Mon', count: 42 },
  { day: 'Tue', count: 37 },
  { day: 'Wed', count: 51 },
  { day: 'Thu', count: 34 },
  { day: 'Fri', count: 29 },
  { day: 'Sat', count: 18 },
  { day: 'Sun', count: 22 },
];

const MOCK_BLOCKED_EMAILS: BlockedEmail[] = [
  { id: '1', sender: 'sara@leadgenpro.io', subject: 'Quick intro to 10x pipeline', score: 0.86, dateISO: '2025-10-05T10:32:00Z' },
  { id: '2', sender: 'mark@outreach.agency', subject: 'Scaling your B2B sales', score: 0.91, dateISO: '2025-10-05T09:15:00Z' },
  { id: '3', sender: 'alex@growthhacks.com', subject: 'Partnership opportunity?', score: 0.78, dateISO: '2025-10-05T08:42:00Z' },
  { id: '4', sender: 'jenny@salesboost.net', subject: 'Re: Your LinkedIn profile', score: 0.82, dateISO: '2025-10-04T16:20:00Z' },
  { id: '5', sender: 'david@prospectpro.io', subject: 'Increase conversions by 200%', score: 0.89, dateISO: '2025-10-04T14:55:00Z' },
  { id: '6', sender: 'lisa@marketingwhiz.com', subject: 'Quick question about your business', score: 0.75, dateISO: '2025-10-04T11:30:00Z' },
  { id: '7', sender: 'tom@leadgen360.com', subject: 'Free demo available', score: 0.84, dateISO: '2025-10-04T09:18:00Z' },
  { id: '8', sender: 'emily@bizgrowth.io', subject: 'Saw your company on LinkedIn', score: 0.79, dateISO: '2025-10-03T15:45:00Z' },
  { id: '9', sender: 'chris@salesengine.net', subject: 'Exclusive invite for you', score: 0.87, dateISO: '2025-10-03T13:22:00Z' },
  { id: '10', sender: 'rachel@outboundpro.com', subject: 'Let\'s connect this week', score: 0.72, dateISO: '2025-10-03T10:10:00Z' },
  { id: '11', sender: 'mike@growthstrat.io', subject: 'Your competitors are doing this', score: 0.88, dateISO: '2025-10-02T16:35:00Z' },
  { id: '12', sender: 'susan@leadstream.com', subject: 'Thought you might be interested', score: 0.76, dateISO: '2025-10-02T14:12:00Z' },
  { id: '13', sender: 'james@prospector.net', subject: 'Quick chat about growth?', score: 0.81, dateISO: '2025-10-02T11:45:00Z' },
  { id: '14', sender: 'anna@bizdev360.io', subject: 'Introducing our new platform', score: 0.85, dateISO: '2025-10-01T15:20:00Z' },
  { id: '15', sender: 'kevin@salesautomation.com', subject: 'Automate your outreach', score: 0.90, dateISO: '2025-10-01T12:05:00Z' },
  { id: '16', sender: 'nicole@leadfactory.io', subject: 'Generate 500+ leads/month', score: 0.83, dateISO: '2025-10-01T09:30:00Z' },
  { id: '17', sender: 'brian@growthhacker.net', subject: 'See how we helped [Company]', score: 0.77, dateISO: '2025-09-30T14:50:00Z' },
  { id: '18', sender: 'karen@salesops.io', subject: 'Noticed you\'re hiring', score: 0.74, dateISO: '2025-09-30T11:15:00Z' },
  { id: '19', sender: 'steve@prospecting.com', subject: 'New way to reach customers', score: 0.86, dateISO: '2025-09-30T08:40:00Z' },
  { id: '20', sender: 'melissa@outreach247.io', subject: 'Can I send you some info?', score: 0.80, dateISO: '2025-09-29T16:25:00Z' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    strictness,
    setStrictness,
    digestFrequency,
    setDigestFrequency,
    multiplier,
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
    return BASE_WEEKLY_DATA.map(({ day, count }) => ({
      day,
      count: Math.min(Math.round(count * multiplier), 99),
    }));
  }, [multiplier]);

  const emailsToDisplay = hasRealData ? realEmails : MOCK_BLOCKED_EMAILS;

  const filteredEmails = useMemo(() => {
    return emailsToDisplay.filter(email => email.score >= scoreThreshold);
  }, [emailsToDisplay, scoreThreshold]);

  const blockedThisWeek = useMemo(() => {
    if (hasRealData) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return allEmails.filter(e =>
        e.classification === 'blocked' &&
        new Date(e.dateISO) >= oneWeekAgo
      ).length;
    }
    return weeklyData.reduce((sum, day) => sum + day.count, 0);
  }, [weeklyData, allEmails, hasRealData]);

  const blockedToday = useMemo(() => {
    if (hasRealData) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return allEmails.filter(e =>
        e.classification === 'blocked' &&
        new Date(e.dateISO) >= today
      ).length;
    }
    return Math.round(BASE_WEEKLY_DATA[0].count * multiplier);
  }, [multiplier, allEmails, hasRealData]);

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
