import { useEffect, useRef, useState } from 'react';
import { Clock, Shield, BarChart3 } from 'lucide-react';

interface BenefitsSectionProps {
  className?: string;
  accentColor?: string;
}

export function BenefitsSection({ className = '', accentColor = 'rgb(59, 130, 246)' }: BenefitsSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  const benefits = [
    {
      id: 'save-time',
      icon: Clock,
      title: 'Save time',
      description: 'Less noise, more signal',
      gradient: 'from-orange-500/20 via-orange-500/10 to-transparent',
      iconColor: 'text-orange-400',
      glowColor: 'rgba(251, 146, 60, 0.3)',
    },
    {
      id: 'safer-defaults',
      icon: Shield,
      title: 'Safer defaults',
      description: 'Allowlist your contacts',
      gradient: 'from-blue-500/20 via-blue-500/10 to-transparent',
      iconColor: 'text-blue-400',
      glowColor: 'rgba(59, 130, 246, 0.3)',
    },
    {
      id: 'weekly-digest',
      icon: BarChart3,
      title: 'Weekly digest',
      description: 'See what we caught + restore',
      gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      iconColor: 'text-emerald-400',
      glowColor: 'rgba(16, 185, 129, 0.3)',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`relative ${className}`}
      aria-label="Key benefits"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={benefit.id}
                className="group/benefit relative"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div
                  className="relative h-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                    transitionDelay: `${index * 150}ms`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 blur-2xl motion-safe:transition-all motion-safe:duration-700 group-hover/benefit:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 30%, ${benefit.glowColor}, transparent 70%)`,
                    }}
                  />

                  <div
                    className="relative backdrop-blur-md rounded-3xl p-0.5 overflow-hidden h-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.02]"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                      }}
                    />

                    <div className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-900/98 to-black/95 rounded-[calc(1.5rem-2px)] p-10 h-full flex flex-col items-center text-center">
                      <div
                        className={`absolute inset-0 rounded-[calc(1.5rem-2px)] bg-gradient-to-br ${benefit.gradient} opacity-0 motion-safe:transition-opacity motion-safe:duration-500 group-hover/benefit:opacity-100`}
                      />

                      <div className="relative mb-6">
                        <div
                          className="absolute inset-0 rounded-full opacity-0 blur-2xl motion-safe:transition-all motion-safe:duration-500 group-hover/benefit:opacity-100"
                          style={{
                            background: `radial-gradient(circle, ${benefit.glowColor}, transparent 70%)`,
                            transform: 'scale(1.2)',
                          }}
                        />

                        <div
                          className="relative w-20 h-20 rounded-full flex items-center justify-center motion-safe:transition-all motion-safe:duration-500 group-hover/benefit:scale-110 group-hover/benefit:-translate-y-2 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${benefit.glowColor.replace('0.3', '0.15')}, ${benefit.glowColor.replace('0.3', '0.05')})`,
                            boxShadow: `0 0 0 1px ${benefit.glowColor.replace('0.3', '0.1')}, 0 8px 24px -4px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.03)`,
                          }}
                        >
                          <Icon
                            className={`w-9 h-9 ${benefit.iconColor} motion-safe:transition-all motion-safe:duration-500 group-hover/benefit:scale-110`}
                            strokeWidth={1.5}
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <div className="relative space-y-3">
                        <h3 className="text-2xl font-bold text-white motion-safe:transition-all motion-safe:duration-300 group-hover/benefit:text-opacity-90">
                          {benefit.title}
                        </h3>
                        <p className="text-base text-zinc-400 motion-safe:transition-colors motion-safe:duration-300 group-hover/benefit:text-zinc-300">
                          {benefit.description}
                        </p>
                      </div>

                      <div
                        className="absolute inset-0 rounded-[calc(1.5rem-2px)] opacity-0 motion-safe:transition-opacity motion-safe:duration-500 group-hover/benefit:opacity-100 pointer-events-none"
                        style={{
                          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${benefit.glowColor.replace('0.3', '0.08')}, transparent 40%)`,
                        }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                          e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
                        }}
                      />
                    </div>
                  </div>

                  <div
                    className="absolute -inset-1 rounded-3xl opacity-0 motion-safe:transition-opacity motion-safe:duration-500 group-hover/benefit:opacity-30 blur-xl pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${benefit.glowColor.replace('0.3', '0.2')}, transparent)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
