import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, TrendingUp, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

interface EmailDecision {
  id: string;
  gmail_msg_id: string;
  from_email: string;
  from_domain: string;
  received_at: string;
  decision: 'unclassified' | 'outreach' | 'keep';
  mailbox_id: string;
}

interface Stats {
  total14Days: number;
  today: number;
  thisWeek: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total14Days: 0, today: 0, thisWeek: 0 });
  const [emails, setEmails] = useState<EmailDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [labeling, setLabeling] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: allDecisions, error: decisionsError } = await supabase
        .from('decisions')
        .select('*')
        .gte('received_at', fourteenDaysAgo.toISOString())
        .order('received_at', { ascending: false })
        .limit(50);

      if (decisionsError) throw decisionsError;

      const decisions = allDecisions || [];

      const total14Days = decisions.length;
      const today = decisions.filter(d =>
        new Date(d.received_at) >= startOfToday
      ).length;
      const thisWeek = decisions.filter(d =>
        new Date(d.received_at) >= startOfWeek
      ).length;

      setStats({ total14Days, today, thisWeek });
      setEmails(decisions);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLabel = async (emailId: string, gmailMsgId: string, mailboxId: string, action: 'outreach' | 'keep') => {
    setLabeling(emailId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          gmail_msg_id: gmailMsgId,
          mailbox_id: mailboxId,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply label');
      }

      await loadData();
    } catch (error) {
      console.error('Failed to apply label:', error);
      alert('Failed to apply label. Please try again.');
    } finally {
      setLabeling(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
              <Link to="/settings" className="text-gray-600 hover:text-gray-900">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Email ingestion and filtering overview</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium">Filtering is in preview</p>
            <p className="text-blue-800 text-sm">
              We're ingesting emails now. Auto-labeling will start in the next sprint.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">Last 14 Days</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total14Days}</p>
            <p className="text-sm text-gray-500 mt-1">Total emails ingested</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">Today</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.today}</p>
            <p className="text-sm text-gray-500 mt-1">Emails today</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600 font-medium">This Week</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.thisWeek}</p>
            <p className="text-sm text-gray-500 mt-1">Past 7 days</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Emails</h2>
            <p className="text-sm text-gray-600">Last 50 ingested emails</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No emails ingested yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Connect a mailbox to start seeing data
                      </p>
                    </td>
                  </tr>
                ) : (
                  emails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {email.from_email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {email.from_domain || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(email.received_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            email.decision === 'unclassified'
                              ? 'bg-gray-100 text-gray-800'
                              : email.decision === 'outreach'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {email.decision}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLabel(email.id, email.gmail_msg_id, email.mailbox_id, 'outreach')}
                          disabled={labeling === email.id || email.decision === 'outreach'}
                        >
                          {labeling === email.id ? 'Labeling...' : 'Mark Outreach'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLabel(email.id, email.gmail_msg_id, email.mailbox_id, 'keep')}
                          disabled={labeling === email.id || email.decision === 'keep'}
                        >
                          Keep
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
