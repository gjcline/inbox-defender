import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_MAKE_WEBHOOK = "https://hook.us2.make.com/qd1axtiygb3ivkcrgqqke0phfof2mcj7";

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

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: string;
  error?: string;
}

async function refreshAccessToken(
  connection: any,
  supabase: any
): Promise<TokenRefreshResult> {
  try {
    console.log(`Refreshing token for connection ${connection.id}`);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: "OAuth credentials not configured",
      };
    }

    if (!connection.refresh_token) {
      return {
        success: false,
        error: "No refresh token available",
      };
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Token refresh failed for ${connection.id}:`, errorText);

      // Check for invalid_grant error (user revoked access)
      if (errorText.includes("invalid_grant")) {
        await supabase
          .from("gmail_connections")
          .update({
            is_active: false,
            last_error: "Token refresh failed: User revoked access. Please reconnect.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", connection.id);

        return {
          success: false,
          error: "invalid_grant - connection marked for reconnect",
        };
      }

      return {
        success: false,
        error: `Token refresh failed: ${errorText}`,
      };
    }

    const tokens = await tokenResponse.json();
    const { access_token, expires_in } = tokens;
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update the connection with new tokens
    const { error: updateError } = await supabase
      .from("gmail_connections")
      .update({
        access_token,
        token_expires_at: newExpiresAt,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    if (updateError) {
      console.error("Failed to update token:", updateError);
      return {
        success: false,
        error: "Failed to save refreshed token",
      };
    }

    console.log(`Token refreshed successfully for ${connection.id}`);
    return {
      success: true,
      accessToken: access_token,
      expiresAt: newExpiresAt,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function ensureValidToken(
  connection: any,
  supabase: any
): Promise<{ success: boolean; accessToken?: string; error?: string; refreshed?: boolean }> {
  try {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const twoMinutes = 2 * 60 * 1000;

    // Check if token expires within 2 minutes
    if (expiresAt.getTime() - now.getTime() > twoMinutes) {
      return {
        success: true,
        accessToken: connection.access_token,
        refreshed: false,
      };
    }

    // Token expires soon or already expired, refresh it
    const refreshResult = await refreshAccessToken(connection, supabase);
    if (!refreshResult.success) {
      return {
        success: false,
        error: refreshResult.error,
        refreshed: false,
      };
    }

    return {
      success: true,
      accessToken: refreshResult.accessToken,
      refreshed: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      refreshed: false,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const syncStartTime = new Date();
  let syncHistoryId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Advisory lock to prevent overlapping runs
    const { data: lockAcquired } = await supabase.rpc('pg_try_advisory_lock', { key: 851234 });

    if (!lockAcquired) {
      console.log("Another sync is already running, skipping this execution");
      return new Response(
        JSON.stringify({ message: "Sync already in progress, skipped" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Advisory lock acquired, starting sync");

    // Create sync history entry
    // Note: Using first connection's user_id and gmail_connection_id, or null if no connections
    const { data: syncHistory, error: syncHistoryError } = await supabase
      .from("sync_history")
      .insert({
        sync_started_at: syncStartTime.toISOString(),
        status: "running",
        user_id: null, // Will be set if we have connections
        gmail_connection_id: null,
      })
      .select("id")
      .single();

    if (!syncHistoryError && syncHistory) {
      syncHistoryId = syncHistory.id;
    }

    const { data: connections, error: connectionsError } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("is_active", true);

    if (connectionsError) throw connectionsError;

    if (!connections || connections.length === 0) {
      // Update sync history
      if (syncHistoryId) {
        await supabase
          .from("sync_history")
          .update({
            sync_completed_at: new Date().toISOString(),
            status: "completed",
            emails_fetched: 0,
            emails_sent_to_webhook: 0,
            refreshed_tokens: 0,
            failures: 0,
          })
          .eq("id", syncHistoryId);
      }

      return new Response(
        JSON.stringify({ message: "No active connections to sync" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];
    let totalFetched = 0;
    let totalPosted = 0;
    let totalRefreshed = 0;
    let totalFailures = 0;

    for (const connection of connections) {
      try {
        // Ensure token is valid before making Gmail API calls
        const tokenResult = await ensureValidToken(connection, supabase);

        if (!tokenResult.success) {
          console.error(`Token validation failed for ${connection.id}:`, tokenResult.error);
          totalFailures++;
          results.push({
            user_id: connection.user_id,
            error: `Token validation failed: ${tokenResult.error}`,
          });
          continue;
        }

        if (tokenResult.refreshed) {
          totalRefreshed++;
        }

        const accessToken = tokenResult.accessToken!;

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
          totalFailures++;
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
        let emailsProcessed = 0;

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

            // Get mailbox_id for this connection
            const { data: mailboxData } = await supabase
              .from("mailboxes")
              .select("id")
              .eq("email_address", connection.email)
              .maybeSingle();

            const { error: insertError } = await supabase
              .from("emails")
              .insert({
                user_id: connection.user_id,
                mailbox_id: mailboxData?.id || null,
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
            } else {
              emailsProcessed++;
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

        totalFetched += emailsProcessed;

        // Send ALL emails to webhook for AI classification
        // Use connection's webhook URL or default
        const webhookUrl = connection.make_webhook_url || DEFAULT_MAKE_WEBHOOK;
        let webhookSent = false;

        if (emailDetails.length > 0) {
          const webhookPayload = {
            user_id: connection.user_id,
            gmail_connection_id: connection.id,
            user_email: connection.email || "",
            access_token: accessToken,
            emails: emailDetails,
            sync_info: {
              is_first_sync: isFirstSync,
              total_emails: emailDetails.length,
              sync_timestamp: new Date().toISOString(),
            },
          };

          try {
            const webhookResponse = await fetch(webhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(webhookPayload),
            });

            webhookSent = webhookResponse.ok;
            if (webhookResponse.ok) {
              totalPosted += emailDetails.length;
            } else {
              console.error("Webhook returned error:", await webhookResponse.text());
              totalFailures++;
            }
          } catch (webhookError) {
            console.error("Error sending to webhook:", webhookError);
            totalFailures++;
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
          token_refreshed: tokenResult.refreshed,
        });
      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
        totalFailures++;
        results.push({
          user_id: connection.user_id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update sync history with final counts
    if (syncHistoryId) {
      await supabase
        .from("sync_history")
        .update({
          sync_completed_at: new Date().toISOString(),
          status: "completed",
          emails_fetched: totalFetched,
          emails_sent_to_webhook: totalPosted,
          refreshed_tokens: totalRefreshed,
          failures: totalFailures,
        })
        .eq("id", syncHistoryId);
    }

    // Structured log for observability
    console.log(JSON.stringify({
      event: "sync_complete",
      fetched: totalFetched,
      posted: totalPosted,
      refreshed: totalRefreshed,
      failures: totalFailures,
      duration_ms: Date.now() - syncStartTime.getTime(),
    }));

    // Release advisory lock
    await supabase.rpc('pg_advisory_unlock', { key: 851234 });
    console.log("Advisory lock released");

    return new Response(
      JSON.stringify({
        success: true,
        processed: connections.length,
        fetched: totalFetched,
        posted: totalPosted,
        refreshed: totalRefreshed,
        failures: totalFailures,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gmail-sync-cron:", error);

    // Update sync history with error
    if (syncHistoryId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase
          .from("sync_history")
          .update({
            sync_completed_at: new Date().toISOString(),
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
            error_details: {
              message: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
            },
          })
          .eq("id", syncHistoryId);
      } catch (updateError) {
        console.error("Failed to update sync history:", updateError);
      }
    }

    // Release advisory lock on error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.rpc('pg_advisory_unlock', { key: 851234 });
      console.log("Advisory lock released after error");
    } catch (unlockError) {
      console.error("Failed to release advisory lock:", unlockError);
    }

    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
