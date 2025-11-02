import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailResult {
  message_id: string;
  classification: "inbox" | "personal" | "conversations" | "marketing" | "cold_outreach" | "spam" | "blocked" | "safe";
  ai_confidence_score: number;
  ai_reasoning: string;
  action_taken?: string;
}

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: string;
  error?: string;
}

interface WebhookPayload {
  user_id: string;
  access_token?: string;
  results: EmailResult[];
}

// Refresh access token if expired
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenRefreshResult> {
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token refresh failed:", errorText);
      return { success: false, error: errorText };
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    return {
      success: true,
      accessToken: tokens.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error("Exception during token refresh:", error);
    return { success: false, error: error.message };
  }
}

// Move email to InboxDefender folder by adding label and removing INBOX
async function moveEmailToFolder(
  messageId: string,
  classification: string,
  labelMapping: Record<string, string>,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Map classification to label key
    const labelKey = classification;
    const labelId = labelMapping[labelKey];

    if (!labelId) {
      console.error(`No label ID found for classification: ${classification}`);
      return { success: false, error: `No label mapping for ${classification}` };
    }

    // Prepare label modifications
    const addLabelIds = [labelId];
    const removeLabelIds = ["INBOX"];

    // Mark as read for spam and marketing
    if (classification === "spam" || classification === "marketing") {
      removeLabelIds.push("UNREAD");
    }

    const modifyResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds,
          removeLabelIds,
        }),
      }
    );

    if (!modifyResponse.ok) {
      const errorText = await modifyResponse.text();
      console.error(`Failed to move email ${messageId}:`, errorText);
      return { success: false, error: errorText };
    }

    console.log(`✅ Moved email ${messageId} to ${classification} folder`);
    return { success: true };
  } catch (error) {
    console.error(`Exception moving email ${messageId}:`, error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    if (!payload.user_id || !payload.results || !Array.isArray(payload.results)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch gmail_connection to get label_mapping and token info
    const { data: gmailConnection, error: connectionError } = await supabase
      .from("gmail_connections")
      .select("access_token, refresh_token, token_expires_at, label_mapping")
      .eq("user_id", payload.user_id)
      .maybeSingle();

    if (connectionError || !gmailConnection) {
      console.error("Failed to fetch Gmail connection:", connectionError);
      return new Response(
        JSON.stringify({ error: "Gmail connection not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if token needs refresh
    let accessToken = gmailConnection.access_token;
    const expiresAt = new Date(gmailConnection.token_expires_at);
    const now = new Date();
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntilExpiry < 5) {
      console.log(`Token expires in ${minutesUntilExpiry.toFixed(1)} minutes, refreshing...`);

      const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
      const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

      const refreshResult = await refreshAccessToken(
        gmailConnection.refresh_token,
        googleClientId,
        googleClientSecret
      );

      if (refreshResult.success) {
        accessToken = refreshResult.accessToken!;

        // Update token in database
        await supabase
          .from("gmail_connections")
          .update({
            access_token: accessToken,
            token_expires_at: refreshResult.expiresAt,
          })
          .eq("user_id", payload.user_id);

        console.log("✓ Token refreshed successfully");
      } else {
        console.error("⚠️  Token refresh failed, will try with existing token");
      }
    }

    const labelMapping = gmailConnection.label_mapping || {};
    const hasLabelMapping = Object.keys(labelMapping).length > 0;

    if (!hasLabelMapping) {
      console.warn("⚠️  No label_mapping found. Labels won't be created until reconnect.");
    }

    const updates = [];
    const errors = [];
    const moved = [];

    for (const result of payload.results) {
      try {
        const { data: email, error: fetchError } = await supabase
          .from("emails")
          .select("*")
          .eq("user_id", payload.user_id)
          .eq("gmail_message_id", result.message_id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching email:", fetchError);
          errors.push({ message_id: result.message_id, error: fetchError.message });
          continue;
        }

        if (!email) {
          errors.push({ message_id: result.message_id, error: "Email not found" });
          continue;
        }

        // Update email classification in database
        const { error: updateError } = await supabase
          .from("emails")
          .update({
            classification: result.classification,
            ai_confidence_score: result.ai_confidence_score,
            ai_reasoning: result.ai_reasoning,
            action_taken: result.action_taken || null,
            processed_at: new Date().toISOString(),
          })
          .eq("id", email.id);

        if (updateError) {
          console.error("Error updating email:", updateError);
          errors.push({ message_id: result.message_id, error: updateError.message });
          continue;
        }

        // Move email to InboxDefender folder
        if (hasLabelMapping && accessToken) {
          const moveResult = await moveEmailToFolder(
            result.message_id,
            result.classification,
            labelMapping,
            accessToken
          );

          if (moveResult.success) {
            // Update email record to mark as moved
            await supabase
              .from("emails")
              .update({
                moved_to_folder: true,
                moved_at: new Date().toISOString(),
                move_error: null,
              })
              .eq("id", email.id);

            moved.push(result.message_id);
          } else {
            // Log move error for retry
            await supabase
              .from("emails")
              .update({
                moved_to_folder: false,
                move_error: moveResult.error,
              })
              .eq("id", email.id);

            console.error(`Failed to move email ${result.message_id}:`, moveResult.error);
          }
        }

        // Handle blocked senders tracking
        if (result.classification === "blocked" || result.classification === "spam" || result.classification === "cold_outreach") {
          const { data: existingSender } = await supabase
            .from("blocked_senders")
            .select("total_emails_blocked")
            .eq("user_id", payload.user_id)
            .eq("email_address", email.sender_email)
            .maybeSingle();

          if (existingSender) {
            await supabase
              .from("blocked_senders")
              .update({
                total_emails_blocked: existingSender.total_emails_blocked + 1,
                blocked_at: new Date().toISOString(),
              })
              .eq("user_id", payload.user_id)
              .eq("email_address", email.sender_email);
          } else {
            await supabase
              .from("blocked_senders")
              .insert({
                user_id: payload.user_id,
                email_address: email.sender_email,
                sender_name: email.sender_name,
                blocked_at: new Date().toISOString(),
                block_reason: "ai_classified",
                total_emails_blocked: 1,
              });
          }
        }

        updates.push({
          message_id: result.message_id,
          status: "updated",
        });
      } catch (error) {
        console.error(`Error processing result for ${result.message_id}:`, error);
        errors.push({
          message_id: result.message_id,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: payload.results.length,
        updated: updates.length,
        moved: moved.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in webhook-from-make:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
