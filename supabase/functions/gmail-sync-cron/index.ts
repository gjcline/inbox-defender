import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: connections, error: connectionsError } = await supabase
      .from("gmail_connections")
      .select("*, mailboxes(email_address)")
      .eq("is_active", true);

    if (connectionsError) throw connectionsError;

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active connections to sync" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    for (const connection of connections) {
      try {
        const accessToken = connection.access_token;

        // On first sync, fetch from 30 days ago to catch recent history
        // On subsequent syncs, fetch from last sync timestamp with 5-minute buffer
        const lastSyncDate = connection.last_sync_at
          ? new Date(connection.last_sync_at)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Subtract 5 minutes buffer to prevent missing emails from edge cases
        const bufferMs = 5 * 60 * 1000;
        const queryDate = new Date(lastSyncDate.getTime() - bufferMs);

        // Format date as YYYY/MM/DD for Gmail API (more reliable than Unix timestamp)
        const year = queryDate.getFullYear();
        const month = String(queryDate.getMonth() + 1).padStart(2, '0');
        const day = String(queryDate.getDate()).padStart(2, '0');
        const afterDate = `${year}/${month}/${day}`;

        const isFirstSync = !connection.last_sync_at;

        // Fetch more emails on first sync to catch up on history
        const maxResults = isFirstSync ? 500 : 100;

        const gmailQuery = `after:${afterDate} in:inbox`;
        console.log(`Syncing for user ${connection.user_id}: query="${gmailQuery}", maxResults=${maxResults}`);

        const gmailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=${maxResults}`,
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
            .from("gmail_connections")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("id", connection.id);

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

            const from = headers.find(h => h.name.toLowerCase() === "from")?.value || "";
            const subject = headers.find(h => h.name.toLowerCase() === "subject")?.value || "";
            const date = headers.find(h => h.name.toLowerCase() === "date")?.value || "";

            const senderEmail = from.match(/<(.+?)>/)?.[1] || from;
            const senderName = from.replace(/<.+?>/, "").trim().replace(/"/g, "");
            const senderDomain = senderEmail.split("@")[1] || "";

            const { data: blockedSender } = await supabase
              .from("blocked_senders")
              .select("total_emails_blocked")
              .eq("user_id", connection.user_id)
              .eq("email_address", senderEmail)
              .maybeSingle();

            let shouldAutoLabel = false;
            if (blockedSender && blockedSender.total_emails_blocked >= 2) {
              shouldAutoLabel = true;
            }

            const { error: insertError } = await supabase
              .from("emails")
              .insert({
                user_id: connection.user_id,
                mailbox_id: connection.mailbox_id,
                gmail_message_id: message.id,
                thread_id: message.threadId,
                subject: subject,
                sender_email: senderEmail,
                sender_name: senderName,
                sender_domain: senderDomain,
                snippet: message.snippet,
                received_at: new Date(parseInt(message.internalDate)).toISOString(),
                classification: shouldAutoLabel ? "blocked" : "pending",
                make_webhook_sent_at: shouldAutoLabel ? null : new Date().toISOString(),
                label_applied: false,
              })
              .select()
              .maybeSingle();

            if (insertError && !insertError.message.includes("duplicate")) {
              console.error("Error inserting email:", insertError);
            }

            // Always add email to webhook payload (send ALL emails)
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
              current_classification: shouldAutoLabel ? "blocked" : "pending",
            });

            // Auto-label emails from repeat offenders
            if (shouldAutoLabel) {
              try {
                await fetch(
                  `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}/modify`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      addLabelIds: ["TRASH"],
                      removeLabelIds: ["INBOX"],
                    }),
                  }
                );

                await supabase
                  .from("emails")
                  .update({ label_applied: true, action_taken: "auto_labeled_and_archived" })
                  .eq("gmail_message_id", message.id)
                  .eq("user_id", connection.user_id);

                await supabase
                  .from("blocked_senders")
                  .update({ total_emails_blocked: blockedSender.total_emails_blocked + 1 })
                  .eq("user_id", connection.user_id)
                  .eq("email_address", senderEmail);
              } catch (labelError) {
                console.error("Error applying label:", labelError);
              }
            }
          }
        }

        // Send ALL emails to webhook for AI classification
        let webhookSent = false;
        if (emailDetails.length > 0 && connection.make_webhook_url) {
          const webhookPayload = {
            user_id: connection.user_id,
            gmail_connection_id: connection.id,
            user_email: connection.mailboxes?.email_address || "",
            access_token: accessToken,
            emails: emailDetails,
            sync_info: {
              is_first_sync: isFirstSync,
              total_emails: emailDetails.length,
              sync_timestamp: new Date().toISOString(),
            },
          };

          try {
            const webhookResponse = await fetch(connection.make_webhook_url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(webhookPayload),
            });

            webhookSent = webhookResponse.ok;
            if (!webhookResponse.ok) {
              console.error("Webhook returned error:", await webhookResponse.text());
            }
          } catch (webhookError) {
            console.error("Error sending to webhook:", webhookError);
          }
        }

        await supabase
          .from("gmail_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", connection.id);

        results.push({
          user_id: connection.user_id,
          new_emails: messageIds.length,
          webhook_sent: webhookSent,
          is_first_sync: isFirstSync,
        });
      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
        results.push({
          user_id: connection.user_id,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: connections.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gmail-sync-cron:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
