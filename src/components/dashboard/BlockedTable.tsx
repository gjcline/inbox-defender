import { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';

export interface BlockedEmail {
  id: string;
  sender: string;
  subject: string;
  score: number;
  dateISO: string;
}

interface BlockedTableProps {
  emails: BlockedEmail[];
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

export const BlockedTable = ({ emails, onRestore, loading = false }: BlockedTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmails = emails.filter(
    (email) =>
      email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Blocked Emails</h3>
        </div>
        <div className="relative">
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-900/80">
            <tr className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Subject</th>
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
                <td colSpan={5} className="py-12 text-center text-zinc-500">
                  {searchTerm ? 'No blocked emails match your search.' : 'No blocked emails found.'}
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
                  </td>
                  <td className="py-3 px-4 text-sm text-zinc-400">
                    {formatDate(email.dateISO)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onRestore(email.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
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
