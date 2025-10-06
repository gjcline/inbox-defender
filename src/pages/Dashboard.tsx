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
import { SettingsDrawer } from '../components/dashboard/SettingsDrawer';
import { Toast } from '../components/dashboard/Toast';

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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const weeklyData = useMemo(() => {
    return BASE_WEEKLY_DATA.map(({ day, count }) => ({
      day,
      count: Math.min(Math.round(count * multiplier), 99),
    }));
  }, [multiplier]);

  const filteredEmails = useMemo(() => {
    return MOCK_BLOCKED_EMAILS.filter(email => email.score >= scoreThreshold);
  }, [scoreThreshold]);

  const blockedThisWeek = useMemo(() => {
    return weeklyData.reduce((sum, day) => sum + day.count, 0);
  }, [weeklyData]);

  const blockedToday = useMemo(() => {
    return Math.round(BASE_WEEKLY_DATA[0].count * multiplier);
  }, [multiplier]);

  const potentialFalsePositives = useMemo(() => {
    return Math.ceil(blockedThisWeek * falsePositiveRate);
  }, [blockedThisWeek, falsePositiveRate]);

  const timeSaved = useMemo(() => {
    return Math.round(blockedThisWeek * 0.5);
  }, [blockedThisWeek]);

  const handleRestore = (id: string) => {
    setToastMessage('Restored (demo)');
    setShowToast(true);
  };

  const handleSaveSettings = () => {
    setToastMessage('Settings saved successfully');
    setShowToast(true);
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

        <BlockedTable
          emails={filteredEmails}
          onRestore={handleRestore}
          loading={loading}
        />
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
