import { useEffect, useRef, useState } from 'react';

interface WhyItWorksProps {
  className?: string;
  accentColor?: string;
}

export function WhyItWorks({ className = '', accentColor = 'rgb(16, 185, 129)' }: WhyItWorksProps) {
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

  const features = [
    {
      id: 'detect',
      icon: (
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      title: 'Detect',
      description: 'Recognizes cold outreach and sales sequences the moment they arrive.',
    },
    {
      id: 'deflect',
      icon: (
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
          />
        </svg>
      ),
      title: 'Deflect',
      description: 'Routes them to a quiet folder so your main inbox stays focused (undo anytime).',
    },
    {
      id: 'deter',
      icon: (
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
      title: 'Deter',
      description: 'Sends intelligent opt-out signals so repeat senders slow down over time.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`relative ${className}`}
      aria-labelledby="why-it-works-heading"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="text-center mb-12 motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <h2
            id="why-it-works-heading"
            className="text-3xl sm:text-4xl font-bold text-white mb-3"
          >
            Why it works
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Inbox Defender doesn't just hide noise—it reduces it.
          </p>
        </div>

        <div
          className="relative group/card"
          style={{
            perspective: '1000px',
          }}
        >
          <div
            className="absolute inset-0 rounded-[28px] opacity-40 blur-xl transition-opacity duration-500 group-hover/card:opacity-60"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${accentColor}15, transparent 70%)`,
            }}
          />

          <div
            className="relative backdrop-blur-md rounded-[28px] p-0.5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />

            <div className="relative bg-gradient-to-br from-zinc-900/95 via-zinc-900/98 to-black/95 rounded-[27px] shadow-2xl">
              <div
                className="absolute inset-0 rounded-[27px] opacity-30"
                style={{
                  background: `radial-gradient(circle at 30% 20%, ${accentColor}08, transparent 50%)`,
                }}
              />

              <ul className="relative grid grid-cols-1 md:grid-cols-3 gap-0">
                {features.map((feature, index) => (
                  <li
                    key={feature.id}
                    className="group/item relative"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {index > 0 && (
                      <div
                        className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-24 bg-gradient-to-b from-transparent via-zinc-700/50 to-transparent"
                        aria-hidden="true"
                      />
                    )}

                    <div
                      className="relative p-8 sm:p-10 h-full motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
                        transitionDelay: `${index * 150}ms`,
                      }}
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                          <div
                            className="absolute inset-0 rounded-full opacity-0 blur-xl motion-safe:transition-all motion-safe:duration-500 group-hover/item:opacity-100"
                            style={{
                              background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
                            }}
                          />

                          <div
                            className="relative w-16 h-16 rounded-full flex items-center justify-center motion-safe:transition-all motion-safe:duration-500 group-hover/item:scale-110 group-hover/item:-translate-y-1 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900"
                            style={{
                              background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}08)`,
                              boxShadow: `0 0 0 1px ${accentColor}15, 0 4px 12px -2px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05)`,
                            }}
                          >
                            <div
                              className="text-emerald-400 motion-safe:transition-transform motion-safe:duration-500 group-hover/item:scale-110"
                              style={{ color: accentColor }}
                            >
                              {feature.icon}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-white motion-safe:transition-colors motion-safe:duration-300 group-hover/item:text-emerald-400">
                            {feature.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-zinc-400 max-w-xs mx-auto">
                            {feature.description}
                          </p>
                        </div>
                      </div>

                      <div
                        className="absolute inset-0 rounded-[27px] opacity-0 motion-safe:transition-opacity motion-safe:duration-500 group-hover/item:opacity-100 pointer-events-none"
                        style={{
                          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${accentColor}06, transparent 40%)`,
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
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
