/*
  # Webhook Receiver from Make.com Edge Function

  Deploy this as a Supabase Edge Function named "webhook-from-make"

  1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
  2. Create new function called "webhook-from-make"
  3. Paste this code
  4. Set verify_jwt to FALSE (this is a public webhook that Make.com will call)

  This function:
  - Receives classification results from Make.com
  - Updates emails table with classification, AI score, and reasoning
  - Updates blocked_senders table if email is classified as blocked
  - Returns success/error response to Make.com

  Expected payload from Make.com:
  {
    "user_id": "uuid",
    "results": [
      {
        "message_id": "gmail_msg_id",
        "classification": "blocked" or "safe",
        "ai_confidence_score": 0.92,
        "ai_reasoning": "This is a cold outreach email...",
        "action_taken": "auto_replied_and_archived"
      }
    ]
  }
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailResult {
  message_id: string;
  classification: 'blocked' | 'safe';
  ai_confidence_score: number;
  ai_reasoning: string;
  action_taken?: string;
}

interface WebhookPayload {
  user_id: string;
  results: EmailResult[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (!payload.user_id || !payload.results || !Array.isArray(payload.results)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updates = [];
    const errors = [];

    for (const result of payload.results) {
      try {
        const { data: email, error: fetchError } = await supabase
          .from('emails')
          .select('*')
          .eq('user_id', payload.user_id)
          .eq('gmail_message_id', result.message_id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching email:', fetchError);
          errors.push({ message_id: result.message_id, error: fetchError.message });
          continue;
        }

        if (!email) {
          errors.push({ message_id: result.message_id, error: 'Email not found' });
          continue;
        }

        const { error: updateError } = await supabase
          .from('emails')
          .update({
            classification: result.classification,
            ai_confidence_score: result.ai_confidence_score,
            ai_reasoning: result.ai_reasoning,
            action_taken: result.action_taken || null,
            processed_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        if (updateError) {
          console.error('Error updating email:', updateError);
          errors.push({ message_id: result.message_id, error: updateError.message });
          continue;
        }

        if (result.classification === 'blocked') {
          const { error: blockedError } = await supabase
            .from('blocked_senders')
            .upsert(
              {
                user_id: payload.user_id,
                email_address: email.sender_email,
                sender_name: email.sender_name,
                blocked_at: new Date().toISOString(),
                block_reason: 'ai_classified',
                total_emails_blocked: 1,
              },
              {
                onConflict: 'user_id,email_address',
                ignoreDuplicates: false,
              }
            );

          if (blockedError && !blockedError.message.includes('duplicate')) {
            const { data: existingSender } = await supabase
              .from('blocked_senders')
              .select('total_emails_blocked')
              .eq('user_id', payload.user_id)
              .eq('email_address', email.sender_email)
              .maybeSingle();

            if (existingSender) {
              await supabase
                .from('blocked_senders')
                .update({
                  total_emails_blocked: existingSender.total_emails_blocked + 1,
                })
                .eq('user_id', payload.user_id)
                .eq('email_address', email.sender_email);
            }
          }
        }

        updates.push({
          message_id: result.message_id,
          status: 'updated',
        });

      } catch (error) {
        console.error(`Error processing result for ${result.message_id}:`, error);
        errors.push({
          message_id: result.message_id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: payload.results.length,
        updated: updates.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in webhook-from-make:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
