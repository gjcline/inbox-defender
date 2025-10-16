import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function GmailCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // This page is now mostly unused in the new OAuth flow
    // The Edge Function redirects directly to /dashboard with query params
    // This page only exists as a fallback or for legacy compatibility
    console.log('⚠️ GmailCallback page loaded - this should not happen in the new OAuth flow');
    console.log('The Edge Function should redirect directly to /dashboard');

    // Redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-900/30 rounded-full mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Redirecting</h2>
          <p className="text-zinc-400">Taking you to the dashboard...</p>
        </div>
      </div>
    </div>
  );
}
