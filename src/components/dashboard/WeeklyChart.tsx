import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Mail } from 'lucide-react';

interface WeeklyChartProps {
  data: Array<{ day: string; count: number }>;
}

export const WeeklyChart = ({ data }: WeeklyChartProps) => {
  const hasData = data.some(d => d.count > 0);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">
        Blocked emails by day (this week)
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="day"
              stroke="#71717a"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#71717a"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelStyle={{ color: '#a1a1aa' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 text-sm">No blocked emails this week</p>
          <p className="text-zinc-500 text-xs mt-1">Connect Gmail to start tracking</p>
        </div>
      )}
    </div>
  );
};
