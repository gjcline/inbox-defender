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

interface EmailBody {
  text: string | null;
  html: string | null;
}

// Base64url decode helper function
function base64urlDecode(str: string): string {
  try {
    // Replace URL-safe characters with standard base64 characters
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // Decode base64
    return atob(base64);
  } catch (error) {
    console.error('Base64 decode error:', error);
    return '';
  }
}

// Extract email body from Gmail API message payload
function extractEmailBody(payload: any): EmailBody {
  let text: string | null = null;
  let html: string | null = null;

  // Check if body data is directly in payload
  if (payload.body?.data) {
    const decoded = base64urlDecode(payload.body.data);
    // Determine if it's HTML or plain text based on content
    if (decoded.includes('<html') || decoded.includes('<body')) {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  // Check multipart message (most emails)
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = base64urlDecode(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = base64urlDecode(part.body.data);
      } else if (part.parts) {
        // Nested multipart (e.g., alternative within mixed)
        const nested = extractEmailBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    }
  }

  return { text, html };
}

// Check if email has attachments
function hasAttachments(payload: any): boolean {
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.filename && part.filename.length > 0) {
        return true;
      }
      if (part.parts && hasAttachments(part)) {
        return true;
      }
    }
  }
  return false;
}

// Extract important headers for domain verification
function extractHeaders(headers: Array<{ name: string; value: string }>): any {
  const headerMap: any = {};
  const importantHeaders = ['from', 'to', 'reply-to', 'return-path', 'sender', 'x-sender'];

  for (const header of headers) {
    const lowerName = header.name.toLowerCase();
    if (importantHeaders.includes(lowerName)) {
      headerMap[lowerName] = header.value;
    }
  }

  return headerMap;
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
  console.log("=== Gmail Sync Cron Started ===");
  console.log("Timestamp:", new Date().toISOString());

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

    console.log("Lock attempt result:", !!tryLock);

    if (!tryLock) {
      console.log("Lock already held - another sync is running");
      return new Response(
        JSON.stringify({ ok: true, reason: "lock_held" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    lockAcquired = true;
    console.log("Lock acquired successfully");

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
    console.log(`Sync history created: ${syncHistoryId}`);

    // Fetch active connections
    const { data: connections, error: connectionsError } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("is_active", true);

    if (connectionsError) {
      throw connectionsError;
    }

    console.log(`Active connections found: ${connections?.length || 0}`);

    // Guard: no active connections
    if (!connections || connections.length === 0) {
      console.log("No active connections found");

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

    const results = [];
    let totalFetched = 0;
    let totalPosted = 0;
    let totalRefreshed = 0;
    let totalFailures = 0;

    for (const connection of connections) {
      try {
        console.log(`\n========================================`);
        console.log(`Processing connection for user: ${connection.user_id}`);
        console.log(`Connection ID: ${connection.id}`);
        console.log(`Email: ${connection.email}`);
        console.log(`Mailbox ID: ${connection.mailbox_id}`);
        console.log(`Access token exists: ${!!connection.access_token}`);
        console.log(`Token expires at: ${connection.token_expires_at}`);
        console.log(`Last sync: ${connection.last_sync_at}`);
        console.log(`OAuth provider: ${connection.oauth_provider || 'google'}`);
        console.log(`========================================\n`);

        // Ensure token is valid before making Gmail API calls
        const tokenResult = await ensureValidToken(connection, supabase);

        if (!tokenResult.success) {
          console.error(`Token validation failed: ${tokenResult.error}`);

          if (tokenResult.requiresReconnect) {
            console.log(`Connection requires reconnect, skipping`);
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
          console.log(`Token refreshed successfully`);
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
        console.log(`Gmail query: "${gmailQuery}", maxResults: ${maxResults}`);

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
          console.error(`Gmail API error: ${errorText}`);
          totalFailures++;
          continue;
        }

        const gmailData = await gmailResponse.json();
        const messageIds = gmailData.messages || [];

        console.log(`Found ${messageIds.length} message(s)`);

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

        console.log(`📧 Starting to process ${messageIds.length} messages from Gmail API`);

        for (const msgRef of messageIds) {
          try {
            // Fetch full email with format=full to get body content
            const msgResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );

            if (!msgResponse.ok) {
              console.error(`Failed to fetch message ${msgRef.id}: ${msgResponse.status}`);
              continue;
            }

            const message: GmailMessage = await msgResponse.json();
            const headers = message.payload.headers;

            const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "";
            const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "";

            const senderEmail = from.match(/<(.+?)>/)?.[1] || from;
            const senderName = from.replace(/<.+?>/, "").trim().replace(/"/g, "");
            const senderDomain = senderEmail.split("@")[1] || "";

            console.log(`📨 Processing email ${message.id} from ${senderEmail}`);

            // Extract full email body
            const emailBody = extractEmailBody(message.payload);
            const hasAttach = hasAttachments(message.payload);
            const importantHeaders = extractHeaders(headers);

            console.log(`   - Has text body: ${!!emailBody.text}, Has HTML body: ${!!emailBody.html}, Has attachments: ${hasAttach}`);

            // Check if sender is blocked
            const { data: blockedSender } = await supabase
              .from("blocked_senders")
              .select("total_emails_blocked")
              .eq("user_id", connection.user_id)
              .eq("email_address", senderEmail)
              .maybeSingle();

            let shouldAutoLabel = false;
            if (blockedSender && blockedSender.total_emails_blocked >= 2) {
              shouldAutoLabel = true;
              console.log(`🚫 Sender ${senderEmail} is blocked (${blockedSender.total_emails_blocked} previous blocks)`);
            }

            // Prepare email record for insertion
            const emailRecord = {
              user_id: connection.user_id,
              mailbox_id: connection.mailbox_id,
              gmail_message_id: message.id,
              thread_id: message.threadId,
              subject: subject,
              sender_email: senderEmail,
              sender_name: senderName,
              sender_domain: senderDomain,
              snippet: message.snippet,
              body_text: emailBody.text,
              body_html: emailBody.html,
              has_attachments: hasAttach,
              headers_json: importantHeaders,
              received_at: new Date(parseInt(message.internalDate)).toISOString(),
              classification: shouldAutoLabel ? "blocked" : "pending",
              make_webhook_sent_at: shouldAutoLabel ? null : new Date().toISOString(),
              label_applied: false,
            };

            console.log(`💾 Attempting to insert email into database:`, {
              message_id: message.id,
              user_id: connection.user_id,
              mailbox_id: connection.mailbox_id,
              sender: senderEmail,
              subject: subject?.substring(0, 50),
            });

            // Use upsert to handle duplicates gracefully
            const { data: insertedEmail, error: insertError } = await supabase
              .from("emails")
              .upsert(emailRecord, {
                onConflict: "user_id,gmail_message_id",
                ignoreDuplicates: false,
              })
              .select()
              .maybeSingle();

            if (insertError) {
              console.error(`❌ Database insertion failed for message ${message.id}:`, {
                error: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint,
                user_id: connection.user_id,
                mailbox_id: connection.mailbox_id,
              });
              totalFailures++;
            } else {
              console.log(`✅ Successfully inserted/updated email ${message.id} in database`);
              emailsProcessed++;
            }

            // Add to webhook payload with full email content for AI classification
            emailDetails.push({
              message_id: message.id,
              thread_id: message.threadId,
              from: from,
              sender_email: senderEmail,
              sender_name: senderName,
              sender_domain: senderDomain,
              subject: subject,
              snippet: message.snippet,
              body_text: emailBody.text,
              body_html: emailBody.html,
              has_attachments: hasAttach,
              headers: importantHeaders,
              received_date: new Date(parseInt(message.internalDate)).toISOString(),
              label_ids: message.labelIds,
              current_classification: shouldAutoLabel ? "blocked" : "pending",
            });

            // Auto-label emails from repeat offenders
            if (shouldAutoLabel) {
              try {
                console.log(`🏷️ Auto-labeling email ${message.id} as blocked`);

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

                console.log(`✅ Auto-label applied successfully`);
              } catch (labelError) {
                console.error(`Error applying label: ${labelError}`);
              }
            }
          } catch (msgError) {
            console.error(`Error processing message ${msgRef.id}:`, msgError);
            totalFailures++;
          }
        }

        console.log(`\n📊 Email processing summary for connection ${connection.id}:`);
        console.log(`   - Messages found in Gmail: ${messageIds.length}`);
        console.log(`   - Successfully inserted to DB: ${emailsProcessed}`);
        console.log(`   - Ready for webhook: ${emailDetails.length}`);

        totalFetched += emailsProcessed;

        // Send emails to webhook ONE AT A TIME (simplifies Make.com scenario)
        const webhookUrl = connection.make_webhook_url || DEFAULT_MAKE_WEBHOOK;
        let webhookSuccessCount = 0;
        const WEBHOOK_TIMEOUT = 10000; // 10 second timeout per email
        const DELAY_BETWEEN_WEBHOOKS = 150; // 150ms delay to avoid overwhelming Make.com

        if (emailDetails.length > 0) {
          console.log(`\n📤 Sending ${emailDetails.length} emails to Make.com webhook (one at a time)`);

          for (let i = 0; i < emailDetails.length; i++) {
            const emailDetail = emailDetails[i];
            const emailNumber = i + 1;
            const totalEmails = emailDetails.length;

            // Create payload for single email (no array, simplifies Make.com)
            const webhookPayload = {
              user_id: connection.user_id,
              gmail_connection_id: connection.id,
              user_email: connection.email || "",
              access_token: accessToken,
              email: emailDetail, // Single email object, not array
            };

            const subjectPreview = emailDetail.subject?.substring(0, 60) || "(no subject)";
            console.log(`   📧 [${emailNumber}/${totalEmails}] Sending: "${subjectPreview}"`);

            try {
              // Create an AbortController for timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

              const webhookResponse = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(webhookPayload),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (webhookResponse.ok) {
                webhookSuccessCount++;
                totalPosted++;

                // Try to parse response and update classification
                try {
                  const makeResponse = await webhookResponse.json();

                  // Make.com returns classification for single email
                  if (makeResponse.classification) {
                    await supabase
                      .from("emails")
                      .update({
                        classification: makeResponse.classification,
                        make_webhook_sent_at: new Date().toISOString(),
                      })
                      .eq("gmail_message_id", emailDetail.message_id)
                      .eq("user_id", connection.user_id);

                    console.log(`      ✅ Make.com classified as: ${makeResponse.classification}`);
                  } else {
                    console.log(`      ✅ Webhook succeeded (status ${webhookResponse.status})`);
                  }
                } catch (parseError) {
                  console.warn(`      ⚠️ Could not parse Make.com response (non-critical): ${parseError}`);
                }
              } else {
                const errorText = await webhookResponse.text();
                console.error(`      ❌ Webhook failed (${webhookResponse.status}): ${errorText.substring(0, 100)}`);
                totalFailures++;
              }
            } catch (webhookError) {
              if (webhookError.name === 'AbortError') {
                console.warn(`      ⏱️ Webhook timeout - continuing with next email. Email is saved in DB.`);
                totalFailures++;
              } else {
                console.error(`      ❌ Webhook error: ${webhookError instanceof Error ? webhookError.message : String(webhookError)}`);
                totalFailures++;
              }
            }

            // Add small delay between webhook calls to avoid overwhelming Make.com
            if (i < emailDetails.length - 1) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_WEBHOOKS));
            }
          }

          console.log(`\n📊 Webhook summary: ${webhookSuccessCount}/${emailDetails.length} emails sent successfully`);
        }

        console.log(`Sync completed for ${connection.email}`);

        await supabase
          .from("gmail_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("id", connection.id);

        results.push({
          user_id: connection.user_id,
          connection_id: connection.id,
          new_emails: messageIds.length,
          webhook_sent: webhookSuccessCount > 0,
          webhook_success_count: webhookSuccessCount,
          is_first_sync: isFirstSync,
          token_refreshed: tokenResult.refreshed,
        });
      } catch (error) {
        console.error(`Error processing connection: ${error}`);
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

    console.log("=== Sync Complete ===");
    console.log(`Fetched: ${totalFetched}, Posted: ${totalPosted}, Refreshed: ${totalRefreshed}, Failures: ${totalFailures}`);

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
    console.error("Sync failed:", error);

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
        console.log("Lock released");
      } catch (unlockError) {
        console.error("Lock release failed:", unlockError);
      }
    }
    console.log("=== Gmail Sync Cron Ended ===");
  }
});
