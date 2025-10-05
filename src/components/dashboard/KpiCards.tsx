import { useEffect, useState } from 'react';
import { Shield, TrendingDown, AlertTriangle, Clock } from 'lucide-react';

interface KpiCardsProps {
  blockedThisWeek: number;
  blockedToday: number;
  potentialFalsePositives: number;
  timeSaved: number;
  loading?: boolean;
}

const CountUp = ({ end, duration = 1000 }: { end: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const SkeletonCard = () => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 animate-pulse">
    <div className="h-10 w-10 bg-zinc-800 rounded-xl mb-4" />
    <div className="h-8 w-24 bg-zinc-800 rounded mb-2" />
    <div className="h-4 w-32 bg-zinc-800 rounded" />
  </div>
);

export const KpiCards = ({
  blockedThisWeek,
  blockedToday,
  potentialFalsePositives,
  timeSaved,
  loading = false,
}: KpiCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const cards = [
    {
      icon: Shield,
      label: 'Blocked this week',
      value: blockedThisWeek,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
    },
    {
      icon: TrendingDown,
      label: 'Blocked today',
      value: blockedToday,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
    },
    {
      icon: AlertTriangle,
      label: 'Potential false positives',
      value: potentialFalsePositives,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    },
    {
      icon: Clock,
      label: 'Time saved',
      value: timeSaved,
      suffix: 'min',
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
          >
            <div className={`${card.iconBg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div className="text-3xl font-semibold text-white mb-1">
              <CountUp end={card.value} />
              {card.suffix && <span className="text-lg text-zinc-400 ml-1">{card.suffix}</span>}
            </div>
            <div className="text-sm text-zinc-400">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
};
