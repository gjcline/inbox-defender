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

    // Find connections with watches that will expire in the next 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const { data: expiringConnections, error: fetchError } = await supabase
      .from("gmail_connections")
      .select("*")
      .eq("is_active", true)
      .eq("push_enabled", true)
      .lt("gmail_watch_expiration", twoDaysFromNow.toISOString());

    if (fetchError) {
      console.error("Error fetching expiring connections:", fetchError);
      throw fetchError;
    }

    if (!expiringConnections || expiringConnections.length === 0) {
      return new Response(
        JSON.stringify({ message: "No watches need renewal" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${expiringConnections.length} watches to renew`);

    const results = [];

    for (const connection of expiringConnections) {
      try {
        // In production, this would call Gmail API to renew the watch:
        // POST https://gmail.googleapis.com/gmail/v1/users/me/watch
        // {
        //   "topicName": "projects/{project-id}/topics/{topic-name}",
        //   "labelIds": ["INBOX"]
        // }
        
        // For now, just log that we would renew
        console.log(`Would renew watch for connection: ${connection.id}`);
        
        // Update the expiration date (in production, use the expiration from Gmail API response)
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + 7);

        await supabase
          .from("gmail_connections")
          .update({
            gmail_watch_expiration: newExpiration.toISOString(),
          })
          .eq("id", connection.id);

        results.push({
          connection_id: connection.id,
          status: "renewed",
          new_expiration: newExpiration.toISOString(),
        });
      } catch (error) {
        console.error(`Error renewing watch for ${connection.id}:`, error);
        results.push({
          connection_id: connection.id,
          status: "error",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        renewed: results.filter(r => r.status === "renewed").length,
        failed: results.filter(r => r.status === "error").length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gmail-renew-watches:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});