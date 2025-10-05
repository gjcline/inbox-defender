import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export function Connect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      setStatus('connecting');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/auth-google-start`);

      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to initiate connection');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Gmail</h1>
            <p className="text-gray-600">
              Secure OAuth connection to start filtering your inbox
            </p>
          </div>

          {status === 'idle' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Secure & Private</p>
                    <p className="text-sm text-gray-600">We only access email metadata, never content</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Easy to Remove</p>
                    <p className="text-sm text-gray-600">Disconnect anytime from settings</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">No Passwords</p>
                    <p className="text-sm text-gray-600">Uses Google OAuth for authentication</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleConnect} className="w-full" size="lg">
                Connect Gmail Account
              </Button>
            </div>
          )}

          {status === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Setting up your mailbox connection...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Connection Successful!</p>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Connection Failed</p>
              <p className="text-gray-600 mb-6">{message}</p>
              <Button onClick={handleConnect} variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
