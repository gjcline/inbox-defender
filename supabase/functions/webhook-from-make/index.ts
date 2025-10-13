import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailResult {
  message_id: string;
  classification: "blocked" | "safe";
  ai_confidence_score: number;
  ai_reasoning: string;
  action_taken?: string;
}

interface WebhookPayload {
  user_id: string;
  access_token?: string;
  results: EmailResult[];
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

    const updates = [];
    const errors = [];

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

        if (result.classification === "blocked") {
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

          if (payload.access_token) {
            try {
              const labelResponse = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${result.message_id}/modify`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${payload.access_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    addLabelIds: ["TRASH"],
                    removeLabelIds: ["INBOX"],
                  }),
                }
              );

              if (labelResponse.ok) {
                await supabase
                  .from("emails")
                  .update({
                    label_applied: true,
                    action_taken: "labeled_and_archived",
                  })
                  .eq("id", email.id);
              }
            } catch (labelError) {
              console.error("Error applying label:", labelError);
            }
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
