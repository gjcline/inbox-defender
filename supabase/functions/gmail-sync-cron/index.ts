import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_MAKE_WEBHOOK = "https://hook.us2.make.com/qd1axtiygb3ivkcrgqqke0phfof2mcj7";
const ADVISORY_LOCK_KEY = 851234;

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
  requiresReconnect?: boolean;
}

async function refreshAccessToken(
  connection: any,
  supabase: any
): Promise<TokenRefreshResult> {
  try {
    console.log(`[${connection.id}] Refreshing token`);

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
      console.error(`[${connection.id}] Token refresh failed:`, errorText);

      // Check for invalid_grant error (user revoked access)
      if (errorText.includes("invalid_grant")) {
        console.log(`[${connection.id}] invalid_grant - marking for reconnect`);
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
          error: "invalid_grant",
          requiresReconnect: true,
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
      console.error(`[${connection.id}] Failed to update token:`, updateError);
      return {
        success: false,
        error: "Failed to save refreshed token",
      };
    }

    console.log(`[${connection.id}] Token refreshed successfully`);
    return {
      success: true,
      accessToken: access_token,
      expiresAt: newExpiresAt,
    };
  } catch (error) {
    console.error(`[${connection.id}] Error refreshing token:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function ensureValidToken(
  connection: any,
  supabase: any
): Promise<{ success: boolean; accessToken?: string; error?: string; refreshed?: boolean; requiresReconnect?: boolean }> {
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

    console.log(`[${connection.id}] Token expires soon, refreshing...`);

    // Token expires soon or already expired, refresh it
    const refreshResult = await refreshAccessToken(connection, supabase);
    if (!refreshResult.success) {
      return {
        success: false,
        error: refreshResult.error,
        refreshed: false,
        requiresReconnect: refreshResult.requiresReconnect,
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
  console.log("cron_begin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const syncStartTime = new Date();
  let syncHistoryId: string | null = null;
  let lockAcquired = false;

  // Create Supabase client with service role (bypasses RLS)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { "x-application-name": "gmail-sync-cron" } },
  });

  try {
    // Advisory lock to prevent overlapping runs
    const { data: tryLock } = await supabase.rpc("pg_try_advisory_lock", { key: ADVISORY_LOCK_KEY });

    console.log("lock_attempt", { acquired: !!tryLock });

    if (!tryLock) {
      console.log("lock_held", "another sync is already running");
      return new Response(
        JSON.stringify({ ok: true, reason: "lock_held" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    lockAcquired = true;
    console.log("lock_acquired", { key: ADVISORY_LOCK_KEY });

    // Create sync_history row at start
    const { data: syncHistory, error: syncHistoryError } = await supabase
      .from("sync_history")
      .insert({
        sync_started_at: syncStartTime.toISOString(),
        status: "running",
        user_id: null,
        gmail_connection_id: null,
        emails_fetched: 0,
        emails_sent_to_webhook: 0,
        refreshed_tokens: 0,
        failures: 0,
      })
      .select("id")
      .single();

    if (syncHistoryError || !syncHistory) {
      console.error("Failed to create sync_history row:", syncHistoryError);
      throw new Error("Failed to create sync history");
    }

    syncHistoryId = syncHistory.id;
    console.log(`Sync started, history ID: ${syncHistoryId}`);

    // Fetch active connections
    const { data: connections, error: connectionsError } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("is_active", true);

    if (connectionsError) {
      throw connectionsError;
    }

    // Guard: no active connections
    if (!connections || connections.length === 0) {
      console.log("no_active_connections", "marking sync_history as completed with zeros");

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
        JSON.stringify({ ok: true, reason: "no_active_connections" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${connections.length} active connection(s)`);

    const results = [];
    let totalFetched = 0;
    let totalPosted = 0;
    let totalRefreshed = 0;
    let totalFailures = 0;

    for (const connection of connections) {
      try {
        console.log(`[${connection.id}] Processing connection for user ${connection.user_id}`);

        // Ensure token is valid before making Gmail API calls
        const tokenResult = await ensureValidToken(connection, supabase);

        if (!tokenResult.success) {
          console.error(`[${connection.id}] Token validation failed:`, tokenResult.error);

          if (tokenResult.requiresReconnect) {
            console.log(`[${connection.id}] Requires reconnect, skipping`);
          }

          totalFailures++;
          results.push({
            user_id: connection.user_id,
            connection_id: connection.id,
            error: `Token validation failed: ${tokenResult.error}`,
            requires_reconnect: tokenResult.requiresReconnect || false,
          });
          continue;
        }

        if (tokenResult.refreshed) {
          console.log(`[${connection.id}] Token refreshed`);
          totalRefreshed++;
        }

        const accessToken = tokenResult.accessToken!;

        // Determine sync date range
        const lastSyncDate = connection.last_sync_at
          ? new Date(connection.last_sync_at)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const bufferMs = 5 * 60 * 1000;
        const queryDate = new Date(lastSyncDate.getTime() - bufferMs);

        const year = queryDate.getFullYear();
        const month = String(queryDate.getMonth() + 1).padStart(2, "0");
        const day = String(queryDate.getDate()).padStart(2, "0");
        const afterDate = `${year}/${month}/${day}`;

        const isFirstSync = !connection.last_sync_at;
        const maxResults = isFirstSync ? 500 : 100;

        const gmailQuery = `after:${afterDate} in:inbox`;
        console.log(`[${connection.id}] Query: "${gmailQuery}", maxResults: ${maxResults}`);

        // Fetch messages from Gmail
        const gmailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=${maxResults}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!gmailResponse.ok) {
          const errorText = await gmailResponse.text();
          console.error(`[${connection.id}] Gmail API error:`, errorText);
          totalFailures++;
          continue;
        }

        const gmailData = await gmailResponse.json();
        const messageIds = gmailData.messages || [];

        console.log(`[${connection.id}] Found ${messageIds.length} message(s)`);

        if (messageIds.length === 0) {
          await supabase
            .from("gmail_connections")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("id", connection.id);

          results.push({
            user_id: connection.user_id,
            connection_id: connection.id,
            new_emails: 0,
          });
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

            const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
            const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";

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
              console.error(`[${connection.id}] Error inserting email:`, insertError);
            } else if (!insertError) {
              emailsProcessed++;
            }

            // Add to webhook payload
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
                console.error(`[${connection.id}] Error applying label:`, labelError);
              }
            }
          }
        }

        totalFetched += emailsProcessed;

        // Send to webhook in batches of 25
        const webhookUrl = connection.make_webhook_url || DEFAULT_MAKE_WEBHOOK;
        let webhookSent = false;
        const BATCH_SIZE = 25;

        if (emailDetails.length > 0) {
          const batches = [];
          for (let i = 0; i < emailDetails.length; i += BATCH_SIZE) {
            batches.push(emailDetails.slice(i, i + BATCH_SIZE));
          }

          console.log(`[${connection.id}] Sending ${emailDetails.length} emails in ${batches.length} batch(es)`);

          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const webhookPayload = {
              user_id: connection.user_id,
              gmail_connection_id: connection.id,
              user_email: connection.email || "",
              access_token: accessToken,
              emails: batch,
              batch_number: batchIndex + 1,
              batch_total: batches.length,
              sync_info: {
                is_first_sync: isFirstSync,
                total_emails: batch.length,
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

              if (webhookResponse.ok) {
                webhookSent = true;
                totalPosted += batch.length;

                // Parse Make.com response
                try {
                  const makeResponse = await webhookResponse.json();

                  // Make should return: { results: [{ message_id, classification }] }
                  if (makeResponse.results && Array.isArray(makeResponse.results)) {
                    const resultsCount = makeResponse.results.length;
                    const sentCount = batch.length;

                    if (resultsCount < sentCount) {
                      console.warn('partial_results', {
                        connection_id: connection.id,
                        batch_number: batchIndex + 1,
                        sent: sentCount,
                        received: resultsCount,
                        missing: sentCount - resultsCount,
                      });
                    }

                    // Process results
                    const resultMap = new Map(
                      makeResponse.results.map((r: any) => [r.message_id, r.classification])
                    );

                    // Update classifications based on Make results
                    for (const email of batch) {
                      const classification = resultMap.get(email.message_id);

                      if (classification) {
                        // Update email with classification from Make
                        await supabase
                          .from("emails")
                          .update({
                            classification: classification,
                            make_webhook_sent_at: new Date().toISOString(),
                          })
                          .eq("gmail_message_id", email.message_id)
                          .eq("user_id", connection.user_id);
                      } else {
                        // Mark as pending if no result received
                        console.log(`[${connection.id}] No result for message ${email.message_id}, keeping as pending`);
                      }
                    }

                    console.log(`[${connection.id}] Batch ${batchIndex + 1}/${batches.length}: Posted ${batch.length}, received ${resultsCount} results`);
                  } else {
                    console.warn(`[${connection.id}] Batch ${batchIndex + 1}: Make response missing results array`);
                  }
                } catch (parseError) {
                  console.error(`[${connection.id}] Failed to parse Make response:`, parseError);
                }
              } else {
                const errorText = await webhookResponse.text();
                console.error(`[${connection.id}] Webhook error (batch ${batchIndex + 1}):`, errorText);
                totalFailures++;
              }
            } catch (webhookError) {
              console.error(`[${connection.id}] Webhook exception (batch ${batchIndex + 1}):`, webhookError);
              totalFailures++;
            }
          }
        }

        await supabase
          .from("gmail_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", connection.id);

        results.push({
          user_id: connection.user_id,
          connection_id: connection.id,
          new_emails: messageIds.length,
          webhook_sent: webhookSent,
          is_first_sync: isFirstSync,
          token_refreshed: tokenResult.refreshed,
        });
      } catch (error) {
        console.error(`[${connection.id}] Error processing connection:`, error);
        totalFailures++;
        results.push({
          user_id: connection.user_id,
          connection_id: connection.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update sync history with final counts
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

    // Structured log for observability
    console.log(
      JSON.stringify({
        event: "sync_complete",
        fetched: totalFetched,
        posted: totalPosted,
        refreshed: totalRefreshed,
        failures: totalFailures,
        duration_ms: Date.now() - syncStartTime.getTime(),
      })
    );

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
    console.error("sync_failed", {
      message: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update sync_history to error state
    if (syncHistoryId) {
      try {
        await supabase
          .from("sync_history")
          .update({
            sync_completed_at: new Date().toISOString(),
            status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
            failures: 1,
            error_details: {
              message: error instanceof Error ? error.message : "Unknown error",
              stack: error instanceof Error ? error.stack : undefined,
            },
          })
          .eq("id", syncHistoryId);
      } catch (updateError) {
        console.error("Failed to update sync_history:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } finally {
    // Always release advisory lock
    if (lockAcquired) {
      try {
        await supabase.rpc("pg_advisory_unlock", { key: ADVISORY_LOCK_KEY });
        console.log("lock_released", { key: ADVISORY_LOCK_KEY });
      } catch (unlockError) {
        console.error("lock_release_failed", unlockError);
      }
    }
    console.log("cron_end");
  }
});
