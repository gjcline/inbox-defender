import { useState } from 'react';
import { Search, RotateCcw, Mail } from 'lucide-react';

export interface EmailWithStatus {
  id: string;
  sender: string;
  subject: string;
  score: number;
  dateISO: string;
  classification: string;
  movedToFolder?: boolean;
}

interface AllEmailsTableProps {
  emails: EmailWithStatus[];
  onRestore: (id: string) => void;
  loading?: boolean;
}

const SkeletonRow = () => (
  <tr className="border-b border-zinc-800 animate-pulse">
    <td className="py-3 px-4">
      <div className="h-4 w-48 bg-zinc-800 rounded" />
    </td>
    <td className="py-3 px-4">
      <div className="h-4 w-64 bg-zinc-800 rounded" />
    </td>
    <td className="py-3 px-4">
      <div className="h-6 w-20 bg-zinc-800 rounded" />
    </td>
    <td className="py-3 px-4">
      <div className="h-4 w-16 bg-zinc-800 rounded" />
    </td>
    <td className="py-3 px-4">
      <div className="h-4 w-24 bg-zinc-800 rounded" />
    </td>
    <td className="py-3 px-4">
      <div className="h-8 w-20 bg-zinc-800 rounded" />
    </td>
  </tr>
);

const getClassificationBadge = (classification: string) => {
  switch (classification?.toLowerCase()) {
    case 'personal':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Personal
        </span>
      );
    case 'conversations':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          Conversations
        </span>
      );
    case 'inbox':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Inbox
        </span>
      );
    case 'marketing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Marketing
        </span>
      );
    case 'cold_outreach':
    case 'cold outreach':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Cold Outreach
        </span>
      );
    case 'spam':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          Spam
        </span>
      );
    case 'pending':
    case null:
    case undefined:
    case '':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Pending
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-600/20">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          {classification || 'Unknown'}
        </span>
      );
  }
};

export const AllEmailsTable = ({ emails, onRestore, loading = false }: AllEmailsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = false;
    if (filterStatus === 'all') {
      matchesFilter = true;
    } else if (filterStatus === 'pending') {
      matchesFilter = !email.classification || email.classification === 'pending';
    } else {
      matchesFilter = email.classification?.toLowerCase() === filterStatus.toLowerCase() ||
                      email.classification?.toLowerCase().replace(' ', '_') === filterStatus.toLowerCase();
    }

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateISO: string) => {
    const date = new Date(dateISO);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const statusCounts = {
    all: emails.length,
    pending: emails.filter(e => !e.classification || e.classification === 'pending').length,
    personal: emails.filter(e => e.classification?.toLowerCase() === 'personal').length,
    conversations: emails.filter(e => e.classification?.toLowerCase() === 'conversations').length,
    inbox: emails.filter(e => e.classification?.toLowerCase() === 'inbox').length,
    marketing: emails.filter(e => e.classification?.toLowerCase() === 'marketing').length,
    cold_outreach: emails.filter(e => e.classification?.toLowerCase() === 'cold_outreach' || e.classification?.toLowerCase() === 'cold outreach').length,
    spam: emails.filter(e => e.classification?.toLowerCase() === 'spam').length,
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">All Synced Emails</h3>
          </div>
          <div className="text-sm text-zinc-400">
            {emails.length} total
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by sender or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Pending ({statusCounts.pending})
          </button>
          <button
            onClick={() => setFilterStatus('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'personal'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Personal ({statusCounts.personal})
          </button>
          <button
            onClick={() => setFilterStatus('conversations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'conversations'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Conversations ({statusCounts.conversations})
          </button>
          <button
            onClick={() => setFilterStatus('inbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'inbox'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Inbox ({statusCounts.inbox})
          </button>
          <button
            onClick={() => setFilterStatus('marketing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'marketing'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Marketing ({statusCounts.marketing})
          </button>
          <button
            onClick={() => setFilterStatus('cold_outreach')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'cold_outreach'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Cold Outreach ({statusCounts.cold_outreach})
          </button>
          <button
            onClick={() => setFilterStatus('spam')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'spam'
                ? 'bg-zinc-600/20 text-zinc-300 border border-zinc-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            Spam ({statusCounts.spam})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-900/80">
            <tr className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  {searchTerm || filterStatus !== 'all'
                    ? 'No emails match your filters.'
                    : 'No emails synced yet. Connect Gmail and sync to see your emails here.'}
                </td>
              </tr>
            ) : (
              filteredEmails.map((email) => (
                <tr
                  key={email.id}
                  className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-zinc-300 max-w-xs truncate">
                    {email.sender}
                  </td>
                  <td className="py-3 px-4 text-sm text-white max-w-md truncate">
                    {email.subject}
                  </td>
                  <td className="py-3 px-4">
                    {getClassificationBadge(email.classification)}
                  </td>
                  <td className="py-3 px-4">
                    {email.score > 0 ? (
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          email.score >= 0.8
                            ? 'bg-red-500/10 text-red-400'
                            : email.score >= 0.7
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {(email.score * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-400">
                    {formatDate(email.dateISO)}
                  </td>
                  <td className="py-3 px-4">
                    {email.classification && email.classification !== 'pending' ? (
                      email.movedToFolder ? (
                        <span className="text-xs text-zinc-400">
                          Moved to {email.classification.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-400">
                          Classified
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-amber-400">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
