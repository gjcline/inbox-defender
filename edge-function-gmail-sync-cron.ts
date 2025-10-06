/*
  # Gmail Sync Cron Edge Function

  Deploy this as a Supabase Edge Function named "gmail-sync-cron"

  1. Go to: https://supabase.com/dashboard/project/bazeyxgsgodhnwckttxi/functions
  2. Create new function called "gmail-sync-cron"
  3. Paste this code
  4. Set up Supabase Cron to call this every 10 minutes:
     - Go to Database > Cron Jobs
     - Add: SELECT net.http_post('https://bazeyxgsgodhnwckttxi.supabase.co/functions/v1/gmail-sync-cron', '{}', '{"Authorization": "Bearer SERVICE_ROLE_KEY"}')
     - Schedule: */10 * * * * (every 10 minutes)

  This function:
  - Fetches all active Gmail connections
  - For each connection, fetches new emails since last sync
  - Sends emails to Make.com webhook for AI classification
  - Stores email metadata in database with 'pending\' status
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connections, error: connectionsError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('is_active', true)
      .not('make_webhook_url', 'is', null);

    if (connectionsError) throw connectionsError;

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active connections to sync' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = [];

    for (const connection of connections) {
      try {
        const accessToken = connection.access_token_encrypted;

        const lastSyncDate = connection.last_sync_at
          ? new Date(connection.last_sync_at)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const afterTimestamp = Math.floor(lastSyncDate.getTime() / 1000);

        const gmailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${afterTimestamp} in:inbox&maxResults=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!gmailResponse.ok) {
          console.error(`Gmail API error for user ${connection.user_id}:`, await gmailResponse.text());
          continue;
        }

        const gmailData = await gmailResponse.json();
        const messageIds = gmailData.messages || [];

        if (messageIds.length === 0) {
          await supabase
            .from('gmail_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', connection.id);

          results.push({ user_id: connection.user_id, new_emails: 0 });
          continue;
        }

        const emailDetails = [];

        for (const msgRef of messageIds) {
          const msgResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (msgResponse.ok) {
            const message: GmailMessage = await msgResponse.json();
            const headers = message.payload.headers;

            const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
            const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
            const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

            const senderEmail = from.match(/<(.+?)>/)?.[1] || from;
            const senderName = from.replace(/<.+?>/, '').trim().replace(/"/g, '');

            emailDetails.push({
              message_id: message.id,
              thread_id: message.threadId,
              from: from,
              sender_email: senderEmail,
              sender_name: senderName,
              subject: subject,
              snippet: message.snippet,
              received_date: new Date(parseInt(message.internalDate)).toISOString(),
              label_ids: message.labelIds,
            });

            const { error: insertError } = await supabase
              .from('emails')
              .insert({
                user_id: connection.user_id,
                gmail_message_id: message.id,
                thread_id: message.threadId,
                subject: subject,
                sender_email: senderEmail,
                sender_name: senderName,
                snippet: message.snippet,
                received_at: new Date(parseInt(message.internalDate)).toISOString(),
                classification: 'pending',
                make_webhook_sent_at: new Date().toISOString(),
              })
              .select()
              .maybeSingle();

            if (insertError && !insertError.message.includes('duplicate')) {
              console.error('Error inserting email:', insertError);
            }
          }
        }

        if (emailDetails.length > 0 && connection.make_webhook_url) {
          const webhookPayload = {
            user_id: connection.user_id,
            gmail_connection_id: connection.id,
            user_email: connection.email_address,
            access_token: accessToken,
            emails: emailDetails,
          };

          await fetch(connection.make_webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
          });
        }

        await supabase
          .from('gmail_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        results.push({
          user_id: connection.user_id,
          new_emails: emailDetails.length
        });

      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
        results.push({
          user_id: connection.user_id,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: connections.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in gmail-sync-cron:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
