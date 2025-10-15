import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active gmail connection for user
    const { data: connection, error: connectionError } = await supabase
      .from("gmail_connections")
      .select("*, mailboxes(email_address)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "No active Gmail connection found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Set up Gmail watch/push notification
    // The topicName should be your Google Cloud Pub/Sub topic
    // Format: projects/{project-id}/topics/{topic-name}
    
    const pushEndpoint = `${supabaseUrl}/functions/v1/gmail-push-notification`;
    
    // For now, we'll skip the actual watch setup since it requires Google Cloud Pub/Sub
    // Instead, we'll rely on the cron job polling
    // In production, you would:
    // 1. Create a Google Cloud Pub/Sub topic
    // 2. Subscribe to it with the push endpoint
    // 3. Call Gmail API watch endpoint
    
    console.log("Would setup watch for:", connection.mailboxes?.email_address);
    console.log("Push endpoint:", pushEndpoint);

    // For now, just update the connection to mark push as "ready" (but using cron)
    await supabase
      .from("gmail_connections")
      .update({
        push_enabled: false, // Set to false until Pub/Sub is configured
        push_endpoint: pushEndpoint,
      })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Automatic sync is configured using scheduled polling (every 15 minutes)",
        push_endpoint: pushEndpoint,
        note: "For real-time push notifications, Google Cloud Pub/Sub setup is required",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gmail-setup-watch:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});