import { useState, useEffect } from 'react';
import { Webhook, Save, CheckCircle, AlertCircle, Info, Code } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MakeWebhookConfigProps {
  userId: string;
}

export function MakeWebhookConfig({ userId }: MakeWebhookConfigProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    loadWebhookUrl();
  }, [userId]);

  const loadWebhookUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('gmail_connections')
        .select('make_webhook_url')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const url = data?.make_webhook_url || 'https://hook.us2.make.com/7lw1o5aue39unp8vdxb56y1ny4abtskw';
      setWebhookUrl(url);
      setSavedUrl(url);
    } catch (err) {
      console.error('Error loading webhook URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('gmail_connections')
        .update({ make_webhook_url: webhookUrl })
        .eq('user_id', userId);

      if (error) throw error;

      setSavedUrl(webhookUrl);
      setMessage({ type: 'success', text: 'Webhook URL saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving webhook URL:', err);
      setMessage({ type: 'error', text: 'Failed to save webhook URL' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = webhookUrl !== savedUrl;

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-48 mb-4"></div>
          <div className="h-10 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-900/30 rounded-lg flex-shrink-0">
          <Webhook className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white mb-1">Make.com Webhook URL</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Enter your Make.com webhook URL to receive emails for AI classification
          </p>

          <div className="space-y-3">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hook.us1.make.com/your-webhook-url"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {message && (
              <div className={`flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Webhook URL'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">
          Your Supabase webhook endpoint (to send results back from Make.com):
        </p>
        <code className="text-xs text-blue-400 bg-zinc-800/50 px-2 py-1 rounded mt-1 block">
          {import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-from-make
        </code>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <button
          onClick={() => setShowDocs(!showDocs)}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Info className="w-4 h-4" />
          {showDocs ? 'Hide' : 'Show'} Webhook Format Documentation
        </button>

        {showDocs && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-white">Payload Sent TO Your Make.com Webhook</h4>
              </div>
              <pre className="text-xs bg-zinc-950 border border-zinc-700 rounded-lg p-3 overflow-x-auto">
                <code className="text-zinc-300">{`{
  "user_id": "uuid",
  "gmail_connection_id": "uuid",
  "user_email": "user@example.com",
  "access_token": "google_oauth_token",
  "emails": [
    {
      "message_id": "gmail_message_id",
      "thread_id": "gmail_thread_id",
      "from": "Full Name <email@domain.com>",
      "sender_email": "email@domain.com",
      "sender_name": "Full Name",
      "subject": "Email subject",
      "snippet": "Email preview text...",
      "received_date": "2025-10-14T10:30:00Z",
      "label_ids": ["INBOX", "UNREAD"],
      "current_classification": "pending"
    }
  ],
  "sync_info": {
    "is_first_sync": false,
    "total_emails": 10,
    "sync_timestamp": "2025-10-14T10:30:00Z"
  }
}`}</code>
              </pre>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">Expected Response FROM Make.com</h4>
              </div>
              <p className="text-xs text-zinc-400 mb-2">
                Your Make.com automation should POST this format back to the webhook-from-make endpoint:
              </p>
              <pre className="text-xs bg-zinc-950 border border-zinc-700 rounded-lg p-3 overflow-x-auto">
                <code className="text-zinc-300">{`{
  "user_id": "uuid",
  "access_token": "google_oauth_token",
  "results": [
    {
      "message_id": "gmail_message_id",
      "classification": "blocked",
      "ai_confidence_score": 0.85,
      "ai_reasoning": "This is a cold outreach email...",
      "action_taken": "labeled_and_archived"
    }
  ]
}`}</code>
              </pre>
              <div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-300">
                  <strong>Note:</strong> classification must be either "blocked" or "safe". Include the access_token so the system can automatically label emails in Gmail.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
