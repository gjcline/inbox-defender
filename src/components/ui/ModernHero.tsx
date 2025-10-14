import { useEffect, useState } from 'react';
import { Button } from './button';
import { Shield, Mail } from 'lucide-react';

interface ModernHeroProps {
  onGetStarted?: () => void;
  isLoading?: boolean;
}

interface FloatingChip {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

export function ModernHero({ onGetStarted, isLoading = false }: ModernHeroProps) {
  const [floatingChips, setFloatingChips] = useState<FloatingChip[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!prefersReducedMotion) {
      const chips: FloatingChip[] = [
        { id: 1, x: 15, y: 25, delay: 0, duration: 25 },
        { id: 2, x: 82, y: 45, delay: 3, duration: 30 },
        { id: 3, x: 25, y: 70, delay: 6, duration: 28 },
      ];
      setFloatingChips(chips);
    }
  }, [prefersReducedMotion]);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(30, 58, 138, 0.15) 0%, rgba(0, 0, 0, 0) 60%), radial-gradient(ellipse 60% 40% at 50% 10%, rgba(37, 99, 235, 0.08) 0%, rgba(0, 0, 0, 0) 50%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="absolute bottom-0 left-0 w-[45%] h-[55%] opacity-[0.09] pointer-events-none">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-full h-full"
          style={{ filter: 'blur(2px)' }}
        >
          <path
            d="M12 22C10.8954 22 10 21.1046 10 20V11.618L4.55279 9.89443C3.63423 9.56462 3 8.69457 3 7.72343V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7.72343C21 8.69457 20.3658 9.56462 19.4472 9.89443L14 11.618V20C14 21.1046 13.1046 22 12 22Z"
            fill="currentColor"
            className="text-blue-500"
            opacity="0.4"
          />
          <path
            d="M10 20V11.618L4.55279 9.89443C3.63423 9.56462 3 8.69457 3 7.72343V5C3 3.89543 3.89543 3 5 3H12V22C10.8954 22 10 21.1046 10 20Z"
            fill="currentColor"
            className="text-blue-400"
            opacity="0.6"
          />
        </svg>
      </div>

      {!prefersReducedMotion && floatingChips.map((chip) => (
        <div
          key={chip.id}
          className="absolute pointer-events-none opacity-[0.05]"
          style={{
            left: `${chip.x}%`,
            top: `${chip.y}%`,
            animation: `float-${chip.id} ${chip.duration}s ease-in-out infinite`,
            animationDelay: `${chip.delay}s`,
            filter: 'blur(1.5px)',
          }}
        >
          <Mail className="w-8 h-8 text-blue-400" />
        </div>
      ))}

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.15] pointer-events-none blur-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
          }}
        />

        <h1 className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.1] tracking-tight mb-8">
          Stop cold emails from
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(34, 211, 238) 100%)',
            }}
          >
            cluttering your inbox
          </span>
        </h1>

        <p className="relative text-lg sm:text-xl md:text-2xl text-white/75 max-w-3xl mx-auto mb-12 leading-relaxed">
          AI-powered email filtering that keeps your inbox clean without missing important messages
        </p>

        <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Button
            onClick={onGetStarted}
            disabled={isLoading}
            size="lg"
            className="text-base sm:text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)',
            }}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Start Free Trial'
            )}
          </Button>

          <Button
            onClick={onGetStarted}
            disabled={isLoading}
            size="lg"
            variant="outline"
            className="text-base sm:text-lg px-8 py-6 bg-transparent hover:bg-white/5 text-white font-semibold rounded-lg border-2 border-white/20 hover:border-white/40 transition-all duration-300 focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Gmail
          </Button>
        </div>

        <div className="relative flex items-center justify-center gap-3 text-sm text-white/60">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span>Secure Google OAuth</span>
          </div>
          <span className="text-white/30">•</span>
          <span>No password sharing</span>
          <span className="text-white/30">•</span>
          <span>You stay in control</span>
        </div>
      </div>

      {!prefersReducedMotion && (
        <style>{`
          @keyframes float-1 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.05; }
            25% { transform: translate(15px, -20px) rotate(5deg); opacity: 0.08; }
            50% { transform: translate(25px, -10px) rotate(-3deg); opacity: 0.06; }
            75% { transform: translate(10px, 15px) rotate(8deg); opacity: 0.07; }
          }
          @keyframes float-2 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.04; }
            25% { transform: translate(-20px, 15px) rotate(-6deg); opacity: 0.07; }
            50% { transform: translate(-10px, 25px) rotate(4deg); opacity: 0.05; }
            75% { transform: translate(-25px, 5px) rotate(-8deg); opacity: 0.06; }
          }
          @keyframes float-3 {
            0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.05; }
            25% { transform: translate(18px, 12px) rotate(7deg); opacity: 0.06; }
            50% { transform: translate(-5px, 20px) rotate(-5deg); opacity: 0.08; }
            75% { transform: translate(22px, -8px) rotate(6deg); opacity: 0.04; }
          }
        `}</style>
      )}
    </section>
  );
}
